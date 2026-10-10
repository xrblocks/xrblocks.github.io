// Initialize Locomotive Scroll with native browser scrolling (smooth: false prevents overflow: hidden lock)
let scroll = { on: () => {}, update: () => {}, scrollTo: (target) => {
  if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
  else if (target instanceof Element) target.scrollIntoView({ behavior: 'smooth' });
}};
try {
  if (window.LocomotiveScroll) {
    scroll = new window.LocomotiveScroll({
      el: document.querySelector('[data-scroll-container]'),
      smooth: false,
      multiplier: 1.0,
      lerp: 0.05,
      direction: 'vertical',
      gestureDirection: 'vertical',
      tablet: {smooth: false},
      smartphone: {smooth: false}
    });
  }
} catch (err) {
  console.warn('[LocomotiveScroll] Initialization skipped:', err);
}
window.locomotiveScroll = scroll;

// Update Locomotive Scroll wrapper trigger on window resize
window.addEventListener('resize', () => {
  if (scroll && scroll.update) scroll.update();
});

// Update scroll calculations once window assets are fully loaded
window.addEventListener('load', () => {
  if (scroll && scroll.update) scroll.update();
});

// ----------------------------------------------------
// 1. THREE.JS 3D BACKGROUND SCENE SETUP
// ----------------------------------------------------

const container = document.getElementById('canvas-container');
let scene = null;
let camera = null;
let renderer = null;
let roomGroup = null;
let baseY = -0.2;

let arModel = null;
let glassesModel = null;
let vrModel = null;
let activeScene = null;
let pendingScene = null;
let transitionState = 'idle'; // 'idle', 'fading_out', 'fading_in'
let transitionProgress = 0;
let transitionRoomZ = 0;

function setModelOpacity(model, opacity) {
  if (!model) return;
  model.userData.currentOpacity = opacity;
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = opacity;
      });
    }
  });
}

function getModelOpacity(model) {
  if (!model) return 0;
  if (model.userData.currentOpacity !== undefined) {
    return model.userData.currentOpacity;
  }
  return 1.0;
}

function switchScene(targetModel) {
  if (activeScene === targetModel || pendingScene === targetModel) return;
  pendingScene = targetModel;
  transitionState = 'fading_out';
  transitionProgress = 0;
}

function debugLog(msg) {
  const isDebug = new URLSearchParams(window.location.search).has('debug');
  if (isDebug) {
    let el = document.getElementById('debug-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'debug-overlay';
      el.style.position = 'fixed';
      el.style.top = '10px';
      el.style.left = '10px';
      el.style.padding = '10px';
      el.style.background = 'rgba(0,0,0,0.85)';
      el.style.color = '#00ff00';
      el.style.fontFamily = 'monospace';
      el.style.fontSize = '12px';
      el.style.zIndex = '9999';
      el.style.whiteSpace = 'pre-wrap';
      el.style.maxWidth = '500px';
      el.style.maxHeight = '300px';
      el.style.overflowY = 'auto';
      document.body.appendChild(el);
    }
    el.textContent += msg + '\n';
    el.scrollTop = el.scrollHeight;
  }
  console.log(msg);
}

async function initThreeBackground() {
  if (!container) return;
  try {
    const [THREE, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js'),
    ]);

    scene = new THREE.Scene();

    // Camera setup (perspective to feel the 3D space)
    camera = new THREE.PerspectiveCamera(
        45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 10);

    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    // Group to hold all room meshes so we can tilt/rotate them together
    roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // ----------------------------------------------------
    // 2. PROCEDURAL 3D MESH GENERATION (Pastel Stylized Objects)
    // ----------------------------------------------------

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('libs/draco/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    console.log(
        '[Three.js] Starting GLB loader request for Designs/AR-Scene-v65.glb...');
    gltfLoader.load(
        'Designs/AR-Scene-v65.glb',
        (gltf) => {
          debugLog('[Three.js] GLB file loaded successfully!');
          arModel = gltf.scene;
          activeScene = arModel;
          debugLog(
              '[Three.js] Model child nodes parsed: ' + arModel.children.length);

          // Extract camera from GLTF scene graph recursively
          let blenderCamera = null;
          arModel.traverse((child) => {
            debugLog(
                '[Three.js] Child node: ' + child.name +
                ' | type: ' + child.type + ' | camera: ' + !!child.isCamera);
            if (child.isCamera) {
              blenderCamera = child;
            }
          });

          // Center the room model first (around its bounding box center)
          const box = new THREE.Box3().setFromObject(arModel);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          debugLog('[Three.js] BBox Size: ' + JSON.stringify(size));
          debugLog('[Three.js] BBox Center: ' + JSON.stringify(center));

          roomGroup.add(arModel);
          setModelOpacity(arModel, 1.0);

          let pivotPoint = null;

          if (blenderCamera) {
            debugLog(
                '[Three.js] Blender Camera found: ' + blenderCamera.name +
                ' fov: ' + blenderCamera.fov);

            // Reset roomGroup and model transforms BEFORE calculating camera
            // world matrices
            baseY = 0;
            roomGroup.scale.set(1.0, 1.0, 1.0);
            roomGroup.position.set(0, baseY, 0);
            arModel.position.set(0, 0, 0);
            arModel.updateMatrixWorld(true);

            const initialWorldPos = new THREE.Vector3();
            const initialWorldQuat = new THREE.Quaternion();
            blenderCamera.getWorldPosition(initialWorldPos);
            blenderCamera.getWorldQuaternion(initialWorldQuat);

            // Sync camera matrices
            camera.fov = blenderCamera.fov;
            camera.near = blenderCamera.near;
            camera.far = blenderCamera.far;
            camera.updateProjectionMatrix();

            const cameraDirection =
                new THREE.Vector3(0, 0, -1).applyQuaternion(initialWorldQuat);
            const pivotDistance = 4.8;  // Distance to the round coffee table
            pivotPoint = initialWorldPos.clone().add(
                cameraDirection.clone().multiplyScalar(pivotDistance));

            debugLog(
                '[Three.js] Pivot point set to: ' + JSON.stringify(pivotPoint));

            // Place the pivot point at roomGroup's origin (0, 0, 0)
            arModel.position.copy(pivotPoint).multiplyScalar(-1);

            // Apply the visual screen layout offset to roomGroup container rather
            // than pivotPoint itself
            roomGroup.position.x = 1.1;
            baseY = -0.05;
            roomGroup.position.y = baseY;

            // Sync Three.js camera position AFTER the model shift
            arModel.updateMatrixWorld(true);
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            blenderCamera.getWorldPosition(worldPos);
            blenderCamera.getWorldQuaternion(worldQuat);

            camera.position.copy(worldPos);
            camera.quaternion.copy(worldQuat);
            debugLog(
                '[Three.js] Camera world pos synced: ' +
                JSON.stringify(worldPos));
          } else {
            debugLog('[Three.js] No camera node found in GLTF scene graph.');
            arModel.position.sub(center);
            arModel.position.y = -0.4;
            arModel.rotation.y = Math.PI * 0.15;
          }

          console.log('[Three.js] Model added and centered successfully.');

          // Load supplementary scenes passing the synced pivot point
          loadGlassesModel(pivotPoint);
          loadVRModel(pivotPoint);

          // Trigger scroll layout recalculation once model is loaded
          if (scroll && scroll.update) scroll.update();
        },
        (xhr) => {
          if (xhr.total > 0) {
            debugLog(
                '[Three.js] Loading progress: ' +
                Math.round(xhr.loaded / xhr.total * 100) + '%');
          }
        },
        (error) => {
          debugLog(
              '[Three.js] Error loading Blender scene: ' +
              (error.message || error));
          console.error(
              '[Three.js] Error loading Blender scene:', error.message || error);
        });

    function loadGlassesModel(pivotPoint) {
      console.log(
          '[Three.js] Starting GLB loader request for Designs/Glasses-Scene.glb...');
      gltfLoader.load(
          'Designs/Glasses-Scene.glb',
          (gltf) => {
            debugLog('[Three.js] Glasses GLB loaded successfully!');
            glassesModel = gltf.scene;

            // Position it using the same pivot point or fallback
            if (pivotPoint) {
              glassesModel.position.copy(pivotPoint).multiplyScalar(-1);
            } else {
              const box = new THREE.Box3().setFromObject(glassesModel);
              const center = box.getCenter(new THREE.Vector3());
              glassesModel.position.sub(center);
              glassesModel.position.y = -0.4;
              glassesModel.rotation.y = Math.PI * 0.15;
            }

            roomGroup.add(glassesModel);
            glassesModel.visible = false;
            setModelOpacity(glassesModel, 0.0);

            debugLog('[Three.js] Glasses model added and positioned.');
          },
          (xhr) => {},
          (error) => {
            console.error('[Three.js] Error loading Glasses scene:', error);
          });
    }

    function loadVRModel(pivotPoint) {
      console.log(
          '[Three.js] Starting GLB loader request for Designs/VR-Scene.glb...');
      gltfLoader.load(
          'Designs/VR-Scene.glb',
          (gltf) => {
            debugLog('[Three.js] VR GLB loaded successfully!');
            vrModel = gltf.scene;

            // Position it using the same pivot point or fallback
            if (pivotPoint) {
              vrModel.position.copy(pivotPoint).multiplyScalar(-1);
            } else {
              const box = new THREE.Box3().setFromObject(vrModel);
              const center = box.getCenter(new THREE.Vector3());
              vrModel.position.sub(center);
              vrModel.position.y = -0.4;
              vrModel.rotation.y = Math.PI * 0.15;
            }

            roomGroup.add(vrModel);
            vrModel.visible = false;
            setModelOpacity(vrModel, 0.0);

            debugLog('[Three.js] VR model added and positioned.');
          },
          (xhr) => {},
          (error) => {
            console.error('[Three.js] Error loading VR scene:', error);
          });
    }

    // Scale roomGroup to make it fill the hero viewport by default (fallback
    // values)
    roomGroup.scale.set(2.2, 2.2, 2.2);

    // Position the entire room group in camera view by default
    roomGroup.position.set(0, baseY, 0);
  } catch (err) {
    console.warn('[Three.js] WebGL 3D background unavailable on this display; continuing with 2D UI:', err);
    renderer = null;
  }
}
initThreeBackground();

// CTA button hover state tracker for camera zoom parallax
let isCtaHovered = false;
let currentRoomZ = 0;
let zVelocity = 0;
const ctaBtn = document.querySelector('.cta-btn');
const ctaBtns = document.querySelectorAll('.cta-btn');
ctaBtns.forEach((btn) => {
  btn.addEventListener('mouseenter', () => {
    isCtaHovered = true;
  });
  btn.addEventListener('mouseleave', () => {
    isCtaHovered = false;
  });
});

// Carousel Drag-to-Scroll state variables (declared here to avoid TDZ in animate loop)
let isDraggingCarousel = false;
let startX;
let carouselTargetScroll = 0;
let carouselCurrentScroll = 0;
let carouselVelocity = 0;
let prevPageX = 0;
let scrollLeftStart = 0;

// Infinite scroll layout calculations
let cardStep = 0;
let originalWidth = 0;
let bufferOffset = 0;
let indent = 0;

// ----------------------------------------------------
// 3. CURSOR MOVEMENT TILT / PARALLAX INTERACTION
// ----------------------------------------------------

let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

window.addEventListener('mousemove', (event) => {
  // Normalize values between -1 and 1
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// ----------------------------------------------------
// 4. SCROLL INTERACTIVITY
// ----------------------------------------------------

const heroSection = document.getElementById('hero');
const videoSection = document.getElementById('video');
const carouselSection = document.getElementById('carousel-section');
const showcaseHeader = document.querySelector('.showcase-header');
const carouselContainer = document.querySelector('.carousel-container');

let targetScrollY = 0;
let currentScrollY = 0;

let isTransitioningView = false;

function handleScroll(scrollY) {
  const height = window.innerHeight;

  if (document.body.classList.contains('experiments-view-active')) {
    if (container) container.style.filter = 'blur(60px) saturate(0.6)';
    return;
  }

  if (isTransitioningView) {
    return;
  }

  // A. Hero Section Fading out + Blur Background
  const heroProgress = Math.min(scrollY / height, 1.0);
  if (heroSection) {
    heroSection.style.opacity = (1 - heroProgress * 1.5).toString();
    heroSection.style.transform = `translateY(${heroProgress * -60}px)`;
  }

  // Add blur/shift/parallax to 3D Background (blur interpolates from 100px to
  // 900px scroll height)
  const blurProgress = Math.max(0, Math.min(1.0, (scrollY - 100) / 800));
  const blurAmount = blurProgress * 60;
  if (container) {
    container.style.filter =
        `blur(${blurAmount}px) saturate(${1.0 - heroProgress * 0.4})`;
  }
  targetScrollY = scrollY;

  // Video browser frame zoom scroll effect based on bounding box viewport entry
  if (videoSection) {
    videoSection.classList.add('visible');
    const rect = videoSection.getBoundingClientRect();
    const startY = height;       // enters from viewport bottom
    const endY = height * 0.15;  // centers in viewport
    const videoProgress =
        Math.max(0, Math.min(1, (startY - rect.top) / (startY - endY)));
    const videoScale = 0.88 + (videoProgress * 0.12);  // scales from 0.88 to 1.0
    const videoFrame = document.querySelector('.video-browser-frame');
    if (videoFrame) {
      videoFrame.style.transform = `scale(${videoScale})`;
    }

    // B. Hide scroll indicator arrow once the user starts scrolling down
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollY > 10) {
      if (scrollIndicator) {
        scrollIndicator.classList.add('hidden');
      }
    } else {
      if (scrollIndicator) {
        scrollIndicator.classList.remove('hidden');
      }
    }
  }
}

scroll.on('scroll', (obj) => {
  if (obj && obj.scroll && typeof obj.scroll.y === 'number') {
    handleScroll(obj.scroll.y);
  }
});

window.addEventListener('scroll', () => {
  handleScroll(window.scrollY || window.pageYOffset || 0);
}, { passive: true });

// Premium Scroll Entrance Animation Observer (IntersectionObserver)
const observerOptions = {
  root: null, // viewport
  rootMargin: '0px',
  threshold: 0.15 // trigger when 15% of the element is visible
};

const entranceObserver = new IntersectionObserver((entries) => {
  if (document.body.classList.contains('experiments-view-active') ||
      isTransitioningView) {
    return;
  }
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// Observe all fade-in elements (Hero copy, showcase titles, newsletter copy)
document.querySelectorAll('.scroll-fade').forEach((el) => {
  el.classList.add('visible');
  entranceObserver.observe(el);
});

if (videoSection) {
  videoSection.classList.add('visible');
  entranceObserver.observe(videoSection);
}

if (carouselContainer) {
  carouselContainer.classList.add('visible');
  entranceObserver.observe(carouselContainer);
}

// Global scroll indicator click handler
window.handleScrollIndicatorClick = () => {
  window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
};

// Clone carousel cards for infinite scroll loop
let carouselCardCount = 0;
let carouselCloneCount = 0;
let carouselCardWidth = 428;

function updateCarouselMetrics(resetScroll = false) {
  if (!carouselContainer || carouselCardCount === 0) return;
  const cardElement = carouselContainer.querySelector('.carousel-card');
  if (!cardElement) return;
  const cardWidth = cardElement.offsetWidth || 428;
  carouselCardWidth = cardWidth;
  const gap = parseFloat(window.getComputedStyle(carouselContainer).gap) || 36;
  cardStep = cardWidth + gap;
  originalWidth = cardStep * carouselCardCount;
  bufferOffset = cardStep * carouselCloneCount;
  const totalCardsSpan = originalWidth - gap;
  indent = (window.innerWidth - totalCardsSpan) / 2;

  if (resetScroll) {
    const initialScroll = bufferOffset - indent;
    carouselContainer.scrollLeft = initialScroll;
    carouselCurrentScroll = initialScroll;
    carouselTargetScroll = initialScroll;
  }
}

if (carouselContainer) {
  const originalCards = Array.from(carouselContainer.children);
  const cardCount = originalCards.length;
  carouselCardCount = cardCount;

  if (cardCount > 0) {
    const cloneCount = cardCount;
    carouselCloneCount = cloneCount;

    // Append clones to end
    for (let i = 0; i < cloneCount; i++) {
      const clone = originalCards[i % cardCount].cloneNode(true);
      carouselContainer.appendChild(clone);
    }
    
    // Prepend clones to start (in reverse order to preserve visual sequence)
    for (let i = 0; i < cloneCount; i++) {
      const index = cardCount - 1 - (i % cardCount);
      const clone = originalCards[index].cloneNode(true);
      carouselContainer.insertBefore(clone, carouselContainer.firstChild);
    }

    // Ensure all videos (originals + clones) auto-play muted in loop
    carouselContainer.querySelectorAll('video').forEach((vid) => {
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playsInline = true;
      vid.loop = true;
      vid.autoplay = true;
      vid.play().catch(() => {});
    });

    // Measure offsets dynamically and center the 5-card sequence
    updateCarouselMetrics(true);
  }
}

// Update Locomotive Scroll calculations since cards were dynamically cloned
scroll.update();

const cards = document.querySelectorAll('.carousel-card');

cards.forEach((card) => {
  card.addEventListener('mouseenter', () => {
    cards.forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
  });
});

// ----------------------------------------------------
// 6. RENDER LOOP (Animations & Lerp Tilt)
// ----------------------------------------------------

const animStartTime = performance.now();

const animate = () => {
  requestAnimationFrame(animate);

  const time = (performance.now() - animStartTime) * 0.001;

  if (roomGroup && renderer && scene && camera) {
    // Disable camera rotation on hover when scrolled past the hero section
    const isPastHero = currentScrollY >= window.innerHeight;
    const hoverTargetX = isPastHero ? 0 : mouseX * 0.0875;
    const hoverTargetY = isPastHero ? 0 : mouseY * 0.04375;

    targetX += (hoverTargetX - targetX) * 0.05;
    targetY += (hoverTargetY - targetY) * 0.05;

    roomGroup.rotation.y = targetX;
    roomGroup.rotation.x = -targetY;

    // Parallax Scroll the 3D room group up smoothly + add gentle floating wave
    currentScrollY += (targetScrollY - currentScrollY) * 0.08;
    roomGroup.position.y =
        baseY + (currentScrollY * 0.00021) + Math.sin(time * 0.45) * 0.05;

    // Zoom in towards camera when CTA button is hovered (organic spring physics
    // with snappy ease-in and long ease-out)
    const targetRoomZ = isCtaHovered ? 0.22 : 0;
    const zDelta = targetRoomZ - currentRoomZ;
    zVelocity +=
        zDelta * 0.0025;  // Snappier spring constant to minimize initial lag
    zVelocity *= 0.88;    // 12% drag per frame to slowly ease-out and stabilize
    currentRoomZ += zVelocity;
    roomGroup.position.z = currentRoomZ + transitionRoomZ;

    // Update scene transition opacities and zoom
    if (transitionState === 'fading_out') {
      if (activeScene) {
        transitionProgress +=
            0.045;  // Snappy fade-out (takes ~22 frames / ~0.36s)
        if (transitionProgress >= 1.0) {
          transitionProgress = 1.0;
          setModelOpacity(activeScene, 0);
          activeScene.visible = false;

          activeScene = pendingScene;
          pendingScene = null;

          if (activeScene) {
            activeScene.visible = true;
            transitionProgress = 0;
            setModelOpacity(activeScene, 0);
            transitionRoomZ = -0.12;  // Start further away from camera
                                      // (zoomed-out) to zoom IN
            transitionState = 'fading_in';
          } else {
            transitionRoomZ = 0;
            transitionState = 'idle';
          }
        } else {
          const t = transitionProgress;
          const eased = 1 - Math.pow(1 - t, 3);  // EaseOutCubic
          setModelOpacity(activeScene, 1 - eased);
        }
      } else {
        activeScene = pendingScene;
        pendingScene = null;
        if (activeScene) {
          activeScene.visible = true;
          transitionProgress = 0;
          setModelOpacity(activeScene, 0);
          transitionRoomZ = -0.12;  // Start further away to zoom in
          transitionState = 'fading_in';
        } else {
          transitionRoomZ = 0;
          transitionState = 'idle';
        }
      }
    } else if (transitionState === 'fading_in') {
      if (activeScene) {
        transitionProgress +=
            0.008;  // Elongate zoom-in to last 2 seconds (~125 frames)
        if (transitionProgress >= 1.0) {
          transitionProgress = 1.0;
          setModelOpacity(activeScene, 1.0);
          transitionRoomZ = 0;  // Reset exactly to 0
          transitionState = 'idle';
        } else {
          const t = transitionProgress;
          // Fade in and zoom in using EaseOutCubic for a soft and smooth
          // deceleration
          const eased = 1 - Math.pow(1 - t, 3);
          setModelOpacity(activeScene, eased);

          // Zoom in along Z axis (-0.12 -> 0) with EaseOutCubic
          transitionRoomZ = -0.12 * (1 - eased);
        }
      } else {
        transitionRoomZ = 0;
        transitionState = 'idle';
      }
    }

    renderer.render(scene, camera);
  }

  // Update Carousel Drag-to-Scroll physics (easing & inertia momentum +
  // infinite wrap-around)
  if (carouselContainer) {
    const minThreshold = (bufferOffset - indent) - originalWidth * 0.5;
    if (isDraggingCarousel) {
      // Direct synchronization eliminating latency
      carouselCurrentScroll = carouselTargetScroll;
      carouselContainer.scrollLeft = carouselCurrentScroll;
    } else if (Math.abs(carouselVelocity) > 0.015) {
      // Inertia slide with deceleration (calibrated to the scaled velocity
      // base)
      carouselCurrentScroll -= carouselVelocity * 3.0;
      carouselVelocity *= 0.94;

      if (cardStep && originalWidth) {
        if (carouselCurrentScroll < minThreshold) {
          carouselCurrentScroll += originalWidth;
          carouselTargetScroll += originalWidth;
          scrollLeftStart += originalWidth;
        } else if (carouselCurrentScroll > minThreshold + originalWidth) {
          carouselCurrentScroll -= originalWidth;
          carouselTargetScroll -= originalWidth;
          scrollLeftStart -= originalWidth;
        }
      }
      carouselContainer.scrollLeft = carouselCurrentScroll;
    } else {
      // Sync with native trackpad / touch horizontal scroll and wrap infinitely
      carouselCurrentScroll = carouselContainer.scrollLeft;
      if (cardStep && originalWidth) {
        if (carouselCurrentScroll < minThreshold) {
          carouselCurrentScroll += originalWidth;
          carouselContainer.scrollLeft = carouselCurrentScroll;
        } else if (carouselCurrentScroll > minThreshold + originalWidth) {
          carouselCurrentScroll -= originalWidth;
          carouselContainer.scrollLeft = carouselCurrentScroll;
        }
      }
      carouselTargetScroll = carouselCurrentScroll;
    }

    // Apply subtle 3D concave curve (inward rotation + positive Z toward camera
    // only near viewport edges)
    if (cardStep > 0 && cards.length > 0) {
      const halfViewport = window.innerWidth * 0.5;
      const isMobileView = window.innerWidth <= 768;
      const maxRotateDeg = isMobileView ? 8 : 12;
      const maxTranslateZ = isMobileView ? 18 : 32;
      const edgeStart = isMobileView ? 0.45 : 0.55;
      const edgeSpan = 0.65;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const cardCenterX =
            i * cardStep + carouselCardWidth * 0.5 - carouselCurrentScroll;
        const normalizedX =
            halfViewport > 0 ? (cardCenterX - halfViewport) / halfViewport : 0;
        const absNorm = Math.abs(normalizedX);
        const edgeProgress =
            Math.max(0, Math.min(1.2, (absNorm - edgeStart) / edgeSpan));
        const easedEdge = Math.pow(edgeProgress, 1.5);
        const rotateY = -Math.sign(normalizedX) * easedEdge * maxRotateDeg;
        const translateZ = easedEdge * maxTranslateZ;
        card.style.transformOrigin = '50% 50%';
        card.style.transform = `perspective(1400px) translate3d(0, 0, ${
            translateZ.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg)`;
      }
    }
  }
};

animate();

// ----------------------------------------------------
// 7. HEADER NAVIGATION PILL SLIDER (Live Layout Tracker)
// ----------------------------------------------------
const navIndicator = document.querySelector('.nav-indicator');
const navBtns = document.querySelectorAll('.nav-btn');
const navCapsule = document.querySelector('.nav-capsule');

let trackingId = null;
let trackingStartTime = 0;

// Initialize layout coordinates
let currentLeft = 5;
let currentWidth = 70;

function updateNavIndicator(hoveredIndex = null) {
  let targetBtn = null;
  if (hoveredIndex !== null) {
    targetBtn = navBtns[hoveredIndex];
  } else {
    // Find active button
    navBtns.forEach((btn) => {
      if (btn.classList.contains('active')) targetBtn = btn;
    });
  }

  if (!targetBtn || !navIndicator) return;

  // Toggle .has-pill class to instantly synchronize text color with the black pill's coordinates
  navBtns.forEach((btn) => btn.classList.remove('has-pill'));
  targetBtn.classList.add('has-pill');

  // Start the frame tracking loop
  if (trackingId) cancelAnimationFrame(trackingId);
  trackingStartTime = Date.now();

  const track = () => {
    const elapsed = Date.now() - trackingStartTime;
    
    const targetLeft = targetBtn.offsetLeft;
    const targetWidth = targetBtn.offsetWidth;

    // Eased interpolation (lerp) for smooth sliding dynamics (slower 0.12 coefficient for highly visible sliding motion)
    currentLeft += (targetLeft - currentLeft) * 0.12;
    currentWidth += (targetWidth - currentWidth) * 0.12;

    navIndicator.style.left = `${currentLeft}px`;
    navIndicator.style.width = `${currentWidth}px`;

    // Continue loop until transition completes (350ms) and coordinates converge
    const isClose = Math.abs(targetLeft - currentLeft) < 0.15 && Math.abs(targetWidth - currentWidth) < 0.15;
    if (elapsed < 350 || !isClose) {
      trackingId = requestAnimationFrame(track);
    } else {
      // Snap to final exact coordinates on stop
      currentLeft = targetLeft;
      currentWidth = targetWidth;
      navIndicator.style.left = `${currentLeft}px`;
      navIndicator.style.width = `${currentWidth}px`;
      trackingId = null;
    }
  };

  track();
}

// Initial sync once fonts are loaded
if (document.fonts) {
  document.fonts.ready.then(() => {
    updateNavIndicator();
  });
} else {
  setTimeout(() => updateNavIndicator(), 100);
}

// Handle dynamic hover tracking for the environment selector
if (navBtns.length > 0 && navCapsule) {
  navBtns.forEach((btn, index) => {
    btn.addEventListener('mouseenter', () => {
      updateNavIndicator(index);
    });
  });

  navCapsule.addEventListener('mouseleave', () => {
    updateNavIndicator(); // Reset back to officially active button coordinates
  });
}

function updateCta(text, iconUrl, color = '') {
  if (!ctaBtn) return;
  const oldContent = ctaBtn.querySelector('.cta-content');
  if (!oldContent) return;

  const oldText = oldContent.querySelector('.cta-text').textContent;
  if (oldText === text) return;

  // Step 1: Clone existing cta-content, configure its new text and icon
  const newContent = oldContent.cloneNode(true);
  newContent.querySelector('.cta-text').textContent = text;
  newContent.querySelector('.cta-icon').style.setProperty('--icon-url', `url('${iconUrl}')`);
  if (color) {
    newContent.style.color = color;
  } else {
    newContent.style.color = '';
  }
  
  // Step 2: Prepare newContent for entry (shifted up, opacity 0)
  newContent.classList.add('animate-in-prepare');
  ctaBtn.appendChild(newContent);

  // Trigger reflow
  newContent.getBoundingClientRect();

  // Step 3: Animate oldContent out immediately
  oldContent.classList.add('animate-out');

  // Step 4: Stagger/overlap the newContent animate-in by 180ms so the button is never empty
  setTimeout(() => {
    newContent.classList.remove('animate-in-prepare');
  }, 180);

  // Step 5: Clean up oldContent from the DOM after the animation completes (500ms)
  setTimeout(() => {
    if (oldContent.parentNode) {
      oldContent.parentNode.removeChild(oldContent);
    }
  }, 500);
}

navBtns.forEach((btn, index) => {
  btn.addEventListener('mouseenter', () => {
    updateNavIndicator(index);
  });

  btn.addEventListener('click', () => {
    navBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    updateNavIndicator(index);
    
    const btnText = btn.querySelector('.btn-text').textContent.trim();
    if (btnText === 'AR') {
      switchScene(arModel);
      updateCta('Start building for AR', 'Designs/icon_AR.svg');
    } else if (btnText === 'Glasses') {
      switchScene(glassesModel);
      updateCta('Glasses coming soon', 'Designs/icon_Glasses.svg', '#888A97');
    } else if (btnText === 'VR') {
      switchScene(vrModel);
      updateCta('VR coming soon', 'Designs/icon_VR.svg', '#888A97');
    }
  });
});

if (navCapsule) {
  navCapsule.addEventListener('mouseleave', () => {
    updateNavIndicator();
  });
}

// Handle Window Resize lifecycle events
window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Re-sync navigation indicator position and carousel metrics on resize
  updateNavIndicator();
  updateCarouselMetrics(false);
});

// ----------------------------------------------------
// 8. CAROUSEL DRAG-TO-SCROLL CONTROLLER
// ----------------------------------------------------
if (carouselContainer) {
  let isDown = false;
  let hasMoved = false;

  carouselContainer.addEventListener('mousedown', (e) => {
    isDown = true;
    isDraggingCarousel = true;
    carouselContainer.classList.add('grabbing');
    startX = e.pageX - carouselContainer.offsetLeft;
    scrollLeftStart = carouselContainer.scrollLeft;
    carouselCurrentScroll = carouselContainer.scrollLeft;
    carouselTargetScroll = carouselCurrentScroll;
    carouselVelocity = 0;
    prevPageX = e.pageX;
    hasMoved = false;
  });

  carouselContainer.addEventListener('mouseleave', () => {
    isDown = false;
    isDraggingCarousel = false;
    carouselContainer.classList.remove('grabbing');
  });

  carouselContainer.addEventListener('mouseup', () => {
    isDown = false;
    isDraggingCarousel = false;
    carouselContainer.classList.remove('grabbing');
  });

  carouselContainer.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - carouselContainer.offsetLeft;
    const walk = (x - startX) * 0.4; // Tuned displacement ratio for ideal heavy glide
    carouselTargetScroll = scrollLeftStart - walk;

    // Active dragging boundary wrap-around calculated synchronously in the input thread
    if (cardStep && originalWidth) {
      const minThreshold = (bufferOffset - indent) - originalWidth * 0.5;
      if (carouselTargetScroll < minThreshold) {
        carouselTargetScroll += originalWidth;
        scrollLeftStart += originalWidth;
        startX -= originalWidth / 0.4;
      } else if (carouselTargetScroll > minThreshold + originalWidth) {
        carouselTargetScroll -= originalWidth;
        scrollLeftStart -= originalWidth;
        startX += originalWidth / 0.4;
      }
    }

    // Calculate velocity scaled to match the actual drag displacement
    carouselVelocity = (e.pageX - prevPageX) * 0.4;
    prevPageX = e.pageX;

    if (Math.abs(walk) > 5) {
      hasMoved = true;
    }
  });

  // Capture clicks on links/buttons inside the carousel to prevent navigation on drag release
  carouselContainer.addEventListener('click', (e) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true); // Capture phase to intercept before target handlers execute
}

// ----------------------------------------------------
// 9. PRESENTATION VIDEO EMBED INTERACTIVITY
// ----------------------------------------------------
const playBtn = document.querySelector('.play-btn');
const videoThumbnail = document.querySelector('.video-thumbnail');
const browserFrame = document.querySelector('.video-browser-frame');

if (playBtn && browserFrame) {
  const handlePlayVideo = () => {
    browserFrame.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/nknCzIxHHzw?autoplay=1&start=8&rel=0"
        title="Vibe Coding XR: Accelerating AI + XR Prototyping with XR Blocks and Gemini"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen>
      </iframe>
    `;
  };

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePlayVideo();
  });

  if (videoThumbnail) {
    videoThumbnail.addEventListener('click', handlePlayVideo);
  }
}

// Scroll back to the top of the page smoothly
window.handleScrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ----------------------------------------------------
// 10. HEADER DROPDOWNS, MOBILE UI & CLIENT-SIDE I18N
// ----------------------------------------------------
const langToggleBtn = document.querySelector('.lang-toggle-btn');
const langDropdownPanel = document.querySelector('.lang-dropdown-panel');
const langOptions = document.querySelectorAll('.lang-option');
const mobileLangTrigger = document.querySelector('.mobile-lang-trigger');
const mobileLangLabel = document.querySelector('.mobile-lang-label');
const shareToggleBtn = document.querySelector('.share-toggle-btn');
const shareDropdownPanel = document.querySelector('.share-dropdown-panel');
const shareOptions = document.querySelectorAll('.share-option');
const mobileShareTrigger = document.querySelector('.mobile-share-trigger');
const mobileMenuBtn = document.querySelector('.mobile-more');
const mobileMenuPanel = document.querySelector('.mobile-menu-panel');
const mobileEnvBtns = document.querySelectorAll('.mobile-env-btn');

const VALID_LANGS = new Set(['en', 'fr', 'es', 'de', 'it', 'ko']);
const langCache = {
  en: {
    "title": "XR Blocks: Build XR without code",
    "home": "Home",
    "faq": "FAQ",
    "faq_h2": "Frequently asked questions",
    "faq_q1": "What is XR Blocks?",
    "faq_a1": "XR Blocks is web-based, a cross-platform framework designed to accelerate human-centered AI+XR innovation. XR Blocks provides a modular architecture with plug-and-play components for core abstraction in AI+XR, including user representation, environmental perception, gestures, and spatial UI. Crucially, it is designed with the mission of “minimum code from idea to reality”, enabling rapid prototyping of complex AI+XR apps. Built upon accessible technologies (WebXR, three.js, TensorFlow, Gemini), our toolkit lowers the barrier to entry for researchers and designers.",
    "faq_q2": "How can I start building with XR Blocks?",
    "faq_a2": "We recommend you to fork our GitHub repository (https://github.com/google/xrblocks), browse each template (https://xrblocks.github.io/docs/templates/Basic) and sample (https://xrblocks.github.io/docs/samples/ModelViewer) project, and then start coding while referring to the manual. For vibe coders, feel free to try out our Gemini Gem (https://xrblocks.github.io/gem), and start building AI + XR apps on Android XR devices or desktop.",
    "faq_q3": "What is Android XR?",
    "faq_a3": "XR stands for extended reality. It’s an umbrella term that encompasses all technologies that blend the real and virtual worlds including virtual reality, augmented reality, and mixed reality. Android XR is an operating system for extended reality devices that use these technologies, like headsets and glasses. It provides the user interface, the ability to access popular apps, and AI assistance from Gemini to these devices.",
    "faq_q4": "How do I get Android XR?",
    "faq_a4": "Android XR is an operating system for headsets and glasses. The first device, Samsung Galaxy XR (https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/), is available now.",
    "faq_q5": "When will Android XR-powered devices be available?",
    "faq_a5": "The first device, Samsung Galaxy XR, is available now. Other devices will be available in 2026.",
    "faq_q6": "How can I start developing for Android XR?",
    "faq_a6": "You can check out developer.android.com/xr (https://developer.android.com/xr) for documentation and information to get started with Android XR. If you are choosing WebXR (https://immersiveweb.dev/), XR Blocks (https://xrblocks.github.io) here is also a great way to make creative Android XR applications.",
    "open": "Open",
    "templates": "Templates",
    "demos": "Demos",
    "docs": "Docs",
    "language_name": "English",
    "build": "Build",
    "without_code": "without code",
    "hero_subtitle": "Accelerating AI + XR Innovation",
    "build_in_ai_studio": "Build in AI Studio",
    "try_xr_blocks_gem": "Try XR Blocks Gem",
    "explore_gallery": "Explore Gallery",
    "explore": "Explore",
    "google_ai_subscriptions": "Google AI Subscriptions",
    "see": "See",
    "showcase_title": "Get to know XR Blocks",
    "showcase_desc": "Explore experimental Android XR features through these demos, available on desktop and devices like Galaxy XR and Project Aura.",
    "card1_title": "XR Blocks Gem",
    "card1_desc": "Describe your vision to XR Blocks Gem to instantly build interactive Android XR apps for headsets like Galaxy XR. Preview your app on the Desktop simulator, and visit our blog for details.",
    "card1_cta": "Create XR Now",
    "card2_title": "For Immersive Web",
    "card2_desc": "XR Blocks is an open-source framework for immersive web experiences, featuring XR Realism, XR Interaction, and AI capabilities.",
    "card2_cta": "Explore Live Demos",
    "card3_title": "Gemini Ice-breakers",
    "card3_desc": "Meet the Gemini assistant on desktop Chrome and Android XR (Galaxy XR) via XR Blocks. This demo uses conversation starters to showcase its capabilities.",
    "card3_cta": "Explore Demo",
    "card4_title": "Ballpit",
    "card4_desc": "Inspired by DepthLab, this demo maps your space in 3D (simulator and Android XR) for a virtual ballpit with physical collisions.",
    "card4_cta": "Explore Demo",
    "card5_title": "Gesture Recognition",
    "card5_desc": "This XR Blocks and LiteRT demo showcases hand interactions: a \"yeah\" gesture triggers colorful stripes, and a thumbs-up releases balloons.",
    "card5_cta": "Explore Demo",
    "view_on_github": "View on GitHub",
    "newsletter_title": "Be the first to get updates from XR Blocks",
    "newsletter_btn": "Sign up for the newsletter",
    "see_all": "See all",
    "demo_gallery": "Demo Gallery",
    "cat_spatial_ui": "Spatial UI",
    "cat_realism": "Realism",
    "cat_avatars": "Avatars",
    "cat_interactions": "Interactions",
    "cat_ai_xr": "AI + XR",
    "cat_advanced": "Advanced",
    "language": "Language",
    "share": "Share",
    "privacy_and_terms": "Privacy & Terms",
    "all": "All"
  },
  fr: {
    "title": "XR Blocks : Créer en XR sans code",
    "home": "Accueil",
    "faq": "FAQ",
    "faq_h2": "Questions fréquentes",
    "faq_q1": "Qu'est-ce que XR Blocks ?",
    "faq_a1": "XR Blocks est un framework web multiplateforme conçu pour accélérer l'innovation IA+XR centrée sur l'humain. XR Blocks fournit une architecture modulaire avec des composants prêts à l'emploi pour la représentation de l'utilisateur, la perception de l'environnement, les gestes et l'interface spatiale. Conçu avec la mission « un minimum de code de l'idée à la réalité », notre kit s'appuie sur des technologies accessibles (WebXR, three.js, TensorFlow, Gemini) pour le prototypage rapide.",
    "faq_q2": "Comment commencer à développer avec XR Blocks ?",
    "faq_a2": "Nous vous recommandons de forker notre dépôt GitHub (https://github.com/google/xrblocks), de parcourir chaque modèle (https://xrblocks.github.io/docs/templates/Basic) et exemple (https://xrblocks.github.io/docs/samples/ModelViewer), puis de commencer à coder en consultant le manuel. Vous pouvez également essayer notre Gemini Gem (https://xrblocks.github.io/gem) pour créer des applications IA + XR sur les appareils Android XR ou sur ordinateur.",
    "faq_q3": "Qu'est-ce qu'Android XR ?",
    "faq_a3": "XR signifie réalité étendue, un terme générique englobant la réalité virtuelle, la réalité augmentée et la réalité mixte. Android XR est un système d'exploitation pour les appareils de réalité étendue tels que les casques et les lunettes, offrant l'interface utilisateur, l'accès aux applications populaires et l'assistance IA de Gemini.",
    "faq_q4": "Comment obtenir Android XR ?",
    "faq_a4": "Android XR est un système d'exploitation pour casques et lunettes. Le premier appareil, Samsung Galaxy XR (https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/), est disponible dès maintenant.",
    "faq_q5": "Quand les appareils sous Android XR seront-ils disponibles ?",
    "faq_a5": "Le premier appareil, Samsung Galaxy XR, est disponible dès maintenant. D'autres appareils seront disponibles en 2026.",
    "faq_q6": "Comment commencer à développer pour Android XR ?",
    "faq_a6": "Consultez developer.android.com/xr (https://developer.android.com/xr) pour obtenir la documentation et les informations de démarrage sur Android XR. Si vous choisissez WebXR (https://immersiveweb.dev/), XR Blocks (https://xrblocks.github.io) est également un excellent moyen de créer des applications Android XR.",
    "open": "Ouvrir",
    "templates": "Modèles",
    "demos": "Démos",
    "docs": "Docs",
    "language_name": "Français",
    "build": "Créer",
    "without_code": "sans code",
    "hero_subtitle": "Accélérer l'innovation IA + XR",
    "build_in_ai_studio": "Créer dans AI Studio",
    "try_xr_blocks_gem": "Essayer XR Blocks Gem",
    "explore_gallery": "Explorer la Galerie",
    "explore": "Explorer",
    "google_ai_subscriptions": "Abonnements Google AI",
    "see": "Voir",
    "showcase_title": "Découvrir XR Blocks",
    "showcase_desc": "Explorez les fonctionnalités expérimentales d'Android XR grâce à ces démos, disponibles sur ordinateur et sur des appareils comme Galaxy XR et Project Aura.",
    "card1_title": "XR Blocks Gem",
    "card1_desc": "Décrivez votre vision à XR Blocks Gem pour créer instantanément des applications Android XR interactives pour des casques comme Galaxy XR. Prévisualisez votre application sur le simulateur de bureau et consultez notre blog pour plus de détails.",
    "card1_cta": "Créer en XR",
    "card2_title": "Pour le Web immersif",
    "card2_desc": "XR Blocks est un framework open source pour les expériences web immersives, intégrant le réalisme XR, l'interaction XR et des fonctionnalités d'IA.",
    "card2_cta": "Explorer les démos",
    "card3_title": "Brise-glaces Gemini",
    "card3_desc": "Rencontrez l'assistant Gemini sur Chrome pour ordinateur et Android XR (Galaxy XR) via XR Blocks. Cette démo utilise des amorces de conversation pour présenter ses capacités.",
    "card3_cta": "Explorer la démo",
    "card4_title": "Piscine à balles",
    "card4_desc": "Inspirée par DepthLab, cette démo cartographie votre espace en 3D (simulateur et Android XR) pour créer une piscine à balles virtuelle avec des collisions physiques.",
    "card4_cta": "Explorer la démo",
    "card5_title": "Reconnaissance gestuelle",
    "card5_desc": "Cette démo XR Blocks et LiteRT présente les interactions manuelles : un geste « yeah » déclenche des bandes colorées et un pouce levé libère des ballons.",
    "card5_cta": "Explorer la démo",
    "view_on_github": "Voir sur GitHub",
    "newsletter_title": "Soyez le premier à recevoir les mises à jour de XR Blocks",
    "newsletter_btn": "S'inscrire à la newsletter",
    "see_all": "Tout voir",
    "demo_gallery": "Galerie de démos",
    "cat_spatial_ui": "Interface spatiale",
    "cat_realism": "Réalisme",
    "cat_avatars": "Avatars",
    "cat_interactions": "Interactions",
    "cat_ai_xr": "IA + XR",
    "cat_advanced": "Avancé",
    "language": "Langue",
    "share": "Partager",
    "privacy_and_terms": "Confidentialité et conditions",
    "all": "Tous"
  },
  es: {
    "title": "XR Blocks: Crea en XR sin código",
    "home": "Inicio",
    "faq": "Preguntas frecuentes",
    "faq_h2": "Preguntas frecuentes",
    "faq_q1": "¿Qué es XR Blocks?",
    "faq_a1": "XR Blocks es un framework multiplataforma basado en la web diseñado para acelerar la innovación en IA+XR centrada en las personas. Proporciona una arquitectura modular con componentes listos para usar para la representación del usuario, percepción del entorno, gestos e interfaz espacial. Diseñado con la misión de “código mínimo de la idea a la realidad”, está construido sobre tecnologías accesibles (WebXR, three.js, TensorFlow, Gemini) para facilitar la creación rápida de prototipos.",
    "faq_q2": "¿Cómo puedo empezar a crear con XR Blocks?",
    "faq_a2": "Te recomendamos hacer un fork de nuestro repositorio de GitHub (https://github.com/google/xrblocks), explorar cada plantilla (https://xrblocks.github.io/docs/templates/Basic) y proyecto de ejemplo (https://xrblocks.github.io/docs/samples/ModelViewer), y comenzar a programar consultando el manual. También puedes probar nuestro Gemini Gem (https://xrblocks.github.io/gem) para crear aplicaciones de IA + XR en dispositivos Android XR o de escritorio.",
    "faq_q3": "¿Qué es Android XR?",
    "faq_a3": "XR significa realidad extendida, un término general que abarca la realidad virtual, la realidad aumentada y la realidad mixta. Android XR es un sistema operativo para dispositivos de realidad extendida, como visores y gafas, que proporciona la interfaz de usuario, acceso a aplicaciones populares y asistencia de IA de Gemini.",
    "faq_q4": "¿Cómo puedo obtener Android XR?",
    "faq_a4": "Android XR es un sistema operativo para visores y gafas. El primer dispositivo, Samsung Galaxy XR (https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/), ya está disponible.",
    "faq_q5": "¿Cuándo estarán disponibles los dispositivos con Android XR?",
    "faq_a5": "El primer dispositivo, Samsung Galaxy XR, ya está disponible. Otros dispositivos estarán disponibles en 2026.",
    "faq_q6": "¿Cómo puedo empezar a desarrollar para Android XR?",
    "faq_a6": "Puedes consultar developer.android.com/xr (https://developer.android.com/xr) para obtener documentación e información sobre cómo empezar con Android XR. Si eliges WebXR (https://immersiveweb.dev/), XR Blocks (https://xrblocks.github.io) es también una excelente forma de crear aplicaciones creativas para Android XR.",
    "open": "Abrir",
    "templates": "Plantillas",
    "demos": "Demos",
    "docs": "Docs",
    "language_name": "Español",
    "build": "Crea",
    "without_code": "sin código",
    "hero_subtitle": "Acelerando la innovación en IA y XR",
    "build_in_ai_studio": "Crear en AI Studio",
    "try_xr_blocks_gem": "Probar XR Blocks Gem",
    "explore_gallery": "Explorar Galería",
    "explore": "Explorar",
    "google_ai_subscriptions": "Suscripciones de Google AI",
    "see": "Ver",
    "showcase_title": "Conoce XR Blocks",
    "showcase_desc": "Explora funciones experimentales de Android XR a través de estas demostraciones, disponibles en escritorio y en dispositivos como Galaxy XR y Project Aura.",
    "card1_title": "XR Blocks Gem",
    "card1_desc": "Describe tu visión a XR Blocks Gem para crear al instante aplicaciones interactivas de Android XR para visores como Galaxy XR. Previsualiza tu aplicación en el simulador de escritorio y visita nuestro blog para más detalles.",
    "card1_cta": "Crear XR ahora",
    "card2_title": "Para la Web inmersiva",
    "card2_desc": "XR Blocks es un framework de código abierto para experiencias web inmersivas, que incluye realismo XR, interacción XR y capacidades de IA.",
    "card2_cta": "Explorar demos en vivo",
    "card3_title": "Rompehielos con Gemini",
    "card3_desc": "Conoce al asistente Gemini en Chrome de escritorio y Android XR (Galaxy XR) mediante XR Blocks. Esta demo utiliza temas de conversación para mostrar sus capacidades.",
    "card3_cta": "Explorar demo",
    "card4_title": "Piscina de pelotas",
    "card4_desc": "Inspirada en DepthLab, esta demo mapea tu espacio en 3D (simulador y Android XR) para una piscina de pelotas virtual con colisiones físicas.",
    "card4_cta": "Explorar demo",
    "card5_title": "Reconocimiento de gestos",
    "card5_desc": "Esta demo de XR Blocks y LiteRT muestra interacciones manuales: un gesto de \"victoria\" activa franjas de colores y un pulgar arriba suelta globos.",
    "card5_cta": "Explorar demo",
    "view_on_github": "Ver en GitHub",
    "newsletter_title": "Sé el primero en recibir actualizaciones de XR Blocks",
    "newsletter_btn": "Regístrate en el boletín informativo",
    "see_all": "Ver todo",
    "demo_gallery": "Galería de demostraciones",
    "cat_spatial_ui": "IU espacial",
    "cat_realism": "Realismo",
    "cat_avatars": "Avatares",
    "cat_interactions": "Interacciones",
    "cat_ai_xr": "IA + XR",
    "cat_advanced": "Avanzado",
    "language": "Idioma",
    "share": "Compartir",
    "privacy_and_terms": "Privacidad y condiciones",
    "all": "Todos"
  },
  de: {
    "title": "XR Blocks: XR ohne Code erstellen",
    "home": "Startseite",
    "faq": "FAQ",
    "faq_h2": "Häufig gestellte Fragen",
    "faq_q1": "Was ist XR Blocks?",
    "faq_a1": "XR Blocks ist ein webbasiertes, plattformübergreifendes Framework zur Beschleunigung menschenzentrierter KI+XR-Innovationen. XR Blocks bietet eine modulare Architektur mit Plug-and-Play-Komponenten für Kernabstraktionen in KI+XR, darunter Benutzerdarstellung, Umgebungswahrnehmung, Gesten und räumliche Benutzeroberflächen. Entwickelt mit der Mission „minimaler Code von der Idee zur Realität“, ermöglicht unser Toolkit auf Basis zugänglicher Technologien (WebXR, three.js, TensorFlow, Gemini) schnelles Prototyping komplexer KI+XR-Apps.",
    "faq_q2": "Wie kann ich mit XR Blocks starten?",
    "faq_a2": "Wir empfehlen Ihnen, unser GitHub-Repository (https://github.com/google/xrblocks) zu forken, die Vorlagen (https://xrblocks.github.io/docs/templates/Basic) und Beispielprojekte (https://xrblocks.github.io/docs/samples/ModelViewer) durchzusehen und anhand des Handbuchs mit dem Programmieren zu beginnen. Für Vibe-Coder steht außerdem unser Gemini Gem (https://xrblocks.github.io/gem) bereit, um KI + XR-Apps für Android XR-Geräte oder den Desktop zu erstellen.",
    "faq_q3": "Was ist Android XR?",
    "faq_a3": "XR steht für Extended Reality – ein Oberbegriff für alle Technologien, die reale und virtuelle Welten verschmelzen lassen, einschließlich Virtual Reality, Augmented Reality und Mixed Reality. Android XR ist ein Betriebssystem für Extended-Reality-Geräte wie Headsets und Datenbrillen und bietet die Benutzeroberfläche, Zugriff auf beliebte Apps sowie KI-Unterstützung durch Gemini.",
    "faq_q4": "Wie erhalte ich Android XR?",
    "faq_a4": "Android XR ist ein Betriebssystem für Headsets und Brillen. Das erste Gerät, Samsung Galaxy XR (https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/), ist ab sofort erhältlich.",
    "faq_q5": "Wann werden Geräte mit Android XR verfügbar sein?",
    "faq_a5": "Das erste Gerät, Samsung Galaxy XR, ist ab sofort erhältlich. Weitere Geräte folgen im Jahr 2026.",
    "faq_q6": "Wie kann ich mit der Entwicklung für Android XR beginnen?",
    "faq_a6": "Unter developer.android.com/xr (https://developer.android.com/xr) finden Sie Dokumentationen und Informationen zum Einstieg in Android XR. Wenn Sie WebXR (https://immersiveweb.dev/) wählen, ist XR Blocks (https://xrblocks.github.io) ebenfalls eine hervorragende Möglichkeit, kreative Android XR-Anwendungen zu entwickeln.",
    "open": "Öffnen",
    "templates": "Vorlagen",
    "demos": "Demos",
    "docs": "Doku",
    "language_name": "Deutsch",
    "build": "Erstellen",
    "without_code": "ohne Code",
    "hero_subtitle": "Beschleunigung von KI + XR Innovationen",
    "build_in_ai_studio": "In AI Studio erstellen",
    "try_xr_blocks_gem": "XR Blocks Gem testen",
    "explore_gallery": "Galerie erkunden",
    "explore": "Erkunden",
    "google_ai_subscriptions": "Google KI Abonnements",
    "see": "Siehe",
    "showcase_title": "XR Blocks kennenlernen",
    "showcase_desc": "Entdecken Sie experimentelle Android XR-Funktionen in diesen Demos – verfügbar auf dem Desktop sowie auf Geräten wie Galaxy XR und Project Aura.",
    "card1_title": "XR Blocks Gem",
    "card1_desc": "Beschreiben Sie XR Blocks Gem Ihre Vision, um sofort interaktive Android XR-Apps für Headsets wie Galaxy XR zu erstellen. Testen Sie Ihre App im Desktop-Simulator und besuchen Sie unseren Blog für Details.",
    "card1_cta": "Jetzt XR erstellen",
    "card2_title": "Für das immersive Web",
    "card2_desc": "XR Blocks ist ein Open-Source-Framework für immersive Web-Erlebnisse mit XR-Realismus, XR-Interaktion und KI-Funktionen.",
    "card2_cta": "Live-Demos erkunden",
    "card3_title": "Gemini-Eisbrecher",
    "card3_desc": "Erleben Sie den Gemini-Assistenten auf Desktop-Chrome und Android XR (Galaxy XR) über XR Blocks. Diese Demo nutzt Gesprächseinstiege, um seine Fähigkeiten zu zeigen.",
    "card3_cta": "Demo erkunden",
    "card4_title": "Bällebad",
    "card4_desc": "Inspiriert von DepthLab kartiert diese Demo Ihren Raum in 3D (Simulator und Android XR) für ein virtuelles Bällebad mit physikalischen Kollisionen.",
    "card4_cta": "Demo erkunden",
    "card5_title": "Gestenerkennung",
    "card5_desc": "Diese XR Blocks- und LiteRT-Demo zeigt Handinteraktionen: Eine „Yeah“-Geste löst bunte Streifen aus und ein Daumen-hoch lässt Ballons steigen.",
    "card5_cta": "Demo erkunden",
    "view_on_github": "Auf GitHub ansehen",
    "newsletter_title": "Erhalten Sie als Erster Updates von XR Blocks",
    "newsletter_btn": "Für den Newsletter anmelden",
    "see_all": "Alle ansehen",
    "demo_gallery": "Demo-Galerie",
    "cat_spatial_ui": "Räumliche UI",
    "cat_realism": "Realismus",
    "cat_avatars": "Avatare",
    "cat_interactions": "Interaktionen",
    "cat_ai_xr": "KI + XR",
    "cat_advanced": "Erweitert",
    "language": "Sprache",
    "share": "Teilen",
    "privacy_and_terms": "Datenschutzerklärung & Nutzungsbedingungen",
    "all": "Alle"
  },
  it: {
    "title": "XR Blocks: Crea in XR senza codice",
    "home": "Home",
    "faq": "FAQ",
    "faq_h2": "Domande frequenti",
    "faq_q1": "Cos'è XR Blocks?",
    "faq_a1": "XR Blocks è un framework multipiattaforma basato sul web progettato per accelerare l'innovazione AI+XR incentrata sull'uomo. Fornisce un'architettura modulare con componenti plug-and-play per la rappresentazione dell'utente, la percezione ambientale, i gesti e l'interfaccia utente spaziale. Creato con la missione di “codice minimo dall'idea alla realtà” su tecnologie accessibili (WebXR, three.js, TensorFlow, Gemini), riduce le barriere d'ingresso per ricercatori e designer.",
    "faq_q2": "Come posso iniziare a sviluppare con XR Blocks?",
    "faq_a2": "Ti consigliamo di effettuare il fork del nostro repository GitHub (https://github.com/google/xrblocks), esplorare ogni template (https://xrblocks.github.io/docs/templates/Basic) ed esempio (https://xrblocks.github.io/docs/samples/ModelViewer), e iniziare a programmare consultando il manuale. Puoi anche provare il nostro Gemini Gem (https://xrblocks.github.io/gem) per creare app AI + XR su dispositivi Android XR o desktop.",
    "faq_q3": "Cos'è Android XR?",
    "faq_a3": "XR sta per realtà estesa, un termine che comprende realtà virtuale, realtà aumentata e realtà mista. Android XR è un sistema operativo per dispositivi di realtà estesa come visori e occhiali, che offre l'interfaccia utente, l'accesso alle app più diffuse e l'assistenza AI di Gemini.",
    "faq_q4": "Come posso ottenere Android XR?",
    "faq_a4": "Android XR è un sistema operativo per visori e occhiali. Il primo dispositivo, Samsung Galaxy XR (https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/), è disponibile ora.",
    "faq_q5": "Quando saranno disponibili i dispositivi con Android XR?",
    "faq_a5": "Il primo dispositivo, Samsung Galaxy XR, è disponibile ora. Altri dispositivi saranno disponibili nel 2026.",
    "faq_q6": "Come posso iniziare a sviluppare per Android XR?",
    "faq_a6": "Puoi consultare developer.android.com/xr (https://developer.android.com/xr) per la documentazione e le informazioni su come iniziare con Android XR. Se scegli WebXR (https://immersiveweb.dev/), XR Blocks (https://xrblocks.github.io) è un ottimo modo per realizzare applicazioni creative per Android XR.",
    "open": "Apri",
    "templates": "Modelli",
    "demos": "Demo",
    "docs": "Documenti",
    "language_name": "Italiano",
    "build": "Crea",
    "without_code": "senza codice",
    "hero_subtitle": "Accelerare l'innovazione AI + XR",
    "build_in_ai_studio": "Crea in AI Studio",
    "try_xr_blocks_gem": "Prova XR Blocks Gem",
    "explore_gallery": "Esplora la Galleria",
    "explore": "Esplora",
    "google_ai_subscriptions": "Abbonamenti Google AI",
    "see": "Vedi",
    "showcase_title": "Scopri XR Blocks",
    "showcase_desc": "Esplora le funzionalità sperimentali di Android XR attraverso queste demo, disponibili su desktop e su dispositivi come Galaxy XR e Project Aura.",
    "card1_title": "XR Blocks Gem",
    "card1_desc": "Descrivi la tua visione a XR Blocks Gem per creare istantaneamente app Android XR interattive per visori come Galaxy XR. Visualizza l'anteprima della tua app sul simulatore desktop e visita il nostro blog per i dettagli.",
    "card1_cta": "Crea XR ora",
    "card2_title": "Per il Web immersivo",
    "card2_desc": "XR Blocks è un framework open-source per esperienze web immersive, dotato di realismo XR, interazione XR e funzionalità AI.",
    "card2_cta": "Esplora le demo live",
    "card3_title": "Rompighiaccio Gemini",
    "card3_desc": "Incontra l'assistente Gemini su Chrome desktop e Android XR (Galaxy XR) tramite XR Blocks. Questa demo utilizza spunti di conversazione per mostrare le sue capacità.",
    "card3_cta": "Esplora la demo",
    "card4_title": "Vasca di palline",
    "card4_desc": "Ispirata a DepthLab, questa demo mappa il tuo spazio in 3D (simulatore e Android XR) per una vasca di palline virtuale con collisioni fisiche.",
    "card4_cta": "Esplora la demo",
    "card5_title": "Riconoscimento dei gesti",
    "card5_desc": "Questa demo di XR Blocks e LiteRT mostra le interazioni con le mani: il gesto \"yeah\" attiva strisce colorate e il pollice in su rilascia palloncini.",
    "card5_cta": "Esplora la demo",
    "view_on_github": "Vedi su GitHub",
    "newsletter_title": "Ricevi per primo gli aggiornamenti da XR Blocks",
    "newsletter_btn": "Iscriviti alla newsletter",
    "see_all": "Vedi tutto",
    "demo_gallery": "Galleria demo",
    "cat_spatial_ui": "UI spaziale",
    "cat_realism": "Realismo",
    "cat_avatars": "Avatar",
    "cat_interactions": "Interazioni",
    "cat_ai_xr": "AI + XR",
    "cat_advanced": "Avanzato",
    "language": "Lingua",
    "share": "Condividi",
    "privacy_and_terms": "Privacy e termini",
    "all": "Tutti"
  },
  ko: {
    "title": "XR Blocks: 코드 없이 XR 구축",
    "home": "홈",
    "faq": "FAQ",
    "faq_h2": "자주 묻는 질문",
    "faq_q1": "XR Blocks란 무엇인가요?",
    "faq_a1": "XR Blocks는 인간 중심의 AI+XR 혁신을 가속화하기 위해 설계된 웹 기반 크로스 플랫폼 프레임워크입니다. 사용자 표현, 환경 인식, 제스처 및 공간 UI를 포함한 AI+XR 핵심 추상화를 위한 플러그 앤 플레이 모듈식 아키텍처를 제공합니다. '아이디어에서 현실까지 최소한의 코드'라는 사명으로 설계되었으며 WebXR, three.js, TensorFlow, Gemini를 기반으로 복잡한 AI+XR 앱의 빠른 프로토타이핑을 지원합니다.",
    "faq_q2": "XR Blocks로 개발을 시작하려면 어떻게 해야 하나요?",
    "faq_a2": "GitHub 저장소(https://github.com/google/xrblocks)를 포크하고 각 템플릿(https://xrblocks.github.io/docs/templates/Basic)과 샘플(https://xrblocks.github.io/docs/samples/ModelViewer) 프로젝트를 살펴본 후 매뉴얼을 참고하여 코딩을 시작하는 것을 권장합니다. 바이브 코더를 위해 Gemini Gem(https://xrblocks.github.io/gem)을 사용하여 Android XR 기기나 데스크톱에서 AI + XR 앱을 구축할 수도 있습니다.",
    "faq_q3": "Android XR이란 무엇인가요?",
    "faq_a3": "XR은 가상 현실(VR), 증강 현실(AR), 혼합 현실(MR)을 포함하여 현실과 가상 세계를 융합하는 모든 기술을 포괄하는 확장 현실(Extended Reality)을 의미합니다. Android XR은 헤드셋 및 글래스와 같은 확장 현실 기기를 위한 운영체제로, 사용자 인터페이스와 인기 앱 액세스 및 Gemini의 AI 지원을 제공합니다.",
    "faq_q4": "Android XR은 어떻게 이용할 수 있나요?",
    "faq_a4": "Android XR은 헤드셋과 글래스를 위한 운영체제입니다. 첫 번째 기기인 Samsung Galaxy XR(https://www.samsung.com/us/xr/galaxy-xr/galaxy-xr/)은 지금 구매할 수 있습니다.",
    "faq_q5": "Android XR 기반 기기는 언제 출시되나요?",
    "faq_a5": "첫 번째 기기인 Samsung Galaxy XR은 지금 이용 가능하며, 다른 기기들은 2026년에 출시될 예정입니다.",
    "faq_q6": "Android XR용 개발은 어떻게 시작할 수 있나요?",
    "faq_a6": "developer.android.com/xr(https://developer.android.com/xr)에서 Android XR 시작에 필요한 문서와 정보를 확인할 수 있습니다. WebXR(https://immersiveweb.dev/)을 선택하는 경우 XR Blocks(https://xrblocks.github.io) 또한 창의적인 Android XR 애플리케이션을 제작하는 훌륭한 방법입니다.",
    "open": "열기",
    "templates": "템플릿",
    "demos": "데모",
    "docs": "문서",
    "language_name": "한국어",
    "build": "구축",
    "without_code": "코드 없이",
    "hero_subtitle": "AI + XR 혁신 가속화",
    "build_in_ai_studio": "AI Studio에서 구축하기",
    "try_xr_blocks_gem": "XR Blocks Gem 사용해 보기",
    "explore_gallery": "갤러리 탐색",
    "explore": "탐색",
    "google_ai_subscriptions": "Google AI 구독",
    "see": "보기",
    "showcase_title": "XR Blocks 알아보기",
    "showcase_desc": "데스크톱과 Galaxy XR 및 Project Aura 같은 기기에서 제공되는 데모를 통해 실험적인 Android XR 기능을 살펴보세요.",
    "card1_title": "XR Blocks Gem",
    "card1_desc": "XR Blocks Gem에 아이디어를 설명하여 Galaxy XR 같은 헤드셋용 대화형 Android XR 앱을 즉시 구축해 보세요. 데스크톱 시뮬레이터에서 앱을 미리 보고 블로그에서 자세한 내용을 확인하세요.",
    "card1_cta": "지금 XR 만들기",
    "card2_title": "몰입형 웹 환경",
    "card2_desc": "XR Blocks는 XR 리얼리즘, XR 상호작용 및 AI 기능을 갖춘 몰입형 웹 경험을 위한 오픈소스 프레임워크입니다.",
    "card2_cta": "라이브 데모 탐색",
    "card3_title": "Gemini 아이스브레이커",
    "card3_desc": "XR Blocks를 통해 데스크톱 Chrome 및 Android XR(Galaxy XR)에서 Gemini 어시스턴트를 만나보세요. 이 데모는 대화 시작 주제를 사용하여 다양한 기능을 선보입니다.",
    "card3_cta": "데모 탐색",
    "card4_title": "볼풀(Ballpit)",
    "card4_desc": "DepthLab에서 영감을 받은 이 데모는 시뮬레이터와 Android XR에서 공간을 3D로 매핑하여 물리적 충돌이 적용된 가상 볼풀을 구현합니다.",
    "card4_cta": "데모 탐색",
    "card5_title": "제스처 인식",
    "card5_desc": "이 XR Blocks 및 LiteRT 데모는 손 상호작용을 보여줍니다. '브이(V)' 제스처는 다채로운 줄무늬를 실행하고 엄지척 제스처는 풍선을 띄웁니다.",
    "card5_cta": "데모 탐색",
    "view_on_github": "GitHub에서 보기",
    "newsletter_title": "XR Blocks의 최신 소식을 가장 먼저 받아보세요",
    "newsletter_btn": "뉴스레터 가입",
    "see_all": "모두 보기",
    "demo_gallery": "데모 갤러리",
    "cat_spatial_ui": "공간 UI",
    "cat_realism": "리얼리즘",
    "cat_avatars": "아바타",
    "cat_interactions": "상호작용",
    "cat_ai_xr": "AI + XR",
    "cat_advanced": "고급",
    "language": "언어",
    "share": "공유",
    "privacy_and_terms": "개인정보처리방침 및 약관",
    "all": "전체"
  }
};

function linkifyFaqAnswers() {
  document.querySelectorAll('.faq-answer').forEach((p) => {
    if (!p.querySelector('a')) {
      const text = p.textContent || '';
      const urlRegex = /(https:\/\/[^\s)]+)/g;
      if (urlRegex.test(text)) {
        p.textContent = '';
        let lastIndex = 0;
        text.replace(urlRegex, (match, url, offset) => {
          if (offset > lastIndex) {
            p.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
          }
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = url;
          p.appendChild(a);
          lastIndex = offset + match.length;
          return match;
        });
        if (lastIndex < text.length) {
          p.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
      }
    }
    p.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  });
}

const fetchedLangs = new Set();

async function applyLanguage(lang, updateUrl = true) {
  const normalizedLang = VALID_LANGS.has(lang) ? lang : 'en';
  try {
    if (!fetchedLangs.has(normalizedLang)) {
      fetchedLangs.add(normalizedLang);
      try {
        const resp = await fetch(`lang/lang_${normalizedLang}.json`);
        if (resp.ok) {
          const remoteStrings = await resp.json();
          langCache[normalizedLang] = Object.assign(
            {},
            langCache[normalizedLang] || {},
            remoteStrings
          );
        }
      } catch (fetchErr) {
        // Use inline langCache fallback
      }
    }
    const strings = langCache[normalizedLang] || langCache.en;
    document.documentElement.lang = normalizedLang;
    if (strings.title) {
      document.title = strings.title;
    }

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const enHtml = el.getAttribute('data-i18n-en-html');
      if (normalizedLang === 'en' && enHtml) {
        el.innerHTML = enHtml;
      } else if (key && strings[key]) {
        el.textContent = strings[key];
      }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key && strings[key]) {
        el.setAttribute('aria-label', strings[key]);
      }
    });

    document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const key = el.getAttribute('data-i18n-alt');
      if (key && strings[key]) {
        el.setAttribute('alt', strings[key]);
      }
    });

    langOptions.forEach((opt) => {
      const isSelected = opt.getAttribute('data-lang') === normalizedLang;
      opt.classList.toggle('selected', isSelected);
      if (isSelected && mobileLangLabel) {
        const labelSpan = opt.querySelector('span:not(.lang-check)');
        if (labelSpan) mobileLangLabel.textContent = labelSpan.textContent;
      }
    });

    linkifyFaqAnswers();

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (normalizedLang === 'en') {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', normalizedLang);
      }
      history.replaceState(history.state, '', url.toString());
    }

    if (scroll) {
      scroll.update();
    }
  } catch (err) {
    console.error('[i18n] Failed to load language strings:', err);
  }
}

if (langToggleBtn && langDropdownPanel) {
  langToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpening = !langDropdownPanel.classList.contains('active');
    langDropdownPanel.classList.toggle('active', isOpening);
    langToggleBtn.classList.toggle('active', isOpening);
    if (shareDropdownPanel) shareDropdownPanel.classList.remove('active');
    if (shareToggleBtn) shareToggleBtn.classList.remove('active');
    if (mobileMenuPanel) mobileMenuPanel.classList.remove('active');
    if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
  });
}

if (shareToggleBtn && shareDropdownPanel) {
  shareToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpening = !shareDropdownPanel.classList.contains('active');
    shareDropdownPanel.classList.toggle('active', isOpening);
    shareToggleBtn.classList.toggle('active', isOpening);
    if (langDropdownPanel) langDropdownPanel.classList.remove('active');
    if (langToggleBtn) langToggleBtn.classList.remove('active');
    if (mobileMenuPanel) mobileMenuPanel.classList.remove('active');
    if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
  });
}

if (langOptions.length > 0 && langDropdownPanel) {
  langOptions.forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      langDropdownPanel.classList.remove('active');
      if (langToggleBtn) langToggleBtn.classList.remove('active');
      if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
      const selectedLang = opt.getAttribute('data-lang');
      if (selectedLang) {
        applyLanguage(selectedLang, true);
      }
    });
  });
}

if (shareOptions.length > 0 && shareDropdownPanel) {
  shareOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
      shareDropdownPanel.classList.remove('active');
      if (shareToggleBtn) shareToggleBtn.classList.remove('active');
      if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
    });
  });
}

if (mobileLangTrigger && langDropdownPanel && mobileMenuPanel) {
  mobileLangTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    mobileMenuPanel.classList.remove('active');
    if (shareDropdownPanel) shareDropdownPanel.classList.remove('active');
    langDropdownPanel.classList.add('active');
  });
}

if (mobileShareTrigger && shareDropdownPanel && mobileMenuPanel) {
  mobileShareTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    mobileMenuPanel.classList.remove('active');
    if (langDropdownPanel) langDropdownPanel.classList.remove('active');
    shareDropdownPanel.classList.add('active');
  });
}

if (mobileMenuBtn && mobileMenuPanel) {
  mobileMenuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpening = !mobileMenuPanel.classList.contains('active');
    mobileMenuPanel.classList.toggle('active', isOpening);
    mobileMenuBtn.classList.toggle('active', isOpening);
    if (langDropdownPanel) langDropdownPanel.classList.remove('active');
    if (langToggleBtn) langToggleBtn.classList.remove('active');
    if (shareDropdownPanel) shareDropdownPanel.classList.remove('active');
    if (shareToggleBtn) shareToggleBtn.classList.remove('active');
  });
}

// Tap/click anywhere outside dropdowns to close them
document.addEventListener('click', (e) => {
  if (mobileMenuPanel && mobileMenuBtn && !mobileMenuPanel.contains(e.target) &&
      !mobileMenuBtn.contains(e.target)) {
    mobileMenuPanel.classList.remove('active');
    if ((!langDropdownPanel ||
         !langDropdownPanel.classList.contains('active')) &&
        (!shareDropdownPanel ||
         !shareDropdownPanel.classList.contains('active'))) {
      mobileMenuBtn.classList.remove('active');
    }
  }
  if (langDropdownPanel && !langDropdownPanel.contains(e.target) &&
      (!langToggleBtn || !langToggleBtn.contains(e.target)) &&
      (!mobileLangTrigger || !mobileLangTrigger.contains(e.target))) {
    langDropdownPanel.classList.remove('active');
    if (langToggleBtn) langToggleBtn.classList.remove('active');
    if (mobileMenuBtn &&
        (!mobileMenuPanel || !mobileMenuPanel.classList.contains('active')) &&
        (!shareDropdownPanel ||
         !shareDropdownPanel.classList.contains('active'))) {
      mobileMenuBtn.classList.remove('active');
    }
  }
  if (shareDropdownPanel && !shareDropdownPanel.contains(e.target) &&
      (!shareToggleBtn || !shareToggleBtn.contains(e.target)) &&
      (!mobileShareTrigger || !mobileShareTrigger.contains(e.target))) {
    shareDropdownPanel.classList.remove('active');
    if (shareToggleBtn) shareToggleBtn.classList.remove('active');
    if (mobileMenuBtn &&
        (!mobileMenuPanel || !mobileMenuPanel.classList.contains('active')) &&
        (!langDropdownPanel ||
         !langDropdownPanel.classList.contains('active'))) {
      mobileMenuBtn.classList.remove('active');
    }
  }
});

if (mobileEnvBtns.length > 0) {
  mobileEnvBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      mobileEnvBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const envString = btn.getAttribute('data-env');
      if (envString === 'AR') {
        switchScene(arModel);
        updateCta('Start building for AR', 'Designs/icon_AR.svg');
      } else if (envString === 'VR') {
        switchScene(vrModel);
        updateCta('VR coming soon', 'Designs/icon_VR.svg', '#888A97');
      } else if (envString === 'Glasses') {
        switchScene(glassesModel);
        updateCta(
            'Glasses coming soon', 'Designs/icon_Glasses.svg', '#888A97');
      }
    });
  });
}

// ----------------------------------------------------
// 11. FAQ ACCORDION INTERACTIVITY
// ----------------------------------------------------
linkifyFaqAnswers();

const initialLangParam = new URLSearchParams(window.location.search).get('lang');
if (initialLangParam && VALID_LANGS.has(initialLangParam) && initialLangParam !== 'en') {
  applyLanguage(initialLangParam, false);
}

const faqItems = document.querySelectorAll('.faq-item');
const heroFaqLink = document.querySelector('.hero-faq-link');

if (faqItems.length > 0) {
  let userToggledFaq = false;
  const mobileFaqMedia = window.matchMedia('(max-width: 768px)');

  const applyDefaultFaqState = (isMobile) => {
    if (userToggledFaq) return;
    if (isMobile) {
      faqItems.forEach((item) => item.classList.remove('open'));
    } else {
      faqItems.forEach(
          (item, index) => item.classList.toggle('open', index === 0));
    }
    if (scroll) scroll.update();
  };

  applyDefaultFaqState(mobileFaqMedia.matches);
  if (mobileFaqMedia.addEventListener) {
    mobileFaqMedia.addEventListener(
        'change', (e) => applyDefaultFaqState(e.matches));
  }

  faqItems.forEach((item) => {
    // Prevent clicks on links inside FAQ answers from toggling the accordion
    item.querySelectorAll('.faq-answer a').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    item.addEventListener('click', () => {
      userToggledFaq = true;
      const isOpen = item.classList.contains('open');
      // Close all items first
      faqItems.forEach((otherItem) => otherItem.classList.remove('open'));
      // If the clicked item was closed, open it
      if (!isOpen) {
        item.classList.add('open');
      }
      // Smoothly recalculate Locomotive Scroll height across the 500ms CSS
      // transition
      const startTime = performance.now();
      const syncScrollHeight = (now) => {
        if (scroll) scroll.update();
        if (now - startTime < 520) {
          requestAnimationFrame(syncScrollHeight);
        }
      };
      requestAnimationFrame(syncScrollHeight);
    });
  });
}

if (heroFaqLink) {
  heroFaqLink.addEventListener('click', (e) => {
    e.preventDefault();
    const faqSection = document.getElementById('faq-section');
    if (faqSection && scroll) {
      scroll.scrollTo(faqSection);
    }
  });
}

// ----------------------------------------------------
// 12. ALL EXPERIMENTS PAGE & FILTER CONTROLLER
// ----------------------------------------------------
const seeAllBtn = document.querySelector('.see-all-btn');
const homeBackBtn = document.querySelector('.home-back-btn');
const homeView = document.getElementById('home-view');
const allExperimentsView = document.getElementById('all-experiments-view');
const experimentsGrid = document.querySelector('.experiments-grid');
const filterPills = document.querySelectorAll('.filter-pill');
const experimentCards = document.querySelectorAll('.experiment-card');

let savedHomeScrollY = 0;
let filterSwapTimeout = null;

experimentCards.forEach((card) => {
  card.addEventListener('click', () => {
    const link = card.querySelector('.card-btn');
    if (link && link.href) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  });
});

function animateVisibleExperimentCards(baseDelay = 0.18) {
  let visibleIndex = 0;
  experimentCards.forEach((card) => {
    card.classList.remove('card-visible');
    card.style.transitionDelay = '0s';
  });

  // Force reflow so removal of .card-visible registers before re-adding
  if (experimentsGrid) void experimentsGrid.offsetHeight;

  requestAnimationFrame(() => {
    experimentCards.forEach((card) => {
      if (!card.classList.contains('filtered-out')) {
        const delay = baseDelay + visibleIndex * 0.055;
        card.style.transitionDelay = `${delay}s`;
        card.classList.add('card-visible');
        visibleIndex++;
      }
    });
  });
}

function openAllExperimentsView(pushHistory = true) {
  if (isTransitioningView ||
      document.body.classList.contains('experiments-view-active'))
    return;
  isTransitioningView = true;

  savedHomeScrollY = targetScrollY || currentScrollY || 0;

  // Stagger filter pills entrance
  filterPills.forEach((pill, index) => {
    pill.style.transitionDelay = `${0.1 + index * 0.04}s`;
  });

  if (homeView) {
    homeView.classList.add('fading-out');
  }

  // Ensure background is smoothly blurred for All Experiments page
  if (container) {
    container.style.filter = 'blur(60px) saturate(0.6)';
  }

  setTimeout(() => {
    if (homeView) {
      homeView.classList.remove('fading-out');
    }
    if (allExperimentsView) {
      allExperimentsView.classList.remove('fading-out');
    }
    if (experimentsGrid) {
      experimentsGrid.classList.remove('grid-filtering');
    }

    document.body.classList.remove('experiments-animate-in');
    experimentCards.forEach((card) => {
      card.classList.remove('card-visible');
      card.style.transitionDelay = '0s';
    });

    document.body.classList.add('experiments-view-active');

    if (scroll) {
      scroll.scrollTo(0, {duration: 0, disableLerp: true});
      scroll.update();
    }

    requestAnimationFrame(() => {
      if (scroll) scroll.update();
      document.body.classList.add('experiments-animate-in');
      animateVisibleExperimentCards(0.18);

      // Clear transition delays after entrance so hover/filter stays snappy
      setTimeout(() => {
        filterPills.forEach((pill) => {
          pill.style.transitionDelay = '0s';
        });
        experimentCards.forEach((card) => {
          card.style.transitionDelay = '0s';
        });
        isTransitioningView = false;
      }, 650);
    });

    if (pushHistory && window.location.hash !== '#all-experiments') {
      history.pushState({view: 'experiments'}, '', '#all-experiments');
    }
  }, 220);
}

function closeAllExperimentsView(pushHistory = true) {
  if (isTransitioningView ||
      !document.body.classList.contains('experiments-view-active'))
    return;
  isTransitioningView = true;

  // Fade out the All Experiments view as a unified container and fade out the
  // Home back button
  document.body.classList.remove('experiments-animate-in');
  if (allExperimentsView) {
    allExperimentsView.classList.add('fading-out');
  }

  // Prepare #home-view in its hidden/fading-out state BEFORE making it display:
  // block
  if (homeView) {
    homeView.classList.add('fading-out');
  }

  setTimeout(() => {
    // Switch active view while #home-view is still at opacity: 0
    document.body.classList.remove('experiments-view-active');
    if (allExperimentsView) {
      allExperimentsView.classList.remove('fading-out');
    }

    // Restore exact scroll state & 3D background blur synchronously before
    // revealing #home-view
    const height = window.innerHeight;
    const heroProgress = Math.min(savedHomeScrollY / height, 1.0);
    const blurProgress =
        Math.max(0, Math.min(1.0, (savedHomeScrollY - 100) / 800));
    const blurAmount = blurProgress * 60;
    if (container) {
      container.style.filter =
          `blur(${blurAmount}px) saturate(${1.0 - heroProgress * 0.4})`;
    }
    if (heroSection) {
      heroSection.style.opacity = (1 - heroProgress * 1.5).toString();
      heroSection.style.transform = `translateY(${heroProgress * -60}px)`;
    }
    targetScrollY = savedHomeScrollY;
    currentScrollY = savedHomeScrollY;

    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
      scrollIndicator.classList.toggle('hidden', savedHomeScrollY > 10);
    }

    if (scroll) {
      scroll.update();
      scroll.scrollTo(savedHomeScrollY, {duration: 0, disableLerp: true});
    }

    requestAnimationFrame(() => {
      if (scroll) {
        scroll.update();
        scroll.scrollTo(savedHomeScrollY, {duration: 0, disableLerp: true});
      }
      updateNavIndicator();

      requestAnimationFrame(() => {
        if (homeView) {
          homeView.classList.remove('fading-out');
        }
        setTimeout(() => {
          isTransitioningView = false;
        }, 420);
      });
    });

    if (pushHistory &&
        (window.location.hash === '#all-experiments' ||
         window.location.pathname === '/gallery')) {
      const cleanPath = window.location.pathname === '/gallery' ?
          '/' :
          window.location.pathname;
      history.pushState({view: 'home'}, '', cleanPath + window.location.search);
    }
  }, 250);
}

if (seeAllBtn && !seeAllBtn.getAttribute('href')) {
  seeAllBtn.addEventListener('click', () => {
    openAllExperimentsView(true);
  });
}

if (homeBackBtn) {
  homeBackBtn.addEventListener('click', () => {
    closeAllExperimentsView(true);
  });
}

window.addEventListener('popstate', () => {
  if (window.location.hash === '#all-experiments' ||
      window.location.pathname === '/gallery') {
    openAllExperimentsView(false);
  } else if (document.body.classList.contains('experiments-view-active')) {
    closeAllExperimentsView(false);
  }
});

// Filter pill click interactivity: hide the whole grid, swap cards cleanly, and
// fade in the new set
if (filterPills.length > 0) {
  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      if (pill.classList.contains('active')) return;

      filterPills.forEach((p) => {
        p.style.transitionDelay = '0s';
        p.classList.remove('active');
      });
      pill.classList.add('active');

      const selectedCategory = pill.getAttribute('data-filter');

      if (filterSwapTimeout) {
        clearTimeout(filterSwapTimeout);
      }

      if (experimentsGrid) {
        experimentsGrid.classList.add('grid-filtering');
      }

      filterSwapTimeout = setTimeout(() => {
        experimentCards.forEach((card) => {
          const categories = (card.getAttribute('data-categories') || '')
                                 .split(',')
                                 .map((c) => c.trim());
          const matches = selectedCategory === 'All' ||
              categories.includes(selectedCategory);
          card.style.transitionDelay = '0s';
          card.classList.toggle('filtered-out', !matches);
          if (matches) {
            card.classList.add('card-visible');
          }
        });

        if (scroll) scroll.update();

        requestAnimationFrame(() => {
          if (experimentsGrid) {
            experimentsGrid.classList.remove('grid-filtering');
          }
          if (scroll) scroll.update();
        });
      }, 240);
    });
  });
}

// Open directly if URL hash is #all-experiments or path is /gallery on load
if (window.location.hash === '#all-experiments' ||
    window.location.pathname === '/gallery') {
  openAllExperimentsView(false);
} else if (
    window.location.hash === '#faq-section' ||
    window.location.pathname === '/faq') {
  window.addEventListener('load', () => {
    const faqSection = document.getElementById('faq-section');
    if (faqSection && scroll) {
      scroll.scrollTo(faqSection);
    }
  });
}
