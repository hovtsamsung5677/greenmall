import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { Group } from 'three';
import { QRCodeSVG } from 'qrcode.react';
import styles from './MallMap.module.css';

import logoGreenMall from '../assets/icons/logo2.png';
import qrCodeIcon from '../assets/icons/qr_code.png';
import qrCodeEngIcon from '../assets/icons/qr_code_eng.png';
import translatorRu from '../assets/icons/переводчик рус.svg';
import translatorEn from '../assets/icons/переводчик англ.svg';
import MallWidget from '../components/mall-widget/MallWidget';
import { fetchFloors, fetchFloorScene } from '../api/floors';
import { fetchRouteNodes } from '../api/routeNodes';
import { fetchRouteEdges } from '../api/routeEdges';
import { buildRouteToStore } from '../api/routes';
import { createSharedRoute } from '../api/sharedRoutes';
import type {
  ApiFloor,
  ApiFloorScene,
  ApiRouteNode,
  ApiRouteEdge,
  ApiRouteToStoreResponse,
} from '../api/types';

const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_RU = [
  'Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь',
  'Июль', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FLOORS = [0, 1, 2, 3, 4];

const localFloorModelModules = import.meta.glob('../../floors/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const LOCAL_FLOOR_MODELS: Record<number, string> = Object.entries(
  localFloorModelModules,
).reduce<Record<number, string>>((acc, [path, url]) => {
  const match = /(-?\d+)_floor\.glb$/i.exec(path);
  if (match) {
    acc[Number(match[1])] = url;
  }
  return acc;
}, {});

const FLOOR_PLACEHOLDER_COLOR: Record<number, string> = {
  1: '#9BA0AB',
  2: '#8B93A6',
  3: '#A3907C',
  4: '#7C97A3',
};

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDate(date: Date, lang: 'ru' | 'en'): string {
  const weekdays = lang === 'ru' ? WEEKDAYS_RU : WEEKDAYS_EN;
  const months = lang === 'ru' ? MONTHS_RU : MONTHS_EN;
  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  return `${weekday}, ${day} ${month}`;
}

export function AnimatedRouteLine({
  points,
  onComplete,
}: {
  points: [number, number, number][];
  onComplete?: () => void;
}) {
  const lineRef = useRef<React.ElementRef<typeof Line>>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const completedRef = useRef(false);

  const positions = useMemo(
    () => points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    [points],
  );

  useEffect(() => {
    progress.current = 0;
    completedRef.current = false;
  }, [points]);

  useFrame((_, delta) => {
    const target = positions.length - 1;
    if (target <= 0) return;
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta / 1.5);
    }
    const t = progress.current;
    const seg = t * target;
    const i = Math.min(positions.length - 2, Math.floor(seg));
    const localT = seg - i;
    const a = positions[i];
    const b = positions[i + 1];

    if (markerRef.current) {
      markerRef.current.position.lerpVectors(a, b, localT);
    }

    if (progress.current >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  return (
    <group>
      <Line ref={lineRef} points={points} color="#22C55E" lineWidth={6} />
      <mesh ref={markerRef}>
        <sphereGeometry args={[8, 16, 16]} />
        <meshStandardMaterial color="#22C55E" emissive="#22C55E" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

export function FloorScene({
  url,
  groupRef,
  metrics,
  route,
  activeFloor,
  onReachTransfer,
}: {
  url: string;
  groupRef?: React.RefObject<Group | null>;
  metrics: PlanMetrics | null;
  route: ApiRouteToStoreResponse | null;
  activeFloor: number;
  onReachTransfer?: (nextFloor: number) => void;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    return cloned;
  }, [gltf]);

  const { scale, center } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    let scale = 1;
    if (metrics && size.x > 0 && size.z > 0) {
      const uniform = Math.min(metrics.width / size.x, metrics.height / size.z) || 1;
      scale = uniform;
    }
    return { scale, center };
  }, [scene, metrics]);
  const stableCenter = useRef(center);
  const stableScale = useRef(scale);

  if (stableCenter.current !== center) {
    stableCenter.current = center;
  }
  if (stableScale.current !== scale) {
    stableScale.current = scale;
  }

  const planToScene = (p: { x: number; y: number; z?: number | null }): [number, number, number] => {
    const w = metrics?.width ?? 1;
    const h = metrics?.height ?? 1;
    const sceneX = p.x - w / 2;
    const sceneY = (p.z ?? 0) || 0;
    const sceneZ = p.y - h / 2;
    return [sceneX, sceneY, sceneZ];
  };

  const routeOverlay = useMemo(() => {
    if (!route || route.routePath.length < 2) return null;
    const segment = route.segments?.find((s) => s.floorNumber === activeFloor) ?? null;
    if (!segment || segment.points.length < 2) return null;
    const points = segment.points.map(planToScene);
    const start = points[0];
    const end = points[points.length - 1];

    const handleComplete = () => {
      const changes = route.floorChanges ?? [];
      const change = changes.find((ch) => ch.fromFloor === activeFloor);
      if (change) onReachTransfer?.(change.toFloor);
    };

    return (
      <group>
        <AnimatedRouteLine points={points} onComplete={handleComplete} />
        <mesh position={start}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={end}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.6} />
        </mesh>
      </group>
    );
  }, [route, planToScene, activeFloor, onReachTransfer]);

  return (
    <>
      <group
        ref={groupRef}
        scale={stableScale.current}
        position={[-stableCenter.current.x * stableScale.current, -stableCenter.current.y * stableScale.current, -stableCenter.current.z * stableScale.current]}
      >
        <primitive object={scene} />
      </group>
      {routeOverlay}
    </>
  );
}

export interface PlanMetrics {
  width: number;
  height: number;
}

function ModelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.modelPlaceholder} style={{ backgroundColor: '#ffcccc' }}>
      <span className={styles.modelPlaceholderLabel}>
        Ошибка загрузки 3D-модели
      </span>
      <button onClick={onRetry} style={{ marginTop: 12, padding: '8px 16px', cursor: 'pointer' }}>
        Повторить
      </button>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary] 3D render error', error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default function MallMap({ onOpenAdmin, widgetRefreshKey }: { onOpenAdmin?: () => void; widgetRefreshKey?: number } = {}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(timer);
  }, []);
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(2);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [scene, setScene] = useState<ApiFloorScene | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null);
  const modelGroupRef = useRef<Group | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null);
  const prevZoomRef = useRef<number>(2);

  const cameraConfig = useMemo(() => ({
    position: [0, 5000, 0.001] as [number, number, number],
    fov: 50,
    near: 0.1,
    far: 100000000,
  }), []);

  const canvasStyle = useMemo(() => ({ background: 'transparent' }), []);

  useEffect(() => {
    const controls = controlsRef.current?.current;
    if (!controls) return;
    controls.target.set(0, 0, 0);
    controls.update();
  }, [activeFloor]);
  const [routeNodes, setRouteNodes] = useState<ApiRouteNode[]>([]);
  const [routeEdges, setRouteEdges] = useState<ApiRouteEdge[]>([]);
  const [activeRoute, setActiveRoute] = useState<ApiRouteToStoreResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

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
    console.log('[MallMap] Loading scene for floor', { activeFloor, floorId: floor.id });
    fetchFloorScene(floor.id)
      .then((data) => {
        setScene(data);
        setCurrentModelUrl(data.floor.modelAsset?.url ?? null);
      })
      .catch((err) => {
        console.error('[MallMap] Failed to load floor scene', err);
        setScene(null);
        setCurrentModelUrl(null);
      })
      .finally(() => setLoading(false));
  }, [activeFloor, floors]);

  useEffect(() => {
    setModelError(false);
    setCanvasError(false);
  }, [activeFloor]);

  useEffect(() => {
    if (!floors.length) return;
    const floor = floors.find((f) => f.number === activeFloor);
    if (!floor) return;
    setRouteNodes([]);
    setRouteEdges([]);
    Promise.all([fetchRouteNodes(floor.id), fetchRouteEdges(floor.id)])
      .then(([n, e]) => {
        setRouteNodes(n);
        setRouteEdges(e);
      })
      .catch(() => {
        setRouteNodes([]);
        setRouteEdges([]);
      });
  }, [activeFloor, floors]);

  async function handleBuildRouteToStore(storeSlug: string) {
    if (!floors.length) return;
    const floor = floors.find((f) => f.number === activeFloor);
    if (!floor) return;

    const connectedIds = new Set<string>();
    for (const edge of routeEdges) {
      connectedIds.add(edge.fromNodeId);
      connectedIds.add(edge.toNodeId);
    }

    const startNode =
      routeNodes.find((n) => n.type === 'PANEL' && connectedIds.has(n.id)) ??
      routeNodes.find((n) => n.type === 'ENTRANCE' && connectedIds.has(n.id)) ??
      routeNodes.find((n) => n.type === 'PANEL') ??
      routeNodes.find((n) => n.type === 'ENTRANCE');

    if (!startNode) {
      setRouteError('Нет узла стойки/входа на этом этаже для начала маршрута');
      return;
    }

    setRouteLoading(true);
    setRouteError(null);
    try {
      const route = await buildRouteToStore({
        fromNodeId: startNode.id,
        storeSlug,
        floorId: floor.id,
      });
      setActiveRoute(route);
    } catch (err) {
      setActiveRoute(null);
      setRouteError(err instanceof Error ? err.message : 'Не удалось построить маршрут');
    } finally {
      setRouteLoading(false);
    }
  }

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(3, Math.max(0.4, +(prev + delta).toFixed(2))));
  };

  async function handleShareRoute() {
    if (!activeRoute) {
      setShareError('Сначала постройте маршрут');
      return;
    }
    setShareLoading(true);
    setShareError(null);
    try {
      const { token } = await createSharedRoute(activeRoute);
      setShareToken(token);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'Не удалось создать QR-код');
      setShareToken(null);
    } finally {
      setShareLoading(false);
    }
  }

  const shareUrl = shareToken
    ? `${(import.meta.env.VITE_SHARE_BASE_URL ?? window.location.origin).replace(/\/+$/, '')}/#/route/${shareToken}`
    : '';

  useEffect(() => {
    const controls = controlsRef.current?.current;
    if (!controls) {
      prevZoomRef.current = zoom;
      return;
    }
    const ratio = zoom / prevZoomRef.current;
    if (ratio !== 1 && ratio > 0) {
      controls.dollyIn(ratio);
      controls.update();
    }
    prevZoomRef.current = zoom;
  }, [zoom]);


  const localModelUrl = LOCAL_FLOOR_MODELS[activeFloor] ?? null;
  const modelUrl = localModelUrl ?? currentModelUrl;

  const planMetrics = useMemo(() => {
    const floor = floors.find((f) => f.number === activeFloor);
    if (!floor) return null;
    return {
      width: floor.width ?? 900,
      height: floor.height ?? 600,
    };
  }, [floors, activeFloor]);

  useEffect(() => {
    console.log('[MallMap] Floor changed:', {
      activeFloor,
      modelUrl,
      source: localModelUrl ? 'local' : currentModelUrl ? 'api' : 'none',
      loading,
      floorsCount: floors.length,
    });
  }, [activeFloor, modelUrl, localModelUrl, currentModelUrl, loading, floors.length]);

  const retryModel = () => {
    setModelError(false);
    setCanvasError(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />

        <div className={styles.headerRight}>
          <div className={styles.dateTime}>
            <span className={styles.time}>{formatTime(now)}</span>
            <span className={styles.date}>{formatDate(now, lang)}</span>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {onOpenAdmin ? (
              <button
                className={styles.adminBtn}
                type="button"
                onClick={onOpenAdmin}
              >
                Admin
              </button>
            ) : null}
            <button
              className={styles.langSwitch}
              type="button"
              onClick={() => setLang((p) => (p === 'en' ? 'ru' : 'en'))}
            >
              <img
                src={lang === 'ru' ? translatorRu : translatorEn}
                alt={lang === 'ru' ? 'Переключить на английский' : 'Switch to Russian'}
                className={styles.translatorIcon}
                draggable={false}
              />
            </button>
          </div>
        </div>
      </header>

      <div className={styles.mapArea}>
        <MallWidget
          key={widgetRefreshKey}
          open={filtersOpen}
          lang={lang}
          refreshKey={widgetRefreshKey}
          onExpand={() => setFiltersOpen(true)}
          onCollapse={() => setFiltersOpen(false)}
          onPickStore={(store) => {
            if (store?.slug) {
              void handleBuildRouteToStore(store.slug);
            }
          }}
        />

        <div className={styles.modelViewport}>
          {!modelUrl ? (
            <div
              className={styles.modelPlaceholder}
              style={{ backgroundColor: FLOOR_PLACEHOLDER_COLOR[activeFloor] }}
            >
              <span className={styles.modelPlaceholderLabel}>
                {loading ? 'Загрузка...' : `3D-модель · этаж ${activeFloor}`}
              </span>
            </div>
          ) : modelError || canvasError ? (
            <ModelError onRetry={retryModel} />
          ) : (
            <ErrorBoundary onError={() => setModelError(true)}>
              <Canvas
                camera={cameraConfig}
                style={canvasStyle}
              >
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 20, 10]} intensity={1.2} />
                <Suspense fallback={null}>
                  <FloorScene
                    key={modelUrl}
                    url={modelUrl}
                    groupRef={modelGroupRef}
                    metrics={planMetrics}
                    route={activeRoute}
                    activeFloor={activeFloor}
                    onReachTransfer={(nextFloor) => setActiveFloor(nextFloor)}
                  />
                </Suspense>
                <OrbitControls
                  ref={controlsRef}
                  makeDefault
                  target={[0, 0, 0]}
                  enableRotate
                  enableZoom
                  enablePan
                  mouseButtons={{
                    LEFT: THREE.MOUSE.ROTATE,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.PAN,
                  }}
                  touches={{
                    ONE: THREE.TOUCH.ROTATE,
                    TWO: THREE.TOUCH.DOLLY_PAN,
                  }}
                />
              </Canvas>
            </ErrorBoundary>
          )}
        </div>

        {(routeLoading || routeError || activeRoute) ? (
          <div className={styles.routeStatus}>
            {routeLoading ? (
              <span>Построение маршрута…</span>
            ) : routeError ? (
              <span className={styles.routeError}>{routeError}</span>
            ) : activeRoute ? (
              <span>
                Маршрут до «{activeRoute.targetStore?.name ?? 'магазина'}»:{' '}
                {activeRoute.totalDistance} ед. · {activeRoute.instructions.length} шагов
              </span>
            ) : null}
          </div>
        ) : null}

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
          <button
            type="button"
            className={styles.qrBtn}
            aria-label={lang === 'en' ? 'Share route via QR' : 'Поделиться маршрутом через QR'}
            onClick={() => void handleShareRoute()}
            disabled={shareLoading || !activeRoute}
          >
            <img src={lang === 'en' ? qrCodeEngIcon : qrCodeIcon} alt="QR" />
          </button>
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

      {shareToken || shareLoading || shareError ? (
        <div className={styles.qrOverlay} onClick={() => setShareToken(null)}>
          <div className={styles.qrModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.qrModalTitle}>
              {lang === 'en' ? 'Scan to open on phone' : 'Отсканируйте, чтобы открыть на телефоне'}
            </h3>
            {shareLoading ? (
              <p className={styles.qrModalHint}>
                {lang === 'en' ? 'Generating code…' : 'Генерация кода…'}
              </p>
            ) : shareError ? (
              <p className={styles.qrModalError}>{shareError}</p>
            ) : shareToken ? (
              <>
                <div className={styles.qrCodeBox}>
                  <QRCodeSVG value={shareUrl} size={220} level="M" />
                </div>
                <p className={styles.qrModalHint}>
                  {lang === 'en'
                    ? 'Open the camera and scan — the route will open in your browser.'
                    : 'Откройте камеру и отсканируйте — маршрут откроется в браузере.'}
                </p>
              </>
            ) : null}
            <button
              type="button"
              className={styles.qrModalClose}
              onClick={() => setShareToken(null)}
            >
              {lang === 'en' ? 'Close' : 'Закрыть'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}








