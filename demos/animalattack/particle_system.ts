import * as THREE from 'three';

const PARTICLE_BOX_SIZE = 0.03;
const PARTICLE_COLOR_BASE = 0xffaa00;
const PARTICLE_COLOR_SPARK_ALT = 0xffffff;

const EXPLOSION_COUNT = 100;
const EXPLOSION_HUE_MIN = 0.02;
const EXPLOSION_HUE_MAX = 0.12;
const EXPLOSION_SAT = 1.0;
const EXPLOSION_LIGHT = 0.5;
const EXPLOSION_SCALE_MIN = 0.5;
const EXPLOSION_SCALE_MAX = 2.0;
const EXPLOSION_Y_OFFSET = 0.2;
const EXPLOSION_VEL_XZ_SPREAD = 10;
const EXPLOSION_VEL_Y_MIN = 2;
const EXPLOSION_VEL_Y_MAX = 12;
const EXPLOSION_LIFE_MIN = 0.5;
const EXPLOSION_LIFE_MAX = 1.0;

const SPARK_COUNT = 20;
const SPARK_SCALE = 0.4;
const SPARK_VEL_XZ_SPREAD = 5;
const SPARK_VEL_Y_MIN = 0;
const SPARK_VEL_Y_MAX = 5;
const SPARK_LIFE_MIN = 0.1;
const SPARK_LIFE_MAX = 0.4;

const GRAVITY = 9.8;
const ROTATION_SPEED = 5;

const BASE_PARTICLE_MAT = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 1.0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

/** Reusable object used to compute matrix transformations for InstancedMesh without garbage collection overhead. */
const sharedObject = new THREE.Object3D();

/** Data defining a single particle's state. */
export interface ParticleData {
  velocity: THREE.Vector3;
  pos: THREE.Vector3;
  rot: THREE.Vector3;
  scale: THREE.Vector3;
  life: number;
}

/** Data associating an InstancedMesh with an array of particle states. */
export interface ParticleEvent {
  mesh: THREE.InstancedMesh;
  particles: ParticleData[];
}

/** Manages and renders particle effects using InstancedMesh. */
export class ParticleSystem {
  public scene: THREE.Object3D;
  public events: ParticleEvent[] = [];
  public geometry = new THREE.BoxGeometry(
    PARTICLE_BOX_SIZE,
    PARTICLE_BOX_SIZE,
    PARTICLE_BOX_SIZE
  );

  public constructor(scene: THREE.Object3D) {
    this.scene = scene;
  }

  /** Spawns a generic particle effect. */
  public spawn(
    count: number,
    setupFn: (index: number) => {color: THREE.Color; data: ParticleData}
  ) {
    const material = BASE_PARTICLE_MAT.clone();
    const instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      material,
      count
    );

    const particles: ParticleData[] = [];
    let maxLife = 0;

    for (let i = 0; i < count; i++) {
      const {color, data} = setupFn(i);
      instancedMesh.setColorAt(i, color);
      particles.push(data);
      if (data.life > maxLife) maxLife = data.life;

      sharedObject.position.copy(data.pos);
      sharedObject.rotation.setFromVector3(data.rot);
      sharedObject.scale.copy(data.scale);
      sharedObject.updateMatrix();
      instancedMesh.setMatrixAt(i, sharedObject.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor)
      instancedMesh.instanceColor.needsUpdate = true;

    this.scene.add(instancedMesh);
    this.events.push({mesh: instancedMesh, particles});
  }

  /** Spawns a colorful explosion effect at the specified position. */
  public spawnExplosion(position: THREE.Vector3) {
    this.spawn(EXPLOSION_COUNT, () => {
      const color = new THREE.Color().setHSL(
        THREE.MathUtils.randFloat(EXPLOSION_HUE_MIN, EXPLOSION_HUE_MAX),
        EXPLOSION_SAT,
        EXPLOSION_LIGHT
      );
      const scaleVal = THREE.MathUtils.randFloat(
        EXPLOSION_SCALE_MIN,
        EXPLOSION_SCALE_MAX
      );
      const pos = position.clone();
      pos.y += EXPLOSION_Y_OFFSET;

      return {
        color,
        data: {
          velocity: new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(EXPLOSION_VEL_XZ_SPREAD),
            THREE.MathUtils.randFloat(EXPLOSION_VEL_Y_MIN, EXPLOSION_VEL_Y_MAX),
            THREE.MathUtils.randFloatSpread(EXPLOSION_VEL_XZ_SPREAD)
          ),
          pos,
          rot: new THREE.Vector3(0, 0, 0),
          scale: new THREE.Vector3(scaleVal, scaleVal, scaleVal),
          life: THREE.MathUtils.randFloat(
            EXPLOSION_LIFE_MIN,
            EXPLOSION_LIFE_MAX
          ),
        },
      };
    });
  }

  /** Spawns sparks/dust effect when objects hit the ground. */
  public spawnSparks(position: THREE.Vector3) {
    this.spawn(SPARK_COUNT, () => {
      const color = new THREE.Color().setHex(
        Math.random() > 0.5 ? PARTICLE_COLOR_BASE : PARTICLE_COLOR_SPARK_ALT
      );

      return {
        color,
        data: {
          velocity: new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(SPARK_VEL_XZ_SPREAD),
            THREE.MathUtils.randFloat(SPARK_VEL_Y_MIN, SPARK_VEL_Y_MAX),
            THREE.MathUtils.randFloatSpread(SPARK_VEL_XZ_SPREAD)
          ),
          pos: position.clone(),
          rot: new THREE.Vector3(0, 0, 0),
          scale: new THREE.Vector3(SPARK_SCALE, SPARK_SCALE, SPARK_SCALE),
          life: THREE.MathUtils.randFloat(SPARK_LIFE_MIN, SPARK_LIFE_MAX),
        },
      };
    });
  }

  /** Progresses the simulation of all active particles. */
  public update(deltaTime: number) {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const event = this.events[i];
      let allDead = true;
      let maxLife = 0;

      for (let j = 0; j < event.particles.length; j++) {
        const p = event.particles[j];
        p.life -= deltaTime;

        if (p.life > 0) {
          allDead = false;
          maxLife = Math.max(maxLife, p.life);

          p.velocity.y -= GRAVITY * deltaTime;
          p.pos.addScaledVector(p.velocity, deltaTime);
          p.rot.x += deltaTime * ROTATION_SPEED;
          p.rot.y += deltaTime * ROTATION_SPEED;

          sharedObject.position.copy(p.pos);
          sharedObject.rotation.setFromVector3(p.rot);
          sharedObject.scale.copy(p.scale);
        } else {
          sharedObject.scale.set(0, 0, 0);
        }

        sharedObject.updateMatrix();
        event.mesh.setMatrixAt(j, sharedObject.matrix);
      }

      if (allDead) {
        this.scene.remove(event.mesh);
        event.mesh.dispose();
        this.events.splice(i, 1);
      } else {
        event.mesh.instanceMatrix.needsUpdate = true;
        (event.mesh.material as THREE.Material).opacity = maxLife;
      }
    }
  }
}
