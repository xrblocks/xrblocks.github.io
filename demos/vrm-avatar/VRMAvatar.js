/**
 * VRMAvatar.js
 *
 * Utility class that wraps VRM loading, per-frame update, and Mixamo animation
 * retargeting. Designed as a proto-addon following the RainParticles pattern:
 * plain JS class, no XRBlocks lifecycle dependencies, fully reusable.
 *
 * Usage:
 *   const avatar = new VRMAvatar();
 *   await avatar.load(url, renderer);
 *   scene.add(avatar.root);            // add the VRM scene graph
 *   // in render loop:
 *   avatar.update(delta);
 */

import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {VRMLoaderPlugin, VRMUtils} from '@pixiv/three-vrm';

// ---------------------------------------------------------------------------
// Mixamo → VRM HumanoidBone name map
// Sourced from three-vrm examples/humanoidAnimation/mixamoVRMRigMap.js
// ---------------------------------------------------------------------------
const MIXAMO_VRM_RIG_MAP = {
  mixamorigHips: 'hips',
  mixamorigSpine: 'spine',
  mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest',
  mixamorigNeck: 'neck',
  mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder',
  mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm',
  mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
  mixamorigLeftHandThumb2: 'leftThumbProximal',
  mixamorigLeftHandThumb3: 'leftThumbDistal',
  mixamorigLeftHandIndex1: 'leftIndexProximal',
  mixamorigLeftHandIndex2: 'leftIndexIntermediate',
  mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal',
  mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
  mixamorigLeftHandMiddle3: 'leftMiddleDistal',
  mixamorigLeftHandRing1: 'leftRingProximal',
  mixamorigLeftHandRing2: 'leftRingIntermediate',
  mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal',
  mixamorigLeftHandPinky2: 'leftLittleIntermediate',
  mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder',
  mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm',
  mixamorigRightHand: 'rightHand',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal',
  mixamorigRightHandThumb2: 'rightThumbProximal',
  mixamorigRightHandThumb3: 'rightThumbDistal',
  mixamorigRightHandIndex1: 'rightIndexProximal',
  mixamorigRightHandIndex2: 'rightIndexIntermediate',
  mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal',
  mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
  mixamorigRightHandMiddle3: 'rightMiddleDistal',
  mixamorigRightHandRing1: 'rightRingProximal',
  mixamorigRightHandRing2: 'rightRingIntermediate',
  mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandPinky1: 'rightLittleProximal',
  mixamorigRightHandPinky2: 'rightLittleIntermediate',
  mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg',
  mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot',
  mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg',
  mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot',
  mixamorigRightToeBase: 'rightToes',
};

// ---------------------------------------------------------------------------
// Retarget a Mixamo FBX AnimationClip onto a loaded VRM's humanoid skeleton.
// Returns a new AnimationClip compatible with the VRM's bone names.
// Based on three-vrm examples/humanoidAnimation/loadMixamoAnimation.js
// ---------------------------------------------------------------------------
/**
 * Retargets a Mixamo FBX AnimationClip onto a loaded VRM's humanoid skeleton.
 * Returns a new AnimationClip compatible with the VRM's bone names.
 * @param {THREE.AnimationClip} clip The Mixamo animation clip.
 * @param {THREE.Group} fbxScene The loaded FBX scene containing the rig.
 * @param {object} vrm The loaded VRM instance.
 * @returns {THREE.AnimationClip} A new AnimationClip compatible with the VRM's bone names.
 */
function retargetMixamoClip(clip, fbxScene, vrm) {
  const tracks = [];
  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const _quatA = new THREE.Quaternion();

  // Find hips with the actual name in the FBX
  let hipsNode = null;
  fbxScene.traverse((obj) => {
    if (!hipsNode && obj.name.match(/^mixamorig\d*Hips$/)) {
      hipsNode = obj;
    }
  });
  const motionHipsHeight = hipsNode?.position.y || 1;
  const vrmHipsHeight = vrm.humanoid.normalizedRestPose.hips.position[1];
  const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

  // Force world matrix computation
  fbxScene.updateMatrixWorld(true);

  for (const track of clip.tracks) {
    const nameParts = track.name.split('.');
    const mixamoRigName = nameParts[0];
    const propertyName = nameParts[1];

    // Normalize bone name for rig map lookup
    const normalizedName = mixamoRigName.replace(/^mixamorig\d*/, 'mixamorig');
    const vrmBoneName = MIXAMO_VRM_RIG_MAP[normalizedName];
    if (!vrmBoneName) continue;

    const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
    if (!vrmNodeName) continue;

    // Use actual FBX bone name (with number prefix)
    const mixamoRigNode = fbxScene.getObjectByName(mixamoRigName);
    if (!mixamoRigNode) continue;

    // Store rotations of rest-pose using world quaternions (official approach)
    mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
    mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

    if (track instanceof THREE.QuaternionKeyframeTrack) {
      for (let i = 0; i < track.values.length; i += 4) {
        const flatQuaternion = track.values.slice(i, i + 4);
        _quatA.fromArray(flatQuaternion);

        _quatA
          .premultiply(parentRestWorldRotation)
          .multiply(restRotationInverse);

        _quatA.toArray(flatQuaternion);
        flatQuaternion.forEach((v, index) => {
          track.values[index + i] = v;
        });
      }

      // VRM1: no sign flip needed
      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          `${vrmNodeName}.${propertyName}`,
          track.times,
          track.values.slice()
        )
      );
    } else if (track instanceof THREE.VectorKeyframeTrack) {
      // VRM1: keep Y (vertical bob) but zero X/Z on hips to strip root motion.
      // Without this, Mixamo walk animations snap back on every loop cycle.
      const value = track.values.map((v, i) =>
        vrmBoneName === 'hips' && i % 3 !== 1 ? 0 : v * hipsPositionScale
      );
      tracks.push(
        new THREE.VectorKeyframeTrack(
          `${vrmNodeName}.${propertyName}`,
          track.times,
          value
        )
      );
    }
  }

  return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
}

// ---------------------------------------------------------------------------
// VRMAvatar
// ---------------------------------------------------------------------------
export class VRMAvatar {
  /**
   * Constructs a new VRMAvatar.
   * @param {object} [opts={}] Initialization options.
   * @param {number} [opts.blinkIntervalMin=3] Seconds between blinks (min).
   * @param {number} [opts.blinkIntervalMax=6] Seconds between blinks (max).
   */
  constructor(opts = {}) {
    /** The root Three.js object to add to the scene. */
    this.root = new THREE.Object3D();

    /** Loaded VRM instance, set after load(). */
    this.vrm = null;

    /** AnimationMixer for the VRM skeleton. */
    this.mixer = null;

    /** Currently active AnimationAction. */
    this._currentAction = null;

    /** Map of clip name → AnimationAction. */
    this._actions = {};

    // Blink state
    this._blinkIntervalMin = opts.blinkIntervalMin ?? 3;
    this._blinkIntervalMax = opts.blinkIntervalMax ?? 6;
    this._nextBlinkAt = this._randomBlinkDelay();
    this._blinkTimer = 0;
    this._blinking = false;
    this._blinkPhase = 0; // 0 = closing, 1 = opening
  }

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  /**
   * Loads a VRM model from a URL. Must be called before update().
   * @param {string} vrmUrl The URL to the VRM file.
   * @returns {Promise<void>}
   */
  async load(vrmUrl) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const gltf = await loader.loadAsync(vrmUrl);
    const vrm = gltf.userData.vrm;

    if (!vrm) {
      throw new Error('VRMLoaderPlugin did not find a VRM in the loaded file.');
    }

    this.vrm = vrm;

    vrm.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.frustumCulled = false;
        obj.castShadow = false;
        obj.receiveShadow = false;
      }
    });

    this.mixer = new THREE.AnimationMixer(vrm.scene);
    this.root.add(vrm.scene);

    console.log('[VRMAvatar] VRM loaded:', vrmUrl);
  }

  /**
   * Loads a Mixamo FBX, retargets it onto the VRM skeleton, and registers it
   * as a named action. Call after load().
   * @param {string} name Logical name, e.g., 'idle' or 'walk'.
   * @param {string} fbxUrl URL to the Mixamo .fbx file.
   * @returns {Promise<void>}
   */
  async loadMixamoAnimation(name, fbxUrl) {
    if (!this.vrm) throw new Error('Call load() before loadMixamoAnimation().');

    const fbxLoader = new FBXLoader();
    const fbxScene = await fbxLoader.loadAsync(fbxUrl);

    if (!fbxScene.animations || fbxScene.animations.length === 0) {
      throw new Error(`No animations found in FBX: ${fbxUrl}`);
    }

    const rawClip = fbxScene.animations[0];
    const retargeted = retargetMixamoClip(rawClip, fbxScene, this.vrm);
    const action = this.mixer.clipAction(retargeted);

    this._actions[name] = action;
    console.log(`[VRMAvatar] Animation '${name}' loaded and retargeted.`);
  }

  // -------------------------------------------------------------------------
  // Playback
  // -------------------------------------------------------------------------

  /**
   * Crossfades to a named animation.
   * @param {string} name Clip name registered via loadMixamoAnimation.
   * @param {number} [fadeDuration=0.3] Duration of the fade in seconds.
   * @returns {void}
   */
  play(name, fadeDuration = 0.3) {
    const next = this._actions[name];
    if (!next) {
      console.warn(`[VRMAvatar] Unknown animation: '${name}'`);
      return;
    }
    if (this._currentAction === next) return;

    next.reset().setEffectiveWeight(1).play();

    if (this._currentAction) {
      this._currentAction.crossFadeTo(next, fadeDuration, true);
    }

    this._currentAction = next;
  }

  // -------------------------------------------------------------------------
  // Per-frame update
  // -------------------------------------------------------------------------

  /**
   * Must be called every frame. Advances the mixer and spring bones.
   * @param {number} delta Time since last frame in seconds.
   * @returns {void}
   */
  update(delta) {
    if (!this.vrm) return;

    this.mixer?.update(delta);
    this._updateBlink(delta);

    this.vrm.update(delta);
  }
  // -------------------------------------------------------------------------
  // Expression helpers
  // -------------------------------------------------------------------------

  /**
   * Sets a VRM expression by name (e.g., 'blink', 'happy', 'angry').
   * @param {string} name Expression name.
   * @param {number} weight Weight value from 0.0 to 1.0.
   * @returns {void}
   */
  setExpression(name, weight) {
    this.vrm?.expressionManager?.setValue(name, weight);
  }

  _randomBlinkDelay() {
    return (
      this._blinkIntervalMin +
      Math.random() * (this._blinkIntervalMax - this._blinkIntervalMin)
    );
  }

  _updateBlink(delta) {
    if (!this.vrm?.expressionManager) return;

    this._blinkTimer += delta;

    if (!this._blinking) {
      if (this._blinkTimer >= this._nextBlinkAt) {
        this._blinking = true;
        this._blinkPhase = 0;
        this._blinkTimer = 0;
      }
      return;
    }

    const CLOSE_DURATION = 0.06; // seconds to fully close
    const OPEN_DURATION = 0.1; // seconds to fully open

    if (this._blinkPhase === 0) {
      const t = Math.min(this._blinkTimer / CLOSE_DURATION, 1);
      this.setExpression('blink', t);
      if (t >= 1) {
        this._blinkPhase = 1;
        this._blinkTimer = 0;
      }
    } else {
      const t = Math.min(this._blinkTimer / OPEN_DURATION, 1);
      this.setExpression('blink', 1 - t);
      if (t >= 1) {
        this._blinking = false;
        this._blinkTimer = 0;
        this._nextBlinkAt = this._randomBlinkDelay();
      }
    }
  }
}
