import { Tensor, loadAndCompile, loadLiteRt, supportsFeature } from "https://cdn.jsdelivr.net/npm/@litertjs/core@2.5.3/+esm";
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js";
//#region demos/efficientsam/efficientsam_worker.ts
const LITERT_WASM_URL = "https://cdn.jsdelivr.net/npm/@litertjs/core@2.5.3/wasm/";
const MODEL_IMG_SIZE = 512;
const MASK_LOW_RES = 128;
const MAX_POINTS = 6;
const ENCODER_MODEL_URL = "https://rawcdn.githack.com/xrblocks/proprietary-assets/15e67828b08e0b05160cc8d497106bd600312517/tflite_models/efficientsam/efficientsam_ti_encoder.tflite";
const DECODER_MODEL_URL = "https://rawcdn.githack.com/xrblocks/proprietary-assets/15e67828b08e0b05160cc8d497106bd600312517/tflite_models/efficientsam/efficientsam_ti_decoder.tflite";
let encoderModel = null;
let decoderModel = null;
let encoderAccelerator = "wasm";
let decoderAccelerator = "wasm";
async function preloadLiteRtWasmModule(jspi) {
	const wasmFileName = !await supportsFeature("relaxedSimd").catch(() => false) ? "litert_wasm_compat_internal.js" : jspi ? "litert_wasm_jspi_internal.js" : "litert_wasm_internal.js";
	const cjsShim = { exports: {} };
	const workerGlobal = self;
	workerGlobal.module = cjsShim;
	workerGlobal.exports = cjsShim.exports;
	workerGlobal.Module = { locateFile: (path) => `${LITERT_WASM_URL}${path}` };
	workerGlobal.ModuleFactory = (await import(`${LITERT_WASM_URL}${wasmFileName}`)).default ?? cjsShim.exports;
	delete workerGlobal.module;
	delete workerGlobal.exports;
	workerGlobal.importScripts = () => {};
}
async function compileWithWarmupFallback(modelUrl, preferredAccelerator, warmupShapes) {
	const acceleratorsToTry = preferredAccelerator === "webgpu" ? ["webgpu", "wasm"] : ["wasm"];
	for (const accelerator of acceleratorsToTry) {
		let model = null;
		const dummyInputs = [];
		try {
			const compiled = await loadAndCompile(modelUrl, { accelerator });
			model = compiled;
			for (const shape of warmupShapes) {
				const size = shape.reduce((a, b) => a * b, 1);
				dummyInputs.push(new Tensor(new Float32Array(size), shape));
			}
			const outputs = await compiled.run(dummyInputs);
			for (const out of outputs) {
				await out.data();
				if (!out.deleted) out.delete();
			}
			for (const inp of dummyInputs) if (!inp.deleted) inp.delete();
			const actualAccelerator = compiled.options?.accelerator === "webgpu" ? "webgpu" : "wasm";
			console.info(`[EfficientSAM Worker] Compiled ${modelUrl} with accelerator='${actualAccelerator}' (fullyAccelerated=${Boolean(compiled.isFullyAccelerated)})`);
			return {
				model: compiled,
				accelerator: actualAccelerator
			};
		} catch (err) {
			console.warn(`[EfficientSAM Worker] LiteRT '${accelerator}' compile/warmup for ${modelUrl} fell back:`, err);
			for (const inp of dummyInputs) if (!inp.deleted) inp.delete();
			if (model && !model.deleted) model.delete();
		}
	}
	throw new Error(`Could not compile ${modelUrl} on any LiteRT accelerator.`);
}
async function handleInit() {
	const t0 = performance.now();
	const jspi = await supportsFeature("jspi").catch(() => false);
	await preloadLiteRtWasmModule(jspi);
	const liteRt = await loadLiteRt(LITERT_WASM_URL, { jspi });
	const hasWebGpu = Boolean(liteRt.getWebGpuDevice());
	const preferred = hasWebGpu ? "webgpu" : "wasm";
	console.info(`[EfficientSAM Worker] LiteRT 2.5.3 initialized (hasWebGpu=${hasWebGpu}, jspi=${jspi})`);
	const encRes = await compileWithWarmupFallback(ENCODER_MODEL_URL, preferred, [[
		1,
		3,
		MODEL_IMG_SIZE,
		MODEL_IMG_SIZE
	]]);
	encoderModel = encRes.model;
	encoderAccelerator = encRes.accelerator;
	const decRes = await compileWithWarmupFallback(DECODER_MODEL_URL, preferred, [
		[
			1,
			256,
			32,
			32
		],
		[
			1,
			MAX_POINTS,
			2
		],
		[1, MAX_POINTS]
	]);
	decoderModel = decRes.model;
	decoderAccelerator = decRes.accelerator;
	const compileTimeMs = performance.now() - t0;
	return {
		encoderAccelerator,
		decoderAccelerator,
		compileTimeMs
	};
}
function rgbaToPlanarFloat32(rgba) {
	const hw = MODEL_IMG_SIZE * MODEL_IMG_SIZE;
	const inputFloat32 = new Float32Array(3 * hw);
	const inv255 = 1 / 255;
	for (let i = 0; i < hw; i++) {
		const idx = i * 4;
		inputFloat32[i] = rgba[idx] * inv255;
		inputFloat32[hw + i] = rgba[idx + 1] * inv255;
		inputFloat32[2 * hw + i] = rgba[idx + 2] * inv255;
	}
	return inputFloat32;
}
async function handleXrSegment(payload) {
	if (!encoderModel || !decoderModel) throw new Error("LiteRT models are not initialized yet.");
	const rgbaBuffer = payload.rgbaBuffer;
	const pts = new Float32Array(payload.ptsBuffer);
	const lbls = new Float32Array(payload.lblsBuffer);
	const quadToClipElements = new Float32Array(payload.quadToClipBuffer);
	const quadSizeMeters = Number(payload.quadSizeMeters ?? .8);
	const rgba = new Uint8ClampedArray(rgbaBuffer);
	const inputFloat32 = rgbaToPlanarFloat32(rgba);
	let inputTensor = null;
	let ptsTensor = null;
	let lblsTensor = null;
	let encOutputs = [];
	let decOutputs = [];
	let encoderMs = 0;
	let decoderMs = 0;
	let masksLogits;
	let ious;
	try {
		const tEnc0 = performance.now();
		inputTensor = new Tensor(inputFloat32, [
			1,
			3,
			MODEL_IMG_SIZE,
			MODEL_IMG_SIZE
		]);
		encOutputs = await encoderModel.run([inputTensor]);
		const embTensor = encOutputs[0];
		encoderMs = performance.now() - tEnc0;
		const tDec0 = performance.now();
		ptsTensor = new Tensor(pts, [
			1,
			MAX_POINTS,
			2
		]);
		lblsTensor = new Tensor(lbls, [1, MAX_POINTS]);
		decOutputs = await decoderModel.run([
			embTensor,
			ptsTensor,
			lblsTensor
		]);
		masksLogits = new Float32Array(await decOutputs[0].data());
		ious = new Float32Array(await decOutputs[1].data());
		decoderMs = performance.now() - tDec0;
	} finally {
		for (const t of [
			inputTensor,
			ptsTensor,
			lblsTensor,
			...encOutputs,
			...decOutputs
		]) if (t && !t.deleted) t.delete();
	}
	const totalMs = encoderMs + decoderMs;
	let bestIdx = 0;
	if (ious[1] > ious[bestIdx]) bestIdx = 1;
	if (ious[2] > ious[bestIdx]) bestIdx = 2;
	const bestIou = ious[bestIdx];
	const W = MODEL_IMG_SIZE;
	const H = MODEL_IMG_SIZE;
	const maskOffset = bestIdx * MASK_LOW_RES * MASK_LOW_RES;
	const cameraBinaryMask = new Uint8Array(W * H);
	const scaleX = MASK_LOW_RES / W;
	const scaleY = MASK_LOW_RES / H;
	let fgCount = 0;
	let camMinX = W;
	let camMinY = H;
	let camMaxX = 0;
	let camMaxY = 0;
	for (let y = 0; y < H; y++) {
		const sy = (y + .5) * scaleY - .5;
		const y0 = Math.max(0, Math.min(127, Math.floor(sy)));
		const y1 = Math.max(0, Math.min(127, y0 + 1));
		const wy = sy - y0;
		const row0 = maskOffset + y0 * MASK_LOW_RES;
		const row1 = maskOffset + y1 * MASK_LOW_RES;
		for (let x = 0; x < W; x++) {
			const sx = (x + .5) * scaleX - .5;
			const x0 = Math.max(0, Math.min(127, Math.floor(sx)));
			const x1 = Math.max(0, Math.min(127, x0 + 1));
			const wx = sx - x0;
			const v00 = masksLogits[row0 + x0];
			const v01 = masksLogits[row0 + x1];
			const v10 = masksLogits[row1 + x0];
			const v11 = masksLogits[row1 + x1];
			if ((1 - wy) * ((1 - wx) * v00 + wx * v01) + wy * ((1 - wx) * v10 + wx * v11) >= 0) {
				cameraBinaryMask[y * W + x] = 1;
				fgCount++;
				if (x < camMinX) camMinX = x;
				if (y < camMinY) camMinY = y;
				if (x > camMaxX) camMaxX = x;
				if (y > camMaxY) camMaxY = y;
			}
		}
	}
	const quadBinaryMask = new Uint8Array(W * H);
	let quadMinY = H;
	const quadToClipMatrix = new THREE.Matrix4().fromArray(quadToClipElements);
	const clipPos = new THREE.Vector4();
	for (let qy = 0; qy < H; qy++) {
		const ly = (.5 - (qy + .5) / H) * quadSizeMeters;
		const rowOffset = qy * W;
		for (let qx = 0; qx < W; qx++) {
			const lx = ((qx + .5) / W - .5) * quadSizeMeters;
			clipPos.set(lx, ly, 0, 1).applyMatrix4(quadToClipMatrix);
			if (clipPos.w <= 1e-5) continue;
			const ndcX = clipPos.x / clipPos.w;
			const ndcY = clipPos.y / clipPos.w;
			const camX = Math.floor((ndcX + 1) * .5 * W);
			const camY = Math.floor((1 - (ndcY + 1) * .5) * H);
			if (camX >= 0 && camX < W && camY >= 0 && camY < H) {
				if (cameraBinaryMask[camY * W + camX]) {
					quadBinaryMask[rowOffset + qx] = 1;
					if (qy < quadMinY) quadMinY = qy;
				}
			}
		}
	}
	const quadOverlayRgba = new Uint8ClampedArray(W * H * 4);
	for (let y = 0; y < H; y++) {
		const rowOffset = y * W;
		for (let x = 0; x < W; x++) {
			const i = rowOffset + x;
			if (!quadBinaryMask[i]) continue;
			const p = i * 4;
			if (x > 0 && x < 511 && y > 0 && y < 511 && (!quadBinaryMask[i - 1] || !quadBinaryMask[i + 1] || !quadBinaryMask[i - W] || !quadBinaryMask[i + W])) {
				quadOverlayRgba[p] = 224;
				quadOverlayRgba[p + 1] = 242;
				quadOverlayRgba[p + 2] = 254;
				quadOverlayRgba[p + 3] = 250;
			} else {
				quadOverlayRgba[p] = 56;
				quadOverlayRgba[p + 1] = 189;
				quadOverlayRgba[p + 2] = 248;
				quadOverlayRgba[p + 3] = 115;
			}
		}
	}
	let cutoutRgbaBuffer = null;
	let cropW = 0;
	let cropH = 0;
	if (fgCount > 0 && camMaxX >= camMinX && camMaxY >= camMinY) {
		cropW = Math.max(1, camMaxX - camMinX + 1);
		cropH = Math.max(1, camMaxY - camMinY + 1);
		const cutoutRgba = new Uint8ClampedArray(cropW * cropH * 4);
		for (let cy = 0; cy < cropH; cy++) {
			const srcY = camMinY + cy;
			for (let cx = 0; cx < cropW; cx++) {
				const srcX = camMinX + cx;
				const srcIdx = srcY * W + srcX;
				if (cameraBinaryMask[srcIdx]) {
					const srcP = srcIdx * 4;
					const dstP = (cy * cropW + cx) * 4;
					cutoutRgba[dstP] = rgba[srcP];
					cutoutRgba[dstP + 1] = rgba[srcP + 1];
					cutoutRgba[dstP + 2] = rgba[srcP + 2];
					cutoutRgba[dstP + 3] = 255;
				}
			}
		}
		cutoutRgbaBuffer = cutoutRgba.buffer;
	}
	return {
		quadOverlayBuffer: quadOverlayRgba.buffer,
		cutoutRgbaBuffer,
		cropW,
		cropH,
		quadMinY,
		fgCount,
		encoderMs,
		decoderMs,
		totalMs,
		bestIou
	};
}
self.addEventListener("message", async (event) => {
	const { id, type, payload = {} } = event.data;
	try {
		if (type === "init") {
			const result = await handleInit();
			self.postMessage({
				id,
				ok: true,
				result
			});
		} else if (type === "xr_segment") {
			const result = await handleXrSegment(payload);
			const transferList = [result.quadOverlayBuffer];
			if (result.cutoutRgbaBuffer) transferList.push(result.cutoutRgbaBuffer);
			self.postMessage({
				id,
				ok: true,
				result
			}, { transfer: transferList });
		} else throw new Error(`Unknown worker command: ${String(type)}`);
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		self.postMessage({
			id,
			ok: false,
			error
		});
	}
});
//#endregion
