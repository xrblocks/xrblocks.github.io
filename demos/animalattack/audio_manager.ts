const EXPLOSION_DURATION = 0.8;
const EXPLOSION_LPF_FREQ_START = 1500;
const EXPLOSION_LPF_FREQ_END = 30;
const EXPLOSION_LPF_TIME = 0.5;
const EXPLOSION_LPF_Q = 5;

const CURVE_SAMPLES = 400;
const DISTORTION_AMOUNT = 50;

const EXPLOSION_GAIN_MAX = 3.0;
const EXPLOSION_ATTACK_TIME = 0.05;
const EXPLOSION_DECAY_TIME = 0.7;
const EXPLOSION_END_GAIN = 0.01;

const ZAP_FREQ_START = 1200;
const ZAP_FREQ_END = 100;
const ZAP_FREQ_TIME = 0.25;

const ZAP_GAIN_MAX = 0.6;
const ZAP_ATTACK_TIME = 0.02;
const ZAP_DECAY_TIME = 0.25;
const ZAP_END_GAIN = 0.01;
const ZAP_DURATION = 0.3;

/** Manages audio context and sound effects for the application. */
export class AudioManager {
  private static audioContext: AudioContext;
  private static noiseBuffer: AudioBuffer | null = null;
  private static distortionCurve: Float32Array | null = null;

  private static getAudioContext() {
    this.audioContext ??= new (window.AudioContext ||
      (window as unknown as {webkitAudioContext: typeof AudioContext})
        .webkitAudioContext)();

    if (this.audioContext.state === 'suspended') this.audioContext.resume();

    if (!this.noiseBuffer) {
      const {sampleRate} = this.audioContext;
      const bufferSize = sampleRate * EXPLOSION_DURATION;
      this.noiseBuffer = this.audioContext.createBuffer(
        1,
        bufferSize,
        sampleRate
      );
      const output = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    }

    if (!this.distortionCurve) {
      this.distortionCurve = new Float32Array(CURVE_SAMPLES);
      for (let i = 0; i < CURVE_SAMPLES; ++i) {
        const x = (i * 2) / CURVE_SAMPLES - 1;
        this.distortionCurve[i] =
          ((DISTORTION_AMOUNT + 3) * x * 20 * (Math.PI / 180)) /
          (Math.PI + DISTORTION_AMOUNT * Math.abs(x));
      }
    }

    return this.audioContext;
  }

  /** Plays a synthesized explosion sound effect. */
  public static playExplosionSound() {
    const audioContext = this.getAudioContext();
    const noiseSource = audioContext.createBufferSource();
    const bandpass = audioContext.createBiquadFilter();
    const distortion = audioContext.createWaveShaper();
    const gainNode = audioContext.createGain();

    const {currentTime: now} = audioContext;

    noiseSource.buffer = this.noiseBuffer;

    bandpass.type = 'lowpass';
    bandpass.frequency.setValueAtTime(EXPLOSION_LPF_FREQ_START, now);
    bandpass.frequency.exponentialRampToValueAtTime(
      EXPLOSION_LPF_FREQ_END,
      now + EXPLOSION_LPF_TIME
    );
    bandpass.Q.value = EXPLOSION_LPF_Q;

    // @ts-expect-error Float32Array type mismatch due to internal TS dom lib issues with ArrayBufferLike
    distortion.curve = this.distortionCurve;
    distortion.oversample = '4x';

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(
      EXPLOSION_GAIN_MAX,
      now + EXPLOSION_ATTACK_TIME
    );
    gainNode.gain.exponentialRampToValueAtTime(
      EXPLOSION_END_GAIN,
      now + EXPLOSION_DECAY_TIME
    );

    noiseSource.connect(bandpass);
    bandpass.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(audioContext.destination);

    noiseSource.start(now);
    noiseSource.stop(now + EXPLOSION_DURATION);
  }

  /** Plays a synthesized zap/laser sound effect. */
  public static playZapSound() {
    const audioContext = this.getAudioContext();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const {currentTime: now} = audioContext;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(ZAP_FREQ_START, now);
    osc.frequency.exponentialRampToValueAtTime(
      ZAP_FREQ_END,
      now + ZAP_FREQ_TIME
    );

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(ZAP_GAIN_MAX, now + ZAP_ATTACK_TIME);
    gain.gain.exponentialRampToValueAtTime(ZAP_END_GAIN, now + ZAP_DECAY_TIME);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + ZAP_DURATION);
  }
}
