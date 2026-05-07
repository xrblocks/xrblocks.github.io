// Underwater scene: deep ocean with sunbeams, drifting jellyfish bloom,
// schools of fish, passing whale shark, glowing bioluminescent burst,
// rising bubble columns, falling marine snow.
export const UnderwaterScene = {
  name: 'Underwater',

  ringCool: 'vec3(0.10, 0.55, 0.85)',
  ringWarm: 'vec3(0.25, 0.95, 0.85)',
  haloInner: 'vec3(0.20, 0.70, 1.00)',
  haloOuter: 'vec3(0.30, 1.00, 0.85)',

  helpers: /* glsl */ `
    // Voronoi-style caustic pattern.
    float caustic(vec2 uv, float t) {
      vec2 p = uv * 4.0;
      float v = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        v += sin(p.x * (1.0 + fi * 0.4) + t * (0.7 + fi * 0.2))
           * sin(p.y * (1.3 + fi * 0.3) + t * (0.9 - fi * 0.15));
      }
      return pow(max(v * 0.33 + 0.5, 0.0), 2.5);
    }

    // A simple "fish" silhouette: streamlined body + tail wedge.
    float fishShape(vec2 d, float facing) {
      // d.x = along body (positive forward), d.y = vertical.
      d.x *= facing;
      float body = smoothstep(0.018, 0.014, abs(d.y))
                 * smoothstep(0.030, 0.025, abs(d.x));
      float tail = smoothstep(0.008, 0.0, d.x + 0.030)
                 * smoothstep(0.020, 0.0, abs(d.y) - max(d.x + 0.030, 0.0)*1.5);
      return clamp(body + tail, 0.0, 1.0);
    }

    // Whale shark silhouette (much bigger, slow tail wave).
    float whaleShape(vec2 d, float wave) {
      // body: long ellipse
      float body = smoothstep(0.045, 0.040, abs(d.y))
                 * smoothstep(0.18, 0.16, abs(d.x));
      // tail (swept)
      float tailY = d.y + sin(d.x * 6.0 + wave) * 0.02;
      float tail = smoothstep(0.020, 0.0, abs(tailY))
                 * smoothstep(0.06, 0.0, max(d.x - 0.16, 0.0));
      // dorsal fin nub
      float fin = smoothstep(0.010, 0.0,
          length(vec2(d.x + 0.04, max(d.y - 0.03, 0.0))));
      return clamp(body + tail + fin, 0.0, 1.0);
    }
  `,

  body: /* glsl */ `
    // Stereo parallax layers.
    vec2 pFar  = parallaxP(p, rd, 0.35);
    vec2 pBack = parallaxP(p, rd, 0.22);
    vec2 pMid  = parallaxP(p, rd, 0.12);
    vec2 pNear = parallaxP(p, rd, 0.04);

    // Vertical depth gradient: bright surface up top, abyss below.
    float depth = 0.5 - pFar.y * 0.5;
    vec3 surface = vec3(0.20, 0.65, 0.85);
    vec3 mid     = vec3(0.05, 0.30, 0.55);
    vec3 abyss   = vec3(0.00, 0.05, 0.18);
    col = mix(surface, mid,  smoothstep(0.0, 0.6, depth));
    col = mix(col,     abyss, smoothstep(0.55, 1.0, depth));

    // Slow swaying water — sample-domain warp.
    vec2 warp = vec2(sin(uTime * 0.4 + pFar.y * 3.0) * 0.02,
                     cos(uTime * 0.3 + pFar.x * 2.0) * 0.02);
    vec2 wp = pFar + warp;

    // God-ray sunbeams streaming down from upper-left.
    {
      vec2 r = wp;
      // Project rays from angle slightly off vertical.
      float ang = -0.35;
      float u = r.x * cos(ang) - r.y * sin(ang);
      float v = r.x * sin(ang) + r.y * cos(ang);
      float ray = 0.0;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float w = 0.18 + fi * 0.07;
        float off = sin(uTime * 0.3 + fi * 1.7) * 0.2 + fi * 0.35 - 0.5;
        float band = exp(-pow((u - off) / w, 2.0));
        ray += band * (0.4 + 0.6 * sin(uTime * 0.6 + fi));
      }
      // Falloff with depth & jitter.
      ray *= smoothstep(1.0, -0.4, pFar.y);
      ray *= 0.7 + 0.3 * fbm(vec2(u * 6.0, v * 3.0 + uTime * 0.4));
      col += vec3(0.60, 0.90, 1.00) * ray * 0.55;
    }

    // Caustic shimmer near the surface.
    float caus = caustic(wp + vec2(0.0, uTime * 0.05), uTime);
    caus *= smoothstep(0.6, -0.6, pFar.y);
    col += vec3(0.50, 0.95, 1.00) * caus * 0.35;

    // Marine snow / drifting particles (always-on).
    {
      vec2 uvNear = pNear * 0.5 + 0.5;
      float s = starsLayer(uvNear * 3.0 + vec2(0.0, uTime * 0.05), 60.0, 0.985);
      col += vec3(0.85, 0.95, 1.0) * s * 0.7;
      float s2 = starsLayer(uvNear * 3.0 + vec2(7.0, uTime * 0.10), 110.0, 0.992);
      col += vec3(0.7, 0.85, 1.0) * s2 * 0.5;
    }

    // ---- Always-on fish school weaving across mid-depth ----
    {
      float t = uTime * 0.5;
      for (int i = 0; i < 14; i++) {
        float fi = float(i);
        float row = floor(fi / 7.0);
        float col_i = mod(fi, 7.0);
        float baseY = -0.15 + row * 0.10
                    + sin(t * 0.6 + col_i * 0.5) * 0.04;
        float baseX = mod(col_i * 0.18 + t * 0.18 + row * 0.4, 2.4) - 1.4;
        vec2 d = pMid - vec2(baseX, baseY);
        float wig = sin(t * 4.0 + col_i + row * 1.7) * 0.005;
        d.y += wig;
        float f = fishShape(d, 1.0);
        vec3 fc = mix(vec3(0.95, 0.75, 0.30),
                      vec3(1.00, 0.95, 0.75), 0.5 + 0.5 * sin(fi));
        col = mix(col, fc * 1.4, f * 0.85);
      }
    }

    // ---- Bubble column rising every 4s from random spot ----
    {
      float cycle = 4.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float baseX = hash(vec2(k, 3.1)) * 1.6 - 0.8;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float dly = fi * 0.4;
        float life = local - dly;
        if (life > 0.0 && life < cycle - dly) {
          float by = -1.0 + life * 0.45;
          float bx = baseX + sin(life * 3.0 + fi) * 0.04;
          float br = 0.012 + fi * 0.003;
          float d = length(pNear - vec2(bx, by));
          float bub = smoothstep(br, br * 0.5, d);
          // Highlight rim
          float rim = smoothstep(br, br * 0.85, d) - smoothstep(br * 0.85, br * 0.7, d);
          col = mix(col, vec3(0.85, 0.98, 1.05), bub * 0.6);
          col += vec3(1.0, 1.0, 1.0) * max(rim, 0.0) * 0.6;
        }
      }
    }

    // ---- Jellyfish bloom drifting through every 14s ----
    {
      float cycle = 14.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float life = smoothstep(0.0, 1.0, local) * smoothstep(cycle, cycle - 2.0, local);
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float baseX = -1.5 + local * 0.18 + fi * 0.35
                    + sin(uTime * 0.6 + fi) * 0.05;
        float baseY = -0.2 + sin(uTime * 0.4 + fi * 1.3) * 0.3 + fi * 0.06;
        vec2 c = vec2(baseX, baseY);
        vec2 d = pMid - c;
        // Bell (top hemisphere)
        float bellR = 0.06 + fi * 0.005;
        float bell = smoothstep(bellR, bellR * 0.85, length(d))
                   * step(d.y, 0.0);
        // Tendrils trailing below
        float tendril = 0.0;
        for (int j = 0; j < 5; j++) {
          float fj = float(j);
          float tx = (fj - 2.0) * 0.012
                   + sin(uTime * 1.2 + fj + fi) * 0.01;
          float td = abs(d.x - tx);
          float ty = max(-d.y, 0.0);
          tendril += smoothstep(0.005, 0.0, td)
                   * smoothstep(0.20, 0.0, ty);
        }
        // Bioluminescent pulse on the bell rim.
        float pulse = 0.5 + 0.5 * sin(uTime * 2.5 + fi * 1.7);
        vec3 jellyCol = mix(vec3(0.55, 0.30, 0.95),
                            vec3(0.30, 0.95, 0.85), pulse);
        col += jellyCol * (bell * 1.3 + tendril * 0.6) * life;
      }
    }

    // ---- Whale shark passing through every 19s ----
    {
      float cycle = 19.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float life = smoothstep(0.0, 1.5, local) * smoothstep(cycle, cycle - 2.0, local);
      // Slow horizontal drift.
      float baseY = (hash(vec2(k, 41.7)) - 0.5) * 0.4;
      vec2 c = vec2(-1.8 + local * 0.18, baseY);
      vec2 d = pBack - c;
      float wave = uTime * 1.5 + k;
      float w = whaleShape(d, wave);
      // Body color: deep blue-gray with white spots.
      vec3 body = vec3(0.20, 0.30, 0.40);
      float spots = step(0.7, hash(floor((pBack - c) * vec2(40.0, 60.0))));
      body = mix(body, vec3(0.80, 0.90, 1.0), spots * 0.6);
      // Belly highlight (lower side lighter).
      body = mix(body, vec3(0.50, 0.65, 0.75),
                 smoothstep(-0.02, 0.04, d.y));
      col = mix(col, body, w * life * 0.95);
    }

    // ---- Bioluminescent burst every 11s ----
    {
      float cycle = 11.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      vec2 bp = vec2(hash(vec2(k, 51.3)) * 1.4 - 0.7,
                     hash(vec2(k, 67.7)) * 1.4 - 0.7);
      float dr = length(pMid - bp);
      float flash = smoothstep(0.0, 0.1, local) * smoothstep(2.5, 0.2, local);
      float core = smoothstep(0.04, 0.0, dr) * 3.5;
      float halo = smoothstep(0.4, 0.0, dr) * 1.0;
      // Sparks radiating outward
      float ang = atan(pMid.y - bp.y, pMid.x - bp.x);
      float spark = pow(0.5 + 0.5 * cos(ang * 18.0 + local * 8.0), 6.0)
                  * smoothstep(0.30, 0.04, dr);
      vec3 bioCol = mix(vec3(0.30, 1.00, 0.85),
                        vec3(0.55, 0.45, 1.20),
                        sin(uTime * 0.7) * 0.5 + 0.5);
      col += bioCol * (core + halo + spark * 1.2) * flash;
    }

    // ---- Lightning flash through water every 26s ----
    {
      float cycle = 26.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float flash = smoothstep(0.0, 0.05, local) * smoothstep(0.8, 0.1, local);
      // Quick double-flash
      flash *= 0.5 + 0.5 * sin(local * 50.0);
      // Whole upper region brightens through caustics.
      float upper = smoothstep(1.0, -0.2, pFar.y);
      col += vec3(0.70, 0.85, 1.00) * flash * upper * 0.9;
      // Bright fork from upper edge.
      float fx = hash(vec2(k, 91.7)) * 1.6 - 0.8;
      float fork = smoothstep(0.012, 0.0,
          abs(pFar.x - (fx + sin(pFar.y * 14.0 + k) * 0.04)))
        * smoothstep(-0.8, 1.0, pFar.y);
      col += vec3(0.95, 0.95, 1.10) * fork * flash * 2.5;
    }
  `,
};
