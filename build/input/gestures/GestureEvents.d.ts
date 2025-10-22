import type { BuiltInGestureName } from './GestureRecognitionOptions';
export type GestureEventType = 'gesturestart' | 'gestureupdate' | 'gestureend';
export type GestureHandedness = 'left' | 'right';
export interface GestureEventDetail {
    /**
     * The canonical gesture identifier. Built-in gestures map to
     * `BuiltInGestureName` while custom providers may surface arbitrary strings.
     */
    name: BuiltInGestureName | string;
    /** Which hand triggered the gesture. */
    hand: GestureHandedness;
    /** Provider specific confidence score, normalized to [0, 1]. */
    confidence: number;
    /**
     * Optional payload for provider specific values (e.g. pinch distance,
     * velocity vectors).
     */
    data?: Record<string, unknown>;
}
export interface GestureEvent {
    type: GestureEventType;
    detail: GestureEventDetail;
}
