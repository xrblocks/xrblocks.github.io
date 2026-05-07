// Lava scene: erupting volcano on the horizon, molten lava river,
// rising ember columns, lava bombs arcing through the sky, lightning
// in volcanic ash plume, occasional pyroclastic flow shock.
export const LavaScene = {
  name: 'Volcano',

  ringCool: 'vec3(0.95, 0.30, 0.05)',
  ringWarm: 'vec3(1.00, 0.85, 0.20)',
  haloInner: 'vec3(1.00, 0.45, 0.10)',
  haloOuter: 'vec3(1.00, 0.85, 0.30)',

  helpers: /* glsl */ `
    // Volcano silhouette + glowing crater.
    float volcanoMask(vec2 p, vec2 c, float w, float h) {
      // Triangular cone with rough top.
      float dx = abs(p.x - c.x);
      float top = c.y + h - dx * (h / w);
      float jagged = (fbm(vec2(p.x * 8.0, 0.0)) - 0.5) * 0.02;
      float surf = top + jagged;
      return step(p.y, surf) * step(c.y - 0.05, p.y);
    }
  `,

  body: /* glsl */ `
    // Stereo parallax layers.
    vec2 pFar  = parallaxP(p, rd, 0.35);
    vec2 pBack = parallaxP(p, rd, 0.22);
    vec2 pMid  = parallaxP(p, rd, 0.12);
    vec2 pNear = parallaxP(p, rd, 0.04);

    // ---- Sky: smoky red/orange gradient ----
    float sky = smoothstep(-0.4, 1.0, pFar.y);
    vec3 high = vec3(0.20, 0.05, 0.15);
    vec3 mid  = vec3(0.55, 0.15, 0.10);
    vec3 low  = vec3(0.95, 0.45, 0.15);
    col = mix(low, mid, smoothstep(-0.4, 0.4, pFar.y));
    col = mix(col, high, smoothstep(0.4, 1.0, pFar.y));

    // Drifting ash clouds in the sky.
    float ash = fbm(vec2(pFar.x * 2.0 + uTime * 0.05, pFar.y * 2.5));
    ash *= smoothstep(-0.2, 1.0, pFar.y);
    col = mix(col, vec3(0.10, 0.05, 0.10), ash * 0.55);

    // Faint distant stars / sparks visible through the haze.
    {
      vec2 uvFar = pFar * 0.5 + 0.5;
      float spark = starsLayer(uvFar * 2.0 + vec2(uTime * 0.02, 0.0), 80.0, 0.992);
      col += vec3(1.0, 0.8, 0.5) * spark * 0.6;
    }

    // ---- Distant volcano on the horizon (centered) ----
    vec2 volcCenter = vec2(0.0, -0.4);
    float volcW = 0.8;
    float volcH = 0.55;
    float volc = volcanoMask(pBack, volcCenter, volcW, volcH);
    if (volc > 0.0) {
      // Dark rocky body with occasional glowing cracks.
      vec3 rock = vec3(0.10, 0.05, 0.04);
      float cracks = ridgedFbm(vec2(pBack.x * 18.0, pBack.y * 22.0));
      cracks = smoothstep(0.55, 0.85, cracks);
      vec3 lavaCrack = vec3(1.00, 0.45, 0.10);
      col = mix(rock, lavaCrack, cracks * 0.6);
    }

    // ---- Lava river running across the foreground ----
    {
      float riverY = -0.65 + sin(pNear.x * 3.0 + uTime * 0.3) * 0.04;
      float riverBand = smoothstep(0.18, 0.0, abs(pNear.y - riverY))
                      * step(pNear.y, -0.45);
      // Flowing texture along x.
      float flow = fbm(vec2(pNear.x * 6.0 - uTime * 0.6, pNear.y * 8.0));
      float flow2 = fbm(vec2(pNear.x * 14.0 - uTime * 1.2, pNear.y * 16.0));
      vec3 lavaCol = mix(vec3(1.00, 0.85, 0.20),
                         vec3(0.95, 0.30, 0.05), flow);
      lavaCol = mix(lavaCol, vec3(0.20, 0.05, 0.02),
                    smoothstep(0.55, 0.85, flow2) * 0.8);
      col = mix(col, lavaCol * 1.6, riverBand);
      // Heat haze glow around it.
      float glow = smoothstep(0.30, 0.0, abs(pNear.y - riverY)) * step(pNear.y, -0.30);
      col += vec3(1.0, 0.45, 0.10) * glow * 0.35;
    }

    // ---- Glowing crater pulse (volcano top) ----
    {
      float craterY = volcCenter.y + volcH;
      float craterDist = length(vec2(pBack.x * 1.2, pBack.y - craterY));
      float pulse = 0.7 + 0.3 * sin(uTime * 2.0);
      float craterGlow = smoothstep(0.20, 0.0, craterDist) * pulse;
      col += vec3(1.0, 0.55, 0.10) * craterGlow * 1.2;
      float craterCore = smoothstep(0.05, 0.0, craterDist);
      col += vec3(1.0, 0.95, 0.65) * craterCore * 1.8;
    }

    // ---- Always-on rising embers ----
    {
      for (int i = 0; i < 24; i++) {
        float fi = float(i);
        float life = mod(uTime * (0.4 + hash(vec2(fi, 7.7)) * 0.5)
                       + fi * 0.5, 3.0);
        float bx = (hash(vec2(fi, 1.7)) - 0.5) * 1.6
                 + sin(life * 2.0 + fi) * 0.05;
        float by = -0.7 + life * 0.6;
        vec2 d = pNear - vec2(bx, by);
        float dr = length(d);
        float ember = smoothstep(0.012, 0.0, dr);
        // Color cools as it rises.
        vec3 ec = mix(vec3(1.0, 0.85, 0.35),
                      vec3(0.85, 0.20, 0.05), life / 3.0);
        // Fade out near top.
        float fade = smoothstep(3.0, 1.5, life);
        col += ec * ember * fade * 1.6;
      }
    }

    // ---- Volcanic ash plume rising from crater (always on) ----
    {
      vec2 plumeCenter = vec2(0.0, volcCenter.y + volcH);
      vec2 dp = pBack - plumeCenter;
      // Plume fans out as it rises.
      float widen = max(dp.y, 0.0) * 0.6 + 0.05;
      float plumeMask = smoothstep(widen, widen * 0.6, abs(dp.x))
                      * smoothstep(1.5, 0.0, dp.y)
                      * step(0.0, dp.y);
      float plumeNoise = warpedFbm(vec2(dp.x * 3.0, dp.y * 2.5 - uTime * 0.4));
      vec3 plumeCol = mix(vec3(0.10, 0.05, 0.10),
                          vec3(0.55, 0.30, 0.20), plumeNoise);
      col = mix(col, plumeCol, plumeMask * (0.4 + plumeNoise * 0.6));
      // Hot base of plume glows.
      float baseGlow = smoothstep(0.4, 0.0, dp.y) * step(0.0, dp.y) * plumeMask;
      col += vec3(1.0, 0.55, 0.20) * baseGlow * 0.6;
    }

    // ---- Eruption every 9s (mega blast) ----
    {
      float cycle = 9.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float blast = smoothstep(0.0, 0.2, local) * smoothstep(2.5, 0.3, local);
      vec2 cr = vec2(0.0, volcCenter.y + volcH);
      float dr = length(pBack - cr);
      // Bright dome expanding out of crater.
      float dome = smoothstep(0.0, 1.5, local) * 0.5;
      float front = smoothstep(0.04, 0.0, abs(dr - dome))
                  * step(0.0, pBack.y - cr.y);
      col += vec3(1.0, 0.75, 0.30) * front * blast * 2.0;
      // Bright flash on whole crater.
      float flash = smoothstep(0.4, 0.0, dr) * blast;
      col += vec3(1.0, 0.95, 0.55) * flash * 1.2;
    }

    // ---- Lava bombs every 5s arcing across sky ----
    {
      float cycle = 5.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        float dly = fi * 0.8;
        float life = local - dly;
        if (life > 0.0 && life < cycle - dly) {
          // Parabolic arc from crater to a random landing point.
          float landX = (hash(vec2(k, fi + 11.7)) - 0.5) * 1.8;
          vec2 c0 = vec2(0.0, volcCenter.y + volcH);
          vec2 c1 = vec2(landX, -0.55);
          float u = life / 1.8;
          if (u <= 1.0) {
            vec2 pos = mix(c0, c1, u);
            pos.y += sin(u * 3.14159) * (0.35 + fi * 0.05);
            float dr = length(pMid - pos);
            float bomb = smoothstep(0.02, 0.0, dr);
            col += vec3(1.0, 0.85, 0.30) * bomb * 2.5;
            // Trailing smoke.
            for (int j = 0; j < 6; j++) {
              float fj = float(j);
              float u2 = u - fj * 0.04;
              if (u2 > 0.0) {
                vec2 pos2 = mix(c0, c1, u2);
                pos2.y += sin(u2 * 3.14159) * (0.35 + fi * 0.05);
                float td = length(pMid - pos2);
                float trail = smoothstep(0.012 + fj * 0.003, 0.0, td);
                col += vec3(0.85, 0.45, 0.20) * trail * (1.0 - fj * 0.15);
              }
            }
          }
        }
      }
    }

    // ---- Volcanic lightning in ash plume every 7s ----
    {
      float cycle = 7.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      float flash = smoothstep(0.0, 0.04, local) * smoothstep(0.4, 0.05, local);
      flash *= 0.5 + 0.5 * sin(local * 80.0);
      // Forked bolt within the plume area.
      vec2 startB = vec2((hash(vec2(k, 13.1)) - 0.5) * 0.4,
                         volcCenter.y + volcH + 0.6);
      vec2 endB   = vec2(startB.x + (hash(vec2(k, 27.7)) - 0.5) * 0.3,
                         volcCenter.y + volcH + 0.05);
      // Sample bolt as zig-zag line.
      float boltDist = 1e9;
      vec2 prev = startB;
      for (int i = 1; i <= 6; i++) {
        float fi = float(i) / 6.0;
        vec2 ptN = mix(startB, endB, fi);
        ptN.x += (hash(vec2(k, fi * 31.0 + 7.7)) - 0.5) * 0.06;
        // Distance from pBack to segment prev->ptN.
        vec2 seg = ptN - prev;
        float tSeg = clamp(dot(pBack - prev, seg) / dot(seg, seg), 0.0, 1.0);
        vec2 closest = prev + seg * tSeg;
        boltDist = min(boltDist, length(pBack - closest));
        prev = ptN;
      }
      float bolt = smoothstep(0.008, 0.0, boltDist);
      col += vec3(1.00, 0.95, 1.10) * bolt * flash * 4.0;
      // Glow halo around bolt.
      col += vec3(0.85, 0.55, 1.00) * smoothstep(0.06, 0.0, boltDist)
           * flash * 0.7;
    }

    // ---- Pyroclastic shock wave every 17s ----
    {
      float cycle = 17.0;
      float k = floor(uTime / cycle);
      float local = uTime - k * cycle;
      vec2 cr = vec2(0.0, volcCenter.y + volcH);
      float dr = length(pBack - cr);
      float radius = local * 0.35;
      float shock = smoothstep(0.04, 0.0, abs(dr - radius))
                  * smoothstep(4.0, 0.5, local)
                  * step(0.0, dr - 0.05);
      col += vec3(1.0, 0.65, 0.30) * shock * 1.3;
      // Distortion ring darkens slightly inside.
      col *= 1.0 - smoothstep(0.04, 0.0, abs(dr - radius)) * 0.2
                 * smoothstep(4.0, 0.5, local);
    }
  `,
};
