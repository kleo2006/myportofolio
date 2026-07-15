import * as THREE from 'three';
import { noiseGLSL } from '../gl/noiseGLSL.js';

/**
 * The scene's signature layer: one large, coherent field of light spanning
 * far past the edges of the viewport. Every particle's position is a pure
 * function of its resting point and elapsed time — no per-frame CPU writes,
 * no simulation state — so the whole field, however large, costs one
 * uniform update per frame regardless of particle count.
 *
 * Motion is a single divergence-free curl-noise flow (large spatial
 * frequency, so it reads as one slow current rather than busy noise),
 * layered with a gentle whole-field rotation. Depth is sold entirely by
 * point size and distance fade, which is what gives the "large-scale"
 * feeling of scale without ever needing a bigger draw call.
 */
export function createFlowField({ count, radius, palette }) {
  const basePos = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  const colorIdx = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Flattened, elongated ellipsoid — wide and shallow reads as an
    // expansive horizon rather than a ball of particles centered on camera.
    const u = Math.random();
    const r = radius * (0.35 + 0.65 * Math.pow(u, 0.5));
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta) * 1.35;
    const y = r * Math.sin(phi) * Math.sin(theta) * 0.45;
    const z = r * Math.cos(phi) * 0.85;

    basePos[i * 3] = x;
    basePos[i * 3 + 1] = y;
    basePos[i * 3 + 2] = z;

    seeds[i * 4] = Math.random();
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.random();
    seeds[i * 4 + 3] = Math.random();

    // Bimodal size distribution: mostly fine dust, a sparse handful of
    // larger foreground cores — sells depth without extra geometry.
    const isCore = Math.random() > 0.92;
    sizes[i] = isCore ? 22 + Math.random() * 20 : 3 + Math.random() * 7;
    colorIdx[i] = Math.floor(Math.random() * 4);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(basePos.slice(), 3));
  geometry.setAttribute('aBasePos', new THREE.BufferAttribute(basePos, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aColorIdx', new THREE.BufferAttribute(colorIdx, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uAmplitude: { value: 1 },
    uFieldRotation: { value: 0 },
    uMouse: { value: new THREE.Vector3() },
    uMouseStrength: { value: 0 },
    uScroll: { value: 0 },
    uExposure: { value: palette.exposure },
    uColor0: { value: palette.particleRamp[0].clone() },
    uColor1: { value: palette.particleRamp[1].clone() },
    uColor2: { value: palette.particleRamp[2].clone() },
    uColor3: { value: palette.particleRamp[3].clone() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${noiseGLSL}

      attribute vec3 aBasePos;
      attribute vec4 aSeed;
      attribute float aSize;
      attribute float aColorIdx;

      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uAmplitude;
      uniform float uFieldRotation;
      uniform vec3 uMouse;
      uniform float uMouseStrength;
      uniform float uScroll;

      varying float vColorIdx;
      varying float vFade;
      varying vec4 vSeed;

      vec3 rotateY(vec3 p, float a) {
        float s = sin(a);
        float c = cos(a);
        return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
      }

      void main() {
        vColorIdx = aColorIdx;
        vSeed = aSeed;

        float t = uTime * (0.05 + aSeed.x * 0.025);

        // Large spatial scale (small multiplier) => one broad, slow-moving
        // current instead of fine turbulence. A second, slower octave
        // gives the current itself a long, non-repeating drift.
        vec3 sample = aBasePos * 0.018 + vec3(0.0, t * 0.35, 0.0);
        vec3 flow = curlNoise(sample + aSeed.yzx * 3.0);
        vec3 driftPos = aBasePos + flow * (16.0 + aSeed.w * 22.0) * uAmplitude;

        // Whole-field rotation: the entire current turns around the scene
        // origin at an imperceptibly slow rate, the kind of motion that
        // reads as "vast" rather than "spinning".
        vec3 pos = rotateY(driftPos, uFieldRotation);

        // Scroll-driven vertical parallax, scaled by depth (seed) so the
        // field doesn't move as one rigid sheet.
        pos.y += uScroll * 22.0 * (0.5 + aSeed.z * 0.5);

        // Soft pointer displacement: particles ease away from the cursor's
        // projected world position rather than snapping to it.
        vec3 toMouse = uMouse - pos;
        float d = length(toMouse);
        float push = uMouseStrength * smoothstep(55.0, 0.0, d) * 3.2;
        pos -= normalize(toMouse + 0.0001) * push;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float depthFade = smoothstep(180.0, 20.0, -mvPosition.z);
        vFade = depthFade;

        gl_PointSize = aSize * uPixelRatio * (70.0 / -mvPosition.z)
          * (0.75 + 0.25 * sin(uTime * 0.5 + aSeed.w * 12.0));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor0;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uExposure;

      varying float vColorIdx;
      varying float vFade;
      varying vec4 vSeed;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;

        float core = smoothstep(0.5, 0.0, d);
        float glow = pow(core, 2.0);

        vec3 color = uColor0;
        if (vColorIdx > 2.5) color = uColor3;
        else if (vColorIdx > 1.5) color = uColor2;
        else if (vColorIdx > 0.5) color = uColor1;

        float twinkle = 0.8 + 0.2 * sin(vSeed.x * 60.0);
        float alpha = glow * vFade * uExposure * twinkle;

        gl_FragColor = vec4(color * (1.1 + glow * 0.6), alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  function update({ time, mouseWorld, mouseStrength, scroll }) {
    uniforms.uTime.value = time;
    uniforms.uMouse.value.copy(mouseWorld);
    uniforms.uMouseStrength.value = mouseStrength;
    uniforms.uScroll.value = scroll;
    // One full turn roughly every 45 minutes — present, but never caught
    // in the act by a visitor.
    uniforms.uFieldRotation.value = time * 0.0025;
  }

  function setPalette(p) {
    uniforms.uColor0.value.copy(p.particleRamp[0]);
    uniforms.uColor1.value.copy(p.particleRamp[1]);
    uniforms.uColor2.value.copy(p.particleRamp[2]);
    uniforms.uColor3.value.copy(p.particleRamp[3]);
    uniforms.uExposure.value = p.exposure;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { points, update, setPalette, dispose, uniforms };
}
