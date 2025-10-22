import { DeepPartial, DeepReadonly } from '../../utils/Types';
export type GestureProvider = 'heuristics' | 'mediapipe' | 'tfjs';
export type BuiltInGestureName = 'pinch' | 'open-palm' | 'fist' | 'thumbs-up' | 'point' | 'spread';
export type GestureConfiguration = {
    enabled: boolean;
    /**
     * Optional override for gesture-specific score thresholds. For distance based
     * gestures this is treated as a maximum distance; for confidence based
     * gestures it is treated as a minimum score.
     */
    threshold?: number;
};
export type GestureConfigurations = Partial<Record<BuiltInGestureName, Partial<GestureConfiguration>>>;
export declare class GestureRecognitionOptions {
    /** Master switch for the gesture recognition block. */
    enabled: boolean;
    /**
     * Backing provider that extracts gesture information.
     *  - 'heuristics': WebXR joint heuristics only (no external ML dependency).
     *  - 'mediapipe': MediaPipe Hands running via Web APIs / wasm.
     *  - 'tfjs': TensorFlow.js hand-pose-detection models.
     */
    provider: GestureProvider;
    /**
     * Minimum confidence score to emit gesture events. Different providers map to
     * different score domains so this value is normalised to [0-1].
     */
    minimumConfidence: number;
    /**
     * Optional throttle window for expensive providers.
     */
    updateIntervalMs: number;
    /**
     * Default gesture catalogue.
     */
    gestures: Record<BuiltInGestureName, GestureConfiguration>;
    constructor(options?: DeepReadonly<DeepPartial<GestureRecognitionOptions>>);
    enable(): this;
    /**
     * Convenience helper to toggle specific gestures.
     */
    setGestureEnabled(name: BuiltInGestureName, enabled: boolean): this;
}
