import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { FloorScene, type PlanMetrics } from '@pages/MallMap';
import { useCachedGLTF } from '@components/MallMap/gltfCache';
import { useFloorScene } from '@hooks/useFloorScene';
import type { ApiRouteToStoreResponse } from '@api/types';
import styles from '@styles/MallMap.module.css';

const FLOOR_PLACEHOLDER_COLOR: Record<number, string> = {
  1: '#9BA0AB',
  2: '#8B93A6',
  3: '#A3907C',
  4: '#7C97A3',
};

const MIN_HEIGHT = 400;
const MAX_HEIGHT = 2600;
const PAN_SPEED = 1.4;

function ModelError() {
  return (
    <div className={styles.modelPlaceholder} style={{ backgroundColor: '#ffcccc' }}>
      <span className={styles.modelPlaceholderLabel}>
        Ошибка загрузки 3D-модели
      </span>
    </div>
  );
}

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

export interface SharedRouteSceneProps {
  route: ApiRouteToStoreResponse | null;
  phoneFrame?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  routeStatusContent?: React.ReactNode;
  initialFloor?: number;
}

export default function SharedRouteScene({
  route,
  phoneFrame = false,
  headerContent,
  footerContent,
  routeStatusContent,
  initialFloor = 1,
}: SharedRouteSceneProps) {
  const [modelError, setModelError] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const modelGroupRef = useRef<Group | null>(null);
  const [zoom, setZoom] = useState<number>(2);
  const targetRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const dragRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
  }>({ active: false, lastX: 0, lastY: 0 });

  const activeFloorFromRoute = useMemo(() => {
    const firstPoint = route?.routePath?.[0];
    if (firstPoint) return firstPoint.floorNumber;
    return route?.segments?.[0]?.floorNumber ?? null;
  }, [route]);

  const [activeFloor, setActiveFloor] = useState<number>(initialFloor);

  const {
    floors,
    floorsError,
    scene,
    sceneError,
    loading,
    modelUrl,
    retry,
  } = useFloorScene(activeFloor);

  const floorNumbers = useMemo(
    () => [...floors].sort((a, b) => a.number - b.number).map((f) => f.number),
    [floors],
  );

  useEffect(() => {
    if (!floors.length) return;
    if (!floors.some((f) => f.number === activeFloor)) {
      setActiveFloor(floors[0].number);
    }
  }, [floors, activeFloor]);

  useEffect(() => {
    if (activeFloorFromRoute != null) setActiveFloor(activeFloorFromRoute);
  }, [activeFloorFromRoute]);

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

  const retryFloors = () => {
    retry();
  };

  const retryScene = () => {
    retry();
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

  const viewport = (
    <>
      {floorsError ? (
        <div className={styles.errorOverlay}>
          <p>{floorsError}</p>
          <button type="button" className={styles.retryBtn} onClick={retryFloors}>Повторить</button>
        </div>
      ) : sceneError ? (
        <div className={styles.errorOverlay}>
          <p>{sceneError}</p>
          <button type="button" className={styles.retryBtn} onClick={retryScene}>Повторить</button>
        </div>
      ) : !modelUrl ? (
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
        <ModelError />
      ) : (
        <Canvas
          camera={{ position: [0, phoneFrame ? 1200 : 1200, 0], fov: 50, near: 0.1, far: 100000000 }}
          style={{ background: 'transparent', touchAction: 'none' }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} />
          <FloorScene
            key={modelUrl}
            gltf={gltf}
            groupRef={modelGroupRef}
            metrics={planMetrics}
            route={route}
            activeFloor={activeFloor}
            onReachTransfer={(nextFloor) => setActiveFloor(nextFloor)}
          />
          <TopDownControls zoom={zoom} targetRef={targetRef} />
        </Canvas>
      )}
    </>
  );

  const inner = (
    <div className={styles.page}>
      {headerContent}
      <div className={styles.mapArea}>
        {routeStatusContent}
        <div
          className={styles.modelViewport}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {viewport}
        </div>
        <div className={styles.floorControls}>
          {floorNumbers.map((floor) => (
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
              <path d="M5 12h14M12 5v14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      {footerContent}
    </div>
  );

  if (phoneFrame) {
    return (
      <div className={styles.phoneFrame}>
        <div className={styles.phoneDevice}>
          <div className={styles.phoneNotch} />
          <div className={styles.phoneScreen}>
            {inner}
          </div>
        </div>
      </div>
    );
  }

  return inner;
}
