import * as THREE from 'three';

const GEOMETRIES = [
  () => new THREE.IcosahedronGeometry(1, 0),
  () => new THREE.TorusGeometry(0.8, 0.28, 16, 48),
  () => new THREE.OctahedronGeometry(1, 0),
  () => new THREE.TorusKnotGeometry(0.6, 0.18, 96, 12),
];

/**
 * A small cluster of glass-like solids drifting slowly through the scene.
 * Uses envMap reflections + iridescence + low opacity to *read* as glass
 * without enabling `transmission`, which would force an extra
 * render-to-texture pass per object per frame — too costly for a
 * background layer that has to share the frame budget with bloom.
 */
export function createGlassCluster({ palette, envMap, count = 5 }) {
  const group = new THREE.Group();
  const items = [];

  for (let i = 0; i < count; i++) {
    const geometry = GEOMETRIES[i % GEOMETRIES.length]();
    const isEven = i % 2 === 0;
    const baseColor = isEven ? palette.accent : palette.violet;
    const material = new THREE.MeshPhysicalMaterial({
      color: baseColor,
      metalness: 0.1,
      roughness: 0.08,
      transparent: true,
      opacity: palette.glassOpacity ?? 0.16,
      envMap,
      envMapIntensity: 1.4,
      iridescence: 1,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      depthWrite: false,
      // A faint self-glow keeps the shapes legible against a near-black
      // canvas in dark mode; in light mode this is dialed to zero so the
      // solids read purely from reflection, as originally designed.
      emissive: baseColor,
      emissiveIntensity: palette.glassEmissive ?? 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const scale = 4 + Math.random() * 7;
    mesh.scale.setScalar(scale);
    mesh.position.set(
      (Math.random() - 0.5) * 140,
      (Math.random() - 0.5) * 70,
      -20 - Math.random() * 90
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

    group.add(mesh);
    items.push({
      mesh,
      material,
      spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      spinSpeed: 0.02 + Math.random() * 0.04,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.08 + Math.random() * 0.06,
      basePos: mesh.position.clone(),
    });
  }

  function update({ time, quality }) {
    items.forEach((item, i) => {
      if (quality === 'low' && i % 2 === 1) {
        item.mesh.visible = false;
        return;
      }
      item.mesh.visible = true;
      item.mesh.rotateOnAxis(item.spinAxis, item.spinSpeed * 0.016);
      item.mesh.position.y = item.basePos.y + Math.sin(time * item.floatSpeed + item.floatPhase) * 4.5;
      item.mesh.position.x = item.basePos.x + Math.cos(time * item.floatSpeed * 0.7 + item.floatPhase) * 3.2;
    });
  }

  function setPalette(p) {
    items.forEach(({ material }, i) => {
      const c = i % 2 === 0 ? p.accent : p.violet;
      material.color.copy(c);
      material.emissive.copy(c);
      material.emissiveIntensity = p.glassEmissive ?? 0;
      material.opacity = p.glassOpacity ?? 0.16;
    });
  }

  function dispose() {
    items.forEach(({ mesh, material }) => {
      mesh.geometry.dispose();
      material.dispose();
    });
  }

  return { group, update, setPalette, dispose };
}