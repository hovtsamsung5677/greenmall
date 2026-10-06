import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import styles from '@styles/MallMap.module.css';

import logoGreenMall from '@assets/icons/logo2.webp';
import qrCodeIcon from '@assets/icons/qr_code.webp';
import qrCodeEngIcon from '@assets/icons/qr_code_eng.webp';
import translatorRu from '@assets/icons/переводчик рус.svg';
import translatorEn from '@assets/icons/переводчик англ.svg';
import MallWidget from '@components/mall-widget/MallWidget';
import { fetchPublicRouteNodes } from '@api/routeNodes';
import { fetchPublicRouteEdges } from '@api/routeEdges';
import { buildRouteToStore } from '@api/routes';
import { createSharedRoute } from '@api/sharedRoutes';
import { fetchActiveHeaderBanner, type HeaderBanner } from '@api/headerBanners';
import { resolveAssetUrl } from '@api/fileAssets';
import { fetchFloorScene } from '@api/floors';
import { useFloorScene } from '@hooks/useFloorScene';
import { buildShareUrl, isUnreachableFromPhone } from '@utils/shareUrl';
import { resolveModelUrl } from '@utils/floors';
import type {
  ApiRouteNode,
  ApiRouteEdge,
  ApiRouteToStoreResponse,
} from '@api/types';

import { useCachedGLTF, clearGLTFCache } from '@components/MallMap/gltfCache';
import { SceneCanvas, makeCameraConfig, type CameraConfig } from '@components/MallMap/SceneCanvas';
import { makePlanToScene } from '@components/MallMap/FloorScene';
import type { PlanMetrics, UpwardShaft } from '@components/MallMap/FloorScene';

// === Реэкспорт для обратной совместимости (RouteSharePreview и др.) ===
export { FloorScene, AnimatedRouteLine } from '@components/MallMap/FloorScene';
export type { PlanMetrics } from '@components/MallMap/FloorScene';

// Расстояние между этажами при переходе, доля от габарита этажа. Задаёт и
// скорость «уезда» модели из кадра, и высоту вертикальной шахты лифта.
const FLOOR_GAP_RATIO = 0.25;

// Общая длительность перехода между этажами (с). Используется и для
// анимации камеры сверху→сбоку→сверху, и для таймаута страховки.
const TRANSFER_DURATION = 1.5;

const TRANSFER_TYPE_LABELS: Record<string, { ru: string; en: string }> = {
  ELEVATOR: { ru: 'Подъём на лифте', en: 'Elevator' },
  ESCALATOR: { ru: 'Подъём по эскалатору', en: 'Escalator' },
  STAIRS: { ru: 'Подъём по лестнице', en: 'Stairs' },
};

// ==================== Константы и утилиты ====================

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

const FLOOR_PLACEHOLDER_COLOR: Record<number, string> = {
  0: '#9BA0AB',
  1: '#9BA0AB',
  2: '#8B93A6',
  3: '#A3907C',
  4: '#7C97A3',
};

// Включите для диагностики: покажет оси X/Y/Z в начале координат.
const DEBUG_3D = false;

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

// ==================== Мелкие UI-компоненты ====================

function MallMapHeader({
  lang, onLangChange, onOpenAdmin, now, banner,
}: {
  lang: 'ru' | 'en';
  onLangChange: (next: 'ru' | 'en') => void;
  onOpenAdmin?: () => void;
  now: Date;
  banner: HeaderBanner | null;
}) {
  return (
    <header className={styles.header}>
      <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
      {banner && banner.asset ? (
        <div className={styles.headerBanner}>
          <img
            src={resolveAssetUrl(banner.asset.url)}
            alt={banner.title}
            className={styles.headerBannerImage}
            onClick={() => {
              if (banner.linkUrl) {
                window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            style={{ cursor: banner.linkUrl ? 'pointer' : 'default' }}
          />
        </div>
      ) : null}
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
          <button
            className={styles.langSwitch}
            type="button"
            onClick={() => onLangChange(lang === 'en' ? 'ru' : 'en')}
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
  );
}

function FloorControls({
  floors, activeFloor, onFloorChange,
}: {
  floors: number[]; activeFloor: number; onFloorChange: (floor: number) => void;
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
  lang, onZoomIn, onZoomOut, onShare, shareLoading, hasRoute,
}: {
  lang: 'ru' | 'en';
  onZoomIn: () => void; onZoomOut: () => void; onShare: () => void;
  shareLoading: boolean; hasRoute: boolean;
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
  lang, shareToken, shareLoading, shareError, shareUrl, onClose,
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
              {isUnreachableFromPhone(shareUrl) ? (
                <p className={styles.qrModalError}>
                  QR-код ведёт на loopback-адрес и с телефона не откроется. Откройте карту на
                  компьютере по LAN-адресу вида {'http://<ip-компьютера>:5173'} и постройте
                  маршрут заново.
                </p>
              ) : (
                <div className={styles.qrCodeBox}>
                  <QRCodeSVG value={shareUrl} size={300} level="M" />
                </div>
              )}
            <p className={styles.qrModalHint}>
              Если камера не открывает ссылку — введите вручную: <code>{shareUrl}</code>
            </p>
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

function ModelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.modelPlaceholder} style={{ backgroundColor: '#ffcccc' }}>
      <span className={styles.modelPlaceholderLabel}>Ошибка загрузки 3D-модели</span>
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
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ==================== MallMap ====================

export default function MallMap({
  onOpenAdmin,
  widgetRefreshKey,
  justOpened,
}: {
  onOpenAdmin?: () => void;
  widgetRefreshKey?: number;
  justOpened?: boolean;
} = {}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(timer);
  }, []);

  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(2);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [canvasError, setCanvasError] = useState(false);
  const [headerBanner, setHeaderBanner] = useState<HeaderBanner | null>(null);

  const {
    floors,
    floorsError,
    scene,
    sceneError,
    loading,
    modelUrl,
    retry,
  } = useFloorScene(activeFloor);

  const controlsRef = useRef<any>(null);
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Флаг: Canvas уже был успешно показан хотя бы раз — больше не размонтируем.
  const [canvasReady, setCanvasReady] = useState(false);

  // Ключ Canvas. Инкрементируется при потере WebGL-контекста (например, после AFK),
  // чтобы React полностью пересоздал Canvas с новым контекстом. Модель мгновенно
  // отрисуется из gltfPromiseCache.
  const [canvasKey, setCanvasKey] = useState(0);

  const cameraConfig: CameraConfig = useMemo(() => makeCameraConfig(activeFloor), [activeFloor]);
  const canvasStyle = useMemo(() => ({ background: 'transparent' }), []);
  const floorNumbers = useMemo(() => [...floors].sort((a, b) => a.number - b.number).map((f) => f.number), [floors]);

  useEffect(() => {
    if (!floors.length) return;
    if (!floors.some((f) => f.number === activeFloor)) {
      setActiveFloor(floors[0].number);
    }
  }, [floors, activeFloor]);

  const [routeNodes, setRouteNodes] = useState<ApiRouteNode[]>([]);
  const [routeEdges, setRouteEdges] = useState<ApiRouteEdge[]>([]);
  const [activeRoute, setActiveRoute] = useState<ApiRouteToStoreResponse | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showRouteToast, setShowRouteToast] = useState(false);

  // Этаж, на который идёт посетитель прямо сейчас. null — перехода нет.
  const [transferTarget, setTransferTarget] = useState<number | null>(null);

  // ---------- загрузка данных ----------

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

  useEffect(() => {
    fetchActiveHeaderBanner()
      .then(setHeaderBanner)
      .catch(() => setHeaderBanner(null));
  }, []);

  // ---------- межэтажный переход ----------

  // Этаж, на который маршрут уйдёт дальше с текущего. По нему модель
  // следующего этажа начинает грузиться заранее — задолго до того, как
  // посетитель дойдёт до лифта, иначе в момент перехода был бы кадр-заглушка.
  const nextFloorNumber = useMemo(() => {
    const change = activeRoute?.floorChanges?.find((c) => c.fromFloor === activeFloor);
    return change?.toFloor ?? null;
  }, [activeRoute, activeFloor]);

  const nextFloorId = useMemo(
    () => floors.find((f) => f.number === nextFloorNumber)?.id ?? null,
    [floors, nextFloorNumber],
  );

  const nextSceneQuery = useQuery({
    queryKey: ['floorScene', nextFloorId],
    queryFn: () => fetchFloorScene(nextFloorId!),
    enabled: !!nextFloorId,
  });

  const nextModelUrl = useMemo(() => {
    if (nextFloorNumber == null) return null;
    return resolveModelUrl(nextFloorNumber, nextSceneQuery.data?.floor.modelAsset?.url ?? null);
  }, [nextFloorNumber, nextSceneQuery.data]);

  const { gltf: nextGltf } = useCachedGLTF(nextModelUrl);

  // Геометрия перехода: вертикальная шахта от конца линии текущего этажа
  // к началу линии следующего. Обе точки считаются в системе координат
  // плана своего этажа — так же, как это делает сам маршрут.
  const transferPlan = useMemo(() => {
    if (transferTarget == null || !activeRoute) return null;
    const direction = transferTarget > activeFloor ? 'up' : 'down';

    const fromFloorData = floors.find((f) => f.number === activeFloor);
    const toFloorData = floors.find((f) => f.number === transferTarget);
    if (!fromFloorData || !toFloorData) return null;

    const fromMetrics: PlanMetrics = {
      width: fromFloorData.width ?? 900,
      height: fromFloorData.height ?? 600,
    };
    const toMetrics: PlanMetrics = {
      width: toFloorData.width ?? 900,
      height: toFloorData.height ?? 600,
    };

    const fromSegment = (activeRoute.segments ?? []).find(
      (s) => s.floorNumber === activeFloor,
    );
    const toSegment = (activeRoute.segments ?? []).find(
      (s) => s.floorNumber === transferTarget,
    );
    const fromPoint = fromSegment?.points[fromSegment.points.length - 1];
    const toPoint = toSegment?.points[0];
    if (!fromPoint || !toPoint) return null;

    const gap =
      Math.max(
        fromMetrics.width,
        fromMetrics.height,
        toMetrics.width,
        toMetrics.height,
      ) * FLOOR_GAP_RATIO;

    const shaft: UpwardShaft = {
      fromPoint: makePlanToScene(fromMetrics)(fromPoint),
      toPoint: makePlanToScene(toMetrics)(toPoint),
      gap,
      direction: direction,
      duration: TRANSFER_DURATION * 0.7,
    };

    return { gap, nextMetrics: toMetrics, shaft, direction };
  }, [transferTarget, activeFloor, floors, activeRoute]);

  // Переход стартует только когда следующая модель уже в памяти — иначе во
  // время движения этажей в кадре мигала бы пустота.
  const transfer = useMemo(() => {
    if (!transferPlan || !nextGltf) return null;
    return {
      gap: transferPlan.gap,
      duration: TRANSFER_DURATION,
      direction: transferPlan.direction as 'up' | 'down',
      onComplete: handleTransferComplete,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferPlan, nextGltf, transferTarget]);

  function handleReachTransfer(nextFloor: number) {
    setTransferTarget(nextFloor);
  }

  function handleTransferComplete() {
    const target = transferTarget;
    setTransferTarget(null);
    if (target != null) setActiveFloor(target);
  }

  function handleFloorChange(floor: number) {
    if (floor === activeFloor) return;
    setTransferTarget(null);
    setActiveFloor(floor);
  }

  useEffect(() => {
    if (!activeRoute) setTransferTarget(null);
  }, [activeRoute]);

  // Страховка: если следующая модель так и не загрузилась или в маршруте нет
  // сегмента целевого этажа, переход не запустится — тогда просто меняем этаж
  // без анимации, чтобы посетитель не остался намертво на текущем.
  useEffect(() => {
    if (transferTarget == null || transfer) return;
    const timer = setTimeout(() => {
      const target = transferTarget;
      setTransferTarget(null);
      if (target != null) setActiveFloor(target);
    }, TRANSFER_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [transferTarget, transfer]);

  // ---------- построение маршрута ----------

  async function handleBuildRouteToStore(storeSlug: string) {
    console.log('[MallMap] handleBuildRouteToStore', {
      activeFloor,
      floorsCount: floors.length,
      routeNodesCount: routeNodes.length,
      routeEdgesCount: routeEdges.length,
      storeSlug,
    });
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
      routeNodes.find((n) => n.type === 'PANEL') ??
      routeNodes.find((n) => n.type === 'ENTRANCE' && connectedIds.has(n.id)) ??
      routeNodes.find((n) => n.type === 'ENTRANCE') ??
      routeNodes.find((n) => n.type === 'INFO_DESK' && connectedIds.has(n.id)) ??
      routeNodes.find((n) => n.type === 'INFO_DESK') ??
      routeNodes.find((n) => n.type === 'STORE_ANCHOR' && connectedIds.has(n.id)) ??
      routeNodes.find((n) => n.type === 'STORE_ANCHOR') ??
      routeNodes.find((n) => n.type === 'ROUTE_POINT' && connectedIds.has(n.id)) ??
      routeNodes.find((n) => n.type === 'ROUTE_POINT');

    console.log('[MallMap] startNode', {
      found: Boolean(startNode),
      startNodeId: startNode?.id,
      startNodeType: startNode?.type,
    });

    if (!startNode) {
      setRouteError('Не найден вход/панель/точка на текущем этаже');
      return;
    }

    setRouteLoading(true);
    setRouteError(null);
    setActiveRoute(null);
    try {
      const route = await buildRouteToStore({
        fromNodeId: startNode.id,
        storeSlug,
      });
      console.log('[MallMap] buildRouteToStore resolved', {
        routePathLength: route.routePath.length,
        segmentsCount: route.segments?.length,
        floorChangesCount: route.floorChanges?.length,
        instructionsCount: route.instructions?.length,
      });
      setActiveRoute(route);
    } catch (err) {
      console.log('[MallMap] buildRouteToStore failed', err);
      setActiveRoute(null);
      setRouteError(err instanceof Error ? err.message : 'Не удалось построить маршрут');
    } finally {
      setRouteLoading(false);
     }
   }

 // ---------- зум ----------

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(3, Math.max(0.4, +(prev + delta).toFixed(2))));
  };

  // ---------- шаринг ----------

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

  const shareUrl = useMemo(
    () => (shareToken ? buildShareUrl(shareToken) : ''),
    [shareToken],
  );

  // ---------- включение контролов после открытия ----------

  useLayoutEffect(() => {
    if (!justOpened) return;
    setControlsEnabled(false);
    const t = setTimeout(() => setControlsEnabled(true), 500);
    return () => clearTimeout(t);
  }, [justOpened]);

  // ---------- модель ----------

  const { gltf, loading: gltfLoading, error: gltfError } = useCachedGLTF(modelUrl);

  useEffect(() => {
    if (gltf && !canvasReady) setCanvasReady(true);
  }, [gltf, canvasReady]);

  const planMetrics: PlanMetrics | null = useMemo(() => {
    const floor = floors.find((f) => f.number === activeFloor);
    if (!floor) return null;
    return {
      width: floor.width ?? 900,
      height: floor.height ?? 600,
    };
  }, [floors, activeFloor]);

  useEffect(() => setShowRouteToast(true), []);
  useEffect(() => {
    if (activeRoute) setShowRouteToast(false);
  }, [activeRoute]);

  const retryModel = () => {
    setModelError(false);
    setCanvasError(false);
    if (modelUrl) clearGLTFCache(modelUrl);
  };

  const retryFloors = () => {
    retry();
  };

  const retryScene = () => {
    retry();
  };

  // ---------- рендер вьюпорта ----------

  let viewport: React.ReactNode;
  if (!modelUrl) {
    viewport = (
      <div
        className={styles.modelPlaceholder}
        style={{ backgroundColor: FLOOR_PLACEHOLDER_COLOR[activeFloor] }}
      >
        <span className={styles.modelPlaceholderLabel}>
          {`3D-модель · этаж ${activeFloor}`}
        </span>
      </div>
    );
  } else if (gltfError || modelError || canvasError) {
    viewport = <ModelError onRetry={retryModel} />;
  } else if (!canvasReady && !gltf && !transfer) {
    viewport = (
      <div
        className={styles.modelPlaceholder}
        style={{ backgroundColor: FLOOR_PLACEHOLDER_COLOR[activeFloor] }}
      >
        <span className={styles.modelPlaceholderLabel}>
          {`3D-модель · этаж ${activeFloor}`}
        </span>
      </div>
    );
  } else {
    viewport = (
      <ErrorBoundary onError={() => setCanvasError(true)}>
        <SceneCanvas
          key={canvasKey}
          gltf={gltf}
          nextGltf={nextGltf}
          metrics={planMetrics}
          nextMetrics={transferPlan?.nextMetrics ?? planMetrics}
          route={activeRoute}
          activeFloor={activeFloor}
          transfer={transfer}
          shaft={transferPlan?.shaft ?? null}
          onReachTransfer={handleReachTransfer}
          onTransferComplete={handleTransferComplete}
          controlsRef={controlsRef}
          controlsEnabled={controlsEnabled}
          cameraConfig={cameraConfig}
          canvasStyle={canvasStyle}
          justOpened={justOpened}
          zoom={zoom}
          debug={DEBUG_3D}
          onContextLost={() => {
            setCanvasKey((k) => k + 1);
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className={styles.page}>
      <MallMapHeader lang={lang} onLangChange={setLang} onOpenAdmin={onOpenAdmin} now={now} banner={headerBanner} />

      <div className={styles.mapArea}>
        <MallWidget
          key={widgetRefreshKey}
          open={filtersOpen}
          lang={lang}
          refreshKey={widgetRefreshKey}
          onExpand={() => setFiltersOpen(true)}
          onCollapse={() => setFiltersOpen(false)}
          onPickStore={(store) => {
            if (store?.slug) void handleBuildRouteToStore(store.slug);
          }}
        />

        <div ref={viewportRef} className={styles.modelViewport}>
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
          ) : (
            viewport
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

        {transferTarget != null ? (
          <div className={styles.transferOverlay}>
            <span className={styles.transferOverlayBadge} />
            <span className={styles.transferOverlayTitle}>
              {lang === 'en'
                ? `Floor ${transferTarget}`
                : `Переход на ${transferTarget}-й этаж`}
            </span>
            <span className={styles.transferOverlayHint}>
              {(() => {
                const type = activeRoute?.floorChanges?.find(
                  (c) => c.fromFloor === activeFloor && c.toFloor === transferTarget,
                )?.type;
                const labels = type ? TRANSFER_TYPE_LABELS[type] : null;
                return labels
                  ? labels[lang]
                  : lang === 'en'
                    ? 'Changing floors'
                    : 'Смена этажа';
              })()}
            </span>
          </div>
        ) : null}

        <FloorControls floors={floorNumbers} activeFloor={activeFloor} onFloorChange={handleFloorChange} />

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
