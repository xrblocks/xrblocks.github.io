/**
 * Interface representing the result of a permission request.
 */
export interface PermissionResult {
    granted: boolean;
    status: PermissionState | 'unknown' | 'error';
    error?: string;
}
/**
 * A utility class to manage and request browser permissions for
 * Location, Camera, and Microphone.
 */
export declare class PermissionsManager {
    /**
     * Requests permission to access the user's geolocation.
     * Note: This actually attempts to fetch the position to trigger the prompt.
     */
    requestLocationPermission(): Promise<PermissionResult>;
    /**
     * Requests permission to access the microphone.
     * Opens a stream to trigger the prompt, then immediately closes it.
     */
    requestMicrophonePermission(): Promise<PermissionResult>;
    /**
     * Requests permission to access the camera.
     * Opens a stream to trigger the prompt, then immediately closes it.
     */
    requestCameraPermission(): Promise<PermissionResult>;
    /**
     * Requests permission for both camera and microphone simultaneously.
     */
    requestAVPermission(): Promise<PermissionResult>;
    /**
     * Internal helper to handle getUserMedia requests.
     * Crucially, this stops the tracks immediately after permission is granted
     * so the hardware doesn't remain active.
     */
    private requestMediaPermission;
    /**
     * Requests multiple permissions sequentially.
     * Returns a single result: granted is true only if ALL requested permissions are granted.
     */
    checkAndRequestPermissions({ geolocation, camera, microphone, }: {
        geolocation?: boolean;
        camera?: boolean;
        microphone?: boolean;
    }): Promise<PermissionResult>;
    /**
     * Checks the current status of a permission without triggering a prompt.
     * Useful for UI state (e.g., disabling buttons if already denied).
     * * @param permissionName - 'geolocation', 'camera', or 'microphone'
     */
    checkPermissionStatus(permissionName: 'geolocation' | 'camera' | 'microphone'): Promise<PermissionState | 'unknown'>;
}
