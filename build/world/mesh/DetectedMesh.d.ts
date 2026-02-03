import * as THREE from 'three';
import type RAPIER_NS from 'rapier3d';
export declare class DetectedMesh extends THREE.Mesh {
    private RAPIER?;
    private rigidBody?;
    private collider?;
    private blendedWorld?;
    private lastChangedTime;
    semanticLabel?: string;
    constructor(mesh: XRMesh, material: THREE.Material);
    initRapierPhysics(RAPIER: typeof RAPIER_NS, blendedWorld: RAPIER_NS.World): void;
    updateVertices(mesh: XRMesh): void;
}
