// Cyberpunk scene: rain-soaked neon city skyline at night, hover-cars
// streaking past, lightning, drone swarm flyover, holographic billboard,
// distant explosions, scanline holograms.
export const CyberpunkScene = {
  name: 'Cyberpunk',

  ringCool: 'vec3(0.95, 0.10, 0.55)',
  ringWarm: 'vec3(0.10, 0.95, 0.95)',
  haloInner: 'vec3(1.00, 0.20, 0.65)',
  haloOuter: 'vec3(0.20, 0.90, 1.00)',

  helpers: /* glsl */ `
    // Rectangular building silhouette with random window grid.
    float buildingMask(vec2 p, float cx, float w, float h, float baseY) {
      return step(abs(p.x - cx), w)
           * step(baseY, p.y)
           * step(p.y, baseY + h);
    }

    // Returns 1.0 inside a window of the building grid (with random lit-ness).
    float windowsAt(vec2 p, float cx, float w, float h, float baseY,
                    float seed) {
      vec2 lp = (p - vec2(cx - w, baseY)) / vec2(w * 2.0, h);
      if (lp.x < 0.0 || lp.x > 1.0 || lp.y < 0.0 || lp.y > 1.0) return 0.0;
      vec2 grid = vec2(8.0, 22.0);
      vec2 cell = lp * grid;
      vec2 fc = fract(cell);
      vec2 ic = floor(cell);
      float lit = step(0.55, hash(ic + seed));
      // Window rectangle inside cell.
      float win = step(0.18, fc.x) * step(fc.x, 0.82)
                * step(0.25, fc.y) * step(fc.y, 0.85);
      // Some windows flicker.
      float flickerOn = step(0.92, hash(ic + seed + 7.7));
      float flicker = mix(1.0,
          0.5 + 0.5 * sin(uTime * 6.0 + ic.x + ic.y),
          flickerOn);
      return lit * win * flicker;
    }
  `,

  body: /* glsl */ `
    // Stereo parallax layers.
    vec2 pFar  = parallaxP(p, rd, 0.35);
    vec2 pBack = parallaxP(p, rd, 0.22);
    vec2 pMid  = parallaxP(p, rd, 0.12);
    vec2 pNear = parallaxP(p, rd, 0.04);

    // ---- Sky: deep purple haze with magenta horizon glow ----
    vec3 skyHigh = vec3(0.04, 0.02, 0.10);
    vec3 skyMid  = vec3(0.20, 0.05, 0.30);
    vec3 skyLow  = vec3(0.50, 0.10, 0.45);
    col = mix(skyLow, skyMid, smoothstep(-0.2, 0.4, pFar.y));
    col = mix(col, skyHigh, smoothstep(0.4, 1.0, pFar.y));

    // Drifting smog/clouds.
    float smog = fbm(vec2(pFar.x * 2.0 + uTime * 0.05, pFar.y * 2.0));
    col = mix(col, vec3(0.35, 0.10, 0.40), smog * smoothstep(0.0, 0.6, pFar.y) * 0.4);

    // ---- City skyline: layered buildings with windows ----
    // Back layer (distant, hazy purple).
    {
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float cx = (fi - 5.5) * 0.20 + sin(fi * 2.7) * 0.04;
        float w  = 0.05 + hash(vec2(fi, 1.7)) * 0.025;
        float h  = 0.45 + hash(vec2(fi, 4.3)) * 0.20;
        float baseY = -0.5;
        float b = buildingMask(pBack, cx, w, h, baseY);
        col = mix(col, vec3(0.10, 0.05, 0.20), b * 0.7);
        // Faint window lights.
        float win = windowsAt(pBack, cx, w, h, baseY, fi);
        col = mix(col, vec3(0.85, 0.55, 0.95), win * 0.5);
      }
    }
    // Mid layer (taller, dark, brighter windows).
    {
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float cx = (fi - 3.0) * 0.32 + sin(fi * 4.1) * 0.06;
        float w  = 0.08 + hash(vec2(fi, 11.7)) * 0.03;
        float h  = 0.65 + hash(vec2(fi, 24.3)) * 0.25;
        float baseY = -0.7;
        float b = buildingMask(pMid, cx, w, h, baseY);
        col = mix(col, vec3(0.02, 0.03, 0.08), b);
        // Bright neon windows.
        float win = windowsAt(pMid, cx, w, h, baseY, fi + 100.0);
        vec3 winCol = mix(vec3(0.20, 0.95, 1.00),
                          vec3(1.00, 0.30, 0.65),
                          hash(vec2(fi, 33.7)));
        col = mix(col, winCol, win);
      }
    }

    // ---- Neon signs glowing on the buildings ----
    {
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float cx = (fi - 1.5) * 0.55 + 0.05;
        float cy = -0.20 + hash(vec2(fi, 13.7)) * 0.4;
        vec2 d = pMid - vec2(cx, cy);
        // Vertical neon strip.
        float strip = smoothstep(0.012, 0.0, abs(d.x))
                    * smoothstep(0.10, 0.0, abs(d.y));
        vec3 nc = (mod(fi, 2.0) < 0.5)
                ? vec3(1.00, 0.20, 0.65)
                : vec3(0.20, 0.95, 1.00);
        // Pulsing.
        float pulse = 0.7 + 0.3 * sin(uTime * 2.0 + fi);
        col += nc * strip * pulse * 1.2;
        // Halo glow around it.
        float halo = smoothstep(0.08, 0.0, length(d * vec2(2.0, 1.0)));
        col += nc * halo * pulse * 0.4;
      }
    }

    // ---- Always-on rain (diagonal streaks) ----
    {
      // Rotated coordinates for diagonal rain.
      vec2 rp = vec2(pNear.x + pNear.y * 0.3, pNear.y);
      vec2 g = vec2(rp.x * 30.0, rp.y * 4.0 - uTime * 6.0);
      vec2 cell = floor(g);
      vec2 f = fract(g);
      float h = hash(cell);
      if (h > 0.55) {
        float streak = smoothstep(0.05, 0.0, abs(f.x - 0.5))
                     * smoothstep(0.5, 0.0, f.y) * step(0.0, f.y);
        col += vec3(0.55, 0.75, 1.00) * streak * 0.5;
      }
    }

    // Wet street reflections at the bottom.
    if (pNear.y < -0.55) {
      float refl = smoothstep(-0.55, -1.0, pNear.y);
      // Reflect city colors with vertical streaks.
      vec3 wetCol = vec3(0.10, 0.05, 0.20)
                  + vec3(1.0, 0.3, 0.7) * sin(pNear.x * 8.0 + uTime * 2.0) * 0.05;
      // Distorted vertical light streaks.
      float lights = sin(pNear.x * 30.0 + uTime * 1.0) * 0.5 + 0.5;
      lights = pow(lights, 4.0) * refl;
      col = mix(col, wetCol, refl * 0.7);
      col += vec3(1.0, 0.4, 0.8) * lights * 0.4;
      col += vec3(0.4, 0.95, 1.0) * pow(sin(pNear.x * 18.0 - uTime * 0.7), 6.0)
           * refl * 0.5;
    }

    // ---- Hover-cars streaking horizontally every 3s ----
    {
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float cycle = 3.0 + fi * 0.3;
        float local = mod(uTime + fi * 1.7, cycle);
        float dir = (mod(fi, 2.0) < 0.5) ? 1.0 : -1.0;
        float by = -0.05 + (hash(vec2(fi, 5.5)) - 0.5) * 0.4;
        float bx = -1.6 * dir + dir * local * (1.6 / cycle) * 2.0;
        vec2 d = pMid - vec2(bx, by);
        // Compact body.
        float body = smoothstep(0.030, 0.024, abs(d.x))
                   * smoothstep(0.008, 0.0, abs(d.y));
        // Front headlight (white) / rear (red), depending on direction.
        float front = smoothstep(0.005, 0.0,
            length(vec2(d.x - 0.025 * dir, d.y)));
        float rear = smoothstep(0.005, 0.0,
            length(vec2(d.x + 0.025 * dir, d.y)));
        col += vec3(0.20, 0.30, 0.50) * body * 1.5;
        col += vec3(1.00, 0.95, 0.85) * front * 2.5;
        col += vec3(1.00, 0.20, 0.20) * rear * 2.0;
        // Streak trail behind.
        float trail = smoothstep(0.20, 0.0, d.x * dir + 0.030)
                    * step(0.0, d.x * dir + 0.030)
                    * smoothstep(0.004, 0.0, abs(d.y));
        col += vec3(1.0, 0.30, 0.50) * trail * 0.7;
      }
    }

    // ---- Holographic billboard appearing every 11s ----
    {
      float cycle = 11.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float life = smoothstep(0.0, 1.0, local) * smoothstep(7.0, 5.0, local);
      // Big rectangle in upper sky.
      vec2 hc = vec2((hash(vec2(k, 11.1)) - 0.5) * 0.8, 0.45);
      vec2 d = pBack - hc;
      float box = step(abs(d.x), 0.30) * step(abs(d.y), 0.18);
      // Scanlines.
      float scan = 0.5 + 0.5 * sin(pBack.y * 80.0 - uTime * 6.0);
      // Glitchy face/icon: just bands of color.
      float bands = step(0.5, fract(d.y * 8.0 + uTime * 0.5));
      vec3 holoCol = mix(vec3(0.20, 0.95, 1.00),
                         vec3(1.00, 0.20, 0.85), bands);
      col = mix(col, holoCol * (0.7 + scan * 0.5), box * life * 0.85);
      // Glitch flicker.
      float glitch = step(0.96, hash(vec2(floor(uTime * 8.0), k)));
      col = mix(col, vec3(1.0, 1.0, 1.0), box * life * glitch * 0.5);
      // Border glow.
      float border = step(0.28, abs(d.x)) * step(abs(d.y), 0.18)
                   + step(0.16, abs(d.y)) * step(abs(d.x), 0.30);
      col += vec3(1.0, 0.20, 0.85) * border * life * 0.8;
    }

    // ---- Drone swarm flyover every 9s ----
    {
      float cycle = 9.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float life = smoothstep(0.0, 0.5, local) * smoothstep(cycle, cycle - 1.0, local);
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float dly = fi * 0.10;
        float prog = local - dly;
        if (prog > 0.0) {
          float baseX = -1.6 + prog * 0.45;
          float baseY = 0.30 + sin(prog * 3.0 + fi * 1.5) * 0.05
                      + (hash(vec2(k, fi + 11.7)) - 0.5) * 0.15;
          vec2 dr = pMid - vec2(baseX, baseY);
          float body = smoothstep(0.006, 0.0, length(dr));
          col += vec3(0.40, 0.85, 1.00) * body * 1.8 * life;
          // Blink red beneath.
          float blink = step(0.5, fract(uTime * 4.0 + fi));
          float light = smoothstep(0.004, 0.0,
              length(pMid - vec2(baseX, baseY - 0.008))) * blink;
          col += vec3(1.0, 0.20, 0.20) * light * 1.5 * life;
        }
      }
    }

    // ---- Lightning strike every 13s (with thunder flash) ----
    {
      float cycle = 13.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float flash = smoothstep(0.0, 0.04, local) * smoothstep(0.6, 0.05, local);
      flash *= 0.5 + 0.5 * sin(local * 50.0);
      // Sky-wide brightening.
      float upper = smoothstep(-0.4, 0.5, pFar.y);
      col += vec3(0.65, 0.55, 0.95) * flash * upper * 0.6;
      // Vertical fork.
      float bx = (hash(vec2(k, 19.7)) - 0.5) * 1.6;
      float zigzag = bx + sin(pFar.y * 22.0 + k) * 0.05
                       + sin(pFar.y * 60.0 + k * 3.0) * 0.015;
      float bolt = smoothstep(0.005, 0.0, abs(pFar.x - zigzag))
                 * smoothstep(-0.4, 1.0, pFar.y);
      col += vec3(0.85, 0.75, 1.20) * bolt * flash * 4.0;
    }

    // ---- Distant explosion every 19s ----
    {
      float cycle = 19.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      vec2 ep = vec2((hash(vec2(k, 23.1)) - 0.5) * 1.2,
                     -0.10 + hash(vec2(k, 31.3)) * 0.3);
      float dr = length(pBack - ep);
      float flash = smoothstep(0.0, 0.15, local) * smoothstep(3.5, 0.3, local);
      float core = smoothstep(0.04, 0.0, dr) * 4.0;
      float bloom = smoothstep(0.5, 0.0, dr) * 1.0;
      vec3 ec = mix(vec3(1.0, 0.95, 0.55),
                    vec3(1.0, 0.45, 0.15),
                    smoothstep(0.0, 1.5, local));
      col += ec * (core + bloom) * flash;
      // Shockwave.
      float radius = local * 0.4;
      float shock = smoothstep(0.015, 0.0, abs(dr - radius))
                  * smoothstep(3.0, 0.5, local);
      col += vec3(1.0, 0.85, 0.55) * shock * 1.5;
    }
  `,
};
