import * as THREE from 'three';
import { DepthOptions } from './DepthOptions';
export declare class DepthTextures {
    private options;
    private float32Arrays;
    private uint8Arrays;
    private dataTextures;
    private nativeTextures;
    depthData: XRCPUDepthInformation[];
    constructor(options: DepthOptions);
    private createDataDepthTextures;
    updateData(depthData: XRCPUDepthInformation, viewId: number): void;
    updateNativeTexture(depthData: XRWebGLDepthInformation, renderer: THREE.WebGLRenderer, viewId: number): void;
    get(viewId: number): THREE.DataTexture | THREE.ExternalTexture;
}
