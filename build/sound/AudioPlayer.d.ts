import { Script } from '../core/Script.js';
import { CategoryVolumes } from './CategoryVolumes';
export interface AudioPlayerOptions {
    sampleRate?: number;
    channelCount?: number;
    category?: string;
}
export declare class AudioPlayer extends Script {
    private options;
    private audioContext?;
    private audioQueue;
    private isPlaying;
    private nextStartTime;
    private gainNode?;
    private categoryVolumes?;
    private volume;
    private category;
    constructor(options?: AudioPlayerOptions);
    /**
     * Sets the CategoryVolumes instance for this player to respect master/category volumes
     */
    setCategoryVolumes(categoryVolumes: CategoryVolumes): void;
    /**
     * Sets the specific volume for this player (0.0 to 1.0)
     */
    setVolume(level: number): void;
    /**
     * Updates the gain node volume based on category volumes
     * Public so CoreSound can update it when master volume changes
     */
    updateGainNodeVolume(): void;
    initializeAudioContext(): Promise<void>;
    playAudioChunk(base64AudioData: string): Promise<void>;
    playNextAudioBuffer(): void;
    clearQueue(): void;
    getIsPlaying(): boolean;
    getQueueLength(): number;
    base64ToArrayBuffer(base64: string): ArrayBuffer;
    stop(): void;
    static isSupported(): boolean;
    dispose(): void;
}
