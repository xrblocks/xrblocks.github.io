import * as THREE from 'three';
export declare const MOOHAN_INTRINSICS_MATRIX: number[];
export declare const MOOHAN_PROJECTION_MATRIX: THREE.Matrix4;
export declare const MOOHAN_CAMERA_POSE_IN_RIGHT_CAMERA_POSITION: THREE.Vector3;
export declare const MOOHAN_CAMERA_POSE_IN_RIGHT_CAMERA_ROTATION: THREE.Quaternion;
export declare const MOOHAN_CAMERA_POSE_IN_RIGHT_CAMERA: THREE.Matrix4;
export declare function getMoohanCameraPose(_camera: THREE.Camera, xrCameras: THREE.WebXRArrayCamera, target: THREE.Matrix4): void;
