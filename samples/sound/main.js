/* eslint-env browser */
import * as THREE from 'three';
import * as xb from 'xrblocks';

class SoundDemoScript extends xb.Script {
  constructor() {
    super();
    this.soundBalls = [];
    this.mainPanel = null;
    this.recordedAudioBuffer = null;
    this.isRecording = false;
    this.recordBtn = null;
    this.statusText = null;
    this.volumeText = null;
    this.recordingStartTime = 0;
    this.currentVolume = 1.0;
    this.ballJumpPhase = 0;
  }

  init() {
    this.createSoundBalls();
    this.createDemoUI();

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(0, 3, 0);
    this.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
    this.add(ambientLight);
  }

  createSoundBalls() {
    const ballPositions = [
      { x: -1.0, y: xb.user.height * 0.5, z: -1.5, color: 0xff6b6b },
      { x: 0.0, y: xb.user.height * 0.5, z: -1.5, color: 0x4ecdc4 },
      { x: 1.0, y: xb.user.height * 0.5, z: -1.5, color: 0xffe66d }
    ];

    ballPositions.forEach((pos, index) => {
      const geometry = new THREE.SphereGeometry(0.1, 32, 32);
      const material = new THREE.MeshStandardMaterial({ 
        color: pos.color,
        metalness: 0.3,
        roughness: 0.4
      });
      const ball = new THREE.Mesh(geometry, material);
      ball.position.set(pos.x, pos.y, pos.z);
      ball.userData.soundIndex = index;
      ball.name = `SoundBall${index}`;
      this.add(ball);
      this.soundBalls.push(ball);
    });
  }

  createDemoUI() {
    this.mainPanel = new xb.SpatialPanel({
      backgroundColor: '#1a1a1aF0',
      useDefaultPosition: false,
      showEdge: true,
      width: 1.0,
      height: 0.8,
    });
    this.mainPanel.isRoot = true;
    this.mainPanel.position.set(0, xb.user.height + 0.2, -xb.user.panelDistance);
    this.add(this.mainPanel);

    const mainGrid = this.mainPanel.addGrid();

    const titleRow = mainGrid.addRow({ weight: 0.18 });
    titleRow.addText({ 
      text: 'Sound Recorder', 
      fontSize: 0.08, 
      fontColor: '#4ecdc4' 
    });

    const statusRow = mainGrid.addRow({ weight: 0.15 });
    this.statusText = statusRow.addText({
      text: 'Click mic to record',
      fontSize: 0.05,
      fontColor: '#ffe66d'
    });

    mainGrid.addRow({ weight: 0.1 });

    const controlRow = mainGrid.addRow({ weight: 0.35 });

    {
      const recordCol = controlRow.addCol({ weight: 0.4 });
      this.recordBtn = recordCol.addIconButton({
        text: 'mic',
        fontSize: 0.5,
      });

      this.recordBtn.onTriggered = () => {
        this.toggleRecording();
      };
    }

    {
      const volDownCol = controlRow.addCol({ weight: 0.2 });
      const volDownBtn = volDownCol.addIconButton({
        text: 'remove',
        fontSize: 0.5,
      });

      volDownBtn.onTriggered = () => {
        this.adjustVolume(-0.1);
      };
    }

    {
      const volDisplayCol = controlRow.addCol({ weight: 0.2 });
      this.volumeText = volDisplayCol.addText({
        text: '100%',
        fontSize: 0.5,
        fontColor: '#4ecdc4'
      });
    }

    {
      const volUpCol = controlRow.addCol({ weight: 0.2 });
      const volUpBtn = volUpCol.addIconButton({
        text: 'add',
        fontSize: 0.5,
      });

      volUpBtn.onTriggered = () => {
        this.adjustVolume(0.1);
      };
    }

    const bottomRow = mainGrid.addRow({ weight: 0.2 });
    bottomRow.addText({
      text: 'Click jumping balls to play',
      fontSize: 0.045,
      fontColor: '#888888'
    });

    if (this.mainPanel) {
      this.mainPanel.updateLayouts();
    }
  }

  async toggleRecording() {
    if (this.isRecording) {
      this.isRecording = false;
      this.updateStatus('Stopping recording...');
      await new Promise(resolve => setTimeout(resolve, 300));
      this.recordedAudioBuffer = xb.core.sound.stopRecording();
      
      if (this.recordedAudioBuffer && this.recordedAudioBuffer.byteLength > 0) {
        const duration = ((Date.now() - this.recordingStartTime) / 1000).toFixed(1);
        this.updateStatus(`Recorded ${duration}s - Click balls to play`);
      } else {
        this.recordedAudioBuffer = null;
        this.updateStatus('Recording failed - no data captured');
      }
      
      this.recordBtn.text = 'mic';
    } else {
      // Start recording using SDK
      try {
        await xb.core.sound.startRecording();

        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.updateStatus('Recording... Click mic again to stop');
        this.recordBtn.text = 'mic_off';
      } catch (error) {
        this.updateStatus('Recording failed - ' + error);
        this.isRecording = false;
      }
    }
  }

  async playRecording() {
    if (!this.recordedAudioBuffer) {
      this.updateStatus('No recording - click mic first!');
      return;
    }

    try {
      this.updateStatus('Playing recording...');
      
      const sampleRate = xb.core.sound.getRecordingSampleRate();
      await xb.core.sound.playRecordedAudio(this.recordedAudioBuffer, sampleRate);
      
      setTimeout(() => {
        if (!this.isRecording) {
          this.updateStatus('Click mic to record');
        }
      }, 2000);
      
    } catch (error) {
      this.updateStatus('Playback failed: ' + error);
    }
  }

  adjustVolume(delta) {
    this.currentVolume = Math.max(0, Math.min(1, this.currentVolume + delta));
    const volumePercent = Math.round(this.currentVolume * 100);
    
    xb.core.sound.setMasterVolume(this.currentVolume);
    
    if (this.volumeText) {
      this.volumeText.text = `${volumePercent}%`;
    }
    
    this.updateStatus(`Volume: ${volumePercent}%`);
  }

  updateStatus(message) {
    if (this.statusText) {
      this.statusText.text = message;
    }
  }

  onSelectStart(event) {
    const controller = event.target;
    
    this.soundBalls.forEach(ball => {
      const intersection = xb.core.user.select(ball, controller);
      if (intersection) {
        if (this.recordedAudioBuffer) {
          this.playRecordingFromBall(ball);
          this.updateStatus(`Playing from ball ${ball.userData.soundIndex + 1}`);
        } else {
          this.updateStatus('Record something first!');
        }
        
        this.pulseBall(ball);
      }
    });
  }

  async playRecordingFromBall(ball) {
    if (!this.recordedAudioBuffer) return;

    try {
      const sampleRate = xb.core.sound.getRecordingSampleRate();
      const audioListener = xb.core.sound.getAudioListener();
      
      const audioContext = new AudioContext({ sampleRate: sampleRate });
      
      const int16Data = new Int16Array(this.recordedAudioBuffer);
      const audioBuffer = audioContext.createBuffer(1, int16Data.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Data.length; i++) {
        channelData[i] = int16Data[i] / 32768.0;
      }
      
      const positionalAudio = new THREE.PositionalAudio(audioListener);
      positionalAudio.setBuffer(audioBuffer);
      positionalAudio.setRefDistance(0.5);
      positionalAudio.setRolloffFactor(2.0);
      positionalAudio.setVolume(this.currentVolume);
      
      ball.add(positionalAudio);
      positionalAudio.play();
      
      positionalAudio.onEnded = () => {
        ball.remove(positionalAudio);
        audioContext.close();
      };
      
    } catch (error) {
      this.updateStatus('Play recording from ball failed: ' + error);
    }
  }

  pulseBall(ball) {
    const originalScale = ball.scale.clone();
    const targetScale = originalScale.clone().multiplyScalar(1.3);
    const startTime = Date.now();
    const duration = 200;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 0.5) {
        const t = progress * 2;
        ball.scale.lerpVectors(originalScale, targetScale, t);
      } else {
        const t = (progress - 0.5) * 2;
        ball.scale.lerpVectors(targetScale, originalScale, t);
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ball.scale.copy(originalScale);
      }
    };
    
    animate();
  }

  update() {
    this.soundBalls.forEach((ball, index) => {
      ball.rotation.y += 0.01 * (index + 1);
      
      if (this.recordedAudioBuffer) {
        this.ballJumpPhase += 0.01;
        const jumpHeight = 0.08;
        const baseHeight = xb.user.height * 0.5;
        const jumpOffset = Math.abs(Math.sin(this.ballJumpPhase + index * Math.PI / 3)) * jumpHeight;
        ball.position.y = baseHeight + jumpOffset;
        
        const targetScale = 1.1;
        ball.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      } else {
        const baseHeight = xb.user.height * 0.5;
        ball.position.y = baseHeight;
        ball.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    });
  }

  destroy() {
    if (this.isRecording) {
      xb.core.sound.disableAudio();
    }
    super.destroy();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const options = new xb.Options();
  options.reticles.enabled = true;
  options.controllers.visualizeRays = true;
  
  xb.add(new SoundDemoScript());
  xb.init(options);
});


