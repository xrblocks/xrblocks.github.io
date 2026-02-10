import * as THREE from 'three';
import { XRDeviceCamera } from './XRDeviceCamera';
export type DeviceCameraParameters = {
    projectionMatrix: THREE.Matrix4;
    getCameraPose: (camera: THREE.Camera, xrCameras: THREE.WebXRArrayCamera, target: THREE.Matrix4) => void;
};
export declare const DEVICE_CAMERA_PARAMETERS: {
    [key: string]: DeviceCameraParameters;
};
export declare function getDeviceCameraClipFromView(renderCamera: THREE.PerspectiveCamera, deviceCamera: XRDeviceCamera, targetDevice: string): THREE.Matrix4;
export declare function getDeviceCameraWorldFromView(renderCamera: THREE.PerspectiveCamera, xrCameras: THREE.WebXRArrayCamera | null, deviceCamera: XRDeviceCamera, targetDevice: string): THREE.Matrix4;
export declare function getDeviceCameraWorldFromClip(renderCamera: THREE.PerspectiveCamera, xrCameras: THREE.WebXRArrayCamera | null, deviceCamera: XRDeviceCamera, targetDevice: string): THREE.Matrix4;
export type CameraParametersSnapshot = {
    clipFromView: THREE.Matrix4;
    viewFromClip: THREE.Matrix4;
    worldFromView: THREE.Matrix4;
    worldFromClip: THREE.Matrix4;
};
export declare function getCameraParametersSnapshot(camera: THREE.PerspectiveCamera, xrCameras: THREE.WebXRArrayCamera | null, deviceCamera: XRDeviceCamera, targetDevice: string): CameraParametersSnapshot;
/**
 * Raycasts to the depth mesh to find the world position and normal at a given UV coordinate.
 * @param rgbUv - The UV coordinate to raycast from.
 * @param depthMeshSnapshot - The depth mesh to raycast against.
 * @param depthTransformParameters - The depth transform parameters.
 * @returns The world position, normal, and depth at the given UV coordinate.
 */
export declare function transformRgbUvToWorld(rgbUv: THREE.Vector2, depthMeshSnapshot: THREE.Mesh, cameraParametersSnapshot: {
    worldFromView: THREE.Matrix4;
    worldFromClip: THREE.Matrix4;
}): {
    worldPosition: THREE.Vector3;
    worldNormal: THREE.Vector3;
    depthInMeters: number;
} | null;
/**
 * Asynchronously crops a base64 encoded image using a THREE.Box2 bounding box.
 * This function creates an in-memory image, draws a specified portion of it to
 * a canvas, and then returns the canvas content as a new base64 string.
 * @param base64Image - The base64 string of the source image. Can be a raw
 *     string or a full data URI.
 * @param boundingBox - The bounding box with relative coordinates (0-1) for
 *     cropping.
 * @returns A promise that resolves with the base64 string of the cropped image.
 */
export declare function cropImage(base64Image: string, boundingBox: THREE.Box2): Promise<string>;
