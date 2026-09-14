import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { FloorScene, type PlanMetrics } from '@pages/MallMap';
import { useCachedGLTF } from '@components/MallMap/gltfCache';
import { fetchFloors, fetchFloorScene } from '@api/floors';
import { getSharedRoute } from '@api/sharedRoutes';
import { getLocalFloorModelUrl } from '@utils/floors';
import type {
  ApiFloor,
  ApiFloorScene,
  ApiRouteToStoreResponse,
} from '@api/types';
import logoGreenMall from '@assets/icons/logo2.webp';
import styles from '@styles/MallMap.module.css';

const FLOORS = [0, 1, 2, 3, 4];

const FLOOR_PLACEHOLDER_COLOR: Record<number, string> = {
  1: '#9BA0AB',
  2: '#8B93A6',
  3: '#A3907C',
  4: '#7C97A3',
};

const BASE_HEIGHT = 1200;
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

export default function RouteShareView({ token }: { token: string }) {
  const [lang] = useState<'ru' | 'en'>('ru');
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [route, setRoute] = useState<ApiRouteToStoreResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [scene, setScene] = useState<ApiFloorScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [modelError, setModelError] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null);
  const modelGroupRef = useRef<Group | null>(null);
  const [zoom, setZoom] = useState<number>(2);
  const targetRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const dragRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
  }>({ active: false, lastX: 0, lastY: 0 });

  const initialFloor = useMemo(() => {
    const firstPoint = route?.routePath?.[0];
    if (firstPoint) return firstPoint.floorNumber;
    return route?.segments?.[0]?.floorNumber ?? 1;
  }, [route]);

  const [activeFloor, setActiveFloor] = useState<number>(1);

  useEffect(() => {
    if (initialFloor) setActiveFloor(initialFloor);
  }, [initialFloor]);

  useEffect(() => {
    setLoading(true);
    setRouteError(null);
    getSharedRoute<ApiRouteToStoreResponse>(token)
      .then((data) => setRoute(data))
      .catch((err) =>
        setRouteError(
          err instanceof Error ? err.message : 'Не удалось загрузить маршрут',
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

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

  if (loading && !routeError) {
    return (
      <div className={styles.page}>
        <div className={styles.modelPlaceholder} style={{ backgroundColor: FLOOR_PLACEHOLDER_COLOR[activeFloor] }}>
          <span className={styles.modelPlaceholderLabel}>Загрузка маршрута…</span>
        </div>
      </div>
    );
  }

  if (routeError) {
    return (
      <div className={styles.page}>
        <div className={styles.modelPlaceholder} style={{ backgroundColor: '#ffcccc' }}>
          <span className={styles.modelPlaceholderLabel}>{routeError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRight} style={{ width: '100%', justifyContent: 'center' }}>
          <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
        </div>
      </header>

      <div className={styles.mapArea}>
        {(route?.totalDistance != null) ? (
          <div className={styles.routeStatus}>
            <span>
              {route?.targetStore?.name
                ? `Маршрут до «${route.targetStore.name}»`
                : 'Маршрут'}:{' '}
              {route?.totalDistance} ед. · {route?.instructions.length} шагов
            </span>
          </div>
        ) : null}

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
            <ModelError />
          ) : (
            <Canvas
              camera={{ position: [0, BASE_HEIGHT, 0], fov: 50, near: 0.1, far: 100000000 }}
              style={{ background: 'transparent', touchAction: 'none' }}
            >
              <ambientLight intensity={0.8} />
              <directionalLight position={[10, 20, 10]} intensity={1.2} />
              <Suspense fallback={null}>
                <FloorScene
                  key={modelUrl}
                  gltf={gltf}
                  groupRef={modelGroupRef}
                  metrics={planMetrics}
                  route={route}
                  activeFloor={activeFloor}
                  onReachTransfer={(nextFloor) => setActiveFloor(nextFloor)}
                />
              </Suspense>
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
    </div>
  );
}
