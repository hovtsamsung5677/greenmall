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
      <Suspense fallback={<LoadingScreen onContinue={openMap} onOpenAdmin={openAdmin} />}>
        <RouteShareView token={shareToken} />
      </Suspense>
    );
  }

  if (isAdmin) {
    return (
      <Suspense fallback={<LoadingScreen onContinue={openMap} onOpenAdmin={openAdmin} />}>
        <AdminPage onClose={closeAdmin} />
      </Suspense>
    );
  }

  return showMap ? (
    <Suspense fallback={<LoadingScreen onContinue={openMap} onOpenAdmin={openAdmin} />}>
      <MallMap onOpenAdmin={openAdmin} widgetRefreshKey={widgetRefreshKey} justOpened={justOpened} />
    </Suspense>
  ) : (
    <LoadingScreen
      onContinue={openMap}
      onOpenAdmin={openAdmin}
    />
  );
}

export default App;
