import type { DeepPartial } from '../../utils/Types';
export declare class MeshDetectionOptions {
    showDebugVisualizations: boolean;
    enabled: boolean;
    constructor(options?: DeepPartial<MeshDetectionOptions>);
    /**
     * Enables the mesh detector.
     */
    enable(): this;
}
