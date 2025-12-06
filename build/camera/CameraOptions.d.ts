import { DeepPartial, DeepReadonly } from '../utils/Types';
/**
 * Parameters for RGB to depth UV mapping given different aspect ratios.
 * These parameters define the distortion model and affine transformations
 * required to align the RGB camera feed with the depth map.
 */
export interface RgbToDepthParams {
    scale: number;
    scaleX: number;
    scaleY: number;
    translateU: number;
    translateV: number;
    k1: number;
    k2: number;
    k3: number;
    p1: number;
    p2: number;
    xc: number;
    yc: number;
}
/**
 * Default parameters for rgb to depth projection.
 * For RGB and depth, 4:3 and 1:1, respectively.
 */
export declare const DEFAULT_RGB_TO_DEPTH_PARAMS: RgbToDepthParams;
/**
 * Configuration options for the device camera.
 */
export declare class DeviceCameraOptions {
    enabled: boolean;
    /**
     * Constraints for `getUserMedia`. This will guide the initial camera
     * selection.
     */
    videoConstraints?: MediaTrackConstraints;
    /**
     * Hint for performance optimization on frequent captures.
     */
    willCaptureFrequently: boolean;
    /**
     * Parameters for RGB to depth UV mapping given different aspect ratios.
     */
    rgbToDepthParams: RgbToDepthParams;
    constructor(options?: DeepReadonly<DeepPartial<DeviceCameraOptions>>);
}
export declare const xrDeviceCameraEnvironmentOptions: {
    readonly enabled: boolean;
    readonly videoConstraints?: {
        readonly advanced?: readonly {
            readonly aspectRatio?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly autoGainControl?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly backgroundBlur?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly channelCount?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly deviceId?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly displaySurface?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly echoCancellation?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly facingMode?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly frameRate?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly groupId?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly height?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly noiseSuppression?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly sampleRate?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly sampleSize?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly width?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
        }[] | undefined;
        readonly aspectRatio?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly autoGainControl?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly backgroundBlur?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly channelCount?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly deviceId?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly displaySurface?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly echoCancellation?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly facingMode?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly frameRate?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly groupId?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly height?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly noiseSuppression?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly sampleRate?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly sampleSize?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly width?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
    } | undefined;
    readonly willCaptureFrequently: boolean;
    readonly rgbToDepthParams: {
        readonly scale: number;
        readonly scaleX: number;
        readonly scaleY: number;
        readonly translateU: number;
        readonly translateV: number;
        readonly k1: number;
        readonly k2: number;
        readonly k3: number;
        readonly p1: number;
        readonly p2: number;
        readonly xc: number;
        readonly yc: number;
    };
};
export declare const xrDeviceCameraUserOptions: {
    readonly enabled: boolean;
    readonly videoConstraints?: {
        readonly advanced?: readonly {
            readonly aspectRatio?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly autoGainControl?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly backgroundBlur?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly channelCount?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly deviceId?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly displaySurface?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly echoCancellation?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly facingMode?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly frameRate?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly groupId?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly height?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly noiseSuppression?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly sampleRate?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly sampleSize?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly width?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
        }[] | undefined;
        readonly aspectRatio?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly autoGainControl?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly backgroundBlur?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly channelCount?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly deviceId?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly displaySurface?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly echoCancellation?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly facingMode?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly frameRate?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly groupId?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly height?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly noiseSuppression?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly sampleRate?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly sampleSize?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly width?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
    } | undefined;
    readonly willCaptureFrequently: boolean;
    readonly rgbToDepthParams: {
        readonly scale: number;
        readonly scaleX: number;
        readonly scaleY: number;
        readonly translateU: number;
        readonly translateV: number;
        readonly k1: number;
        readonly k2: number;
        readonly k3: number;
        readonly p1: number;
        readonly p2: number;
        readonly xc: number;
        readonly yc: number;
    };
};
export declare const xrDeviceCameraEnvironmentContinuousOptions: {
    readonly enabled: boolean;
    readonly videoConstraints?: {
        readonly advanced?: readonly {
            readonly aspectRatio?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly autoGainControl?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly backgroundBlur?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly channelCount?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly deviceId?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly displaySurface?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly echoCancellation?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly facingMode?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly frameRate?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly groupId?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly height?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly noiseSuppression?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly sampleRate?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly sampleSize?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly width?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
        }[] | undefined;
        readonly aspectRatio?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly autoGainControl?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly backgroundBlur?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly channelCount?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly deviceId?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly displaySurface?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly echoCancellation?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly facingMode?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly frameRate?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly groupId?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly height?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly noiseSuppression?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly sampleRate?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly sampleSize?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly width?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
    } | undefined;
    readonly willCaptureFrequently: boolean;
    readonly rgbToDepthParams: {
        readonly scale: number;
        readonly scaleX: number;
        readonly scaleY: number;
        readonly translateU: number;
        readonly translateV: number;
        readonly k1: number;
        readonly k2: number;
        readonly k3: number;
        readonly p1: number;
        readonly p2: number;
        readonly xc: number;
        readonly yc: number;
    };
};
export declare const xrDeviceCameraUserContinuousOptions: {
    readonly enabled: boolean;
    readonly videoConstraints?: {
        readonly advanced?: readonly {
            readonly aspectRatio?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly autoGainControl?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly backgroundBlur?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly channelCount?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly deviceId?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly displaySurface?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly echoCancellation?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly facingMode?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly frameRate?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly groupId?: string | readonly string[] | {
                readonly exact?: string | readonly string[] | undefined;
                readonly ideal?: string | readonly string[] | undefined;
            } | undefined;
            readonly height?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly noiseSuppression?: boolean | {
                readonly exact?: boolean | undefined;
                readonly ideal?: boolean | undefined;
            } | undefined;
            readonly sampleRate?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly sampleSize?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
            readonly width?: number | {
                readonly exact?: number | undefined;
                readonly ideal?: number | undefined;
                readonly max?: number | undefined;
                readonly min?: number | undefined;
            } | undefined;
        }[] | undefined;
        readonly aspectRatio?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly autoGainControl?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly backgroundBlur?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly channelCount?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly deviceId?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly displaySurface?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly echoCancellation?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly facingMode?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly frameRate?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly groupId?: string | readonly string[] | {
            readonly exact?: string | readonly string[] | undefined;
            readonly ideal?: string | readonly string[] | undefined;
        } | undefined;
        readonly height?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly noiseSuppression?: boolean | {
            readonly exact?: boolean | undefined;
            readonly ideal?: boolean | undefined;
        } | undefined;
        readonly sampleRate?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly sampleSize?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
        readonly width?: number | {
            readonly exact?: number | undefined;
            readonly ideal?: number | undefined;
            readonly max?: number | undefined;
            readonly min?: number | undefined;
        } | undefined;
    } | undefined;
    readonly willCaptureFrequently: boolean;
    readonly rgbToDepthParams: {
        readonly scale: number;
        readonly scaleX: number;
        readonly scaleY: number;
        readonly translateU: number;
        readonly translateV: number;
        readonly k1: number;
        readonly k2: number;
        readonly k3: number;
        readonly p1: number;
        readonly p2: number;
        readonly xc: number;
        readonly yc: number;
    };
};
