import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import type { Group } from 'three';
import styles from './MallMap.module.css';

import logoGreenMall from '../assets/icons/logo2.png';
import qrCodeIcon from '../assets/icons/qr_code.png';
import qrCodeEngIcon from '../assets/icons/qr_code_eng.png';
import translatorRu from '../assets/icons/переводчик рус.svg';
import translatorEn from '../assets/icons/переводчик англ.svg';
import MallWidget from '../components/mall-widget/MallWidget';
import { fetchFloors, fetchFloorScene } from '../api/floors';
import type { ApiFloor, ApiFloorScene } from '../api/types';

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

function FloorModel({
  url,
  groupRef,
}: {
  url: string;
  groupRef?: React.RefObject<Group | null>;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.x -= center.x;
    cloned.position.z -= center.z;
    cloned.position.y -= box.min.y;
    return cloned;
  }, [gltf]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
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
  const [zoom, setZoom] = useState<number>(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [scene, setScene] = useState<ApiFloorScene | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null);
  const modelGroupRef = useRef<Group | null>(null);

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

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(2, Math.max(0.5, +(prev + delta).toFixed(2))));
  };

  const localModelUrl = LOCAL_FLOOR_MODELS[activeFloor] ?? null;
  const modelUrl = localModelUrl ?? currentModelUrl;

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
        />

        <div
          className={styles.modelViewport}
          style={{ transform: `scale(${zoom})` }}
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
          ) : modelError || canvasError ? (
            <ModelError onRetry={retryModel} />
          ) : (
            <ErrorBoundary onError={() => setModelError(true)}>
              <Canvas
                camera={{ position: [0, 1000, 0.0001], fov: 50, near: 0.1, far: 100000 }}
                style={{ background: 'transparent' }}
                onCreated={() => {
                  console.log('[Canvas] Created for', modelUrl);
                }}
              >
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 20, 10]} intensity={1.2} />
                <Suspense fallback={null}>
                  <Bounds fit clip margin={0.7}>
                    <FloorModel
                      key={modelUrl}
                      url={modelUrl}
                      groupRef={modelGroupRef}
                    />
                  </Bounds>
                </Suspense>
                <OrbitControls
                  makeDefault
                  enableRotate={false}
                  enableZoom
                  enablePan
                  minPolarAngle={0}
                  maxPolarAngle={0}
                  mouseButtons={{
                    LEFT: THREE.MOUSE.PAN,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT: THREE.MOUSE.PAN,
                  }}
                  touches={{
                    ONE: THREE.TOUCH.PAN,
                    TWO: THREE.TOUCH.DOLLY_PAN,
                  }}
                />
              </Canvas>
            </ErrorBoundary>
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
          <button type="button" className={styles.qrBtn} aria-label="QR-код">
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
    </div>
  );
}
