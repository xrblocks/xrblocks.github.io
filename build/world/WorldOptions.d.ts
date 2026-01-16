import { DeepPartial } from '../utils/Types';
import { MeshDetectionOptions } from './mesh/MeshDetectionOptions';
import { ObjectsOptions } from './objects/ObjectsOptions';
import { PlanesOptions } from './planes/PlanesOptions';
export declare class WorldOptions {
    debugging: boolean;
    enabled: boolean;
    initiateRoomCapture: boolean;
    planes: PlanesOptions;
    objects: ObjectsOptions;
    meshes: MeshDetectionOptions;
    constructor(options?: DeepPartial<WorldOptions>);
    /**
     * Enables plane detection.
     */
    enablePlaneDetection(): this;
    /**
     * Enables object detection.
     */
    enableObjectDetection(): this;
    /**
     * Enables mesh detection.
     */
    enableMeshDetection(): this;
}
