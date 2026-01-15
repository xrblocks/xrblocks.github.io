import * as THREE from 'three';
import { SimulatorPlane } from './SimulatorPlane';
/**
 * Represents a single detected plane in the XR environment. It's a THREE.Mesh
 * that also holds metadata about the plane's properties.
 * Note: This requires chrome://flags/#openxr-spatial-entities to be enabled.
 */
export declare class DetectedPlane extends THREE.Mesh {
    xrPlane: XRPlane | null;
    simulatorPlane?: SimulatorPlane | undefined;
    /**
     * A semantic label for the plane (e.g., 'floor', 'wall', 'ceiling', 'table').
     * Since xrPlane.semanticLabel is readonly, this allows user authoring.
     */
    label?: string;
    /**
     * The orientation of the plane ('Horizontal' or 'Vertical').
     */
    orientation?: XRPlaneOrientation;
    /**
     * @param xrPlane - The plane object from the WebXR API.
     * @param material - The material for the mesh.
     */
    constructor(xrPlane: XRPlane | null, material: THREE.Material, simulatorPlane?: SimulatorPlane | undefined);
}
