import { useState, useEffect, useRef, useCallback } from 'react';
import LoadingScreen from './pages/LoadingScreen';
import MallMap from './pages/MallMap';
import AdminPage from './pages/AdminPage';

const IDLE_TIMEOUT = 60000;

function App() {
  const [showMap, setShowMap] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [widgetRefreshKey, setWidgetRefreshKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setShowMap(false);
    }, IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    resetTimer();

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);

  function openAdmin() {
    setShowAdmin(true);
  }

  function closeAdmin() {
    console.log('[App] closeAdmin, current widgetRefreshKey', widgetRefreshKey);
    setShowAdmin(false);
    setWidgetRefreshKey((prev) => {
      const next = prev + 1;
      console.log('[App] widgetRefreshKey', prev, '->', next);
      return next;
    });
  }

  if (showAdmin) {
    return <AdminPage onClose={closeAdmin} />;
  }

  return showMap ? (
    <MallMap onOpenAdmin={openAdmin} widgetRefreshKey={widgetRefreshKey} />
  ) : (
    <LoadingScreen
      onContinue={() => setShowMap(true)}
      onOpenAdmin={openAdmin}
    />
  );
}

export default App;