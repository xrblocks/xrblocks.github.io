import 'xrblocks/addons/simulator/SimulatorAddons.js';

import * as xb from 'xrblocks';

import {GameRps} from './GameRps.js';

const options = new xb.Options();
options.enableReticles();
options.enableHands();
options.simulator.defaultMode = xb.SimulatorMode.POSE;
options.simulator.defaultHand = xb.Handedness.RIGHT;
options.setAppTitle('Rock Paper Scissors');

async function start() {
  xb.add(new GameRps());
  await xb.init(options);
}

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    start();
  }, 200);
});
