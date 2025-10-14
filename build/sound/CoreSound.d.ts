import * as THREE from 'three';
import { Script } from '../core/Script';
import { AudioListener } from './AudioListener';
import { AudioPlayer } from './AudioPlayer';
import { BackgroundMusic } from './BackgroundMusic';
import { CategoryVolumes, VolumeCategory } from './CategoryVolumes';
import { SoundOptions } from './SoundOptions';
import { SoundSynthesizer } from './SoundSynthesizer';
import { SpatialAudio } from './SpatialAudio';
import { SpeechRecognizer } from './SpeechRecognizer';
import { SpeechSynthesizer } from './SpeechSynthesizer';
export declare class CoreSound extends Script {
    static dependencies: {
        camera: typeof THREE.Camera;
        soundOptions: typeof SoundOptions;
    };
    categoryVolumes: CategoryVolumes;
    soundSynthesizer: SoundSynthesizer;
    listener: THREE.AudioListener;
    backgroundMusic: BackgroundMusic;
    spatialAudio: SpatialAudio;
    speechRecognizer?: SpeechRecognizer;
    speechSynthesizer?: SpeechSynthesizer;
    audioListener: AudioListener;
    audioPlayer: AudioPlayer;
    options: SoundOptions;
    init({ camera, soundOptions }: {
        camera: THREE.Camera;
        soundOptions: SoundOptions;
    }): void;
    getAudioListener(): THREE.AudioListener;
    setMasterVolume(level: number): void;
    getMasterVolume(): number;
    setCategoryVolume(category: VolumeCategory, level: number): void;
    getCategoryVolume(category: VolumeCategory): number;
    enableAudio(options?: {
        streamToAI?: boolean;
        accumulate?: boolean;
    }): Promise<void>;
    disableAudio(): void;
    /**
     * Starts recording audio with chunk accumulation
     */
    startRecording(): Promise<void>;
    /**
     * Stops recording and returns the accumulated audio buffer
     */
    stopRecording(): ArrayBuffer | null;
    /**
     * Gets the accumulated recording buffer without stopping
     */
    getRecordedBuffer(): ArrayBuffer | null;
    /**
     * Clears the accumulated recording buffer
     */
    clearRecordedBuffer(): void;
    /**
     * Gets the sample rate being used for recording
     */
    getRecordingSampleRate(): number;
    setAIStreaming(enabled: boolean): void;
    isAIStreamingEnabled(): boolean;
    playAIAudio(base64AudioData: string): Promise<void>;
    stopAIAudio(): void;
    isAIAudioPlaying(): boolean;
    /**
     * Plays a raw audio buffer (Int16 PCM data) with proper sample rate
     */
    playRecordedAudio(audioBuffer: ArrayBuffer, sampleRate?: number): Promise<void>;
    isAudioEnabled(): boolean;
    getLatestAudioBuffer(): ArrayBuffer | null;
    clearLatestAudioBuffer(): void;
    getEffectiveVolume(category: VolumeCategory, specificVolume?: number): number;
    muteAll(): void;
    unmuteAll(): void;
    destroy(): void;
}
