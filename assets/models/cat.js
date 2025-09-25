import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

class Cat {
  /**
   * Initializes a new instance of the Cat class.
   */
  constructor() {
    if (Cat.instance_) {
      return Cat.instance_;
    }

    this.clock_ = new THREE.Clock();
    this.mixer_ = null;
    this.model_ = null;
    this.positionOffset_ = new THREE.Vector3(0.0, 0.0, 0.0);

    Cat.instance_ = this;
  }

  /**
   * Initializes the cat's properties.
   * @param {THREE.Scene} scene scene
   * @param {THREE.Renderer} renderer renderer
   * @param {THREE.Camera} camera camera
   */
  init(scene, renderer, camera, visible = true, addTexture = true) {
    new RGBELoader()
        .setPath('../textures/')
        .load('royal_esplanade_1k.hdr', function(texture) {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          if (addTexture) {
            scene.environment = texture;
          }
          renderer.render(scene, camera);

          // Loads GLTF model.
          const loader = new GLTFLoader().setPath('../models/Cat/');
          loader.load('cat.gltf', async function(gltf) {
            const animations = gltf.animations;
            // console.log('animations');
            // console.log(animations);

            Cat.instance_.mixer_ = new THREE.AnimationMixer(gltf.scene);
            gltf.animations.forEach((clip) => {
              Cat.instance_.mixer_.clipAction(clip).play();
            });

            Cat.instance_.model_ = gltf.scene;
            // Waits until the model can be added to the scene without blocking
            // to shader compilation
            await renderer.compileAsync(Cat.instance_.model_, camera, scene);
            Cat.instance_.model_.position.set(0, 1.5, -0.55);
            Cat.instance_.model_.scale.set(0.7, 0.7, 0.7);
            Cat.instance_.model_.visible = visible;
            scene.add(Cat.instance_.model_);
            renderer.render(scene, camera);
          });
        });
  }

  /**
   * Updates the cat's animation.
   */
  update() {
    let delta = this.clock_.getDelta();
    if (this.mixer_) this.mixer_.update(delta);
  }
}

export default Cat;
