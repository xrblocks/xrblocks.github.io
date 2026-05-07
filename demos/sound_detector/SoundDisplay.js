import * as xb from 'xrblocks';
import {Text} from 'troika-three-text';
import * as THREE from 'three';

export class SoundDisplay extends xb.Script {
  static dependencies = {camera: THREE.Camera, world: xb.World};

  init({camera, world}) {
    this.camera = camera;
    this.world = world;

    this.lastClassification = '';

    this.initHudText();

    if (this.world.sounds) {
      this.world.sounds.addEventListener('soundDetected', (event) => {
        const result = event.audioClassifierResult;

        const bestCategory = this.getBestCategory(result);
        const bestScore = bestCategory ? bestCategory.score : -1;

        if (bestCategory) {
          this.lastClassification = `${bestCategory.categoryName} (${Math.round(bestScore * 100)}%)`;
        } else {
          this.lastClassification = 'Unknown Sound';
        }

        const debugStr = this.getDebugString(result);
        const baseText = this.lastClassification || 'Listening...';
        this.hudText.text = debugStr ? `${baseText}\n${debugStr}` : baseText;
        this.hudText.sync();
      });

      console.log('SoundDisplay: attached. Waiting for long pinch to listen.');
    } else {
      this.hudText.text = 'Sound Classifier not initialized';
      this.hudText.sync();
    }
  }

  initHudText() {
    this.hudText = new Text();
    this.hudText.text = 'Pinch to start';
    this.hudText.fontSize = 0.05;
    this.hudText.color = 0x00ffff;
    this.hudText.maxWidth = 0.5;
    this.hudText.position.set(0, 0, -0.5); // 50cm in front of camera
    this.hudText.textAlign = 'center';
    this.hudText.anchorX = 'center';
    this.hudText.anchorY = 'middle';

    // Add directly to this script's scene object instead of camera, to ensure WebXR renders it
    this.add(this.hudText);

    // Need to call sync() on troika text to process geometry.
    this.hudText.sync();
  }

  getBestCategory(result) {
    const items = result ? result.items : [];

    if (items && items.length > 0) {
      const firstItem = items[0];
      if (firstItem.classifications && firstItem.classifications.length > 0) {
        const firstClassification = firstItem.classifications[0];
        if (
          firstClassification.categories &&
          firstClassification.categories.length > 0
        ) {
          return firstClassification.categories[0];
        }
      }
    }
    return null;
  }

  getDebugString(result) {
    const debug = result ? result.debug : null;
    if (debug) {
      const {rms, bufferSize, sampleRate} = debug;
      return `Buffer Size: ${bufferSize} | Sample Rate: ${sampleRate} | RMS: ${rms.toFixed(4)}`;
    }
    return '';
  }

  update() {
    // Manually update the position and rotation to keep the text 50 cm in front of camera
    if (this.hudText && this.camera) {
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();

      this.camera.getWorldPosition(position);
      this.camera.getWorldQuaternion(quaternion);

      // Get forward direction
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

      // Position text 0.5m in front of camera
      this.hudText.position.copy(position).addScaledVector(forward, 1.0);
      this.hudText.quaternion.copy(quaternion);
    }
  }
}
