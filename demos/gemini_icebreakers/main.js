import 'xrblocks/addons/simulator/SimulatorAddons.js';

import * as xb from 'xrblocks';

import {GeminiIcebreakers} from './GeminiIcebreakers.js';

const options = new xb.Options({
  antialias: true,
  reticles: {enabled: true},
  visualizeRays: true,
});
options.enableAI();
options.enableCamera();
// Request microphone permission before entering XR.
options.permissions.microphone = true;

async function start() {
  xb.add(new GeminiIcebreakers());
  await xb.init(options);
}

document.addEventListener('DOMContentLoaded', function () {
  start();
});
