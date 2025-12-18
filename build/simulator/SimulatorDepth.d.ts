import * as THREE from 'three';
import { Depth } from '../depth/Depth';
import { SimulatorDepthMaterial } from './SimulatorDepthMaterial';
import { SimulatorScene } from './SimulatorScene';
export declare class SimulatorDepth {
    private simulatorScene;
    private renderer;
    private camera;
    private depth;
    depthWidth: number;
    depthHeight: number;
    depthBufferSlice: Float32Array<ArrayBuffer>;
    depthMaterial: SimulatorDepthMaterial;
    depthRenderTarget: THREE.WebGLRenderTarget;
    depthBuffer: Float32Array;
    depthCamera: THREE.Camera;
    /**
     * If true, copies the rendering camera's projection matrix each frame.
     */
    autoUpdateDepthCameraProjection: boolean;
    /**
     * If true, copies the rendering camera's transform each frame.
     */
    autoUpdateDepthCameraTransform: boolean;
    private projectionMatrixArray;
    constructor(simulatorScene: SimulatorScene);
    /**
     * Initialize Simulator Depth.
     */
    init(renderer: THREE.WebGLRenderer, camera: THREE.Camera, depth: Depth): void;
    createRenderTarget(): void;
    update(): void;
    private updateDepthCamera;
    private renderDepthScene;
    private updateDepth;
}
