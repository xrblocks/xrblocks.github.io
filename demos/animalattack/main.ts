import 'xrblocks/addons/simulator/SimulatorAddons.js';
import * as xb from 'xrblocks';
import {AnimalOcclusionScene} from './animal_occlusion_scene.js';
async function startApp() {
  const options = new xb.Options();
  options.enableUI();
  options.reticles.enabled = true;
  options.depth = new xb.DepthOptions(xb.xrDepthMeshOptions);
  const {depthMesh, depthTexture, occlusion} = options.depth;

  depthMesh.updateFullResolutionGeometry = true;
  depthMesh.renderShadow = true;
  depthTexture.enabled = true;
  occlusion.enabled = true;
  options.xrButton.startText = '<i id="xrlogo"></i> PLAY ANIMALS';
  options.xrButton.endText = '<i id="xrlogo"></i> MISSION COMPLETE';
  xb.add(new AnimalOcclusionScene());
  await xb.init(options);
}
document.addEventListener('DOMContentLoaded', startApp);
