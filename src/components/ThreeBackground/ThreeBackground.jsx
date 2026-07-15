import { useEffect, useRef } from 'react';
import './ThreeBackground.css';

/**
 * Mounts a fixed, full-viewport <canvas> behind all page content and
 * drives it with the CinematicBackground engine (src/three). The engine
 * itself owns all Three.js state; this component only handles the React
 * mount/unmount lifecycle and lazy-loads Three.js so it never blocks the
 * initial paint of the actual portfolio content.
 */
function ThreeBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let engine;
    let cancelled = false;

    import('../../three/CinematicBackground.js').then(({ CinematicBackground }) => {
      if (cancelled || !canvasRef.current) return;
      engine = new CinematicBackground(canvasRef.current);
    });

    return () => {
      cancelled = true;
      engine?.dispose();
    };
  }, []);

  return (
    <div className="three-backdrop" aria-hidden="true">
      <canvas ref={canvasRef} className="three-backdrop__canvas" />
    </div>
  );
}

export default ThreeBackground;
