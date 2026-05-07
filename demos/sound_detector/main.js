import 'xrblocks/addons/simulator/SimulatorAddons.js';
import * as xb from 'xrblocks';
import {LongSelectHandler} from 'xrblocks/addons/ui/LongSelectHandler.js';
import {SoundDisplay} from './SoundDisplay.js';

const options = new xb.Options();
options.world.enabled = true;
options.hands.enabled = true;

options.world.sounds.enabled = true;
options.world.sounds.backendConfig.activeBackend = 'mediapipe';
options.world.sounds.showDebugInfo = false;

options.setAppTitle('Sound Detector Demo');
options.setAppDescription(
  'Detects and classifies sounds from mic input, displaying results in HUD.'
);
options.xrButton.showEnterSimulatorButton = true;

function start() {
  const display = new SoundDisplay();

  const longSelectHandler = new LongSelectHandler(() => {
    if (display.world.sounds) {
      if (display.world.sounds.isListening) {
        display.world.sounds.stopListening();
        display.hudText.text = 'Stopped listening';
      } else {
        display.hudText.text = 'Listening...';
        display.world.sounds.startListening();
      }
      display.hudText.sync();
    }
  });

  xb.add(display);
  xb.add(longSelectHandler);
  xb.init(options);
}

document.addEventListener('DOMContentLoaded', function () {
  start();
});
