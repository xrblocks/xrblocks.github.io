# XR Blocks Landing Page — Engineering Handoff & Productionization Guide

This bundle contains the complete front-end implementation, 3D WebGL assets, videos, icons, and styles for the **XR Blocks** landing page (`Build XR without code`).

---

## 1. Quick Start (Local Development)

Because the page uses ES Module Import Maps (`three`), loads `.glb` 3D scenes via `fetch`/XHR, and initializes the WebAssembly Draco decoder (`libs/draco/`), it must be served over HTTP rather than opened directly via `file://`.

```bash
# Option A: Python 3
python3 -m http.server 8080

# Option B: Node.js (serve / vite / http-server)
npx serve -l 8080 .
```

Then open `http://localhost:8080` in your browser.

---

## 2. Directory & Runtime Asset Manifest

```text
xrblocks_landing/
├── index.html                          # Main document, layout, and responsive CSS (Desktop & Mobile)
├── main.js                         # Core application logic (Three.js scene, Locomotive Scroll, 3D Carousel, Modals, FAQ)
├── README.md                           # Engineering handoff & productionization documentation
├── libs/
│   └── draco/                          # Three.js DRACOLoader WebAssembly & JS decoders (required for .glb loading)
│       ├── draco_decoder.js
│       ├── draco_decoder.wasm
│       ├── draco_encoder.js
│       ├── draco_wasm_wrapper.js
│       └── gltf/
└── Designs/
    ├── AR-Scene-v65.glb                # Primary 3D background model loaded by main.js
    ├── Glasses-Scene.glb               # Secondary 3D model
    ├── VR-Scene.glb                    # Secondary 3D model
    ├── video_xrblocksgem.mp4           # Carousel Card 1 video (XR Blocks Gem)
    ├── video_immersiveweb.mp4          # Carousel Card 2 video (For Immersive Web)
    ├── video_gemini.mp4                # Carousel Card 3 video (Gemini Ice-breakers)
    ├── video_ballpit.mp4               # Carousel Card 4 video (Ballpit)
    ├── video_gesturerecognition.mp4    # Carousel Card 5 video (Gesture Recognition)
    ├── Google.svg                      # Footer Google logo
    ├── arrow_back.svg                  # Navigation back arrow
    ├── arrow_outward.svg               # Carousel card CTA external link arrow
    ├── play_arrow.svg                  # Presentation video play button icon
    ├── add.svg                         # FAQ expand icon (+)
    ├── close_small.svg                 # FAQ collapse icon (×)
    ├── downarrow.svg                   # Fixed bottom scroll indicator arrow
    ├── language.svg                    # Header language selector icon
    ├── check.svg                       # Header language active checkmark
    ├── share.svg                       # Header share dropdown icon
    ├── docs.svg                        # Header Docs icon
    ├── github.svg                      # Header GitHub icon
    ├── more.svg                        # Mobile header menu trigger icon (⋮)
    ├── team_dashboard.svg              # Mobile menu Templates icon
    ├── experiment.svg                  # Mobile menu Demos icon
    ├── discord.svg                     # Header share menu Discord icon
    ├── x.svg                           # Header share menu X icon
    ├── instagram.svg                   # Header share menu Instagram icon
    ├── linkedin.svg                    # Footer LinkedIn share icon
    ├── facebook.svg                    # Footer Facebook share icon
    └── twitter.svg                     # Footer X/Twitter share icon
```

> **Note on Unused/Legacy Reference Files:** Any additional `.jpg`, `.png`, older `.glb` (`AR-Scene-Uncompressed-v61..63.glb`), or reference `.mp4` (`MouseInteractivity.mp4`, `Scroll-Example.mp4`) files in `Designs/`, as well as `main.js`, were used during earlier design iterations and have been excluded from the clean production zip (or can be safely omitted from production builds).

---

## 3. External Dependencies & CDN Imports

Currently loaded in `<head>` of `index.html`:

1. **Google Fonts**
   - `Google Sans`, `Google Sans Display` (`400, 500, 700`), and `Google Sans Text` (`400, 500, 700`) via `fonts.googleapis.com`.
   - *Production tip:* Ensure internal/official Google Font CSS URLs or self-hosted `.woff2` font faces are configured for users without local `Google Sans Display` / `Google Sans Text` installed.
2. **Three.js (`0.180.0`)**
   - Loaded via `<script type="importmap">` from `https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js` and `three/addons/`.
   - *Production tip:* Can be bundled via Vite/Webpack/Rollup (`npm install three@0.180.0`) or self-hosted if strict CSP disallows `cdn.jsdelivr.net`.
3. **YouTube Embed (`nknCzIxHHzw`)**
   - The video section (`#video`) displays the high-res thumbnail (`https://i.ytimg.com/vi/nknCzIxHHzw/maxresdefault.jpg` with automatic fallback to `hqdefault.jpg`) and injects a YouTube `<iframe>` (`https://www.youtube.com/embed/nknCzIxHHzw?autoplay=1&rel=0`) when clicked.

---

## 4. URLs, Links & Pre-Launch Review Checklist

All outbound links open in a new tab (`target="_blank" rel="noopener noreferrer"`). Before launching publicly, verify the following URLs in `index.html`:

| Section | Element / Label | Current Target URL | Production Notes |
| :--- | :--- | :--- | :--- |
| **Header / Mobile Menu** | `Demos` | `https://xrblocks.github.io/docs/samples/ModelViewer/` | Live |
| **Header / Mobile Menu** | `Templates` | `https://xrblocks.github.io/docs/templates/Basic/` | Live |
| **Header / Mobile Menu** | `Docs` | `https://xrblocks.github.io/docs/` | Live |
| **Header / Mobile Menu** | `GitHub` | `https://github.com/google/xrblocks` | Live |
| **Header Dropdown** | `Language` (`English`, `Français`, etc.) | UI state selector in `main.js` | Wire `data-lang` selection in `.lang-option` to i18n routing/localization if multi-locale support is required. |
| **Header Dropdown** | `Share` (`Discord`, `X`, `Instagram`) | `https://discord.com`, `https://x.com`, `https://instagram.com` | Update to specific community/social URLs if desired. |
| **Hero CTA (Primary)** | `Build in AI Studio` | `https://aistudio-preprod.corp.google.com/app/apps` | **IMPORTANT:** Currently points to internal `aistudio-preprod.corp.google.com`. Update to public production AI Studio URL prior to public launch. |
| **Hero CTA (Secondary)** | `Try XR Blocks Gem` | `https://xrblocks.github.io/gem/` | Live |
| **Carousel Card 1** | `Create XR Now` (XR Blocks Gem) | `https://xrblocks.github.io/gem/` | Live |
| **Carousel Card 2** | `Explore Live Demos` (For Immersive Web) | `https://xrblocks.github.io/docs/samples/ModelViewer/` | Live |
| **Carousel Card 3** | `Explore Demo` (Gemini Ice-breakers) | `https://xrblocks.github.io/docs/samples/Gemini-Icebreakers` | Live |
| **Carousel Card 4** | `Explore Demo` (Ballpit) | `https://xrblocks.github.io/docs/samples/Ballpit` | Live |
| **Carousel Card 5** | `Explore Demo` (Gesture Recognition) | `https://xrblocks.github.io/docs/samples/XR-Emoji` | Live |
| **Carousel Section CTA** | `View on GitHub` | `https://github.com/google/xrblocks` | Live |
| **Video Section** | Presentation Video | `https://www.youtube.com/watch?v=nknCzIxHHzw` | Embedded on click |
| **Newsletter CTA** | `Sign up for the newsletter` | `https://forms.gle/kvPCrnfsxFTspATT6` | Live Google Form |
| **Footer Social** | `LinkedIn` | `https://www.linkedin.com/sharing/share-offsite/?url=https://xrblocks.github.io` | Live share intent |
| **Footer Social** | `Facebook` | `https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fxrblocks.github.io%2F&src=sdkpreparse` | Live share intent |
| **Footer Social** | `Twitter (X)` | `https://twitter.com/intent/tweet?text=...&url=https%3A%2F%2Fxrblocks.github.io` | Live share intent |
| **Footer Legal** | `Privacy & Terms` | `https://policies.google.com/` | Live |

---

## 5. Key Interactive Behaviors & Design Specs

If migrating `index.html` and `main.js` into a framework (e.g., Lit, React, Angular, or Astro), preserve these behaviors:

1. **Top Navigation Progressive Blur (`.header-progressive-blur`)**
   - Uses 5 stacked `backdrop-filter: blur(...)` layers (`4px`, `6px`, `10px`, `18px`, `34px`) with non-overlapping vertical `linear-gradient` band masks (`height: calc(88px + 16px)`) and a transparent background (`#0000`) to preserve the underlying scene tone.
   - Off at `scrollY = 0` (`--nav-blur-progress: 0`) and smoothly eases in over the first `160px` of scroll via `updateHeaderBlur(scrollY)`.
2. **3D Background Scene & Edge-Clamped Blur (`main.js`)**
   - Uses `THREE.WebGLRenderer` inside `#canvas-container` (`position: fixed`).
   - Loads `Designs/AR-Scene-v65.glb` with `DRACOLoader` (`libs/draco/`).
   - Blurs the 3D background as the user scrolls past the hero (`scrollY = 100..900px`) via `#canvas-blur-overlay` (`backdrop-filter: blur(...) saturate(...)`), which clamps edge pixels (`SkTileMode::kClamp`) so the viewport borders never fade to transparent or brighten.
3. **"Get to know XR Blocks" Infinite 3D Carousel (`#carousel-section`)**
   - Infinite wrap-around track supporting mouse drag, touch swipe, and horizontal trackpad/wheel scrolling.
   - **First-Load Entrance Animation:** When the carousel first enters the viewport, cards swipe in from right to left with tight spacing and an overlapping left-to-right cascading 3D fan-in rotation (`rotateY(18deg)`, `rotateZ(-2.5deg)` settling to `0deg`).
   - **3D Viewport Edge Curvature:** As cards approach the left or right outer edges of the viewport (`absNorm > 0.55` on desktop, `> 0.45` on mobile), they smoothly rotate inward (`rotateY` up to `±12°` desktop / `±8°` mobile) and translate slightly toward the camera (`translateZ` up to `+32px` desktop / `+18px` mobile) under `perspective: 1200px` for a subtle concave curve.
4. **FAQ Accordion (`#faq-section`)**
   - Container background color is `#E3E6FC` with `60px` border radius (`30px` on mobile).
   - Items animate in with a tight cascading fade-up when scrolling into view (`55ms` stagger) and feature a subtle hover scale (`scale: 1.002`).
   - **Desktop (`> 768px`):** First FAQ item is expanded by default on load.
   - **Mobile (`<= 768px`):** All FAQ items start collapsed by default on load to conserve vertical viewport space (`initFaqAccordion` in `main.js`).
5. **Debug Overlay (`index.html`)**
   - `index.html` includes a small `window.onerror` / `unhandledrejection` debug banner in `<script>` that only activates if `?debug=1` is present in the URL. Remove or gate behind development mode before deploying to production.

---

## 6. Production Deployment Recommendations

- **MIME Types & Compression:** Ensure your hosting server / CDN serves `.wasm` with `application/wasm` and `.glb` with `model/gltf-binary`, and enables Brotli/Gzip compression for `.glb`, `.wasm`, `.js`, and `.svg`.
- **Caching Headers:** Set long `Cache-Control` headers (`public, max-age=31536000, immutable`) on static assets (`Designs/*.glb`, `Designs/*.mp4`, `libs/draco/*`).
- **SEO & Social Sharing Meta Tags:** Add OpenGraph (`og:title`, `og:description`, `og:image`, `og:url`) and `<link rel="icon">` tags to `<head>` in `index.html` matching the final production domain (`https://xrblocks.github.io/`).
