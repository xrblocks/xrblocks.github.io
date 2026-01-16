import type RAPIER_NS from '@dimforge/rapier3d';
import * as THREE from 'three';
import { MeshScript } from '../core/Script';
import { DepthOptions } from './DepthOptions';
import { DepthTextures } from './DepthTextures';
export declare class DepthMesh extends MeshScript {
    private depthOptions;
    private depthTextures?;
    static dependencies: {
        renderer: typeof THREE.WebGLRenderer;
    };
    static isDepthMesh: boolean;
    ignoreReticleRaycast: boolean;
    private worldPosition;
    private worldQuaternion;
    private updateVertexNormals;
    private minDepth;
    private maxDepth;
    private minDepthPrev;
    private maxDepthPrev;
    private downsampledGeometry?;
    private downsampledMesh?;
    private collider?;
    private colliders;
    private colliderUpdateFps;
    private renderer;
    private projectionMatrixInverse;
    private lastColliderUpdateTime;
    private options;
    private depthTextureMaterialUniforms?;
    private depthTarget;
    private depthTexture;
    private depthScene;
    private depthCamera;
    private gpuPixels;
    private RAPIER?;
    private blendedWorld?;
    private rigidBody?;
    private colliderId;
    constructor(depthOptions: DepthOptions, width: number, height: number, depthTextures?: DepthTextures | undefined);
    /**
     * Initialize the depth mesh.
     */
    init({ renderer }: {
        renderer: THREE.WebGLRenderer;
    }): void;
    /**
     * Updates the depth data and geometry positions based on the provided camera
     * and depth data.
     */
    updateDepth(depthData: Readonly<XRCPUDepthInformation>, projectionMatrixInverse: Readonly<THREE.Matrix4>): void;
    updateGPUDepth(depthData: Readonly<XRWebGLDepthInformation>, projectionMatrixInverse: Readonly<THREE.Matrix4>): void;
    convertGPUToGPU(depthData: Readonly<XRWebGLDepthInformation>): XRCPUDepthInformation;
    /**
     * Method to manually update the full resolution geometry.
     * Only needed if options.updateFullResolutionGeometry is false.
     */
    updateFullResolutionGeometry(depthData: XRCPUDepthInformation): void;
    /**
     * Internal method to update the geometry of the depth mesh.
     */
    private updateGeometry;
    /**
     * Optimizes collider updates to run periodically based on the specified FPS.
     */
    private updateColliderIfNeeded;
    initRapierPhysics(RAPIER: typeof RAPIER_NS, blendedWorld: RAPIER_NS.World): void;
    /**
     * Customizes raycasting to compute normals for intersections.
     * @param raycaster - The raycaster object.
     * @param intersects - Array to store intersections.
     * @returns - True if intersections are found.
     */
    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): boolean;
    getColliderFromHandle(handle: RAPIER_NS.ColliderHandle): RAPIER_NS.Collider | undefined;
}
