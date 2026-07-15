import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { getPalette, subscribeToTheme } from './palette.js';
import { createFlowField } from './objects/flowField.js';
import { createOrbitalSystem } from './objects/orbitals.js';
import { createAtmosphere } from './objects/atmosphere.js';
import { createStarfield, createDust } from './objects/stars.js';
import { ColorGradePass } from './post/ColorGradePass.js';

/**
 * An original cinematic background: a large-scale curl-noise flow field,
 * a small system of comet-lit orbital rings, and a soft volumetric haze
 * layer, composited with restrained bloom, an anti-aliased edge pass and
 * a final film-style grade. Everything here is procedural — no textures,
 * no imported assets, no reference art — generated fresh from the site's
 * own color tokens via palette.js.
 *
 * Public surface intentionally matches the previous engine
 * (constructor(canvas), dispose()) so ThreeBackground.jsx and the rest of
 * the app don't need to change.
 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

function detectQuality() {
  const isSmall = window.innerWidth < 760;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const lowCores = (navigator.hardwareConcurrency || 4) <= 4;

  if (isSmall && isCoarsePointer) return 'low';
  if (isCoarsePointer || lowCores) return 'medium';
  return 'high';
}

const QUALITY_PRESETS = {
  low: { particles: 1100, orbitals: 2, atmosphere: 2, stars: 200, dust: 50, bloom: false, smaa: false, grade: true, pixelRatioCap: 1.5 },
  medium: { particles: 2600, orbitals: 3, atmosphere: 3, stars: 320, dust: 90, bloom: true, smaa: false, grade: true, pixelRatioCap: 1.75 },
  high: { particles: 4600, orbitals: 4, atmosphere: 4, stars: 460, dust: 150, bloom: true, smaa: true, grade: true, pixelRatioCap: 2 },
};

export class CinematicBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.quality = this.reducedMotion ? 'low' : detectQuality();
    this.preset = QUALITY_PRESETS[this.quality];

    this.clock = new THREE.Clock();
    this.mouseTarget = new THREE.Vector2(0, 0);
    this.mouse = new THREE.Vector2(0, 0);
    this.mouseWorld = new THREE.Vector3(0, 0, 0);
    this.mouseStrength = 0;
    this.scrollTarget = 0;
    this.scroll = 0;
    this.introProgress = 0;
    this.isVisible = true;
    this.frameTimes = [];
    this.degraded = false;
    this.disposed = false;

    this._onPointerMove = this._onPointerMove.bind(this);
    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    this._tick = this._tick.bind(this);

    this._init();
  }

  _init() {
    const palette = getPalette();
    this.palette = palette;

    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.preset.pixelRatioCap));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Filmic response so bloom highlights roll off softly instead of
    // clipping to flat white.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(palette.fog.getHex(), 0.0028);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );
    camera.position.set(0, 0, 72);
    this.camera = camera;
    this.basePosition = camera.position.clone();

    // Hemisphere light: cool navy from "above", near-black bounce from
    // "below" — scattered ambient rather than a flat, direction-less wash.
    const hemi = new THREE.HemisphereLight(palette.navy.clone().lerp(palette.accent, 0.15), 0x030305, 0.5);
    scene.add(hemi);
    this.hemi = hemi;

    // A single dim, cool rim light — enough to give the orbital rings and
    // atmosphere a sense of direction without ever reading as a studio key.
    const key = new THREE.DirectionalLight(palette.accent, 0.35);
    key.position.set(30, 40, 20);
    scene.add(key);
    this.keyLight = key;

    this.flowField = createFlowField({ count: this.preset.particles, radius: 92, palette });
    scene.add(this.flowField.points);

    this.orbitals = createOrbitalSystem({ palette, count: this.preset.orbitals });
    scene.add(this.orbitals.group);

    this.atmosphere = createAtmosphere({ palette, count: this.preset.atmosphere });
    scene.add(this.atmosphere.group);

    this.stars = createStarfield({
      count: this.preset.stars,
      radius: 420,
      color: palette.ink,
      boost: palette.glowBoost,
    });
    scene.add(this.stars.points);

    this.dust = createDust({
      count: this.preset.dust,
      spread: 70,
      color: palette.accent,
      boost: palette.glowBoost,
    });
    this.dust.points.position.z = -10;
    scene.add(this.dust.points);

    // Postprocessing: soft bloom, optional edge AA, then a final grade
    // pass (vignette + split tone + grain) applied after tone mapping.
    this.composer = null;
    if (!this.reducedMotion) {
      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      if (this.preset.bloom) {
        const bloom = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          0.5,
          0.6,
          0.26
        );
        composer.addPass(bloom);
        this.bloom = bloom;
      }

      if (this.preset.smaa) {
        const smaa = new SMAAPass(
          window.innerWidth * renderer.getPixelRatio(),
          window.innerHeight * renderer.getPixelRatio()
        );
        composer.addPass(smaa);
        this.smaa = smaa;
      }

      composer.addPass(new OutputPass());

      if (this.preset.grade) {
        const grade = new ColorGradePass();
        composer.addPass(grade);
        this.grade = grade;
      }

      this.composer = composer;
    }

    this._unsubscribeTheme = subscribeToTheme((p) => this._applyPalette(p));

    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibility);

    this._onResize();

    if (this.reducedMotion) {
      // Respect the user's preference: render one settled frame instead of
      // starting a continuous animation loop.
      this._renderStatic();
    } else {
      this.clock.start();
      this._raf = requestAnimationFrame(this._tick);
    }
  }

  _applyPalette(palette) {
    this.palette = palette;
    // Small, sparse accents can snap on theme toggle. The fog wash covers
    // the whole frame, so that one gets a short tween instead of a cut.
    this._fogTween = {
      from: this.scene.fog.color.clone(),
      to: palette.fog.clone(),
      start: performance.now(),
      duration: 900,
    };
    this.flowField.setPalette(palette);
    this.orbitals.setPalette(palette);
    this.atmosphere.setPalette(palette);
    this.stars.setBoost(palette.glowBoost);
    this.dust.setBoost(palette.glowBoost);
    if (this.reducedMotion) {
      this.scene.fog.color.copy(palette.fog);
      this._fogTween = null;
      this._renderStatic();
    }
  }

  _updateFogTween() {
    if (!this._fogTween) return;
    const t = clamp((performance.now() - this._fogTween.start) / this._fogTween.duration, 0, 1);
    this.scene.fog.color.copy(this._fogTween.from).lerp(this._fogTween.to, t);
    if (t >= 1) this._fogTween = null;
  }

  _onPointerMove(e) {
    this.mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  _onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollTarget = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) this.composer.setSize(w, h);
    if (this.smaa) this.smaa.setSize(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
    if (this.reducedMotion) this._renderStatic();
  }

  _onVisibility() {
    this.isVisible = document.visibilityState === 'visible';
  }

  _renderStatic() {
    // One deterministic frame for reduced-motion visitors.
    this.flowField.update({ time: 0, mouseWorld: this.mouseWorld, mouseStrength: 0, scroll: this.scroll });
    this.orbitals.update({ time: 0, introProgress: 1 });
    this.atmosphere.update({ time: 0, camera: this.camera, introProgress: 1 });
    this.stars.update(0);
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  _monitorPerf(delta) {
    if (this.degraded) return;
    this.frameTimes.push(delta);
    if (this.frameTimes.length < 90) return;

    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1 / avg;
    this.frameTimes.length = 0;

    if (fps < 42) {
      this.degraded = true;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
      if (this.composer) {
        // Fall back to a single RenderPass + OutputPass — no bloom, no
        // SMAA, no grade — the cheapest path that still tone-maps and
        // color-manages correctly.
        const cheap = new EffectComposer(this.renderer);
        cheap.addPass(new RenderPass(this.scene, this.camera));
        cheap.addPass(new OutputPass());
        this.composer = cheap;
        this.bloom = null;
        this.smaa = null;
        this.grade = null;
      }
    }
  }

  _tick() {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(this._tick);
    if (!this.isVisible) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.elapsedTime;

    this._monitorPerf(delta);
    this._updateFogTween();

    // Smoothly settle pointer/scroll targets (inertia, not snapping).
    this.mouse.lerp(this.mouseTarget, 1 - Math.pow(0.001, delta));
    this.scroll = lerp(this.scroll, this.scrollTarget, 1 - Math.pow(0.0005, delta));
    this.mouseStrength = lerp(this.mouseStrength, 1, 1 - Math.pow(0.01, delta));
    this.introProgress = Math.min(1, this.introProgress + delta / 2.2);

    // Slow autonomous camera drift — independent periods so the orbit
    // never traces the same path twice within a normal visit — plus a
    // hair of roll tied to pointer position for a very subtle "handheld
    // gimbal" quality rather than a locked-off shot.
    const driftX = Math.sin(time * 0.045) * 6 + Math.sin(time * 0.011) * 2.5;
    const driftY = Math.cos(time * 0.037) * 3.5;
    const parallaxX = this.mouse.x * 4.5;
    const parallaxY = this.mouse.y * 2.8;

    this.camera.position.x = this.basePosition.x + driftX + parallaxX;
    this.camera.position.y = this.basePosition.y + driftY + parallaxY;
    this.camera.position.z = this.basePosition.z - this.scroll * 16;
    this.camera.lookAt(0, -this.scroll * 6, 0);
    this.camera.rotation.z = this.mouse.x * -0.012;

    // Focal breathing: an extremely slow FOV oscillation, the kind of
    // detail that reads as "alive" without being consciously noticed.
    this.camera.fov = 50 + Math.sin(time * 0.02) * 1.1;
    this.camera.updateProjectionMatrix();

    this.mouseWorld.set(this.mouse.x * 44, this.mouse.y * 26, 0);

    this.flowField.update({
      time,
      mouseWorld: this.mouseWorld,
      mouseStrength: this.mouseStrength * 0.55,
      scroll: this.scroll,
    });

    this.orbitals.update({ time, introProgress: this.introProgress });
    this.atmosphere.update({ time, camera: this.camera, introProgress: this.introProgress });
    this.stars.update(time);
    this.dust.update(delta);

    if (this.bloom) {
      // Light mode now carries brighter particles/orbitals/haze (see
      // palette.js glowBoost), so bloom gets a small matching lift —
      // otherwise the extra brightness reads as flatter, un-glowing color
      // rather than genuine light.
      const themeBloom = this.palette?.isDark ? 1 : 1.15;
      this.bloom.strength = (0.36 + this.introProgress * 0.1 + this.scroll * 0.16) * themeBloom;
    }
    if (this.grade) {
      this.grade.uniforms.uTime.value = time;
    }

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibility);
    if (this._unsubscribeTheme) this._unsubscribeTheme();

    this.flowField.dispose();
    this.orbitals.dispose();
    this.atmosphere.dispose();
    this.stars.dispose();
    this.dust.dispose();
    this.composer?.dispose?.();
    this.renderer.dispose();
  }
}