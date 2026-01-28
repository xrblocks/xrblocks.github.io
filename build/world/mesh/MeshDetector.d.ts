import * as THREE from 'three';
import { Script } from '../../core/Script';
import { DetectedMesh } from './DetectedMesh';
import { MeshDetectionOptions } from './MeshDetectionOptions';
import { Physics } from '../../physics/Physics';
export declare class MeshDetector extends Script {
    static readonly dependencies: {
        options: typeof MeshDetectionOptions;
        renderer: typeof THREE.WebGLRenderer;
    };
    private debugMaterials;
    private fallbackDebugMaterial;
    xrMeshToThreeMesh: Map<XRMesh, DetectedMesh>;
    threeMeshToXrMesh: Map<DetectedMesh, XRMesh>;
    private renderer;
    private physics?;
    private defaultMaterial;
    init({ options, renderer, }: {
        options: MeshDetectionOptions;
        renderer: THREE.WebGLRenderer;
    }): void;
    initPhysics(physics: Physics): void;
    updateMeshes(_timestamp: number, frame?: XRFrame): void;
    private createMesh;
    private updateMeshPose;
}
