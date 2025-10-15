import * as THREE from 'three';
import { XRDeviceCamera } from '../../camera/XRDeviceCamera.js';
export declare class ScreenshotSynthesizer {
    private pendingScreenshotRequests;
    private virtualCanvas?;
    private virtualBuffer;
    private virtualRenderTarget?;
    private virtualRealCanvas?;
    private virtualRealBuffer;
    private virtualRealRenderTarget?;
    private fullScreenQuad?;
    private renderTargetWidth;
    onAfterRender(renderer: THREE.WebGLRenderer, renderSceneFn: () => void, deviceCamera?: XRDeviceCamera): Promise<void>;
    private createVirtualImageDataURL;
    private resolveVirtualOnlyRequests;
    private createVirtualRealImageDataURL;
    private resolveVirtualRealRequests;
    private getFullScreenQuad;
    /**
     * Requests a screenshot from the scene as a DataURL.
     * @param overlayOnCamera - If true, overlays the image on a camera image
     *     without any projection or aspect ratio correction.
     * @returns Promise which returns the screenshot.
     */
    getScreenshot(overlayOnCamera?: boolean): Promise<unknown>;
}
