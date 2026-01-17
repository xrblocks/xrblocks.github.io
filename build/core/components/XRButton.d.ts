import { PermissionsManager } from './PermissionsManager';
import { WebXRSessionManager } from './WebXRSessionManager';
export declare class XRButton {
    private sessionManager;
    private permissionsManager;
    private appTitle;
    private appDescription;
    private startText;
    private endText;
    private invalidText;
    private startSimulatorText;
    startSimulator: () => void;
    private permissions;
    domElement: HTMLDivElement;
    simulatorButtonElement: HTMLButtonElement;
    xrButtonElement: HTMLButtonElement;
    constructor(sessionManager: WebXRSessionManager, permissionsManager: PermissionsManager, appTitle?: string, appDescription?: string, startText?: string, endText?: string, invalidText?: string, startSimulatorText?: string, showEnterSimulatorButton?: boolean, startSimulator?: () => void, permissions?: {
        geolocation: boolean;
        camera: boolean;
        microphone: boolean;
    });
    private createSimulatorButton;
    private createXRAppTitle;
    private createXRAppDescription;
    private createXRButtonElement;
    private onSessionReady;
    private showXRNotSupported;
    private onSessionStarted;
    private onSessionEnded;
}
