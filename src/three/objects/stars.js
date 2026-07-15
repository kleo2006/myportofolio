import * as THREE from 'three';

function pointsMaterial({ size, opacity, color, sizeAttenuation = true }) {
  return new THREE.PointsMaterial({
    size,
    color,
    transparent: true,
    opacity,
    sizeAttenuation,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Sparse, far-distance points with a slow per-star twinkle. Cheap: no
 * custom shader needed, just a size-attenuated PointsMaterial with an
 * opacity animated via a handful of trig terms on the CPU side per frame
 * (count is small enough that this is negligible).
 */
export function createStarfield({ count = 500, radius = 400, color, boost = 1 }) {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  let currentBoost = boost;

  for (let i = 0; i < count; i++) {
    const r = radius * (0.6 + Math.random() * 0.4);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 50;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = pointsMaterial({ size: 1.4, opacity: 0.5, color });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  function update(time) {
    material.opacity = Math.min(1, (0.35 + 0.15 * Math.sin(time * 0.4 + phases[0])) * currentBoost);
  }

  function setBoost(b) {
    currentBoost = b;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { points, update, material, setBoost, dispose };
}

/**
 * Small, low-opacity motes closer to the camera than everything else —
 * gives the scene a foreground layer so the parallax reads as genuinely
 * three-dimensional rather than a single flat backdrop plane.
 */
export function createDust({ count = 180, spread = 60, color, boost = 1 }) {
  const positions = new Float32Array(count * 3);
  const drift = new Float32Array(count * 3);
  let currentBoost = boost;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = 10 + Math.random() * 30;

    drift[i * 3] = (Math.random() - 0.5) * 0.02;
    drift[i * 3 + 1] = 0.01 + Math.random() * 0.02;
    drift[i * 3 + 2] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const baseOpacity = 0.22;
  const material = pointsMaterial({ size: 0.9, opacity: baseOpacity * currentBoost, color });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  function update(dt) {
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += drift[i * 3];
      pos[i * 3 + 1] += drift[i * 3 + 1];
      if (pos[i * 3 + 1] > spread / 2) pos[i * 3 + 1] = -spread / 2;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  function setBoost(b) {
    currentBoost = b;
    material.opacity = Math.min(1, baseOpacity * currentBoost);
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { points, update, material, setBoost, dispose };
}