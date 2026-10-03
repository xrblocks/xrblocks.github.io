import * as THREE from "three";
import { buildDisplacementMap, keyOutBackground } from "xrblocks";
//#region demos/generative_object/src/TextureSource.ts
/**
* Default {@link TextureSource} backed by `THREE.TextureLoader`. Resolves once
* the browser has decoded the image, reporting its natural pixel dimensions.
*/
var DataUrlTextureSource = class {
	loader = new THREE.TextureLoader();
	load(dataUrl) {
		return new Promise((resolve, reject) => {
			this.loader.load(dataUrl, (texture) => {
				texture.colorSpace = THREE.SRGBColorSpace;
				const image = texture.image;
				resolve({
					texture,
					width: image?.width ?? 0,
					height: image?.height ?? 0
				});
			}, void 0, (error) => reject(error));
		});
	}
};
/**
* A {@link TextureSource} that removes the (plain) background of the generated
* image so the subject reads as a clean cutout. Decodes the image to a 2D
* canvas, keys out background pixels via `keyOutBackground`, and returns a
* `CanvasTexture`. Browser-only (requires `Image` and a 2D canvas context).
*
* The relief displacement map is built lazily, only when `buildDisplacement` is
* set, so flat cutouts do not allocate a texture they never use.
*/
var CanvasBackgroundTextureSource = class {
	/** Maximum RGB distance from the sampled background color to key out. */
	tolerance;
	/** Whether to also build the relief displacement map. */
	buildDisplacement;
	constructor(options = {}) {
		this.tolerance = options.tolerance;
		this.buildDisplacement = options.buildDisplacement ?? false;
	}
	load(dataUrl) {
		return new Promise((resolve, reject) => {
			const image = new Image();
			image.crossOrigin = "anonymous";
			image.onload = () => {
				try {
					resolve(this.process(image));
				} catch (error) {
					reject(error);
				}
			};
			image.onerror = () => reject(/* @__PURE__ */ new Error("Failed to decode generated image"));
			image.src = dataUrl;
		});
	}
	process(image) {
		const width = image.naturalWidth || image.width;
		const height = image.naturalHeight || image.height;
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("2D canvas context unavailable for background removal");
		context.drawImage(image, 0, 0, width, height);
		const imageData = context.getImageData(0, 0, width, height);
		const keyed = keyOutBackground({
			data: imageData.data,
			width,
			height
		}, { tolerance: this.tolerance });
		imageData.data.set(keyed.data);
		context.putImageData(imageData, 0, 0);
		const texture = new THREE.CanvasTexture(canvas);
		texture.colorSpace = THREE.SRGBColorSpace;
		let displacementTexture;
		if (this.buildDisplacement) {
			const displacement = buildDisplacementMap({
				data: keyed.data,
				width,
				height
			});
			const displacementCanvas = document.createElement("canvas");
			displacementCanvas.width = width;
			displacementCanvas.height = height;
			const displacementContext = displacementCanvas.getContext("2d");
			if (displacementContext) {
				const displacementImageData = displacementContext.createImageData(width, height);
				displacementImageData.data.set(displacement.data);
				displacementContext.putImageData(displacementImageData, 0, 0);
				displacementTexture = new THREE.CanvasTexture(displacementCanvas);
			}
		}
		return {
			texture,
			width,
			height,
			displacementTexture
		};
	}
};
//#endregion
export { CanvasBackgroundTextureSource, DataUrlTextureSource };
