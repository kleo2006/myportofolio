import * as THREE from 'three';
import { noiseGLSL } from '../gl/noiseGLSL.js';

/**
 * Soft, slow-drifting light volumes standing in for true volumetric fog.
 * Each is a camera-facing plane whose fragment shader paints a noise-
 * modulated radial gradient — cheap (one quad, no raymarching) but reads
 * as glowing haze pooling in depth rather than a flat sprite, especially
 * once it sits behind the flow field and inside the scene's exponential
 * fog.
 */
export function createAtmosphere({ palette, count = 4 }) {
  const group = new THREE.Group();
  const volumes = [];
  // Same theme-tracking as orbitals.js — this haze is already very low
  // opacity by design (0.05–0.10), so in light mode it needs a real lift
  // to read as anything more than a rounding error against the page bg.
  let glowBoost = palette.glowBoost ?? 1;

  const colorSlots = [palette.accent, palette.violet, palette.cyan];

  for (let i = 0; i < count; i++) {
    const size = 90 + Math.random() * 70;
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);

    const uniforms = {
      uTime: { value: 0 },
      uSeed: { value: Math.random() * 100 },
      uColor: { value: colorSlots[i % colorSlots.length].clone() },
      uOpacity: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${noiseGLSL}
        uniform float uTime;
        uniform float uSeed;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          vec2 c = vUv - 0.5;
          float dist = length(c) * 2.0;
          float base = smoothstep(1.0, 0.0, dist);

          // Slow-evolving noise breaks up the perfect radial gradient so it
          // reads as drifting mist rather than a lens flare.
          float n = fbm(vec3(c * 2.6, uTime * 0.015 + uSeed));
          float shape = base * (0.75 + 0.35 * n);
          shape = pow(max(shape, 0.0), 1.6);

          gl_FragColor = vec4(uColor, shape * uOpacity);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * 140,
      (Math.random() - 0.5) * 60,
      -40 - Math.random() * 90
    );
    mesh.frustumCulled = false;

    group.add(mesh);
    volumes.push({
      mesh,
      uniforms,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: 0.02 + Math.random() * 0.02,
      basePos: mesh.position.clone(),
      targetOpacity: 0.05 + Math.random() * 0.05,
    });
  }

  function update({ time, camera, introProgress }) {
    for (const v of volumes) {
      v.uniforms.uTime.value = time;
      v.uniforms.uOpacity.value = Math.min(0.4, v.targetOpacity * introProgress * glowBoost);

      // Gentle independent drift so the haze pools shift position without
      // ever reading as a repeating loop.
      v.mesh.position.x = v.basePos.x + Math.sin(time * v.driftSpeed + v.driftPhase) * 8;
      v.mesh.position.y = v.basePos.y + Math.cos(time * v.driftSpeed * 0.8 + v.driftPhase) * 5;

      // Billboard toward the camera.
      v.mesh.quaternion.copy(camera.quaternion);
    }
  }

  function setPalette(p) {
    glowBoost = p.glowBoost ?? 1;
    const colors = [p.accent, p.violet, p.cyan];
    volumes.forEach((v, i) => v.uniforms.uColor.value.copy(colors[i % colors.length]));
  }

  function dispose() {
    volumes.forEach((v) => {
      v.mesh.geometry.dispose();
      v.mesh.material.dispose();
    });
  }

  return { group, update, setPalette, dispose };
}