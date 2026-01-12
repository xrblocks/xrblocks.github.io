import { Grid, GridOptions } from './Grid.js';
/**
 * A layout container designed to hold secondary UI elements, such
 * as an exit button or settings icon. It typically "orbits" or remains
 * attached to a corner of its parent panel, outside the main content area.
 */
export type OrbiterPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top' | 'bottom' | 'left' | 'right';
export type OrbiterOptions = GridOptions & {
    orbiterPosition?: OrbiterPosition;
    orbiterScale?: number;
    offset?: number;
    elevation?: number;
};
export declare class Orbiter extends Grid {
    orbiterPosition: OrbiterPosition;
    orbiterScale: number;
    offset: number;
    elevation: number;
    private static readonly BASE_OFFSET;
    private static readonly BASE_ELEVATION;
    private static readonly MAX_OUTWARD;
    constructor(options?: OrbiterOptions);
    init(): void;
    private _place;
}
