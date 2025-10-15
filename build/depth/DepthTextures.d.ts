import * as THREE from 'three';
import { DepthOptions } from './DepthOptions';
export declare class DepthTextures {
    private options;
    private uint16Arrays;
    private uint8Arrays;
    private dataTextures;
    private nativeTextures;
    depthData: XRCPUDepthInformation[];
    constructor(options: DepthOptions);
    private createDataDepthTextures;
    updateData(depthData: XRCPUDepthInformation, view_id: number): void;
    updateNativeTexture(depthData: XRWebGLDepthInformation, renderer: THREE.WebGLRenderer, view_id: number): void;
    get(view_id: number): THREE.DataTexture | THREE.ExternalTexture;
}
