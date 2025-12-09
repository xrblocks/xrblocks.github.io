import * as THREE from 'three';
import * as xb from 'xrblocks';

import {DepthVisualizationPass} from './DepthVisualizationPass.js';

export class DepthMapScene extends xb.Script {
  init() {
    if (xb.core.effects) {
      this.depthVisPass = new DepthVisualizationPass(xb.scene, xb.core.camera);
      xb.core.effects.addPass(this.depthVisPass);
    } else {
      console.error(
        'This sample needs post processing for adding the depth visualization pass. Please enable options.usePostprocessing'
      );
    }

    this.depthMeshAlphaSlider = new xb.FreestandingSlider(
      /*start=*/ 1.0,
      /*min=*/ 0.0,
      /*max=*/ 1.0,
      /*scale*/ 5.0
    );
    // Which controller is currently selecting depthMeshAlphaSlider.
    this.currentSliderController = null;

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    this.add(light);
  }

  onSelectStart(event) {
    const controller = event.target;
    controller.userData.selected = true;
    this.currentSliderController = controller;
    this.depthMeshAlphaSlider.setInitialPose(
      controller.position,
      controller.quaternion
    );
  }

  onSelectEnd(event) {
    const controller = event.target;
    controller.userData.selected = false;
    if (this.currentSliderController == controller) {
      const opacity = this.depthMeshAlphaSlider.getValueFromController(
        this.currentSliderController
      );
      this.depthVisPass.setAlpha(opacity);
      this.depthMeshAlphaSlider.updateValue(opacity);
    }
    this.currentSliderController = null;
  }

  update() {
    if (this.currentSliderController) {
      const opacity = this.depthMeshAlphaSlider.getValueFromController(
        this.currentSliderController
      );
      this.depthVisPass.setAlpha(opacity);
    }
    this.depthVisPass.updateEnvironmentalDepthTexture(xb.core.depth);
  }
}
