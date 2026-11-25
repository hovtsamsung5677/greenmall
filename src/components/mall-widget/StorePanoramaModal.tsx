import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import styles from '@styles/StorePanoramaModal.module.css';

export interface StorePanoramaModalProps {
  open: boolean;
  title: string;
  imageUrl: string;
  onClose: () => void;
}

export default function StorePanoramaModal({ open, title, imageUrl, onClose }: StorePanoramaModalProps) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    setLoadError(false);
    setOffset({ x: 0, y: 0 });
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setReady(true);
    image.onerror = () => setLoadError(true);
    image.src = imageUrl;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      image.onload = null;
      image.onerror = null;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, imageUrl]);

  if (!open) return null;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = dragRef.current;
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setOffset((current) => ({
      x: current.x + dx,
      y: Math.max(-window.innerHeight * 0.2, Math.min(window.innerHeight * 0.2, current.y + dy)),
    }));
  };

  const stopDragging = () => {
    dragRef.current = null;
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Панорама магазина ${title}`}>
      <div className={styles.header}>
        <div>
          <strong>{title}</strong>
          <span>Проведите пальцем или перетащите мышью для обзора</span>
        </div>
      </div>
      {ready && !loadError ? (
        <div
          className={styles.viewer}
          role="img"
          aria-label={`Панорамный обзор магазина ${title}`}
          style={{
            backgroundImage: `url("${imageUrl.replaceAll('"', '%22')}")`,
            backgroundPosition: `${offset.x}px calc(50% + ${offset.y}px)`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        />
      ) : null}
      <button
        type="button"
        className={styles.closeButton}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onClose}
        aria-label="Закрыть панораму"
      >
        ×
      </button>
      {loadError ? (
        <div className={styles.loading}>Не удалось загрузить панораму</div>
      ) : !ready ? (
        <div className={styles.loading}>Загрузка панорамы…</div>
      ) : null}
    </div>
  );
}
