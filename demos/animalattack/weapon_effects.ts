import * as THREE from 'three';
import {AudioManager} from './audio_manager.js';
import {randInt} from './math_utils.js';

const MIN_FIRE_DISTANCE = 0.01;
const FIRE_EXTEND_MULTIPLIER = 3;
const FIRE_EXTEND_MIN = 30;

const LASER_CYLINDER_SEGMENTS = 12;
const LASER_CORE_RADIUS = 0.005;
const LASER_CORE_COLOR = 0xffffff;
const LASER_CORE_OPACITY = 1.0;
const LASER_INNER_RADIUS = 0.02;
const LASER_INNER_COLOR = 0xffff00;
const LASER_INNER_OPACITY = 0.8;
const LASER_OUTER_RADIUS = 0.06;
const LASER_OUTER_COLOR = 0xff0000;
const LASER_OUTER_OPACITY = 0.5;

const BALL_PARTICLE_COUNT = 10;
const BALL_GLOW_RADIUS = 0.12;
const BALL_GLOW_SEGMENTS = 16;
const BALL_GLOW_OPACITY = 0.8;
const BALL_CORE_RADIUS = 0.05;
const BALL_CORE_SEGMENTS = 16;
const BALL_CORE_COLOR = 0xffffff;
const BALL_CORE_OPACITY = 1.0;
const BALL_SPEED = 25.0;

const FIRE_PARTICLE_COUNT = 450;
const FIRE_COLORS = [0xff2200, 0xff6600, 0xffaa00, 0xffffff];
const FIRE_OPACITY = 0.9;
const FIRE_MIN_RADIUS = 0.12;
const FIRE_MAX_RADIUS = 0.35;
const FIRE_SPEED = 18.0;
const FIRE_SPREAD_MULTIPLIER = 5.0;
const FIRE_ROT_SPREAD = 0.8;

const TORNADO_PARTICLE_COUNT = 750;
const TORNADO_COLORS = [0x00ffff, 0x0088ff, 0xffffff, 0x8800ff];
const TORNADO_OPACITY = 0.8;
const TORNADO_MIN_SIZE = 0.06;
const TORNADO_MAX_SIZE = 0.25;
const TORNADO_MIN_SPEED = 20.0;
const TORNADO_MAX_SPEED = 28.0;
const TORNADO_RADIUS_MULTIPLIER = 4.0;
const TORNADO_RADIUS_MAX = 1.2;
const TORNADO_RADIUS_BASE = 0.1;
const TORNADO_ROT_SPREAD = 1.2;

const ANIMATION_FPS = 30;
const LASER_FADE_SPEED = 0.1;
const TORNADO_FADE_SPEED = 0.005;
const DEFAULT_FADE_SPEED = 0.01;
const FIRE_RISE_SPEED = 0.8;
const FIRE_SCALE_SHRINK = 0.92;
const FIRE_POS_JITTER = 0.05;
const MS_PER_SEC = 1000;

const LASER_CYLINDER_GEO = new THREE.CylinderGeometry(
  1,
  1,
  1,
  LASER_CYLINDER_SEGMENTS
).rotateX(Math.PI / 2);
const BALL_GLOW_GEO = new THREE.SphereGeometry(
  1,
  BALL_GLOW_SEGMENTS,
  BALL_GLOW_SEGMENTS
);
const BALL_CORE_GEO = new THREE.SphereGeometry(
  1,
  BALL_CORE_SEGMENTS,
  BALL_CORE_SEGMENTS
);
const FIRE_PARTICLE_GEO = new THREE.DodecahedronGeometry(1, 0);
const TORNADO_PARTICLE_GEO = new THREE.BoxGeometry(1, 1, 1);

const TORNADO_COLOR_OBJS = TORNADO_COLORS.map((c) => new THREE.Color(c));
const FIRE_COLOR_OBJS = FIRE_COLORS.map((c) => new THREE.Color(c));
const BALL_COLOR_POOL = Array.from({length: 50}, () =>
  new THREE.Color().setHSL(Math.random(), 1.0, 0.5)
);

const BASE_LASER_CORE_MAT = new THREE.MeshBasicMaterial({
  color: LASER_CORE_COLOR,
  opacity: LASER_CORE_OPACITY,
  depthWrite: true,
  transparent: true,
});
const BASE_LASER_GLOW_MAT = new THREE.MeshBasicMaterial({
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const BASE_BALL_GLOW_MAT = new THREE.MeshBasicMaterial({
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const BASE_BALL_CORE_MAT = new THREE.MeshBasicMaterial({
  color: BALL_CORE_COLOR,
  transparent: true,
  opacity: BALL_CORE_OPACITY,
});
const BASE_FIRE_MAT = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: FIRE_OPACITY,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const BASE_TORNADO_MAT = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: TORNADO_OPACITY,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

/** Reusable object used to compute matrix transformations for InstancedMesh without garbage collection overhead. */
const sharedObject = new THREE.Object3D();

/** Reusable vector used for intermediate math calculations without garbage collection overhead. */
const sharedVector = new THREE.Vector3();
const updatedMeshes = new Set<THREE.InstancedMesh>();

/** Defines parameters for gradually fading out an effect material. */
export interface FadeItem {
  mat: THREE.Material;
  maxOpacity: number;
}

/** Represents the state of a generic animated effect instance. */
export interface BaseAnimatedInstance {
  type: 'base';
  mesh: THREE.InstancedMesh;
  index: number;
  pos: THREE.Vector3;
  speed: number;
  dir: THREE.Vector3;
  scale: number;
}

/** Represents the state of an animated ball projectile instance. */
export interface BallAnimatedInstance {
  type: 'ball';
  glowMesh: THREE.InstancedMesh;
  coreMesh: THREE.InstancedMesh;
  index: number;
  pos: THREE.Vector3;
  speed: number;
  dir: THREE.Vector3;
}

/** Represents the state of an animated fire particle instance. */
export interface FireAnimatedInstance {
  type: 'fire';
  mesh: THREE.InstancedMesh;
  index: number;
  pos: THREE.Vector3;
  scale: number;
  rot: THREE.Vector3;
  speed: number;
  dir: THREE.Vector3;
  rotSpeed: THREE.Vector3;
}

/** Represents the state of an animated tornado particle instance. */
export interface TornadoAnimatedInstance {
  type: 'tornado';
  mesh: THREE.InstancedMesh;
  index: number;
  rot: THREE.Vector3;
  size: number;
  speed: number;
  dir: THREE.Vector3;
  centerPos: THREE.Vector3;
  right: THREE.Vector3;
  upDir: THREE.Vector3;
  jitter: number;
  rotSpeed: THREE.Vector3;
  angle: number;
  radius: number;
  spinSpeed: number;
}

/** Union type covering all possible animated weapon instances. */
export type AnimatedInstance =
  | BaseAnimatedInstance
  | BallAnimatedInstance
  | FireAnimatedInstance
  | TornadoAnimatedInstance;

/** Manages the creation and animation of 3D weapon visual effects. */
export class WeaponEffects {
  /** Renders the requested weapon effect between two points in space. */
  public static show(
    start: THREE.Vector3,
    end: THREE.Vector3,
    scene: THREE.Object3D,
    weaponType: string
  ) {
    AudioManager.playZapSound();
    const distance = start.distanceTo(end);
    if (distance < MIN_FIRE_DISTANCE) return;

    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const weaponGroup = new THREE.Group();
    scene.add(weaponGroup);

    const meshesToFade: FadeItem[] = [];
    const animatedMeshes: AnimatedInstance[] = [];

    switch (weaponType) {
      case 'laser':
        this.createLaser(start, end, distance, weaponGroup, meshesToFade);
        break;
      case 'ball':
        this.createBall(
          start,
          end,
          direction,
          weaponGroup,
          meshesToFade,
          animatedMeshes
        );
        break;
      case 'fire':
        this.createFire(
          start,
          end,
          direction,
          weaponGroup,
          meshesToFade,
          animatedMeshes
        );
        break;
      case 'tornado':
        this.createTornado(
          start,
          end,
          direction,
          weaponGroup,
          meshesToFade,
          animatedMeshes
        );
        break;
    }

    this.animateEffect(
      scene,
      weaponGroup,
      meshesToFade,
      animatedMeshes,
      weaponType
    );
  }

  /** Builds a laser beam composed of a core and glowing outer layers. */
  public static createLaser(
    start: THREE.Vector3,
    end: THREE.Vector3,
    distance: number,
    weaponGroup: THREE.Group,
    meshesToFade: FadeItem[]
  ) {
    const midPoint = start.clone().lerp(end, 0.5);
    const laserLineGroup = new THREE.Group();
    laserLineGroup.position.copy(midPoint);
    laserLineGroup.lookAt(end);

    const createCylinder = (
      radius: number,
      baseMat: THREE.Material,
      color: number,
      opacity: number
    ) => {
      const mat = baseMat.clone() as THREE.MeshBasicMaterial;
      if (color !== 0xffffff) mat.color.setHex(color);
      mat.opacity = opacity;
      const mesh = new THREE.Mesh(LASER_CYLINDER_GEO, mat);
      mesh.scale.set(radius, radius, distance);
      mesh.frustumCulled = false;
      meshesToFade.push({mat, maxOpacity: opacity});
      return mesh;
    };

    const core = createCylinder(
      LASER_CORE_RADIUS,
      BASE_LASER_CORE_MAT,
      LASER_CORE_COLOR,
      LASER_CORE_OPACITY
    );
    const innerGlow = createCylinder(
      LASER_INNER_RADIUS,
      BASE_LASER_GLOW_MAT,
      LASER_INNER_COLOR,
      LASER_INNER_OPACITY
    );
    const outerGlow = createCylinder(
      LASER_OUTER_RADIUS,
      BASE_LASER_GLOW_MAT,
      LASER_OUTER_COLOR,
      LASER_OUTER_OPACITY
    );

    laserLineGroup.add(core, innerGlow, outerGlow);
    weaponGroup.add(laserLineGroup);
  }

  /** Instantiates a sequence of glowing ball projectiles. */
  public static createBall(
    start: THREE.Vector3,
    end: THREE.Vector3,
    direction: THREE.Vector3,
    weaponGroup: THREE.Group,
    meshesToFade: FadeItem[],
    animatedMeshes: AnimatedInstance[]
  ) {
    const glowMat = BASE_BALL_GLOW_MAT.clone() as THREE.MeshBasicMaterial;
    const coreMat = BASE_BALL_CORE_MAT.clone() as THREE.MeshBasicMaterial;

    const glowInstanced = new THREE.InstancedMesh(
      BALL_GLOW_GEO,
      glowMat,
      BALL_PARTICLE_COUNT
    );
    const coreInstanced = new THREE.InstancedMesh(
      BALL_CORE_GEO,
      coreMat,
      BALL_PARTICLE_COUNT
    );
    glowInstanced.frustumCulled = false;
    coreInstanced.frustumCulled = false;
    weaponGroup.add(glowInstanced);
    weaponGroup.add(coreInstanced);

    meshesToFade.push(
      {mat: glowMat, maxOpacity: BALL_GLOW_OPACITY},
      {mat: coreMat, maxOpacity: BALL_CORE_OPACITY}
    );

    for (let i = 0; i < BALL_PARTICLE_COUNT; i++) {
      const progress =
        BALL_PARTICLE_COUNT > 1 ? i / (BALL_PARTICLE_COUNT - 1) : 0;
      sharedVector.copy(start).lerp(end, progress);
      const randomColor = BALL_COLOR_POOL[i % BALL_COLOR_POOL.length];

      glowInstanced.setColorAt(i, randomColor);

      sharedObject.position.copy(sharedVector);
      sharedObject.scale.setScalar(BALL_GLOW_RADIUS);
      sharedObject.updateMatrix();
      glowInstanced.setMatrixAt(i, sharedObject.matrix);

      sharedObject.scale.setScalar(BALL_CORE_RADIUS);
      sharedObject.updateMatrix();
      coreInstanced.setMatrixAt(i, sharedObject.matrix);

      animatedMeshes.push({
        type: 'ball',
        glowMesh: glowInstanced,
        coreMesh: coreInstanced,
        index: i,
        pos: sharedVector.clone(),
        speed: BALL_SPEED,
        dir: direction,
      });
    }

    glowInstanced.instanceMatrix.needsUpdate = true;
    if (glowInstanced.instanceColor)
      glowInstanced.instanceColor.needsUpdate = true;
    coreInstanced.instanceMatrix.needsUpdate = true;
  }

  /** Creates a stream of particles that simulate a fiery burst. */
  public static createFire(
    start: THREE.Vector3,
    end: THREE.Vector3,
    direction: THREE.Vector3,
    weaponGroup: THREE.Group,
    meshesToFade: FadeItem[],
    animatedMeshes: AnimatedInstance[]
  ) {
    const fireExtend = Math.max(
      start.distanceTo(end) * FIRE_EXTEND_MULTIPLIER,
      FIRE_EXTEND_MIN
    );
    const extendedEnd = sharedVector
      .copy(start)
      .addScaledVector(direction, fireExtend);

    const fireMat = BASE_FIRE_MAT.clone() as THREE.MeshBasicMaterial;
    meshesToFade.push({mat: fireMat, maxOpacity: FIRE_OPACITY});

    const fireInstanced = new THREE.InstancedMesh(
      FIRE_PARTICLE_GEO,
      fireMat,
      FIRE_PARTICLE_COUNT
    );
    fireInstanced.frustumCulled = false;
    weaponGroup.add(fireInstanced);

    for (let i = 0; i < FIRE_PARTICLE_COUNT; i++) {
      const progress = Math.pow(Math.random(), 0.7);
      const spread = progress * FIRE_SPREAD_MULTIPLIER;

      const pos = new THREE.Vector3().copy(start).lerp(extendedEnd, progress);
      pos.x += THREE.MathUtils.randFloatSpread(spread);
      pos.y += THREE.MathUtils.randFloatSpread(spread);
      pos.z += THREE.MathUtils.randFloatSpread(spread);

      const scale = THREE.MathUtils.randFloat(FIRE_MIN_RADIUS, FIRE_MAX_RADIUS);

      sharedObject.position.copy(pos);
      sharedObject.scale.setScalar(scale);
      sharedObject.rotation.set(0, 0, 0);
      sharedObject.updateMatrix();
      fireInstanced.setMatrixAt(i, sharedObject.matrix);

      fireInstanced.setColorAt(
        i,
        FIRE_COLOR_OBJS[randInt(FIRE_COLOR_OBJS.length)]
      );

      animatedMeshes.push({
        type: 'fire',
        mesh: fireInstanced,
        index: i,
        pos,
        scale: scale,
        rot: new THREE.Vector3(0, 0, 0),
        speed: FIRE_SPEED,
        dir: direction,
        rotSpeed: new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(FIRE_ROT_SPREAD),
          THREE.MathUtils.randFloatSpread(FIRE_ROT_SPREAD),
          THREE.MathUtils.randFloatSpread(FIRE_ROT_SPREAD)
        ),
      });
    }

    fireInstanced.instanceMatrix.needsUpdate = true;
    if (fireInstanced.instanceColor)
      fireInstanced.instanceColor.needsUpdate = true;
  }

  /** Triggers a tornado effect, a swirling cluster of particles. */
  public static createTornado(
    start: THREE.Vector3,
    end: THREE.Vector3,
    direction: THREE.Vector3,
    weaponGroup: THREE.Group,
    meshesToFade: FadeItem[],
    animatedMeshes: AnimatedInstance[]
  ) {
    const fireExtend = Math.max(
      start.distanceTo(end) * FIRE_EXTEND_MULTIPLIER,
      FIRE_EXTEND_MIN
    );
    const extendedEnd = sharedVector
      .copy(start)
      .addScaledVector(direction, fireExtend);

    const up = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3().crossVectors(direction, up);
    if (right.lengthSq() < 0.001)
      right = new THREE.Vector3().crossVectors(
        direction,
        new THREE.Vector3(1, 0, 0)
      );
    right.normalize();

    const upDir = new THREE.Vector3()
      .crossVectors(right, direction)
      .normalize();

    const tornadoMat = BASE_TORNADO_MAT.clone() as THREE.MeshBasicMaterial;
    meshesToFade.push({mat: tornadoMat, maxOpacity: TORNADO_OPACITY});

    const tornadoInstanced = new THREE.InstancedMesh(
      TORNADO_PARTICLE_GEO,
      tornadoMat,
      TORNADO_PARTICLE_COUNT
    );
    tornadoInstanced.frustumCulled = false;
    weaponGroup.add(tornadoInstanced);

    for (let i = 0; i < TORNADO_PARTICLE_COUNT; i++) {
      const progress = i / TORNADO_PARTICLE_COUNT;
      const centerPos = new THREE.Vector3()
        .copy(start)
        .lerp(extendedEnd, progress);
      const size = THREE.MathUtils.randFloat(
        TORNADO_MIN_SIZE,
        TORNADO_MAX_SIZE
      );

      const radius =
        Math.min(progress * TORNADO_RADIUS_MULTIPLIER, TORNADO_RADIUS_MAX) +
        TORNADO_RADIUS_BASE;
      const angle = Math.random() * Math.PI * 2;
      const spinSpeed = THREE.MathUtils.randFloat(10.0, 20.0);

      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;

      sharedVector
        .copy(right)
        .multiplyScalar(offsetX)
        .addScaledVector(upDir, offsetY);

      sharedObject.position.copy(centerPos).add(sharedVector);
      sharedObject.scale.setScalar(size);
      sharedObject.rotation.set(0, 0, 0);
      sharedObject.updateMatrix();
      tornadoInstanced.setMatrixAt(i, sharedObject.matrix);

      tornadoInstanced.setColorAt(
        i,
        TORNADO_COLOR_OBJS[randInt(TORNADO_COLOR_OBJS.length)]
      );

      animatedMeshes.push({
        type: 'tornado',
        mesh: tornadoInstanced,
        index: i,
        speed: THREE.MathUtils.randFloat(TORNADO_MIN_SPEED, TORNADO_MAX_SPEED),
        dir: direction,
        centerPos,
        right,
        upDir,
        jitter: radius * 0.1,
        rotSpeed: new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(TORNADO_ROT_SPREAD),
          THREE.MathUtils.randFloatSpread(TORNADO_ROT_SPREAD),
          THREE.MathUtils.randFloatSpread(TORNADO_ROT_SPREAD)
        ),
        angle,
        radius,
        spinSpeed,
        size,
        rot: new THREE.Vector3(0, 0, 0),
      });
    }

    tornadoInstanced.instanceMatrix.needsUpdate = true;
    if (tornadoInstanced.instanceColor)
      tornadoInstanced.instanceColor.needsUpdate = true;
  }

  /** Sets up the animation loop for the given weapon effect. */
  public static animateEffect(
    scene: THREE.Object3D,
    weaponGroup: THREE.Group,
    meshesToFade: FadeItem[],
    animatedMeshes: AnimatedInstance[],
    weaponType: string
  ) {
    let opacity = 1.0;
    const fadeSpeed =
      weaponType === 'laser'
        ? LASER_FADE_SPEED
        : weaponType === 'tornado'
          ? TORNADO_FADE_SPEED
          : DEFAULT_FADE_SPEED;

    const fadeInterval = setInterval(() => {
      opacity -= fadeSpeed;
      if (opacity <= 0) {
        clearInterval(fadeInterval);
        this.cleanupGroup(scene, weaponGroup);
      } else {
        this.updateFades(meshesToFade, opacity);
        this.updateAnimations(animatedMeshes, ANIMATION_FPS);
      }
    }, ANIMATION_FPS);
  }

  /** Clears the effect objects from the scene once they finish animating. */
  private static cleanupGroup(scene: THREE.Object3D, group: THREE.Group) {
    scene.remove(group);
    group.traverse((child: THREE.Object3D) => {
      if ((child as THREE.InstancedMesh).dispose) {
        (child as THREE.InstancedMesh).dispose();
      }
    });
  }

  /** Adjusts the opacity of fading materials. */
  private static updateFades(meshesToFade: FadeItem[], opacity: number) {
    for (const {mat, maxOpacity} of meshesToFade) {
      mat.opacity = opacity * maxOpacity;
      mat.transparent = true;
    }
  }

  /** Runs the tick logic for each active animated instance. */
  private static updateAnimations(
    animatedMeshes: AnimatedInstance[],
    fps: number
  ) {
    updatedMeshes.clear();

    for (const item of animatedMeshes) {
      if (item.type === 'tornado') {
        this.animateTornadoItem(item, fps);
        updatedMeshes.add(item.mesh);
      } else if (item.type === 'fire') {
        this.animateFireItem(item, fps);
        updatedMeshes.add(item.mesh);
      } else if (item.type === 'ball') {
        this.animateBallItem(item, fps);
        updatedMeshes.add(item.glowMesh);
        updatedMeshes.add(item.coreMesh);
      } else {
        this.animateBaseItem(item, fps);
        updatedMeshes.add(item.mesh);
      }
    }

    for (const mesh of updatedMeshes) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Calculates the complex motion for a single tornado particle. */
  private static animateTornadoItem(
    item: TornadoAnimatedInstance,
    fps: number
  ) {
    const {
      centerPos,
      right,
      upDir,
      rotSpeed,
      dir,
      speed,
      radius,
      spinSpeed,
      jitter,
      size,
    } = item;

    centerPos.addScaledVector(dir, speed * (fps / MS_PER_SEC));
    item.angle += spinSpeed * (fps / MS_PER_SEC);

    const offsetX =
      Math.cos(item.angle) * radius + THREE.MathUtils.randFloatSpread(jitter);
    const offsetY =
      Math.sin(item.angle) * radius + THREE.MathUtils.randFloatSpread(jitter);

    sharedVector
      .copy(right)
      .multiplyScalar(offsetX)
      .addScaledVector(upDir, offsetY);

    item.rot.add(rotSpeed);

    sharedObject.position.copy(centerPos).add(sharedVector);
    sharedObject.rotation.setFromVector3(item.rot);
    sharedObject.scale.setScalar(size);
    sharedObject.updateMatrix();

    item.mesh.setMatrixAt(item.index, sharedObject.matrix);
  }

  /** Computes the upward and forward motion for a fire particle. */
  private static animateFireItem(item: FireAnimatedInstance, fps: number) {
    const {dir, speed, rotSpeed} = item;
    item.pos.addScaledVector(dir, speed * (fps / MS_PER_SEC));
    item.pos.x += THREE.MathUtils.randFloatSpread(FIRE_POS_JITTER);
    item.pos.z += THREE.MathUtils.randFloatSpread(FIRE_POS_JITTER);
    item.pos.y += FIRE_RISE_SPEED * (fps / MS_PER_SEC);

    item.rot.add(rotSpeed);
    item.scale *= FIRE_SCALE_SHRINK;

    sharedObject.position.copy(item.pos);
    sharedObject.rotation.setFromVector3(item.rot);
    sharedObject.scale.setScalar(item.scale);
    sharedObject.updateMatrix();

    item.mesh.setMatrixAt(item.index, sharedObject.matrix);
  }

  /** Progresses an animated ball projectile forward. */
  private static animateBallItem(item: BallAnimatedInstance, fps: number) {
    const {dir, speed} = item;
    item.pos.addScaledVector(dir, speed * (fps / MS_PER_SEC));

    sharedObject.position.copy(item.pos);
    sharedObject.rotation.set(0, 0, 0);

    sharedObject.scale.setScalar(BALL_GLOW_RADIUS);
    sharedObject.updateMatrix();
    item.glowMesh.setMatrixAt(item.index, sharedObject.matrix);

    sharedObject.scale.setScalar(BALL_CORE_RADIUS);
    sharedObject.updateMatrix();
    item.coreMesh.setMatrixAt(item.index, sharedObject.matrix);
  }

  /** Default animation handler for straightforward linear movements. */
  private static animateBaseItem(item: BaseAnimatedInstance, fps: number) {
    const {dir, speed} = item;
    item.pos.addScaledVector(dir, speed * (fps / MS_PER_SEC));

    sharedObject.position.copy(item.pos);
    sharedObject.rotation.set(0, 0, 0);
    sharedObject.scale.setScalar(item.scale);
    sharedObject.updateMatrix();

    item.mesh.setMatrixAt(item.index, sharedObject.matrix);
  }
}
