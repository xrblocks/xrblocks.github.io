import * as THREE from 'three';
/**
 * Represents a single detected object in the XR environment and holds metadata
 * about the object's properties. Note: 3D object position is stored in the
 * position property of `Three.Object3D`.
 */
export declare class DetectedObject<T> extends THREE.Object3D {
    label: string;
    image: string | null;
    detection2DBoundingBox: THREE.Box2;
    data: T;
    /**
     * @param label - The semantic label of the object.
     * @param image - The base64 encoded cropped image of the object.
     * @param detection2DBoundingBox - The 2D bounding box of the detected object in normalized screen
     * coordinates. Values are between 0 and 1. Centerpoint of this bounding is
     * used for backproject to obtain 3D object position (i.e., this.position).
     * @param data - Additional properties from the detector.
     * This includes any object proparties that is requested through the
     * schema but is not assigned a class property by default (e.g., color, size).
     */
    constructor(label: string, image: string | null, detection2DBoundingBox: THREE.Box2, data: T);
}
