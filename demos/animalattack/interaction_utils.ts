import * as THREE from 'three';

const ACTIVE_Y_THRESHOLD = -50;
const RAYCASTER_Z_DIR = -1;
const DEFAULT_RAY_DISTANCE = 100;

const animalRoots: THREE.Object3D[] = [];

/** Utility functions for raycasting and detecting hits on animals or UI elements. */
export class InteractionUtils {
  private static getAnimalIndexFromHierarchy(
    obj: THREE.Object3D | null | undefined
  ): number | undefined {
    let current = obj;
    while (current) {
      if (current.userData?.animalIndex !== undefined) {
        return current.userData.animalIndex as number;
      }
      current = current.parent;
    }
    return undefined;
  }

  /** Checks if the raycaster intersects with UI palette items or spawned animals. */
  public static checkIntersection(
    raycaster: THREE.Raycaster,
    paletteItems: THREE.Object3D[],
    spawnedAnimals: Map<number, THREE.Object3D>
  ) {
    const paletteHit = raycaster.intersectObjects(paletteItems, false)[0];
    if (paletteHit) return paletteHit;

    animalRoots.length = 0;
    for (const a of spawnedAnimals.values()) {
      if (a.position.y > ACTIVE_Y_THRESHOLD) animalRoots.push(a);
    }

    const hits = raycaster.intersectObjects(animalRoots, true);

    if (hits.length > 0) {
      const [{object, point}] = hits;
      const animalIndex = this.getAnimalIndexFromHierarchy(object);
      if (animalIndex !== undefined) {
        return {point, object: {userData: {animalIndex}}};
      }
    }
    return null;
  }

  /** Aligns a raycaster to match the orientation and position of an XR controller. */
  public static setRaycasterFromXRController(
    raycaster: THREE.Raycaster,
    controller: THREE.Object3D
  ) {
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, RAYCASTER_Z_DIR).applyMatrix4(tempMatrix);
  }

  /** Determines the endpoint of a weapon attack, checking for hits on animals or the environment. */
  public static getWeaponEndPoint(
    raycaster: THREE.Raycaster,
    spawnedAnimals: Map<number, THREE.Object3D>,
    depthMesh: THREE.Object3D | null | undefined
  ) {
    animalRoots.length = 0;
    for (const a of spawnedAnimals.values()) {
      if (a.position.y > ACTIVE_Y_THRESHOLD) animalRoots.push(a);
    }
    const hits = raycaster.intersectObjects(animalRoots, true);

    for (const {object, point} of hits) {
      const animalIndex = this.getAnimalIndexFromHierarchy(object);
      if (animalIndex !== undefined) return {point, hitAnimalId: animalIndex};
    }

    if (depthMesh) {
      const envHits = raycaster.intersectObject(depthMesh, true);
      const validEnvHit = envHits.find((h) => h.distance > 0.3); // Ignore hits closer than 30cm (user's own body/hand)
      if (validEnvHit) return {point: validEnvHit.point, isEnvHit: true};
    }

    return {
      point: raycaster.ray.origin
        .clone()
        .add(
          raycaster.ray.direction.clone().multiplyScalar(DEFAULT_RAY_DISTANCE)
        ),
    };
  }
}
