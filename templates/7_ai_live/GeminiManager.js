import * as xb from 'xrblocks';
import {GeminiManager as CoreGeminiManager} from 'xrblocks/addons/ai/GeminiManager.js';

import {TranscriptionManager} from './TranscriptionManager.js';

export class GeminiManager extends CoreGeminiManager {
  constructor() {
    super();
    this.defaultText = 'Say "Start" to begin...';
  }

  init() {
    super.init();
    this.createTextDisplay();

    // Hook into events from the base class
    this.addEventListener('inputTranscription', (event) => {
      this.transcription?.handleInputTranscription(event.message);
    });
    this.addEventListener('outputTranscription', (event) => {
      this.transcription?.handleOutputTranscription(event.message);
    });
    this.addEventListener('turnComplete', () => {
      this.transcription?.finalizeTurn();
    });
    this.addEventListener('interrupted', () => {
      // Optional: handle interruption visual cues if needed
    });
  }

  async toggleGeminiLive() {
    return this.isAIRunning ? this.stopGeminiLive() : this.startGeminiLive();
  }

  async startGeminiLive() {
    try {
      await super.startGeminiLive();
      this.updateButtonState();
    } catch (error) {
      console.error('Failed to start AI session:', error);
      this.transcription?.addText(
        'Error: Failed to start AI session - ' + error.message
      );
      this.cleanup(); // Clean up on failure
      this.updateButtonState();
    }
  }

  async stopGeminiLive() {
    await super.stopGeminiLive();
    this.updateButtonState();
    this.transcription?.clear();
    this.transcription?.setText(this.defaultText);
  }

  createTextDisplay() {
    this.textPanel = new xb.SpatialPanel({
      width: 3,
      height: 1.5,
      backgroundColor: '#1a1a1abb',
    });
    const grid = this.textPanel.addGrid();

    const responseDisplay = new xb.ScrollingTroikaTextView({
      text: this.defaultText,
      fontSize: 0.03,
      textAlign: 'left',
    });
    grid.addRow({weight: 0.7}).add(responseDisplay);
    this.transcription = new TranscriptionManager(responseDisplay);

    this.toggleButton = grid.addRow({weight: 0.3}).addTextButton({
      text: '▶ Start',
      fontColor: '#ffffff',
      backgroundColor: '#006644',
      fontSize: 0.2,
    });
    this.toggleButton.onTriggered = () => this.toggleGeminiLive();

    this.textPanel.position.set(0, 1.2, -2);
    this.add(this.textPanel);
  }

  updateButtonState() {
    this.toggleButton?.setText(this.isAIRunning ? '⏹ Stop' : '▶ Start');
  }
}
