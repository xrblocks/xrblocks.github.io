import * as THREE from "three";
import { OCCLUDABLE_ITEMS_LAYER, OcclusionUtils, Script, computeBillboardScale } from "xrblocks";
import { runCleanupSteps } from "./cleanup.js";
//#region demos/generative_object/src/GenerativeObject.ts
/**
* A generated image placed in the scene as a draggable object: a flat textured
* cutout by default, or a displaced relief mesh when
* {@link GenerativeObjectStyle.relief} is set. Opts into
* `OCCLUDABLE_ITEMS_LAYER` so depth occlusion can hide it behind real geometry.
*/
var GenerativeObject = class extends Script {
	disposed = false;
	occlusion;
	/** The prompt that produced this object. */
	prompt;
	/** The mesh that renders the generated image. */
	mesh;
	/**
	* @param prompt - The prompt that produced the image.
	* @param loaded - The decoded texture and its pixel dimensions.
	* @param style - How to size and build the mesh.
	*/
	constructor(prompt, loaded, style) {
		super();
		this.prompt = prompt;
		this.xb = { manipulation: {
			actions: { translate: true },
			handle: { action: "translate" }
		} };
		this.mesh = style.relief ? buildReliefMesh(loaded, style) : buildFlatMesh(loaded.texture);
		const size = computeBillboardScale(loaded.width, loaded.height, style.maxSize);
		this.mesh.scale.set(size.x, size.y, 1);
		this.add(this.mesh);
		this.mesh.layers.enable(OCCLUDABLE_ITEMS_LAYER);
	}
	/** Registers every compiled program with the enabled depth occlusion pass. */
	enableOcclusion(depth) {
		if (!depth.options.enabled || !depth.options.occlusion.enabled) return;
		const shaders = /* @__PURE__ */ new Set();
		this.occlusion = {
			depth,
			shaders
		};
		this.mesh.material.onBeforeCompile = (shader) => {
			if (this.disposed) return;
			OcclusionUtils.addOcclusionToShader(shader);
			shaders.add(shader);
			depth.occludableShaders.add(shader);
		};
		this.mesh.material.needsUpdate = true;
	}
	/** Releases GPU resources held by this object. */
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		const occlusion = this.occlusion;
		this.occlusion = void 0;
		this.mesh.material.onBeforeCompile = () => {};
		const material = this.mesh.material;
		const textures = /* @__PURE__ */ new Set();
		for (const tex of [
			material.map,
			material.displacementMap,
			material.bumpMap
		]) if (tex) textures.add(tex);
		runCleanupSteps([
			...Array.from(occlusion?.shaders ?? [], (shader) => () => {
				occlusion?.depth.occludableShaders.delete(shader);
			}),
			() => this.mesh.geometry.dispose(),
			...Array.from(textures, (texture) => () => texture.dispose()),
			() => material.dispose()
		]);
	}
};
function buildFlatMesh(texture) {
	const material = new THREE.MeshBasicMaterial({
		map: texture,
		transparent: true,
		alphaTest: .5,
		side: THREE.DoubleSide
	});
	return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
}
function buildReliefMesh(loaded, style) {
	const segments = style.reliefSegments ?? 96;
	const strength = style.reliefStrength ?? .04;
	const displacementMap = loaded.displacementTexture ?? loaded.texture;
	const material = new THREE.MeshStandardMaterial({
		map: loaded.texture,
		displacementMap,
		displacementScale: strength,
		bumpMap: displacementMap,
		roughness: .9,
		metalness: 0,
		transparent: true,
		alphaTest: .5,
		side: THREE.DoubleSide
	});
	return new THREE.Mesh(new THREE.PlaneGeometry(1, 1, segments, segments), material);
}
//#endregion
export { GenerativeObject };
