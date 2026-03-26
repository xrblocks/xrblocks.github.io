import * as THREE from 'three';
import * as xb from 'xrblocks';
import {ANIMAL_MODELS} from './animal_models.js';
import {AnimalSlider} from './animal_slider.js';
import {WeaponToolUI} from './weapon_tool_ui.js';
import {InteractionUtils} from './interaction_utils.js';
import {AudioManager} from './audio_manager.js';
import {ParticleSystem} from './particle_system.js';
import {WeaponEffects} from './weapon_effects.js';
import {AnimalBehavior} from './animal_behavior.js';
import {randInt} from './math_utils.js';

const HIDDEN_Y_POSITION = -100;
const ACTIVE_Y_THRESHOLD = -50;
const DEFAULT_DRAG_DISTANCE = 1.0;

const LIGHT_HEMISPHERE_SKY = 0xbbbbbb;
const LIGHT_HEMISPHERE_GROUND = 0x888888;
const LIGHT_HEMISPHERE_INTENSITY = 3;
const LIGHT_DIR_COLOR = 0xffffff;
const LIGHT_DIR_INTENSITY = 2;
const LIGHT_DIR_POS_Y = 500;
const LIGHT_DIR_POS_Z = -10;
const SHADOW_MAP_SIZE = 2048;

const RAIN_DROP_INTERVAL_INITIAL = 0.05;
const RAIN_DROP_INTERVAL_NORMAL = 1.5;

const SPAWN_OFFSET_FORWARD = 7.0;
const SPAWN_OFFSET_RIGHT_SPREAD = 10.0;
const SPAWN_OFFSET_FORWARD_SPREAD = 3.0;
const SPAWN_HEIGHT_BASE = 4.0;
const SPAWN_HEIGHT_SPREAD = 3.0;

const MS_TO_SEC_MULTIPLIER = 0.001;

/**
 * Reusable vectors for intermediate math calculations during frame updates.
 * Multiple vectors are required to avoid overwriting values during chained operations
 * (e.g., cross products or interpolations) without allocating new memory and causing GC stutter.
 */
const sharedVectorA = new THREE.Vector3();
const sharedVectorB = new THREE.Vector3();
const sharedVectorC = new THREE.Vector3();
const sharedVectorD = new THREE.Vector3();

/** Configuration structure for defining spawnable animal entities. */
export interface AnimalModel {
  img: string;
  file: string;
  path: string;
  scale: number;
  rotY: number;
  tint?: number;
  talking: boolean;
}

/** Main scene controller for the Animal Attack interactive application. */
export class AnimalOcclusionScene extends xb.Script {
  public pointer = new THREE.Vector2();
  public raycaster = new THREE.Raycaster();
  public spawnedAnimals: Map<number, THREE.Object3D> = new Map();
  public mixers: THREE.AnimationMixer[] = [];
  public draggedAnimal: THREE.Object3D | null = null;
  public isDragging = false;
  public dragSource: THREE.Object3D | string | null = null;
  public dragDistance = DEFAULT_DRAG_DISTANCE;
  public weaponsEnabled = false;
  public rainActive = true;
  public rainTimer = 0;
  public firstRainDropPending = true;
  public particleSystem = new ParticleSystem(this);
  public sliderUI!: AnimalSlider;
  public weaponUI!: WeaponToolUI;

  public async init() {
    this.addLights();
    xb.showReticleOnDepthMesh(true);

    this.sliderUI = new AnimalSlider(
      this,
      ANIMAL_MODELS as unknown as AnimalModel[]
    );
    this.weaponUI = new WeaponToolUI(
      this,
      (enabled: boolean) => {
        this.weaponsEnabled = enabled;
      },
      (rainActive: boolean) => {
        this.rainActive = rainActive;
        if (this.rainActive) {
          this.firstRainDropPending = true;
        } else {
          this.explodeAllAnimals();
        }
      }
    );

    this.setupSimulatorEvents();
    this.preloadAllAnimals();
  }

  /** Initializes and loads all animal 3D models hidden from view. */
  public preloadAllAnimals() {
    let globalId = 0;
    for (const [typeIndex, animalData] of ANIMAL_MODELS.entries()) {
      const modelViewer = new xb.ModelViewer({
        castShadow: true,
        receiveShadow: true,
      });
      // @ts-expect-error - Accessing private property to drastically improve raycast performance
      modelViewer.raycastToChildren = false;
      modelViewer.layers.enable(xb.OCCLUDABLE_ITEMS_LAYER);
      modelViewer.userData = {animalIndex: globalId, typeIndex};
      modelViewer.position.set(0, HIDDEN_Y_POSITION, 0);

      this.add(modelViewer);
      this.spawnedAnimals.set(globalId, modelViewer);
      this.loadAnimalGLTF(
        modelViewer,
        globalId,
        animalData as unknown as AnimalModel
      );
      globalId++;
    }
  }

  /** Adds directional and hemisphere lighting to the scene. */
  public addLights() {
    this.add(
      new THREE.HemisphereLight(
        LIGHT_HEMISPHERE_SKY,
        LIGHT_HEMISPHERE_GROUND,
        LIGHT_HEMISPHERE_INTENSITY
      )
    );
    const light = new THREE.DirectionalLight(
      LIGHT_DIR_COLOR,
      LIGHT_DIR_INTENSITY
    );
    light.position.set(0, LIGHT_DIR_POS_Y, LIGHT_DIR_POS_Z);
    light.castShadow = true;
    light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    this.add(light);
  }

  /** Initiates the drag interaction for a specific animal. */
  public startDraggingAnimal(index: number, startPosition: THREE.Vector3) {
    this.draggedAnimal = this.spawnedAnimals.get(index) ?? null;
    this.isDragging = true;

    if (this.draggedAnimal) {
      this.draggedAnimal.userData.hasTarget = false;
      this.draggedAnimal.userData.spawnSource = 'manual';
      if (startPosition) this.draggedAnimal.position.copy(startPosition);
    }
  }

  /** Asynchronously loads a GLTF model and configures its animations and materials. */
  public async loadAnimalGLTF(
    modelViewer: xb.ModelViewer,
    _index: number,
    animalData: AnimalModel
  ) {
    try {
      const {scale: s, rotY, path, file, tint} = animalData;
      await modelViewer.loadGLTFModel({
        data: {
          scale: {x: s, y: s, z: s},
          rotation: {x: 0, y: rotY, z: 0},
          path,
          model: file,
        },
        setupRaycastBox: true,
        renderer: xb.core.renderer,
        onSceneLoaded: (scene: THREE.Object3D) => {
          const mv = modelViewer as xb.ModelViewer & {
            gltf?: {animations: THREE.AnimationClip[]};
          };
          const anim = mv.gltf?.animations?.[0];
          if (anim) {
            const mixer = new THREE.AnimationMixer(scene);
            mixer.clipAction(anim).play();
            this.mixers.push(mixer);
          }
        },
      });

      modelViewer.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.layers.enable(xb.OCCLUDABLE_ITEMS_LAYER);
          if (tint) {
            if (Array.isArray(mesh.material)) {
              mesh.material = mesh.material.map((mat) => {
                const newMat = mat.clone() as THREE.MeshBasicMaterial;
                newMat.color.setHex(tint);
                return newMat;
              });
            } else if (mesh.material) {
              mesh.material = mesh.material.clone();
              (mesh.material as THREE.MeshBasicMaterial).color.setHex(tint);
            }
          }
        }
      });
    } catch (e) {
      console.error('Failed to load animal:', e);
    }
  }

  /** Releases the currently dragged animal, establishing its new anchor position. */
  public dropAnimal(raycaster: THREE.Raycaster) {
    if (!this.draggedAnimal) return;

    const paletteHit = InteractionUtils.checkIntersection(
      raycaster,
      this.sliderUI.getPaletteItems(),
      this.spawnedAnimals
    );
    if (
      (paletteHit?.object.userData as Record<string, unknown>)?.isPaletteItem
    ) {
      this.destroyAnimal(this.draggedAnimal.userData.animalIndex as number);
      return;
    }

    if (xb.core.camera) {
      const target = xb.core.camera.position.clone();
      target.y = this.draggedAnimal.position.y;
      this.draggedAnimal.lookAt(target);
    }

    this.draggedAnimal.userData.anchorPosition ??= new THREE.Vector3();
    this.draggedAnimal.userData.anchorPosition.copy(
      this.draggedAnimal.position
    );
    this.draggedAnimal.userData.homeAnchor =
      this.draggedAnimal.position.clone();

    this.isDragging = false;
    this.draggedAnimal = null;
    this.dragSource = null;
  }

  /** Executes a weapon attack from the given source point along the raycaster path. */
  public fireWeapon(
    aimingRaycaster: THREE.Raycaster,
    visualSourcePoint: THREE.Vector3
  ) {
    const types = ['laser', 'ball', 'fire', 'tornado'];
    const actualWeaponType = types[randInt(types.length)];

    const {hitAnimalId, isEnvHit, point} = InteractionUtils.getWeaponEndPoint(
      aimingRaycaster,
      this.spawnedAnimals,
      xb.core.depth?.depthMesh
    );
    if (hitAnimalId !== undefined) {
      this.destroyAnimal(hitAnimalId);
    } else if (isEnvHit && point) {
      this.particleSystem.spawnSparks(point);
    }

    if (point) {
      WeaponEffects.show(visualSourcePoint, point, this, actualWeaponType);
    }
  }

  /** Triggers the explosion effect and hides the specified animal. */
  public destroyAnimal(index: number) {
    const modelViewer = this.spawnedAnimals.get(index);
    if (modelViewer && modelViewer.position.y > ACTIVE_Y_THRESHOLD) {
      this.particleSystem.spawnExplosion(modelViewer.position.clone());
      AudioManager.playExplosionSound();

      modelViewer.position.set(0, HIDDEN_Y_POSITION, 0);
      modelViewer.userData.hasTarget = false;

      if (this.draggedAnimal === modelViewer) {
        this.isDragging = false;
        this.draggedAnimal = null;
        this.dragSource = null;
      }
    }
  }

  /** Explodes all currently active animals in the scene. */
  public explodeAllAnimals() {
    for (const [index, animal] of this.spawnedAnimals.entries()) {
      if (animal.position.y > ACTIVE_Y_THRESHOLD) this.destroyAnimal(index);
    }
  }

  /** Binds necessary DOM events for desktop simulation. */
  public setupSimulatorEvents() {
    window.addEventListener(
      'pointerdown',
      this.onPointerDown.bind(this) as EventListener,
      {capture: true}
    );
    window.addEventListener(
      'pointermove',
      this.onPointerMove.bind(this) as EventListener,
      {capture: true}
    );
    window.addEventListener(
      'pointerup',
      this.onPointerUp.bind(this) as EventListener,
      {capture: true}
    );
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Computes the normalized device coordinates of the mouse pointer. */
  public updatePointer(event: MouseEvent) {
    if (event.clientX === undefined || event.clientY === undefined)
      return false;
    this.pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    return true;
  }

  /** Evaluates raycaster intersections against UI elements. */
  private handleUIHits(raycaster: THREE.Raycaster, event: Event | null) {
    const uiHits = raycaster.intersectObjects(
      [...this.sliderUI.getHitboxes(), ...this.weaponUI.getHitboxes()],
      true
    );

    const isPaletteHit = uiHits.some((hit) => {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData?.isPaletteItem) return true;
        obj = obj.parent;
      }
      return false;
    });

    const isUIHit = uiHits.length > 0;
    const handled = isUIHit && !isPaletteHit;

    if (handled) {
      // Let the native xb.UI handle the button triggers natively if possible, but also intercept custom trigger events on explicit bgMeshes.
      const interactiveHit = uiHits.find(
        (hit) => typeof hit.object.userData?.onTrigger === 'function'
      );
      if (interactiveHit) {
        interactiveHit.object.userData.onTrigger();
        event?.stopPropagation();
      }
    }

    return {handled, isPaletteHit};
  }

  /** Processes the start of a user interaction, handling UI clicks, weapons, or dragging. */
  public handleInteractionStart(
    raycaster: THREE.Raycaster,
    sourceObject: THREE.Object3D | string,
    event: Event | null
  ) {
    const {handled, isPaletteHit} = this.handleUIHits(raycaster, event);
    if (handled) return;

    event?.stopPropagation();

    if (this.weaponsEnabled && !isPaletteHit) {
      const visualOrigin = sharedVectorA;
      visualOrigin.set(0, 0, 0);
      if (sourceObject === 'desktop') {
        this.weaponUI.getSourceIcon().updateWorldMatrix(true, false);
        this.weaponUI.getSourceIcon().getWorldPosition(visualOrigin);
      } else if (sourceObject instanceof THREE.Object3D) {
        visualOrigin.setFromMatrixPosition(sourceObject.matrixWorld);
      }
      this.fireWeapon(raycaster, visualOrigin);
      return;
    }

    if (this.isDragging) return;

    const hit = InteractionUtils.checkIntersection(
      raycaster,
      this.sliderUI.getPaletteItems(),
      this.spawnedAnimals
    );
    if (!hit) return;

    this.dragSource = sourceObject;

    const origin =
      sourceObject === 'desktop'
        ? (xb.core.camera?.position ?? sharedVectorB.set(0, 0, 0))
        : sharedVectorB.setFromMatrixPosition(
            (sourceObject as THREE.Object3D).matrixWorld
          );

    this.dragDistance = hit.point.distanceTo(origin);

    const targetId = (hit.object.userData as Record<string, unknown>)
      ?.isPaletteItem
      ? this.getAvailableAnimalFromPalette(
          hit.object.userData.animalIndex as number
        )
      : hit.object.userData.animalIndex;

    this.startDraggingAnimal(targetId, hit.point);
  }

  /** Finds a hidden, available animal instance matching the requested type index. */
  private getAvailableAnimalFromPalette(typeIndex: number) {
    const pool = [...this.spawnedAnimals.entries()].filter(
      ([, a]) => a.userData.typeIndex === typeIndex
    );
    for (const [, a] of pool) {
      a.position.set(0, HIDDEN_Y_POSITION, 0);
      a.userData.hasTarget = false;
    }
    return pool[0][0];
  }

  /** Mouse down event handler for desktop interaction. */
  public onPointerDown(event: MouseEvent) {
    if (xb.core.renderer?.xr?.isPresenting) return;
    if (!xb.core.camera || !this.updatePointer(event)) return;
    this.raycaster.setFromCamera(this.pointer, xb.core.camera);
    this.handleInteractionStart(this.raycaster, 'desktop', event);
  }

  /** Mouse move event handler for tracking drag movement on desktop. */
  public onPointerMove(event: MouseEvent) {
    if (xb.core.renderer?.xr?.isPresenting) return;
    if (this.isDragging) this.updatePointer(event);
  }

  /** Mouse up event handler to conclude a desktop drag operation. */
  public onPointerUp(event: MouseEvent) {
    if (xb.core.renderer?.xr?.isPresenting) return;
    if (event.button === 0 && this.isDragging) {
      if (xb.core.camera) {
        this.updatePointer(event);
        this.raycaster.setFromCamera(this.pointer, xb.core.camera);
      }
      this.dropAnimal(this.raycaster);
    }
  }

  /** XR controller select start handler for grabbing or interacting. */
  public onSelectStart(event: Event & {target?: THREE.Object3D}) {
    const controller = event.target;
    if (controller) {
      controller.updateMatrixWorld(true);
      InteractionUtils.setRaycasterFromXRController(this.raycaster, controller);
      this.handleInteractionStart(this.raycaster, controller, null);
    }
  }

  /** XR controller select end handler for releasing objects. */
  public onSelectEnd(event: Event & {target?: THREE.Object3D}) {
    if (this.dragSource === event.target && event.target) {
      event.target.updateMatrixWorld(true);
      InteractionUtils.setRaycasterFromXRController(
        this.raycaster,
        event.target
      );
      this.dropAnimal(this.raycaster);
    }
  }

  /** Drops a new animal from the sky near the user's location. */
  public spawnRainAnimal() {
    const available = [...this.spawnedAnimals.entries()]
      .filter(([, a]) => a.position.y <= ACTIVE_Y_THRESHOLD)
      .map(([index]) => index);

    if (available.length > 0) {
      const index = available[randInt(available.length)];
      const animal = this.spawnedAnimals.get(index);

      if (animal) {
        sharedVectorA.set(0, SPAWN_HEIGHT_BASE, -2);
        if (xb.core.camera) {
          sharedVectorB
            .set(0, 0, -1)
            .applyQuaternion(xb.core.camera.quaternion)
            .setY(0)
            .normalize();
          sharedVectorC.set(0, 1, 0);
          sharedVectorD.crossVectors(sharedVectorB, sharedVectorC).normalize();

          sharedVectorA
            .copy(xb.core.camera.position)
            .addScaledVector(sharedVectorB, SPAWN_OFFSET_FORWARD)
            .addScaledVector(
              sharedVectorD,
              (Math.random() - 0.5) * SPAWN_OFFSET_RIGHT_SPREAD
            )
            .addScaledVector(
              sharedVectorB,
              (Math.random() - 0.5) * SPAWN_OFFSET_FORWARD_SPREAD
            );
          sharedVectorA.y +=
            SPAWN_HEIGHT_BASE + Math.random() * SPAWN_HEIGHT_SPREAD;
        }

        animal.position.copy(sharedVectorA);
        Object.assign(animal.userData, {
          isFalling: true,
          hasTarget: false,
          spawnSource: 'rain',
        });

        if (!animal.userData.homeAnchor) {
          animal.userData.homeAnchor = new THREE.Vector3();
        }
        if (xb.core.camera) {
          animal.userData.homeAnchor.copy(xb.core.camera.position).setY(0);
        } else {
          animal.userData.homeAnchor.set(0, 0, 0);
        }
      }
    }
  }

  /** Main frame loop for ticking logic, animations, and particle systems. */
  public update() {
    try {
      const deltaTime = xb.getDeltaTime();
      const time = performance.now() * MS_TO_SEC_MULTIPLIER;

      if (this.rainActive) {
        this.rainTimer = (this.rainTimer || 0) + deltaTime;
        const dropInterval = this.firstRainDropPending
          ? RAIN_DROP_INTERVAL_INITIAL
          : RAIN_DROP_INTERVAL_NORMAL;
        if (this.rainTimer > dropInterval) {
          this.rainTimer = 0;
          this.firstRainDropPending = false;
          this.spawnRainAnimal();
        }
      } else {
        this.firstRainDropPending = true;
      }

      for (const mixer of this.mixers) mixer.update(deltaTime);
      this.particleSystem.update(deltaTime);

      const {camera, depth} = xb.core;

      AnimalBehavior.updateFalling(
        this.spawnedAnimals,
        depth?.depthMesh,
        this.particleSystem,
        camera,
        deltaTime,
        this.draggedAnimal
      );
      AnimalBehavior.updateDragTransform(
        this.isDragging,
        this.draggedAnimal,
        this.dragSource,
        this.raycaster,
        this.pointer,
        camera,
        depth?.depthMesh,
        this.dragDistance
      );
      AnimalBehavior.updateWandering(
        this.spawnedAnimals,
        depth?.depthMesh,
        deltaTime,
        time,
        this.draggedAnimal,
        camera
      );
      AnimalBehavior.updateBreathing(
        this.spawnedAnimals,
        time,
        ANIMAL_MODELS as unknown as AnimalModel[],
        this.isDragging,
        camera
      );
    } catch (e) {
      console.error('Safely caught loop error to prevent crash: ', e);
    }
  }
}
