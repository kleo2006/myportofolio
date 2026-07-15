import * as THREE from 'three';

/**
 * A small system of tilted elliptical rings, each carrying a single
 * traveling point of light (a "comet head") plus one or two trailing
 * satellites. The rings themselves stay almost invisible — a hairline of
 * additive glow — so what actually reads is the light moving along an
 * implied orbit, not a drawn circle. Restrained on purpose: three or four
 * of these do more for a "premium" read than any denser structure would.
 */
export function createOrbitalSystem({ palette, count = 3 }) {
  const group = new THREE.Group();
  const rings = [];
  // Rings/satellites render at a flat opacity that ignores theme entirely
  // unless we track this ourselves — kept in sync via setPalette() below,
  // including the very first call palette.js fires on construction.
  let glowBoost = palette.glowBoost ?? 1;

  const colorSlots = [palette.accent, palette.cyan, palette.violet, palette.offwhite];

  for (let i = 0; i < count; i++) {
    const radius = 30 + i * 14 + Math.random() * 6;
    const segments = 160;
    const speed = (i % 2 === 0 ? 1 : -1) * (0.03 + Math.random() * 0.015);
    const color = colorSlots[i % colorSlots.length];

    const ringGroup = new THREE.Group();
    ringGroup.rotation.x = (Math.random() - 0.5) * 1.4 + Math.PI / 2 * 0.15;
    ringGroup.rotation.z = (Math.random() - 0.5) * 1.1;
    ringGroup.position.y = (Math.random() - 0.5) * 16;

    // -- Hairline ring: a line loop whose alpha is driven entirely by a
    // traveling "head" angle, so brightness sweeps around the circle
    // instead of the ring reading as a static drawn shape.
    const positions = new Float32Array((segments + 1) * 3);
    const angles = new Float32Array(segments + 1);
    for (let s = 0; s <= segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      positions[s * 3] = Math.cos(a) * radius;
      positions[s * 3 + 1] = Math.sin(a) * radius;
      positions[s * 3 + 2] = 0;
      angles[s] = a;
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineGeo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));

    const lineUniforms = {
      uHead: { value: 0 },
      uColor: { value: color.clone() },
      uOpacity: { value: 0 },
    };

    const lineMat = new THREE.ShaderMaterial({
      uniforms: lineUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aAngle;
        varying float vAngle;
        void main() {
          vAngle = aAngle;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uHead;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAngle;

        void main() {
          float d = abs(mod(vAngle - uHead + 3.14159265, 6.2831853) - 3.14159265);
          // Bright, tight comet head fading to a near-invisible hairline
          // for the rest of the circumference.
          float trail = exp(-d * 3.2) * 0.9 + 0.025;
          gl_FragColor = vec4(uColor, trail * uOpacity);
        }
      `,
    });

    const line = new THREE.LineLoop(lineGeo, lineMat);

    // -- Satellites: one bright head, one dim trailing companion, riding
    // the same ellipse. Rendered as soft round sprites via a Points shader
    // so they read as glowing bodies rather than flat dots.
    const satCount = 2;
    const satOffsets = new Float32Array(satCount);
    const satBrightness = new Float32Array(satCount);
    satOffsets[0] = 0;
    satBrightness[0] = 1.0;
    satOffsets[1] = 0.55 + Math.random() * 0.3;
    satBrightness[1] = 0.4;

    const satGeo = new THREE.BufferGeometry();
    satGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(satCount * 3), 3));
    satGeo.setAttribute('aOffset', new THREE.BufferAttribute(satOffsets, 1));
    satGeo.setAttribute('aBrightness', new THREE.BufferAttribute(satBrightness, 1));

    const satUniforms = {
      uHead: { value: 0 },
      uRadius: { value: radius },
      uColor: { value: color.clone() },
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    };

    const satMat = new THREE.ShaderMaterial({
      uniforms: satUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aOffset;
        attribute float aBrightness;
        uniform float uHead;
        uniform float uRadius;
        uniform float uPixelRatio;
        varying float vBrightness;

        void main() {
          float a = uHead + aOffset * 6.2831853;
          vec3 pos = vec3(cos(a) * uRadius, sin(a) * uRadius, 0.0);
          vBrightness = aBrightness;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = (7.0 + aBrightness * 7.0) * uPixelRatio * (60.0 / -mvPosition.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vBrightness;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float glow = pow(smoothstep(0.5, 0.0, d), 1.7);
          gl_FragColor = vec4(uColor * (1.2 + glow), glow * uOpacity * (0.5 + vBrightness * 0.5));
        }
      `,
    });

    const satellites = new THREE.Points(satGeo, satMat);
    satellites.frustumCulled = false;

    ringGroup.add(line, satellites);
    group.add(ringGroup);

    rings.push({
      ringGroup,
      lineUniforms,
      satUniforms,
      speed,
      phase: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.006,
    });
  }

  function update({ time, introProgress }) {
    for (const r of rings) {
      const head = time * r.speed + r.phase;
      r.lineUniforms.uHead.value = head;
      r.satUniforms.uHead.value = head;
      const o = Math.min(1, introProgress * 0.85 * glowBoost);
      r.lineUniforms.uOpacity.value = o;
      r.satUniforms.uOpacity.value = o;
      r.ringGroup.rotation.y += r.spinSpeed;
    }
  }

  function setPalette(p) {
    glowBoost = p.glowBoost ?? 1;
    const colors = [p.accent, p.cyan, p.violet, p.offwhite];
    rings.forEach((r, i) => {
      const c = colors[i % colors.length];
      r.lineUniforms.uColor.value.copy(c);
      r.satUniforms.uColor.value.copy(c);
    });
  }

  function dispose() {
    rings.forEach((r) => {
      r.ringGroup.children.forEach((child) => {
        child.geometry.dispose();
        child.material.dispose();
      });
    });
  }

  return { group, update, setPalette, dispose };
}