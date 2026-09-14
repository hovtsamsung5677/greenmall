import { useState, useEffect, useLayoutEffect, useMemo, Suspense, useRef } from 'react';
import React from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  Vector3,
  Mesh,
  Box3,
  MeshStandardMaterial,
  CylinderGeometry,
  InstancedMesh,
  Object3D,
  Quaternion,
  MOUSE,
  TOUCH
} from 'three';
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
import { fetchPublicRouteNodes } from '../api/routeNodes';
import { fetchPublicRouteEdges } from '../api/routeEdges';
import { buildRouteToStore } from '../api/routes';
import { createSharedRoute } from '../api/sharedRoutes';
import { getLocalFloorModelUrl } from '../utils/floors';
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

const FLOOR_PLACEHOLDER_COLOR: Record<number, string> = {
  0: '#9BA0AB',
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

function getPointOnPolyline(points: Vector3[], totalLength: number, distance: number): Vector3 | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0].clone();
  if (distance <= 0) return points[0].clone();
  if (distance >= totalLength) return points[points.length - 1].clone();

  let traveled = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = a.distanceTo(b);
    if (distance <= traveled + segLen) {
      const t = (distance - traveled) / segLen;
      return new Vector3().lerpVectors(a, b, Math.min(t, 1));
    }
    traveled += segLen;
  }
  return points[points.length - 1].clone();
}

export function AnimatedRouteLine({
  points,
  onComplete,
  speed = 2.5,
  dashSize = 4,
}: {
  points: [number, number, number][];
  onComplete?: () => void;
  speed?: number;
  dashSize?: number;
}) {
  const markerRef = useRef<Mesh>(null);
  const progress = useRef(0);
  const completedRef = useRef(false);

  const vectors = useMemo(
    () => points.map((p) => new Vector3(p[0], p[1], p[2])),
    [points],
  );

  const DASH_LENGTH = 10;
  const GAP_LENGTH = 5;

  const totalLength = useMemo(() => {
    let len = 0;
    for (let i = 0; i < vectors.length - 1; i++) {
      len += vectors[i].distanceTo(vectors[i + 1]);
    }
    return len;
  }, [vectors]);

  const dashes = useMemo(() => {
    if (totalLength === 0 || vectors.length < 2) return [] as { a: Vector3; b: Vector3 }[];
    const step = DASH_LENGTH + GAP_LENGTH;
    const count = Math.max(1, Math.floor(totalLength / step));
    const result: { a: Vector3; b: Vector3 }[] = [];
    for (let i = 0; i < count; i++) {
      const startDist = i * step;
      const endDist = Math.min(startDist + DASH_LENGTH, totalLength);
      const a = getPointOnPolyline(vectors, totalLength, startDist);
      const b = getPointOnPolyline(vectors, totalLength, endDist);
      if (a && b) {
        result.push({ a, b });
      }
    }
    return result;
  }, [vectors, totalLength]);

  const instancedMesh = useMemo(() => {
    if (dashes.length === 0) return null;
    const radius = Math.max(0.1, dashSize);
    const geometry = new CylinderGeometry(radius, radius, 1, 12);
    const material = new MeshStandardMaterial({
      color: '#000000',
      emissive: '#000000',
      emissiveIntensity: 0.6,
    });
    const mesh = new InstancedMesh(geometry, material, dashes.length);
    mesh.count = 0;

    const dummy = new Object3D();
    const mid = new Vector3();
    const dir = new Vector3();
    const quat = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const scale = new Vector3();

    for (let i = 0; i < dashes.length; i++) {
      const { a, b } = dashes[i];
      const length = Math.max(0.01, a.distanceTo(b));
      mid.addVectors(a, b).multiplyScalar(0.5);
      dir.subVectors(b, a);
      dir.normalize();
      quat.setFromUnitVectors(up, dir);
      scale.set(1, length, 1);

      dummy.position.copy(mid);
      dummy.quaternion.copy(quat);
      dummy.scale.copy(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [dashes, dashSize]);

  useEffect(() => {
    progress.current = 0;
    completedRef.current = false;
  }, [points]);

  useFrame((_, delta) => {
    if (!instancedMesh || dashes.length === 0) return;

    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta / speed);
    }

    const visibleCount = Math.max(0, Math.min(dashes.length, Math.floor(progress.current * dashes.length)));
    if (instancedMesh.count !== visibleCount) {
      instancedMesh.count = visibleCount;
    }

    const markerDist = progress.current * totalLength;
    const markerPos = getPointOnPolyline(vectors, totalLength, markerDist);
    if (markerRef.current && markerPos) {
      markerRef.current.position.copy(markerPos);
    }

    if (progress.current >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  if (!instancedMesh) return null;

  return (
    <group>
      <primitive object={instancedMesh} />
      <mesh ref={markerRef}>
        <sphereGeometry args={[dashSize * 1.2, 16, 16]} />
        <meshStandardMaterial color="#000000" emissive="#000000" emissiveIntensity={0.6} />
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
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const center = new Vector3();
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

function MallMapHeader({
  lang,
  onLangChange,
  onOpenAdmin,
  now,
}: {
  lang: 'ru' | 'en';
  onLangChange: (next: 'ru' | 'en') => void;
  onOpenAdmin?: () => void;
  now: Date;
}) {
  return (
    <header className={styles.header}>
      <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
      <div className={styles.headerRight}>
        <div className={styles.dateTime}>
          <span className={styles.time}>{formatTime(now)}</span>
          <span className={styles.date}>{formatDate(now, lang)}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {onOpenAdmin ? (
            <button className={styles.adminBtn} type="button" onClick={onOpenAdmin}>
              Admin
            </button>
          ) : null}
          <button className={styles.langSwitch} type="button" onClick={() => onLangChange(lang === 'en' ? 'ru' : 'en')}>
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
  );
}

function FloorControls({
  floors,
  activeFloor,
  onFloorChange,
}: {
  floors: number[];
  activeFloor: number;
  onFloorChange: (floor: number) => void;
}) {
  return (
    <div className={styles.floorControls}>
      {floors.map((floor) => (
        <button
          key={floor}
          type="button"
          className={`${styles.floorBtn} ${activeFloor === floor ? styles.floorBtnActive : ''}`}
          onClick={() => onFloorChange(floor)}
          aria-pressed={activeFloor === floor}
        >
          {floor}
        </button>
      ))}
    </div>
  );
}

function ZoomControls({
  lang,
  onZoomIn,
  onZoomOut,
  onShare,
  shareLoading,
  hasRoute,
}: {
  lang: 'ru' | 'en';
  onZoomIn: () => void;
  onZoomOut: () => void;
  onShare: () => void;
  shareLoading: boolean;
  hasRoute: boolean;
}) {
  return (
    <div className={styles.zoomControls}>
      <button
        type="button"
        className={styles.qrBtn}
        aria-label={lang === 'en' ? 'Share route via QR' : 'Поделиться маршрутом через QR'}
        onClick={onShare}
        disabled={shareLoading || !hasRoute}
      >
        <img src={lang === 'en' ? qrCodeEngIcon : qrCodeIcon} alt="QR" />
      </button>
      <button type="button" className={styles.zoomBtn} aria-label="Уменьшить" onClick={onZoomOut}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" className={styles.zoomBtn} aria-label="Увеличить" onClick={onZoomIn}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function ShareQrModal({
  lang,
  shareToken,
  shareLoading,
  shareError,
  shareUrl,
  onClose,
}: {
  lang: 'ru' | 'en';
  shareToken: string | null;
  shareLoading: boolean;
  shareError: string | null;
  shareUrl: string;
  onClose: () => void;
}) {
  if (!shareToken && !shareLoading && !shareError) return null;

  return (
    <div className={styles.qrOverlay} onClick={onClose}>
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
        <button type="button" className={styles.qrModalClose} onClick={onClose}>
          {lang === 'en' ? 'Close' : 'Закрыть'}
        </button>
      </div>
    </div>
  );
}

function CameraController({ activeFloor, controlsRef, justOpened }: { activeFloor: number; controlsRef: React.RefObject<any>; justOpened?: boolean }) {
  const { camera } = useThree();
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  useEffect(() => {
    if (!justOpened) return;

    const resetCamera = () => {
      const controls = controlsRef.current;
      const cam = cameraRef.current;
      if (!controls || !cam) return;

      const y = activeFloor === 0 ? 120000 : 900;

      controls.target.set(0, 0, 0);
      cam.position.set(0, y, 0.001);
      cam.updateProjectionMatrix();

      controls.update();
    };

    const delays = [50, 150, 300, 500];
    const timeoutIds = delays.map((delay) => setTimeout(resetCamera, delay));
    return () => {
      timeoutIds.forEach(clearTimeout);
    };
  }, [activeFloor, controlsRef, justOpened]);

  return null;
}

export default function MallMap({ onOpenAdmin, widgetRefreshKey, justOpened }: { onOpenAdmin?: () => void; widgetRefreshKey?: number; justOpened?: boolean } = {}) {
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
  const controlsRef = useRef<any>(null);
  const prevZoomRef = useRef<number>(2);
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const cameraConfig = useMemo(() => {
    const y = activeFloor === 0 ? 120000 : 900;
    return {
      position: [0, y, 0.001] as [number, number, number],
      fov: 50,
      near: 0.1,
      far: 100000000,
    };
  }, [activeFloor]);

  const canvasStyle = useMemo(() => ({ background: 'transparent' }), []);

  const [routeNodes, setRouteNodes] = useState<ApiRouteNode[]>([]);
  const [routeEdges, setRouteEdges] = useState<ApiRouteEdge[]>([]);
  const [activeRoute, setActiveRoute] = useState<ApiRouteToStoreResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [showRouteToast, setShowRouteToast] = useState(false);

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
    Promise.all([fetchPublicRouteNodes(floor.id), fetchPublicRouteEdges(floor.id)])
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

    const nodesByType = new Map<string, ApiRouteNode[]>();
    for (const node of routeNodes) {
      const list = nodesByType.get(node.type) ?? [];
      list.push(node);
      nodesByType.set(node.type, list);
    }

    const typePriority: ApiRouteNode['type'][] = [
      'PANEL',
      'ENTRANCE',
      'INFO_DESK',
      'STORE_ANCHOR',
      'ROUTE_POINT',
    ];

    let startNode: ApiRouteNode | undefined;
    for (const type of typePriority) {
      const candidates = nodesByType.get(type) ?? [];
      startNode = candidates.find((n) => connectedIds.has(n.id)) ?? candidates[0];
      if (startNode) break;
    }

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
    if (justOpened) {
      prevZoomRef.current = zoom;
    }
  }, [justOpened, zoom]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) {
      prevZoomRef.current = zoom;
      return;
    }
    const ratio = zoom / prevZoomRef.current;
    if (ratio !== 1 && ratio > 0) {
      controls.dollyIn(1 / ratio);
      controls.update();
    }
    prevZoomRef.current = zoom;
  }, [zoom]);

  useLayoutEffect(() => {
    if (!justOpened) return;
    setControlsEnabled(false);

    const t = setTimeout(() => {
      setControlsEnabled(true);
    }, 500);
    return () => {
      clearTimeout(t);
    };
  }, [justOpened]);

  const localModelUrl = getLocalFloorModelUrl(activeFloor);
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
    setShowRouteToast(true);
  }, []);

  useEffect(() => {
    if (activeRoute) {
      setShowRouteToast(false);
    }
  }, [activeRoute]);

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
      <MallMapHeader
        lang={lang}
        onLangChange={setLang}
        onOpenAdmin={onOpenAdmin}
        now={now}
      />

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

        <div ref={viewportRef} className={styles.modelViewport}>
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
                key={activeFloor}
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
                  key={activeFloor}
                  ref={controlsRef}
                  makeDefault
                  target={[0, 0, 0]}
                  enabled={controlsEnabled}
                  enableDamping={false}
                  mouseButtons={{
                    LEFT: MOUSE.ROTATE,
                    MIDDLE: MOUSE.DOLLY,
                    RIGHT: MOUSE.PAN,
                  }}
                  touches={{
                    ONE: TOUCH.ROTATE,
                    TWO: TOUCH.DOLLY_PAN,
                  }}
                />
                <CameraController activeFloor={activeFloor} controlsRef={controlsRef} justOpened={justOpened} />
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

        {showRouteToast && !activeRoute && !routeLoading && !routeError ? (
          <div className={styles.routeToast}>
            Выберите магазин, чтобы построить маршрут
          </div>
        ) : null}

        <div className={styles.debugOverlay}>
          <strong>Debug</strong>
          <div>activeFloor: {activeFloor}</div>
          <div>
            camera: {(() => {
              const c = controlsRef.current;
              if (!c) return 'no controls';
              const t = c.target;
              const p = c.object?.position;
              return `pos=(${p?.x?.toFixed(1)}, ${p?.y?.toFixed(1)}, ${p?.z?.toFixed(1)}) target=(${t?.x?.toFixed(1)}, ${t?.y?.toFixed(1)}, ${t?.z?.toFixed(1)})`;
            })()}
          </div>
          <div>zoom: {zoom}</div>
          <div>modelUrl: {modelUrl ?? 'none'}</div>
          <div>metrics: {planMetrics ? `w=${planMetrics.width} h=${planMetrics.height}` : 'none'}</div>
        </div>

        <FloorControls floors={FLOORS} activeFloor={activeFloor} onFloorChange={setActiveFloor} />

        <ZoomControls
          lang={lang}
          onZoomIn={() => handleZoom(0.2)}
          onZoomOut={() => handleZoom(-0.2)}
          onShare={() => void handleShareRoute()}
          shareLoading={shareLoading}
          hasRoute={!!activeRoute}
        />
      </div>

      <ShareQrModal
        lang={lang}
        shareToken={shareToken}
        shareLoading={shareLoading}
        shareError={shareError}
        shareUrl={shareUrl}
        onClose={() => setShareToken(null)}
      />
    </div>
  );
}
