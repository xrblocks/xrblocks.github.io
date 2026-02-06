import * as THREE from 'three';
export declare class Raycaster extends THREE.Raycaster {
    sortFunction: (a: THREE.Intersection, b: THREE.Intersection) => number;
    /** {@inheritDoc three#Raycaster.intersectObjects} */
    intersectObject<TIntersected extends THREE.Object3D>(object: THREE.Object3D, recursive?: boolean, intersects?: Array<THREE.Intersection<TIntersected>>): Array<THREE.Intersection<TIntersected>>;
    /** {@inheritDoc three#Raycaster.intersectObjects} */
    intersectObjects<TIntersected extends THREE.Object3D>(objects: THREE.Object3D[], recursive?: boolean, intersects?: Array<THREE.Intersection<TIntersected>>): Array<THREE.Intersection<TIntersected>>;
}
