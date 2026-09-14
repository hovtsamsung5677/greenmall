import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { FloorScene, type PlanMetrics } from './MallMap';
import { useCachedGLTF } from '../components/MallMap/gltfCache';
import { fetchFloors, fetchFloorScene } from '../api/floors';
import { getLocalFloorModelUrl } from '../utils/floors';
import type { ApiFloor, ApiFloorScene } from '../api/types';
import logoGreenMall from '../assets/icons/logo2.webp';
import styles from './MallMap.module.css';

const FLOORS = [0, 1, 2, 3, 4];

const FLOOR_PLACEHOLDER_COLOR: Record<number, string> = {
  1: '#9BA0AB',
  2: '#8B93A6',
  3: '#A3907C',
  4: '#7C97A3',
};

const MIN_HEIGHT = 400;
const MAX_HEIGHT = 2600;
const PAN_SPEED = 1.4;

function TopDownControls({
  zoom,
  targetRef,
}: {
  zoom: number;
  targetRef: React.RefObject<{ x: number; z: number }>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const height = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * (zoom / 3);
    camera.position.set(targetRef.current.x, height, targetRef.current.z);
    camera.up.set(0, 0, -1);
    camera.lookAt(targetRef.current.x, 0, targetRef.current.z);
  });

  return null;
}

export default function RouteSharePreview() {
  const [lang] = useState<'ru' | 'en'>('ru');
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [scene, setScene] = useState<ApiFloorScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelError, setModelError] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null);
  const modelGroupRef = useRef<Group | null>(null);
  const [zoom, setZoom] = useState<number>(2);
  const targetRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const [activeFloor, setActiveFloor] = useState<number>(1);

  useEffect(() => {
    fetchFloors()
      .then(setFloors)
      .catch(() => setFloors([]));
  }, []);

  useEffect(() => {
    if (!floors.length) return;
    const floor = floors.find((f) => f.number === activeFloor);
    if (!floor) return;
    setLoading(true);
    setModelError(false);
    setCanvasError(false);
    fetchFloorScene(floor.id)
      .then((data) => {
        setScene(data);
        setCurrentModelUrl(data.floor.modelAsset?.url ?? null);
      })
      .catch(() => {
        setScene(null);
        setCurrentModelUrl(null);
      })
      .finally(() => setLoading(false));
  }, [activeFloor, floors]);

  const localModelUrl = getLocalFloorModelUrl(activeFloor);
  const modelUrl = localModelUrl ?? currentModelUrl;
  const { gltf, loading: gltfLoading, error: gltfError } = useCachedGLTF(modelUrl);

  const planMetrics = useMemo<PlanMetrics | null>(() => {
    const floor = floors.find((f) => f.number === activeFloor);
    if (!floor) return null;
    return {
      width: floor.width ?? 900,
      height: floor.height ?? 600,
    };
  }, [floors, activeFloor]);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(3, Math.max(0.4, +(prev + delta).toFixed(2))));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    const scale = (2 - zoom) * PAN_SPEED + 0.4;
    targetRef.current.x -= dx * scale;
    targetRef.current.z -= dy * scale;
  };

  const endDrag = (e: React.PointerEvent) => {
    dragRef.current.active = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className={styles.phoneFrame}>
      <div className={styles.phoneDevice}>
        <div className={styles.phoneNotch} />
        <div className={styles.phoneScreen}>
          <div className={styles.page}>
            <header className={styles.header}>
              <div className={styles.headerRight} style={{ width: '100%', justifyContent: 'center' }}>
                <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
              </div>
            </header>

      <div className={styles.mapArea}>
        <div
          className={styles.modelViewport}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {!modelUrl ? (
            <div
              className={styles.modelPlaceholder}
              style={{ backgroundColor: FLOOR_PLACEHOLDER_COLOR[activeFloor] }}
            >
              <span className={styles.modelPlaceholderLabel}>
                {loading ? 'Загрузка...' : `3D-модель · этаж ${activeFloor}`}
              </span>
            </div>
          ) : gltfLoading || !gltf ? (
            <div
              className={styles.modelPlaceholder}
              style={{ backgroundColor: FLOOR_PLACEHOLDER_COLOR[activeFloor] }}
            >
              <span className={styles.modelPlaceholderLabel}>
                Загрузка 3D-модели...
              </span>
            </div>
          ) : gltfError ? (
            <div className={styles.modelPlaceholder} style={{ backgroundColor: '#ffcccc' }}>
              <span className={styles.modelPlaceholderLabel}>Ошибка загрузки 3D-модели</span>
            </div>
          ) : (
            <Canvas
              camera={{ position: [0, 1200, 0], fov: 50, near: 0.1, far: 100000000 }}
              style={{ background: 'transparent', touchAction: 'none' }}
            >
              <ambientLight intensity={0.8} />
              <directionalLight position={[10, 20, 10]} intensity={1.2} />
              <FloorScene
                key={modelUrl}
                gltf={gltf}
                groupRef={modelGroupRef}
                metrics={planMetrics}
                route={null}
                activeFloor={activeFloor}
              />
              <TopDownControls zoom={zoom} targetRef={targetRef} />
            </Canvas>
          )}
        </div>

        <div className={styles.floorControls}>
          {FLOORS.map((floor) => (
            <button
              key={floor}
              type="button"
              className={`${styles.floorBtn} ${activeFloor === floor ? styles.floorBtnActive : ''}`}
              onClick={() => setActiveFloor(floor)}
              aria-pressed={activeFloor === floor}
            >
              {floor}
            </button>
          ))}
        </div>

        <div className={styles.zoomControls}>
          <button type="button" className={styles.zoomBtn} aria-label="Уменьшить" onClick={() => handleZoom(-0.1)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className={styles.zoomBtn} aria-label="Увеличить" onClick={() => handleZoom(0.1)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ padding: 12, textAlign: 'center', color: '#7c7c7c', fontSize: 13 }}>
        Предпросмотр страницы по QR (без маршрута)
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}
