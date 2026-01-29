import 'xrblocks/addons/simulator/SimulatorAddons.js';
import * as xb from 'xrblocks';
import {
  FilesetResolver,
  GestureRecognizer,
  DrawingUtils,
} from '@mediapipe/tasks-vision';

class HandTrackingService {
  constructor() {
    this.gestureRecognizer = null;
    this.videoElement = document.getElementById('webcam-video');
    this.canvasElement = document.getElementById('output-canvas');
    this.canvasCtx = this.canvasElement.getContext('2d');
    this.gestureLabel = document.getElementById('gesture-label');
    this.lastVideoTime = -1;
    this.currentGesture = 'NONE';
  }

  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm'
    );

    this.gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/latest/gesture_recognizer.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({video: true});
      this.videoElement.srcObject = stream;
      this.videoElement.addEventListener('loadeddata', () => {
        this.gestureLabel.innerText = 'Show Hand';
        this.predictWebcam();
      });
    } catch (err) {
      console.error(err);
      this.gestureLabel.innerText = 'Camera Error';
    }
  }

  async predictWebcam() {
    requestAnimationFrame(() => this.predictWebcam());
    if (!this.gestureRecognizer) return;

    if (this.videoElement.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.videoElement.currentTime;
      const results = this.gestureRecognizer.recognizeForVideo(
        this.videoElement,
        performance.now()
      );
      this.drawResults(results);
    }
  }

  detectCustomGestures(landmarks) {
    const wrist = landmarks[0],
      thumbTip = landmarks[4],
      indexKnuckle = landmarks[5];
    const indexTip = landmarks[8],
      indexPip = landmarks[6];
    const middleTip = landmarks[12],
      middlePip = landmarks[10];
    const ringTip = landmarks[16],
      ringPip = landmarks[14];
    const pinkyTip = landmarks[20],
      pinkyPip = landmarks[18];

    const dist = (p1, p2) =>
      Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
          Math.pow(p1.y - p2.y, 2) +
          Math.pow(p1.z - p2.z, 2)
      );
    const isExtended = (tip, pip) => dist(tip, wrist) > dist(pip, wrist) * 1.1;

    const indexOpen = isExtended(indexTip, indexPip);
    const middleOpen = isExtended(middleTip, middlePip);
    const ringOpen = isExtended(ringTip, ringPip);
    const pinkyOpen = isExtended(pinkyTip, pinkyPip);

    // Check fist-based gestures first
    if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
      if (thumbTip.y > indexKnuckle.y + 0.1) return 'THUMB_DOWN';
      if (thumbTip.y < indexKnuckle.y - 0.1) return 'THUMB_UP';
      return 'FIST';
    }

    // PINCH requires index finger partially extended
    const indexExtension = dist(indexTip, wrist) / dist(indexKnuckle, wrist);
    if (dist(thumbTip, indexTip) < 0.05 && indexExtension > 1.3) {
      return 'PINCH';
    }

    // ROCK gesture
    if (indexOpen && !middleOpen && !ringOpen && pinkyOpen) {
      return 'ROCK';
    }

    return null;
  }

  drawResults(results) {
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;
    this.canvasCtx.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );

    if (!results || !results.landmarks.length) {
      this.currentGesture = 'NONE';
      this.gestureLabel.innerText = 'No Hand';
      this.gestureLabel.style.color = '#fff';
      return;
    }

    const landmarks = results.landmarks[0];
    const drawingUtils = new DrawingUtils(this.canvasCtx);
    drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 3,
    });
    drawingUtils.drawLandmarks(landmarks, {
      color: '#FF0000',
      lineWidth: 1,
      radius: 3,
    });

    let gesture = this.detectCustomGestures(landmarks);

    // Fallback to MediaPipe native gestures
    if (!gesture && results.gestures.length > 0) {
      const name = results.gestures[0][0].categoryName;
      const mapping = {
        Pointing_Up: 'POINTING',
        Victory: 'VICTORY',
        Thumb_Up: 'THUMB_UP',
        Closed_Fist: 'FIST',
        Open_Palm: 'RELAXED',
      };
      gesture = mapping[name] || name;
    }

    gesture = gesture || 'NONE';
    this.currentGesture = gesture;
    this.gestureLabel.innerText = gesture.replace(/_/g, ' ');
    this.gestureLabel.style.color =
      gesture !== 'NONE' && gesture !== 'RELAXED' ? '#0f0' : '#ccc';
  }
}

const handTracking = new HandTrackingService();
handTracking.initialize();

class GestureToSimulatorBridge extends xb.Script {
  constructor() {
    super();
    this.lastGesture = 'NONE';
    this.lastTriggerTime = 0;
    this.cooldownMs = 100;
    this.gestureToSimulatorPose = {
      PINCH: xb.SimulatorHandPose.PINCHING,
      FIST: xb.SimulatorHandPose.FIST,
      THUMB_UP: xb.SimulatorHandPose.THUMBS_UP,
      THUMB_DOWN: xb.SimulatorHandPose.THUMBS_DOWN,
      POINTING: xb.SimulatorHandPose.POINTING,
      VICTORY: xb.SimulatorHandPose.VICTORY,
      ROCK: xb.SimulatorHandPose.ROCK,
      RELAXED: xb.SimulatorHandPose.RELAXED,
      NONE: xb.SimulatorHandPose.RELAXED,
    };
  }

  update() {
    const gesture = handTracking.currentGesture;
    const currentTime = performance.now();

    if (
      gesture !== this.lastGesture &&
      currentTime - this.lastTriggerTime >= this.cooldownMs
    ) {
      this.lastGesture = gesture;
      this.lastTriggerTime = currentTime;
      const simulatorPose = this.gestureToSimulatorPose[gesture];
      if (simulatorPose && xb.core.simulator?.hands) {
        xb.core.simulator.hands.setRightHandLerpPose(simulatorPose);
      }
    }
  }
}

const options = new xb.Options();
options.enableUI();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.simulator.stereo.enabled = true;
options.xrButton.alwaysAutostartSimulator = true;

document.addEventListener('DOMContentLoaded', () => {
  xb.add(new GestureToSimulatorBridge());
  xb.init(options);
});
