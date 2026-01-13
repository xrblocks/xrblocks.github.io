import * as xb from 'xrblocks';
export declare class LongSelectHandler extends xb.Script {
    protected onTrigger: () => void;
    protected triggerDelay: number;
    protected triggerCooldownDuration: number;
    protected pulseAnimationDuration: number;
    protected visualizerColor: number;
    protected visualizerRadius: number;
    private triggerTimeout;
    private lastTriggerTime;
    private isTriggerOnCooldown;
    private activeHandedness;
    private triggerStartTime;
    private isPulsing;
    private pulseStartTime;
    private outerVisualizer;
    private innerVisualizer;
    private outerMaterialOpacity;
    private innerMaterialOpacity;
    private sphereGeometry;
    private outerMaterial;
    private innerMaterial;
    constructor(onTrigger: () => void, { triggerDelay, triggerCooldownDuration, pulseAnimationDuration, visualizerColor, visualizerRadius, }?: {
        triggerDelay?: number | undefined;
        triggerCooldownDuration?: number | undefined;
        pulseAnimationDuration?: number | undefined;
        visualizerColor?: number | undefined;
        visualizerRadius?: number | undefined;
    });
    onSelectStart(event: xb.SelectEvent): void;
    onSelecting(): void;
    onSelectEnd(): void;
    private _triggerSelection;
    private createVisualizers;
    updateVisualizers(): void;
    removeVisualizers(): void;
}
