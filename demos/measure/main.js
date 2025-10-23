import 'xrblocks/addons/simulator/SimulatorAddons.js';

import * as xb from 'xrblocks';

import {MeasureScene} from './MeasureScene.js';

const options = new xb.Options({
  antialias: true,
  reticles: {enabled: true},
  visualizeRays: true,
  depth: xb.xrDepthMeshPhysicsOptions,
});

function start() {
  xb.add(new MeasureScene());
  xb.init(options);
}

document.addEventListener('DOMContentLoaded', function () {
  start();
});
