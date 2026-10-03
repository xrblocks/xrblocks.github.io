import * as THREE from "three";
import { AI, Depth, Script, poseInFrontOfCamera, quaternionFacingCamera } from "xrblocks";
import { GenerativeObject } from "./GenerativeObject.js";
import { GenerativeOptions } from "./GenerativeOptions.js";
import { runCleanupSteps } from "./cleanup.js";
import { CanvasBackgroundTextureSource, DataUrlTextureSource } from "./TextureSource.js";
//#region demos/generative_object/src/GenerativeObjects.ts
const scratchCameraPosition = new THREE.Vector3();
const scratchOrigin = new THREE.Vector3();
const scratchDirection = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
/** Clearance in meters to float an object off a vertical surface. */
const SURFACE_CLEARANCE = .08;
/**
* Demo helper that turns a text prompt into a placed, draggable
* {@link GenerativeObject}: it asks the AI model to generate an image, decodes
* it into a texture, and drops the result into the scene in front of the user.
*
* Lives in the demo (rather than the SDK) so the high-level shape can keep
* evolving. The generation step is split into {@link generateBillboard}, an
* image-to-placed-object primitive, to mirror where an SDK
* `ai.generateBillboard(image)` could eventually sit.
*
* If AI is unavailable or generation yields no image, {@link imagine} resolves
* to `null` instead of throwing.
*/
var GenerativeObjects = class extends Script {
	static dependencies = {
		ai: AI,
		camera: THREE.Camera,
		scene: THREE.Scene,
		depth: Depth
	};
	options = new GenerativeOptions();
	/** Decodes generated image data into a texture. Built from options on init. */
	textureSource = new DataUrlTextureSource();
	/** All objects created this session, in creation order. */
	objects = [];
	ai;
	camera;
	scene;
	depth;
	raycaster = new THREE.Raycaster();
	generation = 0;
	disposed = true;
	init({ ai, camera, scene, depth }) {
		this.ai = ai;
		this.camera = camera;
		this.scene = scene;
		this.depth = depth;
		this.generation++;
		this.disposed = false;
		this.textureSource = this.options.removeBackground ? new CanvasBackgroundTextureSource({ buildDisplacement: this.options.relief }) : new DataUrlTextureSource();
	}
	/** Whether image generation can run in the current session. */
	get isSupported() {
		return !this.disposed && !!this.ai?.isAvailable();
	}
	/** Billboards tracked objects toward the user each frame, when enabled. */
	update() {
		if (this.disposed || !this.camera || !this.options.billboard || this.objects.length === 0) return;
		const cameraPosition = this.camera.getWorldPosition(scratchCameraPosition);
		for (const object of this.objects) quaternionFacingCamera(object.position, cameraPosition, object.quaternion);
	}
	/**
	* Generates an image for `prompt` and places it as a draggable object in
	* front of the user.
	* @param prompt - What to generate, e.g. "a small red dragon".
	* @param options - Optional per-call placement overrides.
	* @returns The placed object, or `null` if generation was unavailable or
	*     produced no image.
	*/
	async imagine(prompt, options = {}) {
		if (!this.ai || !this.isSupported) return null;
		const generation = this.generation;
		const result = await this.ai.generate(prompt, "image", this.options.systemInstruction);
		if (generation !== this.generation || typeof result !== "string" || result.length === 0) return null;
		return this.generateBillboard(result, prompt, options);
	}
	/**
	* Builds and places a draggable billboard from an already-generated image.
	* This is the image-to-object half of {@link imagine}, kept separate to model
	* the shape of a future `ai.generateBillboard(image)` primitive.
	* @param image - Image data (typically a `data:` URL).
	* @param prompt - Label describing the image, stored on the object.
	* @param options - Optional per-call placement overrides.
	* @returns The placed object, or `null` if it was cleared mid-load.
	*/
	async generateBillboard(image, prompt = "", options = {}) {
		if (this.disposed || !this.scene) return null;
		const generation = this.generation;
		const loaded = await this.textureSource.load(image);
		if (generation !== this.generation) {
			const textures = /* @__PURE__ */ new Set([loaded.texture, loaded.displacementTexture]);
			runCleanupSteps(Array.from(textures, (texture) => () => texture?.dispose()));
			return null;
		}
		const maxSize = options.maxSize ?? this.options.maxSize;
		const distance = options.distance ?? this.options.distance;
		const object = new GenerativeObject(prompt, loaded, {
			maxSize,
			relief: this.options.relief,
			reliefStrength: this.options.reliefStrength,
			reliefSegments: this.options.reliefSegments
		});
		if (this.depth) object.enableOcclusion(this.depth);
		this.placeObject_(object, distance);
		this.scene.add(object);
		this.objects.push(object);
		return object;
	}
	/**
	* Positions a freshly built object: on the real-world surface the user is
	* looking at when grounding is enabled and a hit is found, otherwise in front
	* of the camera. Stands on horizontal surfaces and floats a little off
	* vertical ones so it never blends into a wall. Always upright toward the user.
	*/
	placeObject_(object, distance) {
		const hit = this.options.groundOnSurface ? this.raycastSurface_() : null;
		if (hit) {
			if (Math.abs(hit.normal.dot(WORLD_UP)) > .7) {
				const halfHeight = object.mesh.scale.y / 2;
				object.position.copy(hit.point).addScaledVector(WORLD_UP, halfHeight);
			} else object.position.copy(hit.point).addScaledVector(hit.normal, SURFACE_CLEARANCE);
		} else poseInFrontOfCamera(this.camera, distance, object.position);
		const cameraPosition = this.camera.getWorldPosition(scratchCameraPosition);
		quaternionFacingCamera(object.position, cameraPosition, object.quaternion);
	}
	/**
	* Raycasts from the camera forward against the depth mesh.
	* @returns The world-space hit point and surface normal, or `null` if there is
	*     no depth mesh or no intersection.
	*/
	raycastSurface_() {
		const depthMesh = this.depth?.depthMesh;
		if (!depthMesh || !this.camera || !this.depth?.options.enabled) return null;
		const origin = this.camera.getWorldPosition(scratchOrigin);
		const direction = this.camera.getWorldDirection(scratchDirection);
		this.raycaster.set(origin, direction);
		depthMesh.updateWorldMatrix(true, false);
		const intersections = this.raycaster.intersectObject(depthMesh, false);
		if (intersections.length === 0) return null;
		const hit = intersections[0];
		if (hit.distance > this.options.maxGroundDistance) return null;
		return {
			point: hit.point.clone(),
			normal: (hit.face?.normal ?? hit.normal ?? WORLD_UP).clone().transformDirection(depthMesh.matrixWorld).normalize()
		};
	}
	/** Removes all generated objects from the scene and frees their resources. */
	clearObjects() {
		this.generation++;
		const objects = this.objects.splice(0);
		runCleanupSteps(objects.flatMap((object) => [() => object.removeFromParent(), () => object.dispose()]));
	}
	dispose() {
		this.disposed = true;
		this.ai = void 0;
		this.camera = void 0;
		this.scene = void 0;
		this.depth = void 0;
		this.clearObjects();
	}
};
//#endregion
export { GenerativeObjects };
