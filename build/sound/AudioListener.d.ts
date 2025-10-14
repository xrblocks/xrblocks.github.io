import { AI } from '../ai/AI';
import { Registry } from '../core/components/Registry';
import { Script } from '../core/Script.js';
export interface AudioListenerOptions {
    sampleRate?: number;
    channelCount?: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
}
export declare class AudioListener extends Script {
    static dependencies: {
        registry: typeof Registry;
    };
    private options;
    private audioStream?;
    audioContext?: AudioContext;
    private sourceNode?;
    private processorNode?;
    private isCapturing;
    private latestAudioBuffer;
    private accumulatedChunks;
    private isAccumulating;
    private registry;
    aiService?: AI;
    private onAudioData?;
    private onError?;
    constructor(options?: AudioListenerOptions);
    /**
     * Init the AudioListener.
     */
    init({ registry }: {
        registry: Registry;
    }): void;
    startCapture(callbacks?: {
        onAudioData?: (audioBuffer: ArrayBuffer) => void;
        onError?: (error: Error) => void;
        accumulate?: boolean;
    }): Promise<void>;
    stopCapture(): void;
    setupAudioCapture(): Promise<void>;
    private setupAudioWorklet;
    streamToAI(audioBuffer: ArrayBuffer): void;
    setAIStreaming(enabled: boolean): void;
    cleanup(): void;
    static isSupported(): boolean;
    getIsCapturing(): boolean;
    getLatestAudioBuffer(): ArrayBuffer | null;
    clearLatestAudioBuffer(): void;
    /**
     * Gets all accumulated audio chunks as a single combined buffer
     */
    getAccumulatedBuffer(): ArrayBuffer | null;
    /**
     * Clears accumulated chunks
     */
    clearAccumulatedBuffer(): void;
    /**
     * Gets the number of accumulated chunks
     */
    getAccumulatedChunkCount(): number;
    dispose(): void;
}
