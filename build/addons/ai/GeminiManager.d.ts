import type * as GoogleGenAITypes from '@google/genai';
import * as THREE from 'three';
import * as xb from 'xrblocks';
export interface GeminiManagerEventMap extends THREE.Object3DEventMap {
    inputTranscription: {
        message: string;
    };
    outputTranscription: {
        message: string;
    };
    turnComplete: object;
}
export declare class GeminiManager extends xb.Script<GeminiManagerEventMap> {
    xrDeviceCamera?: xb.XRDeviceCamera;
    ai: xb.AI;
    audioStream: MediaStream | null;
    audioContext: AudioContext | null;
    sourceNode: MediaStreamAudioSourceNode | null;
    processorNode: AudioWorkletNode | null;
    isAIRunning: boolean;
    audioQueue: AudioBuffer[];
    nextAudioStartTime: number;
    private screenshotInterval?;
    currentInputText: string;
    currentOutputText: string;
    tools: xb.Tool[];
    constructor();
    init(): void;
    startGeminiLive({ liveParams }?: {
        liveParams?: xb.GeminiStartLiveSessionParams;
    }): Promise<void>;
    stopGeminiLive(): Promise<void>;
    setupAudioCapture(): Promise<void>;
    startLiveAI(params: xb.GeminiStartLiveSessionParams): Promise<void>;
    startScreenshotCapture(intervalMs?: number): void;
    captureAndSendScreenshot(): void;
    sendAudioData(audioBuffer: ArrayBuffer): void;
    sendVideoFrame(base64Image: string): void;
    initializeAudioContext(): Promise<void>;
    playAudioChunk(audioData: string): Promise<void>;
    scheduleAudioBuffers(): void;
    cleanup(): void;
    handleAIMessage(message: GoogleGenAITypes.LiveServerMessage): void;
    arrayBufferToBase64(buffer: ArrayBuffer): string;
    base64ToArrayBuffer(base64: string): ArrayBuffer;
    dispose(): void;
}
