import { useState, useEffect, useRef, useCallback } from 'react';
import LoadingScreen from './pages/LoadingScreen';
import MallMap from './pages/MallMap';
import AdminPage from './pages/AdminPage';

const IDLE_TIMEOUT = 60000;

function App() {
  const [showMap, setShowMap] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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

  if (showAdmin) {
    return <AdminPage />;
  }

  return showMap ? (
    <MallMap onOpenAdmin={() => setShowAdmin(true)} />
  ) : (
    <LoadingScreen
      onContinue={() => setShowMap(true)}
      onOpenAdmin={() => setShowAdmin(true)}
    />
  );
}

export default App;