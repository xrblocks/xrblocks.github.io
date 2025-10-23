import * as THREE from 'three';
import { Input } from '../Input';
import { User } from '../../core/User';
import { Script } from '../../core/Script';
import { GestureEventDetail, GestureEventType } from './GestureEvents';
import { GestureRecognitionOptions } from './GestureRecognitionOptions';
type GestureScriptEvent = THREE.Event & {
    type: GestureEventType;
    target: GestureRecognition;
    detail: GestureEventDetail;
};
interface GestureRecognitionEventMap extends THREE.Object3DEventMap {
    gesturestart: GestureScriptEvent;
    gestureupdate: GestureScriptEvent;
    gestureend: GestureScriptEvent;
}
export declare class GestureRecognition extends Script<GestureRecognitionEventMap> {
    static dependencies: {
        input: typeof Input;
        user: typeof User;
        options: typeof GestureRecognitionOptions;
    };
    private options;
    private user;
    private input;
    private activeGestures;
    private lastEvaluation;
    private detectors;
    private activeProvider;
    private providerWarned;
    init({ options, user, input, }: {
        options: GestureRecognitionOptions;
        user: User;
        input: Input;
    }): Promise<void>;
    update(): void;
    private configureProvider;
    private assignDetectors;
    private evaluateHand;
    private buildHandContext;
    private emitGesture;
}
export {};
