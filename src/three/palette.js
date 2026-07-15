import * as THREE from 'three';

/**
 * Bridges the site's existing CSS design tokens (variables.css) into the
 * Three.js scene, so the background is generated from the *same* color
 * system as the rest of the UI instead of a hard-coded palette that could
 * drift out of sync with the light/dark theme.
 */

function readVar(name, fallback) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function toColor(cssValue) {
  const c = new THREE.Color();
  try {
    // THREE.Color understands hex + rgb()/rgba() strings but not
    // shorthand rgba with named alpha channel weirdness, so strip alpha.
    const rgbaMatch = cssValue.match(
      /rgba?\(([^)]+)\)/i
    );
    if (rgbaMatch) {
      const parts = rgbaMatch[1].split(',').map((n) => parseFloat(n));
      c.setRGB(parts[0] / 255, parts[1] / 255, parts[2] / 255, THREE.SRGBColorSpace);
    } else {
      c.set(cssValue);
    }
  } catch {
    c.set(fallbackColor);
  }
  return c;
}

const fallbackColor = '#3247d1';

export function getPalette() {
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const isDark = theme === 'dark';

  const ink = toColor(readVar('--color-ink', isDark ? '#eef1fb' : '#14151c'));
  const bg = toColor(readVar('--color-bg', isDark ? '#05070c' : '#f8f7f4'));

  // Dedicated scene hues — foundation (charcoal/navy), primary (electric
  // blue), secondary (soft cyan), atmospheric (muted violet) and
  // highlight (neutral off-white). Kept on their own token set (see
  // variables.css) so the scene keeps a cohesive, restrained palette
  // independent of whatever accent color the UI theme happens to use.
  const charcoal = toColor(readVar('--scene-charcoal', isDark ? '#06070b' : '#0b0d12'));
  const navy = toColor(readVar('--scene-navy', isDark ? '#050710' : '#0a0e1a'));
  const accent = toColor(readVar('--scene-electric-blue', isDark ? '#5b7fff' : '#3a5cff'));
  const cyan = toColor(readVar('--scene-cyan', isDark ? '#8fe9f0' : '#7fe0e8'));
  const violet = toColor(readVar('--scene-violet', isDark ? '#a48fe8' : '#8b7bd8'));
  const offwhite = toColor(readVar('--scene-offwhite', isDark ? '#f7f6f2' : '#f4f2ec'));

  return {
    theme,
    isDark,
    // Deep atmosphere / fog base — charcoal blended toward midnight navy,
    // a touch lighter in light mode so it still reads as haze rather than
    // a black hole behind a white page.
    fog: isDark
      ? charcoal.clone().lerp(navy, 0.5)
      : bg.clone().lerp(navy, 0.05),
    background: bg,
    charcoal,
    navy,
    accent,
    cyan,
    violet,
    offwhite,
    ink,
    // Restrained ramp: mostly electric blue and soft cyan (light-as-color
    // primaries), violet as an occasional atmospheric accent, off-white
    // reserved for the rarest, brightest cores.
    particleRamp: [accent, accent.clone().lerp(cyan, 0.6), violet, offwhite],
    auroraA: accent,
    auroraB: violet,
    auroraC: cyan,
    // Additive layers read as much stronger in dark mode — dial exposure
    // down there and lift it in light mode where the light canvas swallows
    // subtle glows. (Raised from 0.5 — at that level the particle field was
    // barely legible against the light background.)
    exposure: isDark ? 0.8 : 0.68,
    // Orbitals and atmospheric haze render at a fixed opacity regardless
    // of theme (they don't read uExposure), so on their own they'd stay
    // exactly as faint in light mode as in dark. This gives them their
    // own multiplier to compensate.
    glowBoost: isDark ? 1 : 1.55,
  };
}

/**
 * Invokes `callback(palette)` immediately and again every time the site's
 * `data-theme` attribute changes (the ThemeToggle flips this on
 * <html>). Returns a disposer.
 */
export function subscribeToTheme(callback) {
  callback(getPalette());

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'data-theme') {
        callback(getPalette());
        break;
      }
    }
  });

  observer.observe(document.documentElement, { attributes: true });
  return () => observer.disconnect();
}