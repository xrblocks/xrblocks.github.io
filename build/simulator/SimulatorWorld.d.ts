import { Options } from '../core/Options';
import { World } from '../world/World';
export declare class SimulatorWorld {
    private options;
    private world;
    init(options: Options, world: World): Promise<void>;
    private loadPlanes;
}
