import * as THREE from 'three';
import * as xb from 'xrblocks';

import {MeasuringTape} from './MeasuringTape.js';

const palette = [0x0F9D58, 0xF4B400, 0x4285F4, 0xDB4437];

export class MeasureScene extends xb.Script {
  activeMeasuringTapes = new Map();
  currentColorIndex = 0;

  init() {
    xb.showReticleOnDepthMesh(true);
    this.setupLights();
  }

  setupLights() {
    const light = new THREE.DirectionalLight(0xffffff, 2.0);
    light.position.set(0.5, 1, 0.866);
    this.add(light);
    const light2 = new THREE.DirectionalLight(0xffffff, 1.0);
    light2.position.set(-1, 0.5, -0.5);
    this.add(light2);
    const light3 = new THREE.AmbientLight(0x404040, 2.0);
    this.add(light3);
  }

  onSelectStart(event) {
    const controller = event.target;
    const intersections =
        xb.core.input.intersectionsForController.get(controller);
    if (intersections.length == 0) return;
    if (this.activeMeasuringTapes.has(controller)) {
      this.remove(this.activeMeasuringTapes.get(controller));
    }
    const closestIntersection = intersections[0];
    const color = palette[this.currentColorIndex];
    this.currentColorIndex = (this.currentColorIndex + 1) % palette.length;
    const measuringTape = new MeasuringTape(
        closestIntersection.point, closestIntersection.point, 0.05, color);
    this.add(measuringTape);
    this.activeMeasuringTapes.set(controller, measuringTape);
  }

  update() {
    for (const [controller, tape] of this.activeMeasuringTapes) {
      const intersections =
          xb.core.input.intersectionsForController.get(controller)
              .filter(intersection => {
                let target = intersection.object;
                while (target) {
                  if (target.ignoreReticleRaycast === true) {
                    return false;
                  }
                  target = target.parent;
                }
                return true;
              });
      if (intersections.length > 0) {
        tape.setSecondPoint(intersections[0].point);
      }
    }
  }

  onSelectEnd(event) {
    const controller = event.target;
    this.activeMeasuringTapes.delete(controller);
  }
}