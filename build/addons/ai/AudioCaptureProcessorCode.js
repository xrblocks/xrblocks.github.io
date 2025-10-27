const AUDIO_CAPTURE_PROCESSOR_CODE = `
    // Audio worklet processor for capturing audio data
    class AudioCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];

        if (input && input[0]) {
        const inputData = input[0];
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        this.port.postMessage({type: 'audioData', data: pcmData.buffer});
        }

        return true;
    }
    }

    registerProcessor('audio-capture-processor', AudioCaptureProcessor);
`;

export { AUDIO_CAPTURE_PROCESSOR_CODE };
