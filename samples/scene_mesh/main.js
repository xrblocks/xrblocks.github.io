import 'xrblocks/addons/simulator/SimulatorAddons.js';

import * as THREE from 'three';
import * as xb from 'xrblocks';

// Scene Mesh sample.
//
// This uses the same approach as plane detection: the app only enables the
// feature, and the SDK supplies the data. On a real Android XR device the
// MeshDetector reads `frame.detectedMeshes`; in the desktop simulator,
// SimulatorWorld extracts the ground-truth geometry of the loaded environment
// GLTF and injects it via MeshDetector.setSimulatorMeshes(). Either way the
// generated mesh lives at `xb.core.world.meshes`.
//
// It mirrors the depthmesh sample's capabilities: a hemisphere light and a
// freestanding opacity slider driven by pinch/click + drag on a controller.
class SceneMeshVisualizer extends xb.Script {
  currentSliderController = null;
  sceneMeshAlphaSlider = new xb.FreestandingSlider(
    /*start=*/ 1.0,
    /*min=*/ 0.0,
    /*max=*/ 1.0,
    /*scale*/ 5.0
  );
  opacity = 1.0;

  constructor() {
    super();
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
    light.position.set(0.5, 1, 0.25);
    this.add(light);
  }

  init() {
    this.opacity = this.sceneMeshAlphaSlider.startingValue;
  }

  // Applies the current opacity to every detected scene mesh material. The
  // MeshDetector's debug materials are shared across meshes, so this is cheap
  // and stays correct as meshes stream in (real device) or are injected once
  // (simulator).
  setSceneMeshOpacity(opacity) {
    const meshes = xb.core?.world?.meshes;
    if (!meshes) return;
    meshes.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        material.transparent = true;
        material.opacity = opacity;
      }
    });
  }

  onSelectStart(event) {
    this.currentSliderController = event.target;
    this.sceneMeshAlphaSlider.setInitialPoseFromController(
      this.currentSliderController
    );
  }

  onSelectEnd(event) {
    const controller = event.target;
    if (this.currentSliderController == controller) {
      this.opacity = this.sceneMeshAlphaSlider.getValueFromController(
        this.currentSliderController
      );
      this.sceneMeshAlphaSlider.updateValue(this.opacity);
    }
    this.currentSliderController = null;
  }

  update() {
    if (this.currentSliderController) {
      this.opacity = this.sceneMeshAlphaSlider.getValueFromController(
        this.currentSliderController
      );
    }
    this.setSceneMeshOpacity(this.opacity);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const options = new xb.Options();
  options.setAppTitle('Scene Mesh');
  options.world.enableMeshDetection();
  options.world.meshes.showDebugVisualizations = true;
  xb.add(new SceneMeshVisualizer());
  xb.init(options);
});
