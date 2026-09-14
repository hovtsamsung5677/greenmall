import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import LoadingScreen from './pages/LoadingScreen';

const MallMap = lazy(() => import('./pages/MallMap'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const RouteShareView = lazy(() => import('./pages/RouteShareView'));

const IDLE_TIMEOUT = 60000;

function getRouteTokenFromHash(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  const match = /^\/route\/([A-Za-z0-9]+)$/.exec(hash);
  return match ? match[1] : null;
}

function RouteLoadingSplash() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f3f4d7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '4px solid rgba(122, 143, 20, 0.2)',
          borderTopColor: '#7A8F14',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function App() {
  const [showMap, setShowMap] = useState(false);
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0);
  const [shareToken, setShareToken] = useState<string | null>(
    () => getRouteTokenFromHash(),
  );
  const [isAdmin, setIsAdmin] = useState(() => window.location.pathname === '/admin');
  const [justOpened, setJustOpened] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setShowMap(false);
      setJustOpened(false);
    }, IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    resetTimer();

    const onHashChange = () => {
      setShareToken(getRouteTokenFromHash());
    };

    const onPopState = () => {
      setIsAdmin(window.location.pathname === '/admin');
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onPopState);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onPopState);
    };
  }, [resetTimer]);

  // Prefetch: пока пользователь читает LoadingScreen, браузер в фоне
  // скачивает MallMap + three.js (311 kB gzip). К моменту тапа чанки
  // уже в кеше, и Suspense разрешается мгновенно — без видимой задержки.
  useEffect(() => {
    void import('./pages/MallMap');
  }, []);

  function openAdmin() {
    window.history.pushState({}, '', '/admin');
    setIsAdmin(true);
  }

  function openMap() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setShowMap(true);
    setJustOpened(true);
  }

  function closeAdmin() {
    console.log('[App] closeAdmin, current widgetRefreshKey', widgetRefreshKey);
    window.history.back();
    setWidgetRefreshKey((prev) => {
      const next = prev + 1;
      console.log('[App] widgetRefreshKey', prev, '->', next);
      return next;
    });
  }

  if (shareToken) {
    return (
      <Suspense fallback={<RouteLoadingSplash />}>
        <RouteShareView token={shareToken} />
      </Suspense>
    );
  }

  if (isAdmin) {
    return (
      <Suspense fallback={<RouteLoadingSplash />}>
        <AdminPage onClose={closeAdmin} />
      </Suspense>
    );
  }

  return showMap ? (
    <Suspense fallback={<RouteLoadingSplash />}>
      <MallMap
        onOpenAdmin={openAdmin}
        widgetRefreshKey={widgetRefreshKey}
        justOpened={justOpened}
      />
    </Suspense>
  ) : (
    <LoadingScreen onContinue={openMap} onOpenAdmin={openAdmin} />
  );
}

export default App;
