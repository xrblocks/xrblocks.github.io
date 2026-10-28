import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Native browser scroll adapter (replaces Locomotive Scroll smooth-scrolling hijack)
const scrollListeners = [];
const scroll = {
  on(event, cb) {
    if (event === 'scroll') {
      scrollListeners.push(cb);
    }
  },
  update() {},
  scrollTo(target, opts = {}) {
    const immediate = opts && (opts.duration === 0 || opts.disableLerp);
    const behavior = immediate ? 'auto' : 'smooth';
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior });
    } else if (target && typeof target.getBoundingClientRect === 'function') {
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior });
    }
  }
};
window.locomotiveScroll = scroll;

window.addEventListener('scroll', () => {
  const y = window.scrollY || window.pageYOffset || 0;
  for (let i = 0; i < scrollListeners.length; i++) {
    scrollListeners[i]({ scroll: { y } });
  }
}, { passive: true });

// ----------------------------------------------------
// 1. THREE.JS 3D BACKGROUND SCENE SETUP
// ----------------------------------------------------

const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// Camera setup (perspective to feel the 3D space)
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const canvasBlurOverlay = document.createElement('div');
canvasBlurOverlay.id = 'canvas-blur-overlay';
container.appendChild(canvasBlurOverlay);

function setCanvasBlur(blurPx, saturateVal) {
  const filterStr = blurPx > 0.01 || saturateVal < 0.999
    ? `blur(${blurPx.toFixed(2)}px) saturate(${saturateVal.toFixed(3)})`
    : 'none';
  canvasBlurOverlay.style.backdropFilter = filterStr;
  canvasBlurOverlay.style.webkitBackdropFilter = filterStr;
}

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 8, 5);
scene.add(dirLight);

// Group to hold all room meshes so we can tilt/rotate them together
const roomGroup = new THREE.Group();
scene.add(roomGroup);

let baseY = -0.2;


// ----------------------------------------------------
// 2. PROCEDURAL 3D MESH GENERATION (Pastel Stylized Objects)
// ----------------------------------------------------

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('libs/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

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

console.log('[Three.js] Starting GLB loader request for Designs/AR-Scene-v65.glb...');
gltfLoader.load('Designs/AR-Scene-v65.glb', (gltf) => {
  debugLog('[Three.js] GLB file loaded successfully!');
  arModel = gltf.scene;
  activeScene = arModel;
  debugLog('[Three.js] Model child nodes parsed: ' + arModel.children.length);

  // Extract camera from GLTF scene graph recursively
  let blenderCamera = null;
  arModel.traverse((child) => {
    debugLog('[Three.js] Child node: ' + child.name + ' | type: ' + child.type + ' | camera: ' + !!child.isCamera);
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
    debugLog('[Three.js] Blender Camera found: ' + blenderCamera.name + ' fov: ' + blenderCamera.fov);
    
    // Reset roomGroup and model transforms BEFORE calculating camera world matrices
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

    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(initialWorldQuat);
    const pivotDistance = 4.8; // Distance to the round coffee table
    pivotPoint = initialWorldPos.clone().add(cameraDirection.clone().multiplyScalar(pivotDistance));

    debugLog('[Three.js] Pivot point set to: ' + JSON.stringify(pivotPoint));

    // Place the pivot point at roomGroup's origin (0, 0, 0)
    arModel.position.copy(pivotPoint).multiplyScalar(-1);

    // Apply the visual screen layout offset to roomGroup container rather than pivotPoint itself
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
    debugLog('[Three.js] Camera world pos synced: ' + JSON.stringify(worldPos));
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
  scroll.update();
},
(xhr) => {
  if (xhr.total > 0) {
    debugLog('[Three.js] Loading progress: ' + Math.round(xhr.loaded / xhr.total * 100) + '%');
  }
},
(error) => {
  debugLog('[Three.js] Error loading Blender scene: ' + (error.message || error));
  console.error('[Three.js] Error loading Blender scene:', error.message || error);
});

function loadGlassesModel(pivotPoint) {
  console.log('[Three.js] Starting GLB loader request for Designs/Glasses-Scene.glb...');
  gltfLoader.load('Designs/Glasses-Scene.glb', (gltf) => {
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
  console.log('[Three.js] Starting GLB loader request for Designs/VR-Scene.glb...');
  gltfLoader.load('Designs/VR-Scene.glb', (gltf) => {
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

// Scale roomGroup to make it fill the hero viewport by default (fallback values)
roomGroup.scale.set(2.2, 2.2, 2.2);

// Position the entire room group in camera view by default
roomGroup.position.set(0, baseY, 0);

// CTA button hover state tracker for camera zoom parallax
let isCtaHovered = false;
let currentRoomZ = 0;
let zVelocity = 0;
const ctaBtn = document.querySelector('.cta-btn');
const ctaBtns = document.querySelectorAll('.cta-btn');

function initCtaWordMask(btn) {
  const content = btn.querySelector('.cta-content');
  if (!content) return;
  const text = content.textContent.trim();
  const words = text.split(/\s+/);

  const buildWordSpans = () =>
    words
      .map((word, i) => `<span class="cta-word" style="--word-i: ${i}">${word}</span>`)
      .join(' ');

  content.innerHTML = `
    <span class="cta-row cta-row-primary">${buildWordSpans()}</span>
    <span class="cta-row cta-row-clone" aria-hidden="true">${buildWordSpans()}</span>
  `;
}

document.querySelectorAll('.cta-btn, .see-all-btn, .newsletter-btn').forEach((btn) => {
  initCtaWordMask(btn);
});

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

const headerEl = document.querySelector('header');
function updateHeaderBlur(scrollY) {
  if (!headerEl) return;
  const rawProgress = Math.max(0, Math.min(1, scrollY / 160));
  const smoothProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
  headerEl.style.setProperty('--nav-blur-progress', smoothProgress.toFixed(4));
}
updateHeaderBlur(window.scrollY || window.pageYOffset || 0);

const heroSection = document.getElementById('hero');
const videoSection = document.getElementById('video');
const carouselSection = document.getElementById('carousel-section');
const showcaseHeader = document.querySelector('.showcase-header');
const carouselContainer = document.querySelector('.carousel-container');

let targetScrollY = 0;
let currentScrollY = 0;

let isTransitioningView = false;

scroll.on('scroll', (obj) => {
  const scrollY = obj.scroll.y;
  const height = window.innerHeight;

  updateHeaderBlur(scrollY);

  if (document.body.classList.contains('experiments-view-active')) {
    setCanvasBlur(60, 0.6);
    return;
  }

  if (isTransitioningView) {
    return;
  }
  
  // A. Hero Section Scroll Parallax + Blur Background
  const heroProgress = Math.min(scrollY / height, 1.0);
  heroSection.style.transform = `translateY(${heroProgress * -60}px)`;

  // Add blur/shift/parallax to 3D Background (blur interpolates from 100px to 900px scroll height)
  const blurProgress = Math.max(0, Math.min(1.0, (scrollY - 100) / 800));
  const blurAmount = blurProgress * 60;
  setCanvasBlur(blurAmount, 1.0 - heroProgress * 0.4);
  targetScrollY = scrollY;

  // Video browser frame zoom scroll effect based on bounding box viewport entry
  const rect = videoSection.getBoundingClientRect();
  const startY = height; // enters from viewport bottom
  const endY = height * 0.15; // centers in viewport
  const videoProgress = Math.max(0, Math.min(1, (startY - rect.top) / (startY - endY)));
  const videoScale = 0.8 + (videoProgress * 0.2); // scales from 0.8 to 1.0
  const videoFrame = document.querySelector('.video-browser-frame');
  if (videoFrame) {
    videoFrame.style.transform = `scale(${videoScale})`;
  }

  // B. Hide scroll indicator arrow once the user starts scrolling down,
  // and ensure the video module hides when scrolled all the way back to the top
  const scrollIndicator = document.querySelector('.scroll-indicator');
  if (scrollY > 10) {
    if (scrollIndicator) {
      scrollIndicator.classList.add('hidden');
    }
    if (videoSection && rect.top < height * 0.9 && rect.bottom > 0) {
      videoSection.classList.add('visible');
    }
  } else {
    if (scrollIndicator) {
      scrollIndicator.classList.remove('hidden');
    }
    if (videoSection) {
      videoSection.classList.remove('visible');
    }
  }
});

// Premium Scroll Entrance Animation Observer (IntersectionObserver)
const observerOptions = {
  root: null, // viewport
  rootMargin: '0px',
  threshold: 0.15 // trigger when 15% of the element is visible
};

let carouselIntroTriggered = false;
let carouselIntroDone = false;
let carouselIntroStartTime = 0;

const entranceObserver = new IntersectionObserver((entries) => {
  if (document.body.classList.contains('experiments-view-active') || isTransitioningView) {
    return;
  }
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      if (entry.target === videoSection && targetScrollY <= 10) {
        return;
      }
      if (entry.target === carouselContainer && !carouselIntroTriggered) {
        carouselIntroTriggered = true;
        carouselIntroStartTime = performance.now();
      }
      entry.target.classList.add('visible');
    } else {
      // Remove visible class when scrolled out of view to allow re-triggering animations, EXCEPT for the carousel
      if (entry.target !== carouselContainer) {
        entry.target.classList.remove('visible');
      }
    }
  });
}, observerOptions);

// Observe all fade-in elements (Hero copy, showcase titles, newsletter copy)
document.querySelectorAll('.scroll-fade').forEach((el) => {
  entranceObserver.observe(el);
});

if (videoSection) {
  entranceObserver.observe(videoSection);
}

if (carouselContainer) {
  entranceObserver.observe(carouselContainer);
}

const faqList = document.querySelector('.faq-list');
if (faqList) {
  entranceObserver.observe(faqList);
}

// Global scroll indicator click handler using Locomotive scrollTo
window.handleScrollIndicatorClick = () => {
  scroll.scrollTo(window.innerHeight);
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

function animateCardArrow(btn) {
  const mask = btn.querySelector('.card-cta-icon-mask');
  if (!mask) return;
  const activeArrows = mask.querySelectorAll('.card-cta-arrow:not(.arrow-out)');
  if (!activeArrows.length) return;
  const currentArrow = activeArrows[activeArrows.length - 1];

  const newArrow = currentArrow.cloneNode(true);
  newArrow.classList.remove('arrow-out');
  newArrow.classList.add('arrow-in-prepare');
  mask.appendChild(newArrow);

  // Trigger reflow so starting bottom-left position is registered
  void newArrow.offsetWidth;

  // Shoot current arrow out to upper-right
  activeArrows.forEach((el) => el.classList.add('arrow-out'));

  // Immediately shoot new arrow in from bottom-left
  setTimeout(() => {
    newArrow.classList.remove('arrow-in-prepare');
  }, 30);

  // Clean up old arrow element(s) after transition completes
  setTimeout(() => {
    activeArrows.forEach((el) => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }, 420);
}

document.querySelectorAll('.card-cta-btn').forEach((btn) => {
  btn.addEventListener('mouseenter', () => animateCardArrow(btn));
});

// ----------------------------------------------------
// 6. RENDER LOOP (Animations & Lerp Tilt)
// ----------------------------------------------------

const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();

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
  roomGroup.position.y = baseY + (currentScrollY * 0.00021) + Math.sin(time * 0.45) * 0.05;

  // Zoom in towards camera when CTA button is hovered (organic spring physics with snappy ease-in and long ease-out)
  const targetRoomZ = isCtaHovered ? 0.22 : 0;
  const zDelta = targetRoomZ - currentRoomZ;
  zVelocity += zDelta * 0.0025; // Snappier spring constant to minimize initial lag
  zVelocity *= 0.88; // 12% drag per frame to slowly ease-out and stabilize
  currentRoomZ += zVelocity;
  roomGroup.position.z = currentRoomZ + transitionRoomZ;

  // Update Carousel Drag-to-Scroll physics (easing & inertia momentum + infinite wrap-around)
  if (carouselContainer) {
    const minThreshold = (bufferOffset - indent) - originalWidth * 0.5;
    if (isDraggingCarousel) {
      // Direct synchronization eliminating latency
      carouselCurrentScroll = carouselTargetScroll;
      carouselContainer.scrollLeft = carouselCurrentScroll;
    } else if (Math.abs(carouselVelocity) > 0.015) {
      // Inertia slide with deceleration (calibrated to the scaled velocity base)
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

    // Apply subtle 3D concave curve + 1st-time right-to-left swipe-in animation
    if (cardStep > 0 && cards.length > 0) {
      const halfViewport = window.innerWidth * 0.5;
      const isMobileView = window.innerWidth <= 768;
      const maxRotateDeg = isMobileView ? 8 : 12;
      const maxTranslateZ = isMobileView ? 18 : 32;
      const edgeStart = isMobileView ? 0.45 : 0.55;
      const edgeSpan = 0.65;

      const now = performance.now();
      const introElapsed = carouselIntroTriggered ? (now - carouselIntroStartTime) : 0;
      const baseSwipeX = isMobileView ? 120 : 220;
      const staggerDistanceX = isMobileView ? 4 : 6;
      const leadIndex = carouselCloneCount;
      let allIntroFinished = carouselIntroTriggered;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        let introTranslateX = 0;
        let introTranslateZ = 0;
        let introRotateY = 0;
        let introRotateZ = 0;

        if (!carouselIntroDone) {
          const staggerIndex = Math.max(0, i - leadIndex);
          const translateDelayMs = staggerIndex * 14;
          const translateDurationMs = 1200;
          const rotateDelayMs = staggerIndex * 55;
          const rotateDurationMs = 950;
          const startOffsetX = baseSwipeX + staggerIndex * staggerDistanceX;
          const startRotateY = (isMobileView ? 12 : 18) + staggerIndex * (isMobileView ? 1.5 : 2.2);
          const startRotateZ = -(isMobileView ? 1.6 : 2.5) - staggerIndex * 0.45;
          const startTranslateZ = -(isMobileView ? 28 : 48) - staggerIndex * 10;

          if (!carouselIntroTriggered) {
            introTranslateX = startOffsetX;
            introTranslateZ = startTranslateZ;
            introRotateY = startRotateY;
            introRotateZ = startRotateZ;
            card.style.opacity = '0';
            allIntroFinished = false;
          } else {
            const translateT = Math.max(0, Math.min(1, (introElapsed - translateDelayMs) / translateDurationMs));
            const rotateT = Math.max(0, Math.min(1, (introElapsed - rotateDelayMs) / rotateDurationMs));
            if (translateT < 1 || rotateT < 1) {
              allIntroFinished = false;
            }
            // Soft cubic ease-out for horizontal glide; tightly overlapping left-to-right cascade for 3D rotation & depth
            const easeTranslate = 1 - Math.pow(1 - translateT, 3);
            const easeRotate = 1 - Math.pow(1 - rotateT, 3);
            introTranslateX = startOffsetX * (1 - easeTranslate);
            introTranslateZ = startTranslateZ * (1 - easeRotate);
            introRotateY = startRotateY * (1 - easeRotate);
            introRotateZ = startRotateZ * (1 - easeRotate);

            const opacityDelay = i >= carouselCloneCount ? staggerIndex * 25 : 80;
            const opacityDuration = 580;
            const opacityT = Math.max(0, Math.min(1, (introElapsed - opacityDelay) / opacityDuration));
            const easedOpacity = 1 - Math.pow(1 - opacityT, 2.5);
            card.style.opacity = easedOpacity.toFixed(3);
          }
        }

        const cardCenterX = i * cardStep + carouselCardWidth * 0.5 - carouselCurrentScroll + introTranslateX;
        const normalizedX = halfViewport > 0 ? (cardCenterX - halfViewport) / halfViewport : 0;
        const absNorm = Math.abs(normalizedX);
        const edgeProgress = Math.max(0, Math.min(1.2, (absNorm - edgeStart) / edgeSpan));
        const easedEdge = Math.pow(edgeProgress, 1.5);
        const rotateY = -Math.sign(normalizedX) * easedEdge * maxRotateDeg + introRotateY;
        const translateZ = easedEdge * maxTranslateZ + introTranslateZ;
        card.style.transformOrigin = '50% 50%';
        card.style.transform = `perspective(1400px) translate3d(${introTranslateX.toFixed(2)}px, 0, ${translateZ.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) rotateZ(${introRotateZ.toFixed(2)}deg)`;
      }

      if (!carouselIntroDone && allIntroFinished) {
        carouselIntroDone = true;
        for (let i = 0; i < cards.length; i++) {
          cards[i].style.opacity = '1';
        }
      }
    }
  }

  // Update scene transition opacities and zoom
  if (transitionState === 'fading_out') {
    if (activeScene) {
      transitionProgress += 0.045; // Snappy fade-out (takes ~22 frames / ~0.36s)
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
          transitionRoomZ = -0.12; // Start further away from camera (zoomed-out) to zoom IN
          transitionState = 'fading_in';
        } else {
          transitionRoomZ = 0;
          transitionState = 'idle';
        }
      } else {
        const t = transitionProgress;
        const eased = 1 - Math.pow(1 - t, 3); // EaseOutCubic
        setModelOpacity(activeScene, 1 - eased);
      }
    } else {
      activeScene = pendingScene;
      pendingScene = null;
      if (activeScene) {
        activeScene.visible = true;
        transitionProgress = 0;
        setModelOpacity(activeScene, 0);
        transitionRoomZ = -0.12; // Start further away to zoom in
        transitionState = 'fading_in';
      } else {
        transitionRoomZ = 0;
        transitionState = 'idle';
      }
    }
  } else if (transitionState === 'fading_in') {
    if (activeScene) {
      transitionProgress += 0.008; // Elongate zoom-in to last 2 seconds (~125 frames)
      if (transitionProgress >= 1.0) {
        transitionProgress = 1.0;
        setModelOpacity(activeScene, 1.0);
        transitionRoomZ = 0; // Reset exactly to 0
        transitionState = 'idle';
      } else {
        const t = transitionProgress;
        // Fade in and zoom in using EaseOutCubic for a soft and smooth deceleration
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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
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
        src="https://www.youtube.com/embed/ZzmWNUtVHB8?autoplay=1" 
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

// Scroll back to the top of the page smoothly via Locomotive scroll instance
window.handleScrollToTop = () => {
  scroll.scrollTo(0);
};

// ----------------------------------------------------
// 10. HEADER DROPDOWNS & MOBILE RESPONSIVE UI CONTROLLER
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
      langOptions.forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      const labelSpan = opt.querySelector('span:not(.lang-check)');
      if (mobileLangLabel && labelSpan) {
        mobileLangLabel.textContent = labelSpan.textContent;
      }
      langDropdownPanel.classList.remove('active');
      if (langToggleBtn) langToggleBtn.classList.remove('active');
      if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
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
  if (
    mobileMenuPanel &&
    mobileMenuBtn &&
    !mobileMenuPanel.contains(e.target) &&
    !mobileMenuBtn.contains(e.target)
  ) {
    mobileMenuPanel.classList.remove('active');
    if (
      (!langDropdownPanel || !langDropdownPanel.classList.contains('active')) &&
      (!shareDropdownPanel || !shareDropdownPanel.classList.contains('active'))
    ) {
      mobileMenuBtn.classList.remove('active');
    }
  }
  if (
    langDropdownPanel &&
    !langDropdownPanel.contains(e.target) &&
    (!langToggleBtn || !langToggleBtn.contains(e.target)) &&
    (!mobileLangTrigger || !mobileLangTrigger.contains(e.target))
  ) {
    langDropdownPanel.classList.remove('active');
    if (langToggleBtn) langToggleBtn.classList.remove('active');
    if (
      mobileMenuBtn &&
      (!mobileMenuPanel || !mobileMenuPanel.classList.contains('active')) &&
      (!shareDropdownPanel || !shareDropdownPanel.classList.contains('active'))
    ) {
      mobileMenuBtn.classList.remove('active');
    }
  }
  if (
    shareDropdownPanel &&
    !shareDropdownPanel.contains(e.target) &&
    (!shareToggleBtn || !shareToggleBtn.contains(e.target)) &&
    (!mobileShareTrigger || !mobileShareTrigger.contains(e.target))
  ) {
    shareDropdownPanel.classList.remove('active');
    if (shareToggleBtn) shareToggleBtn.classList.remove('active');
    if (
      mobileMenuBtn &&
      (!mobileMenuPanel || !mobileMenuPanel.classList.contains('active')) &&
      (!langDropdownPanel || !langDropdownPanel.classList.contains('active'))
    ) {
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
        updateCta('Glasses coming soon', 'Designs/icon_Glasses.svg', '#888A97');
      }
    });
  });
}

// ----------------------------------------------------
// 11. FAQ ACCORDION INTERACTIVITY
// ----------------------------------------------------
const faqItems = document.querySelectorAll('.faq-item');
const heroFaqLink = document.querySelector('.hero-faq-link');

if (faqItems.length > 0) {
  let userToggledFaq = false;
  const mobileFaqMedia = window.matchMedia('(max-width: 768px)');

  const wrapFaqTextWords = (node, container) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          container.appendChild(document.createTextNode(' '));
        } else {
          const span = document.createElement('span');
          span.className = 'faq-line-word';
          span.textContent = part;
          container.appendChild(span);
        }
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const clone = node.cloneNode(false);
      node.childNodes.forEach((child) => wrapFaqTextWords(child, clone));
      container.appendChild(clone);
    }
  };

  const updateFaqLineIndices = (answerEl) => {
    if (!answerEl) return;
    const words = answerEl.querySelectorAll('.faq-line-word');
    if (!words.length) return;
    let lineIndex = 0;
    let currentTop = null;
    words.forEach((word) => {
      const top = word.offsetTop;
      if (currentTop === null) {
        currentTop = top;
      } else if (Math.abs(top - currentTop) > 4) {
        lineIndex += 1;
        currentTop = top;
      }
      word.style.setProperty('--line-i', String(lineIndex));
    });
  };

  faqItems.forEach((item) => {
    const answerEl = item.querySelector('.faq-answer');
    if (answerEl) {
      const frag = document.createDocumentFragment();
      Array.from(answerEl.childNodes).forEach((child) => wrapFaqTextWords(child, frag));
      answerEl.innerHTML = '';
      answerEl.appendChild(frag);
      updateFaqLineIndices(answerEl);
    }
  });

  window.addEventListener('resize', () => {
    faqItems.forEach((item) => updateFaqLineIndices(item.querySelector('.faq-answer')));
  });

  const applyDefaultFaqState = (isMobile) => {
    if (userToggledFaq) return;
    if (isMobile) {
      faqItems.forEach((item) => item.classList.remove('open'));
    } else {
      faqItems.forEach((item, index) => item.classList.toggle('open', index === 0));
    }
    scroll.update();
  };

  applyDefaultFaqState(mobileFaqMedia.matches);
  if (mobileFaqMedia.addEventListener) {
    mobileFaqMedia.addEventListener('change', (e) => applyDefaultFaqState(e.matches));
  }

  faqItems.forEach((item) => {
    const faqIcon = item.querySelector('.faq-icon');
    const stepFaqIconRotation = () => {
      if (!faqIcon) return;
      const currentRot = parseFloat(faqIcon.dataset.rot || '0');
      const nextRot = currentRot - 90;
      faqIcon.dataset.rot = String(nextRot);
      faqIcon.style.transform = `rotate(${nextRot}deg)`;
    };

    item.addEventListener('mouseenter', stepFaqIconRotation);
    item.addEventListener('mouseleave', stepFaqIconRotation);

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
        updateFaqLineIndices(item.querySelector('.faq-answer'));
        item.classList.add('open');
      }
      // Smoothly recalculate Locomotive Scroll height across the 650ms ease-out transition
      const startTime = performance.now();
      const syncScrollHeight = (now) => {
        scroll.update();
        if (now - startTime < 750) {
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
    if (faqSection) {
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
  if (isTransitioningView || document.body.classList.contains('experiments-view-active')) return;
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
  setCanvasBlur(60, 0.6);

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

    scroll.scrollTo(0, { duration: 0, disableLerp: true });
    scroll.update();

    requestAnimationFrame(() => {
      scroll.update();
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
      history.pushState({ view: 'experiments' }, '', '#all-experiments');
    }
  }, 220);
}

function closeAllExperimentsView(pushHistory = true) {
  if (isTransitioningView || !document.body.classList.contains('experiments-view-active')) return;
  isTransitioningView = true;

  // Fade out the All Experiments view as a unified container and fade out the Home back button
  document.body.classList.remove('experiments-animate-in');
  if (allExperimentsView) {
    allExperimentsView.classList.add('fading-out');
  }

  // Prepare #home-view in its hidden/fading-out state BEFORE making it display: block
  if (homeView) {
    homeView.classList.add('fading-out');
  }

  setTimeout(() => {
    // Switch active view while #home-view is still at opacity: 0
    document.body.classList.remove('experiments-view-active');
    if (allExperimentsView) {
      allExperimentsView.classList.remove('fading-out');
    }

    // Restore exact scroll state & 3D background blur synchronously before revealing #home-view
    const height = window.innerHeight;
    const heroProgress = Math.min(savedHomeScrollY / height, 1.0);
    const blurProgress = Math.max(0, Math.min(1.0, (savedHomeScrollY - 100) / 800));
    const blurAmount = blurProgress * 60;
    setCanvasBlur(blurAmount, 1.0 - heroProgress * 0.4);
    heroSection.style.transform = `translateY(${heroProgress * -60}px)`;
    targetScrollY = savedHomeScrollY;
    currentScrollY = savedHomeScrollY;

    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
      scrollIndicator.classList.toggle('hidden', savedHomeScrollY > 10);
    }

    scroll.update();
    scroll.scrollTo(savedHomeScrollY, { duration: 0, disableLerp: true });

    requestAnimationFrame(() => {
      scroll.update();
      scroll.scrollTo(savedHomeScrollY, { duration: 0, disableLerp: true });
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

    if (pushHistory && window.location.hash === '#all-experiments') {
      history.pushState({ view: 'home' }, '', window.location.pathname + window.location.search);
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
  if (window.location.hash === '#all-experiments') {
    openAllExperimentsView(false);
  } else if (document.body.classList.contains('experiments-view-active')) {
    closeAllExperimentsView(false);
  }
});

// Filter pill click interactivity: hide the whole grid, swap cards cleanly, and fade in the new set
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
          const matches = selectedCategory === 'All' || categories.includes(selectedCategory);
          card.style.transitionDelay = '0s';
          card.classList.toggle('filtered-out', !matches);
          if (matches) {
            card.classList.add('card-visible');
          }
        });

        scroll.update();

        requestAnimationFrame(() => {
          if (experimentsGrid) {
            experimentsGrid.classList.remove('grid-filtering');
          }
          scroll.update();
        });
      }, 240);
    });
  });
}

// Open directly if URL hash is #all-experiments on load
if (window.location.hash === '#all-experiments') {
  openAllExperimentsView(false);
}



