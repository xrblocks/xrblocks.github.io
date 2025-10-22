import * as THREE from 'three';
import { Handedness } from '../Hands';
import { BuiltInGestureName, GestureConfiguration } from './GestureRecognitionOptions';
export type HandLabel = 'left' | 'right';
export type JointPositions = Map<string, THREE.Vector3>;
export type HandContext = {
    handedness: Handedness;
    handLabel: HandLabel;
    joints: JointPositions;
};
export type GestureDetectionResult = {
    confidence: number;
    data?: Record<string, unknown>;
};
export type GestureDetector = (context: HandContext, config: GestureConfiguration) => GestureDetectionResult | undefined;
export type GestureDetectorMap = Partial<Record<BuiltInGestureName, GestureDetector>>;
