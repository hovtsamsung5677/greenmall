import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { SRGBColorSpace } from 'three';
import styles from '@styles/StorePanoramaModal.module.css';

function PanoramaSphere({ url }: { url: string }) {
  const texture = useTexture(url);
  texture.colorSpace = SRGBColorSpace;

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[20, 64, 40]} />
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

export interface StorePanoramaModalProps {
  open: boolean;
  title: string;
  imageUrl: string;
  onClose: () => void;
}

export default function StorePanoramaModal({ open, title, imageUrl, onClose }: StorePanoramaModalProps) {
  const [ready, setReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    setImageReady(false);
    setLoadError(false);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setImageReady(true);
    image.onerror = () => setLoadError(true);
    image.src = imageUrl;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      image.onload = null;
      image.onerror = null;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, imageUrl, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Панорама магазина ${title}`}>
      <div className={styles.header}>
        <div>
          <strong>{title}</strong>
          <span>Проведите пальцем или перетащите мышью для обзора</span>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Закрыть панораму">×</button>
      </div>
      {loadError ? (
        <div className={styles.loading}>Не удалось загрузить панораму</div>
      ) : !ready ? (
        <div className={styles.loading}>Загрузка панорамы…</div>
      ) : null}
      {imageReady && !loadError ? (
        <Canvas
          className={styles.canvas}
          camera={{ position: [0, 0, 0.1], fov: 70 }}
          onCreated={() => setReady(true)}
        >
          <PanoramaSphere url={imageUrl} />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={-0.35}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI - 0.05}
            target={[0, 0, 0]}
          />
        </Canvas>
      ) : null}
    </div>
  );
}
