import * as xb from 'xrblocks';
import { AUDIO_CAPTURE_PROCESSOR_CODE } from './AudioCaptureProcessorCode.js';

const DEFAULT_SCHEDULE_AHEAD_TIME = 1.0;
class GeminiManager extends xb.Script {
    constructor() {
        super();
        // Audio setup
        this.audioStream = null;
        this.audioContext = null;
        this.sourceNode = null;
        this.processorNode = null;
        this.queuedSourceNodes = new Set();
        // AI state
        this.isAIRunning = false;
        // Audio playback setup
        this.audioQueue = [];
        this.nextAudioStartTime = 0;
        // Transcription state
        this.currentInputText = '';
        this.currentOutputText = '';
        this.tools = [];
        this.scheduleAheadTime = DEFAULT_SCHEDULE_AHEAD_TIME;
    }
    init() {
        this.xrDeviceCamera = xb.core.deviceCamera;
        this.ai = xb.core.ai;
    }
    async startGeminiLive({ liveParams, model, } = {}) {
        if (this.isAIRunning || !this.ai) {
            console.warn('AI already running or not available');
            return;
        }
        liveParams = liveParams || {};
        liveParams.tools = liveParams.tools || [];
        liveParams.tools.push({
            functionDeclarations: this.tools.map((tool) => tool.toJSON()),
        });
        try {
            await this.setupAudioCapture();
            await this.startLiveAI(liveParams, model);
            this.startScreenshotCapture();
            this.isAIRunning = true;
        }
        catch (error) {
            console.error('Failed to start Gemini Live:', error);
            this.cleanup();
            throw error;
        }
    }
    async stopGeminiLive() {
        if (!this.isAIRunning)
            return;
        try {
            if (this.ai && this.ai.stopLiveSession) {
                await this.ai.stopLiveSession();
            }
            this.cleanup();
            this.isAIRunning = false;
            // Clear transcriptions when stopping
            this.currentInputText = '';
            this.currentOutputText = '';
        }
        catch (error) {
            console.error('Failed to stop Gemini Live:', error);
        }
    }
    async setupAudioCapture() {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            },
        });
        const audioTracks = this.audioStream.getAudioTracks();
        if (audioTracks.length === 0) {
            throw new Error('No audio tracks found.');
        }
        this.audioContext = new AudioContext({ sampleRate: 16000 });
        const blob = new Blob([AUDIO_CAPTURE_PROCESSOR_CODE], {
            type: 'text/javascript',
        });
        const blobUrl = URL.createObjectURL(blob);
        await this.audioContext.audioWorklet.addModule(blobUrl);
        this.sourceNode = this.audioContext.createMediaStreamSource(this.audioStream);
        this.processorNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');
        this.processorNode.port.onmessage = (event) => {
            if (event.data.type === 'audioData' && this.isAIRunning) {
                this.sendAudioData(event.data.data);
            }
        };
        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);
    }
    async startLiveAI(params, model) {
        return new Promise((resolve, reject) => {
            this.ai.setLiveCallbacks({
                onopen: () => {
                    resolve();
                },
                onmessage: (message) => {
                    this.handleAIMessage(message);
                },
                onerror: (error) => {
                    console.error('Live AI error:', error);
                    reject(error);
                },
                onclose: () => {
                    this.isAIRunning = false;
                },
            });
            this.ai.startLiveSession(params, model).catch(reject);
        });
    }
    startScreenshotCapture(intervalMs = 1000) {
        if (this.screenshotInterval) {
            console.error('Screenshot interval already running');
            return;
        }
        this.screenshotInterval = setInterval(() => {
            this.captureAndSendScreenshot();
        }, intervalMs);
    }
    captureAndSendScreenshot() {
        try {
            const base64Image = this.xrDeviceCamera.getSnapshot({
                outputFormat: 'base64',
                mimeType: 'image/jpeg',
                quality: 1,
            });
            if (typeof base64Image == 'string') {
                // Strip the data URL prefix if present
                const base64Data = base64Image.startsWith('data:')
                    ? base64Image.split(',')[1]
                    : base64Image;
                this.sendVideoFrame(base64Data);
            }
        }
        catch (error) {
            console.error('Failed to capture screenshot:', error);
        }
    }
    sendAudioData(audioBuffer) {
        if (!this.isAIRunning || !this.ai || !this.ai.sendRealtimeInput) {
            throw new Error('AI not ready to send audio clip.');
        }
        try {
            const base64Audio = this.arrayBufferToBase64(audioBuffer);
            this.ai.sendRealtimeInput({
                audio: { data: base64Audio, mimeType: 'audio/pcm;rate=16000' },
            });
        }
        catch (error) {
            console.error('Failed to send audio:', error);
        }
    }
    sendVideoFrame(base64Image) {
        if (!this.isAIRunning || !this.ai || !this.ai.sendRealtimeInput) {
            throw new Error('AI not ready to send video frame');
        }
        try {
            this.ai.sendRealtimeInput({
                video: { data: base64Image, mimeType: 'image/jpeg' },
            });
        }
        catch (error) {
            console.error('❌ Failed to send video frame:', error);
            console.error('Error stack:', error.stack);
        }
    }
    async initializeAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new AudioContext({ sampleRate: 24000 });
        }
    }
    async playAudioChunk(audioData) {
        try {
            await this.initializeAudioContext();
            const arrayBuffer = this.base64ToArrayBuffer(audioData);
            const audioBuffer = this.audioContext.createBuffer(1, arrayBuffer.byteLength / 2, 24000);
            const channelData = audioBuffer.getChannelData(0);
            const int16View = new Int16Array(arrayBuffer);
            for (let i = 0; i < int16View.length; i++) {
                channelData[i] = int16View[i] / 32768.0;
            }
            this.audioQueue.push(audioBuffer);
            this.scheduleAudioBuffers();
        }
        catch (error) {
            console.error('Error playing audio chunk:', error);
        }
    }
    scheduleAudioBuffers() {
        while (this.audioQueue.length > 0 &&
            this.nextAudioStartTime <=
                this.audioContext.currentTime + this.scheduleAheadTime) {
            const audioBuffer = this.audioQueue.shift();
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);
            source.onended = () => {
                source.disconnect();
                this.queuedSourceNodes.delete(source);
                this.scheduleAudioBuffers();
            };
            const startTime = Math.max(this.nextAudioStartTime, this.audioContext.currentTime);
            source.start(startTime);
            this.queuedSourceNodes.add(source);
            this.nextAudioStartTime = startTime + audioBuffer.duration;
        }
    }
    stopPlayingAudio() {
        this.audioQueue = [];
        this.nextAudioStartTime = 0;
        for (const source of this.queuedSourceNodes) {
            source.stop();
            source.disconnect();
        }
        this.queuedSourceNodes.clear();
    }
    cleanup() {
        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.screenshotInterval = undefined;
        }
        // Clear audio queue and stop playback
        this.audioQueue = [];
        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.audioStream) {
            this.audioStream.getTracks().forEach((track) => track.stop());
            this.audioStream = null;
        }
    }
    handleAIMessage(message) {
        if (message.data) {
            this.playAudioChunk(message.data);
        }
        for (const functionCall of message.toolCall?.functionCalls ?? []) {
            const tool = this.tools.find((tool) => tool.name == functionCall.name);
            if (tool) {
                const exec = tool.execute(functionCall.args);
                exec
                    .then((result) => {
                    this.ai.sendToolResponse({
                        functionResponses: {
                            id: functionCall.id,
                            name: functionCall.name,
                            response: {
                                output: result.data,
                                error: result.error,
                                ...result.metadata,
                            },
                        },
                    });
                })
                    .catch((error) => console.error('Tool error:', error));
            }
        }
        if (message.serverContent) {
            if (message.serverContent.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                if (text) {
                    this.dispatchEvent({ type: 'inputTranscription', message: text });
                }
            }
            if (message.serverContent.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                if (text) {
                    this.dispatchEvent({ type: 'outputTranscription', message: text });
                }
            }
            if (message.serverContent.interrupted) {
                this.stopPlayingAudio();
                this.dispatchEvent({ type: 'interrupted' });
            }
            if (message.serverContent.turnComplete) {
                this.dispatchEvent({ type: 'turnComplete' });
            }
        }
    }
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    dispose() {
        this.cleanup();
        super.dispose();
    }
}

export { GeminiManager };
