import * as THREE from "three";
//#region demos/animalattack/interaction_utils.ts
const ACTIVE_Y_THRESHOLD = -50;
const RAYCASTER_Z_DIR = -1;
const DEFAULT_RAY_DISTANCE = 100;
const animalRoots = [];
/** Utility functions for raycasting and detecting hits on animals or UI elements. */
var InteractionUtils = class {
	static getAnimalIndexFromHierarchy(obj) {
		let current = obj;
		while (current) {
			if (current.userData?.animalIndex !== void 0) return current.userData.animalIndex;
			current = current.parent;
		}
	}
	/** Checks if the raycaster intersects with UI palette items or spawned animals. */
	static checkIntersection(raycaster, paletteItems, spawnedAnimals) {
		const paletteHit = raycaster.intersectObjects(paletteItems, false)[0];
		if (paletteHit) return paletteHit;
		animalRoots.length = 0;
		for (const a of spawnedAnimals.values()) if (a.position.y > ACTIVE_Y_THRESHOLD) animalRoots.push(a);
		const hits = raycaster.intersectObjects(animalRoots, true);
		if (hits.length > 0) {
			const [{ object, point }] = hits;
			const animalIndex = this.getAnimalIndexFromHierarchy(object);
			if (animalIndex !== void 0) return {
				point,
				object: { userData: { animalIndex } }
			};
		}
		return null;
	}
	/** Aligns a raycaster to match the orientation and position of an XR controller. */
	static setRaycasterFromXRController(raycaster, controller) {
		const tempMatrix = new THREE.Matrix4();
		tempMatrix.identity().extractRotation(controller.matrixWorld);
		raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
		raycaster.ray.direction.set(0, 0, RAYCASTER_Z_DIR).applyMatrix4(tempMatrix);
	}
	/** Determines the endpoint of a weapon attack, checking for hits on animals or the environment. */
	static getWeaponEndPoint(raycaster, spawnedAnimals, depthMesh) {
		animalRoots.length = 0;
		for (const a of spawnedAnimals.values()) if (a.position.y > ACTIVE_Y_THRESHOLD) animalRoots.push(a);
		const hits = raycaster.intersectObjects(animalRoots, true);
		for (const { object, point } of hits) {
			const animalIndex = this.getAnimalIndexFromHierarchy(object);
			if (animalIndex !== void 0) return {
				point,
				hitAnimalId: animalIndex
			};
		}
		if (depthMesh) {
			const validEnvHit = raycaster.intersectObject(depthMesh, true).find((h) => h.distance > .3);
			if (validEnvHit) return {
				point: validEnvHit.point,
				isEnvHit: true
			};
		}
		return { point: raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(DEFAULT_RAY_DISTANCE)) };
	}
};
//#endregion
export { InteractionUtils };
