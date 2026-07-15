import * as THREE from 'three';
import { noiseGLSL } from '../gl/noiseGLSL.js';

/**
 * The signature layer of the scene: a field of points that never fully
 * settles. Rather than switching between discrete "states" (which reads as
 * a loop), each particle's motion is a continuous blend of four fields —
 * curl-noise drift, orbital rotation, vortex inflow and wave propagation —
 * whose weights evolve on independent slow sine cycles. Because the cycles
 * share no common period, the mixture never repeats on any timescale a
 * visitor would notice.
 */
export function createParticleField({ count, radius, palette }) {
  const positions = new Float32Array(count * 3);
  const basePos = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const sizes = new Float32Array(count);
  const colorIdx = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Distribute in a soft ellipsoidal volume, denser toward the core.
    const r = radius * Math.pow(Math.random(), 0.65);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta) * 0.55;
    const z = r * Math.cos(phi) * 0.7;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    basePos[i * 3] = x;
    basePos[i * 3 + 1] = y;
    basePos[i * 3 + 2] = z;

    seeds[i * 4] = Math.random();
    seeds[i * 4 + 1] = Math.random();
    seeds[i * 4 + 2] = Math.random();
    seeds[i * 4 + 3] = Math.random();

    sizes[i] = 6 + Math.random() * 18;
    colorIdx[i] = Math.floor(Math.random() * 4);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aBasePos', new THREE.BufferAttribute(basePos, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aColorIdx', new THREE.BufferAttribute(colorIdx, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uFlowWeight: { value: 0.6 },
    uOrbitWeight: { value: 0.2 },
    uVortexWeight: { value: 0.1 },
    uWaveWeight: { value: 0.1 },
    uMouse: { value: new THREE.Vector3() },
    uMouseStrength: { value: 0 },
    uScroll: { value: 0 },
    uAttractorPos: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
    uAttractorStrength: { value: [0, 0, 0] },
    uExposure: { value: palette.exposure },
    uColor0: { value: palette.particleRamp[0] },
    uColor1: { value: palette.particleRamp[1] },
    uColor2: { value: palette.particleRamp[2] },
    uColor3: { value: palette.particleRamp[3] },
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
      uniform float uFlowWeight;
      uniform float uOrbitWeight;
      uniform float uVortexWeight;
      uniform float uWaveWeight;
      uniform vec3 uMouse;
      uniform float uMouseStrength;
      uniform float uScroll;
      uniform vec3 uAttractorPos[3];
      uniform float uAttractorStrength[3];

      varying float vColorIdx;
      varying float vFade;
      varying vec4 vSeed;

      void main() {
        vColorIdx = aColorIdx;
        vSeed = aSeed;

        float t = uTime * (0.035 + aSeed.x * 0.02);
        vec3 base = aBasePos;

        // -- Flow: curl noise drift, the ambient "always alive" layer.
        vec3 flowDir = curlNoise(base * 0.05 + t * 0.6 + aSeed.yzx * 4.0);
        vec3 flowPos = base + flowDir * (10.0 + aSeed.w * 14.0) * uFlowWeight;

        // -- Orbit: gentle rotation around the Y axis at a per-particle radius.
        float orbitAngle = t * (0.4 + aSeed.y * 0.3) + aSeed.z * 6.2831;
        float orbitR = length(base.xz);
        vec3 orbitPos = vec3(
          cos(orbitAngle) * orbitR,
          base.y + sin(t * 0.5 + aSeed.x * 6.0) * 4.0,
          sin(orbitAngle) * orbitR
        );

        // -- Vortex: spiral inward/outward breathing around the core.
        float vortexAngle = atan(base.z, base.x) + uTime * 0.12 * (0.5 + aSeed.w);
        float vortexR = orbitR * (0.6 + 0.4 * sin(uTime * 0.05 + aSeed.x * 10.0));
        vec3 vortexPos = vec3(
          cos(vortexAngle) * vortexR,
          base.y * (0.8 + 0.2 * sin(uTime * 0.03 + aSeed.y * 8.0)),
          sin(vortexAngle) * vortexR
        );

        // -- Wave: propagating sinusoidal displacement across X.
        float wave = sin(base.x * 0.05 + uTime * 0.4) * cos(base.z * 0.05 - uTime * 0.25);
        vec3 wavePos = base + vec3(0.0, wave * 12.0, 0.0);

        vec3 pos = flowPos * uFlowWeight
          + orbitPos * uOrbitWeight
          + vortexPos * uVortexWeight
          + wavePos * uWaveWeight;
        pos /= max(uFlowWeight + uOrbitWeight + uVortexWeight + uWaveWeight, 0.0001);

        // Invisible attractors: an inverse-square-ish pull that fades to
        // zero well before the body itself, so particles ease into a
        // slow drift rather than snapping toward a point — physically
        // inspired damping rather than a literal orbit solver.
        for (int a = 0; a < 3; a++) {
          vec3 toAttractor = uAttractorPos[a] - pos;
          float dist = length(toAttractor) + 1.0;
          float falloff = uAttractorStrength[a] / (dist * dist) * smoothstep(90.0, 15.0, dist);
          pos += normalize(toAttractor) * falloff;
        }

        // Subtle scroll-driven downward parallax adds depth as the page moves.
        pos.y += uScroll * 18.0 * (0.4 + aSeed.z * 0.6);

        // Pointer gravity: a soft pull toward the mouse's projected world point.
        vec3 toMouse = uMouse - pos;
        float d = length(toMouse);
        float pull = uMouseStrength * smoothstep(60.0, 0.0, d) * 0.5;
        pos += normalize(toMouse + 0.0001) * pull;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float depthFade = smoothstep(140.0, 10.0, -mvPosition.z);
        vFade = depthFade;

        gl_PointSize = aSize * uPixelRatio * (60.0 / -mvPosition.z) * (0.7 + 0.3 * sin(uTime * 0.6 + aSeed.w * 10.0));
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
        float glow = pow(core, 1.8);

        vec3 color = uColor0;
        if (vColorIdx > 2.5) color = uColor3;
        else if (vColorIdx > 1.5) color = uColor2;
        else if (vColorIdx > 0.5) color = uColor1;

        float twinkle = 0.75 + 0.25 * sin(vSeed.x * 50.0);
        float alpha = glow * vFade * uExposure * twinkle;

        gl_FragColor = vec4(color * (1.2 + glow), alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  function update({ time, mouseWorld, mouseStrength, scroll, cycleWeights, attractors }) {
    uniforms.uTime.value = time;
    uniforms.uMouse.value.copy(mouseWorld);
    uniforms.uMouseStrength.value = mouseStrength;
    uniforms.uScroll.value = scroll;
    uniforms.uFlowWeight.value = cycleWeights.flow;
    uniforms.uOrbitWeight.value = cycleWeights.orbit;
    uniforms.uVortexWeight.value = cycleWeights.vortex;
    uniforms.uWaveWeight.value = cycleWeights.wave;
    if (attractors) {
      for (let i = 0; i < 3; i++) {
        const a = attractors[i];
        if (!a) continue;
        uniforms.uAttractorPos.value[i].copy(a.position);
        uniforms.uAttractorStrength.value[i] = a.strength;
      }
    }
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

/**
 * Slow, non-repeating weight cycle for the four motion fields above.
 * Independent periods (in seconds) mean the combined pattern has an
 * effective repeat length of years, not seconds.
 */
export function computeCycleWeights(time) {
  const flow = 0.45 + 0.25 * Math.sin(time * 0.021 + 0.4);
  const orbit = 0.25 + 0.2 * Math.sin(time * 0.013 + 2.1);
  const vortex = 0.18 + 0.15 * Math.sin(time * 0.0091 + 4.0);
  const wave = 0.16 + 0.14 * Math.sin(time * 0.0157 + 1.2);
  return { flow, orbit, vortex, wave };
}