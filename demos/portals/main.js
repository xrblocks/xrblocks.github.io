import 'xrblocks/addons/simulator/SimulatorAddons.js';

import * as xb from 'xrblocks';

import {PortalGalleryScene} from './PortalGalleryScene.js';

const options = new xb.Options();
options.enableUI();
options.reticles.enabled = true;

// Real-world depth mesh so the portal can be placed on a wall/floor and the
// galaxy hides behind real geometry around the rim.
options.depth = new xb.DepthOptions(xb.xrDepthMeshOptions);
options.depth.depthTexture.enabled = true;
options.depth.occlusion.enabled = true;

options.xrButton.startText = '<i id="xrlogo"></i> OPEN A PORTAL';
options.xrButton.endText = '<i id="xrlogo"></i> CLOSE PORTAL';

async function start() {
  xb.add(new PortalGalleryScene());
  await xb.init(options);
}

document.addEventListener('DOMContentLoaded', start);
