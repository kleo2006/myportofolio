import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

/**
 * Final pass of the chain: applied *after* OutputPass, so it operates on
 * display-referred pixels (post-tonemap, post-colorspace-conversion) —
 * the same stage a colorist would grade at. Three restrained moves:
 *
 *  1. Vignette — darkens the frame edges so the eye settles on the
 *     content sitting in the center of the viewport rather than the
 *     background's corners.
 *  2. Split tone — lifts shadows very slightly toward the scene's cool
 *     navy and warms the highlights a touch toward the accent hue, the
 *     cheapest move that reads as "graded" rather than "raw render".
 *  3. Grain — a faint, animated dither that keeps smooth gradients (the
 *     bloom, the atmosphere haze) from banding, and not incidentally
 *     reads as expensive film stock rather than flat CG.
 */
const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignetteStrength: { value: 0.38 },
    uGrainStrength: { value: 0.022 },
    uShadowTint: { value: new THREE.Color(0x0a1030) },
    uHighlightTint: { value: new THREE.Color(0xfff2d8) },
    uGradeStrength: { value: 0.16 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignetteStrength;
    uniform float uGrainStrength;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    uniform float uGradeStrength;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 graded = mix(color.rgb, color.rgb * uShadowTint * 2.0, (1.0 - luma) * uGradeStrength);
      graded = mix(graded, graded * uHighlightTint, luma * uGradeStrength * 0.6);

      vec2 c = vUv - 0.5;
      float vignette = 1.0 - dot(c, c) * uVignetteStrength * 2.0;
      vignette = smoothstep(0.0, 1.0, vignette);
      graded *= vignette;

      float grain = (hash(vUv * vec2(1920.0, 1080.0) + uTime) - 0.5) * uGrainStrength;
      graded += grain;

      gl_FragColor = vec4(graded, color.a);
    }
  `,
};

export class ColorGradePass extends Pass {
  constructor() {
    super();
    this.uniforms = THREE.UniformsUtils.clone(ColorGradeShader.uniforms);
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: ColorGradeShader.vertexShader,
      fragmentShader: ColorGradeShader.fragmentShader,
    });
    this.fsQuad = new FullScreenQuad(this.material);
  }

  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tDiffuse.value = readBuffer.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }

  setSize() {
    // Screen-space shader, resolution-independent — nothing to resize.
  }

  dispose() {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
