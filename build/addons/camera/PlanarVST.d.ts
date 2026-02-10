import * as xb from 'xrblocks';
export declare class PlanarVST extends xb.Script {
    private disposables;
    private mesh?;
    targetDevice: string;
    init(): void;
    update(): void;
    dispose(): void;
}
