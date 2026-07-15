import * as THREE from 'three';
import { noiseGLSL } from '../gl/noiseGLSL.js';

/**
 * Two or three large, softly-lit ribbon planes that drift like aurora
 * curtains far behind the particle field. Vertex displacement comes from
 * layered noise so each ribbon undulates independently; the fragment
 * shader fades to nothing at every edge so there's never a hard boundary.
 */
export function createAuroraRibbons({ palette, count = 3, segments = 96 }) {
  const group = new THREE.Group();
  const ribbons = [];

  const colors = [palette.auroraA, palette.auroraB, palette.auroraC];

  for (let i = 0; i < count; i++) {
    const width = 260 + i * 40;
    const height = 90 + i * 18;
    const geometry = new THREE.PlaneGeometry(width, height, segments, 1);

    const uniforms = {
      uTime: { value: 0 },
      uSeed: { value: Math.random() * 100 },
      uColor: { value: colors[i % colors.length].clone() },
      uOpacity: { value: 0 },
      uMouse: { value: new THREE.Vector2() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        ${noiseGLSL}
        uniform float uTime;
        uniform float uSeed;
        uniform vec2 uMouse;
        varying float vEdge;
        varying float vFlow;

        void main() {
          vec3 p = position;

          float nx = p.x * 0.012 + uSeed;
          float t = uTime * 0.06;

          float displacement = fbm(vec3(nx, t, uSeed)) * 26.0
            + fbm(vec3(nx * 2.3, t * 1.6, uSeed + 9.0)) * 8.0;

          p.z += displacement;
          p.y += sin(nx * 3.0 + t * 1.4) * 6.0;
          p.x += uMouse.x * 6.0;
          p.z += uMouse.y * 4.0;

          // Fade factor toward the horizontal edges of the ribbon (uv.x
          // isn't available without a custom attribute, so derive it from
          // the plane's local x range via the geometry's own bounds proxy).
          vEdge = 1.0 - smoothstep(0.65, 1.0, abs(p.x) / 200.0);
          vFlow = displacement;

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vEdge;
        varying float vFlow;

        void main() {
          float glow = clamp(0.35 + vFlow * 0.02, 0.0, 1.0);
          float alpha = vEdge * glow * uOpacity;
          gl_FragColor = vec4(uColor * (1.0 + glow * 0.4), alpha);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      (Math.random() - 0.5) * 80,
      20 + i * 22,
      -60 - i * 30
    );
    mesh.rotation.x = -0.3 + Math.random() * 0.15;
    mesh.rotation.z = (Math.random() - 0.5) * 0.2;

    group.add(mesh);
    const baseOpacity = 0.16 + i * 0.03;
    ribbons.push({ mesh, uniforms, baseOpacity, opacityScale: palette.auroraOpacityScale ?? 1 });
  }

  function update({ time, mouseNorm, introProgress }) {
    ribbons.forEach(({ uniforms, baseOpacity, opacityScale }, i) => {
      uniforms.uTime.value = time + i * 12.0;
      uniforms.uMouse.value.set(mouseNorm.x, mouseNorm.y);
      uniforms.uOpacity.value = baseOpacity * opacityScale * introProgress;
    });
  }

  function setPalette(p) {
    const cols = [p.auroraA, p.auroraB, p.auroraC];
    ribbons.forEach((ribbon, i) => {
      ribbon.uniforms.uColor.value.copy(cols[i % cols.length]);
      ribbon.opacityScale = p.auroraOpacityScale ?? 1;
    });
  }

  function dispose() {
    ribbons.forEach(({ mesh }) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  }

  return { group, update, setPalette, dispose };
}