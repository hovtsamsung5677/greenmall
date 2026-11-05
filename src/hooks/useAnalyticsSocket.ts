import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN } from '@api/env';

/**
 * Opens a WebSocket (socket.io) connection to the `analytics` namespace and
 * invokes `onStatsUpdate` every time the server broadcasts a `statsUpdate`
 * event — i.e. whenever a new analytics event is persisted on the backend.
 *
 * The hook handles:
 *  - automatic (re)connection;
 *  - cleanup on unmount.
 *
 * Usage:
 *   const { ready } = useAnalyticsSocket(() => refetchAllStats());
 */
export function useAnalyticsSocket(onStatsUpdate: () => void): { ready: boolean } {
  const callbackRef = useRef(onStatsUpdate);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  useEffect(() => {
    const socket = io(`${API_ORIGIN}/analytics`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setReady(true);
      // optional: emit a ping to confirm the channel is live
      socket.emit('ping');
    });

    socket.on('pong', () => {
      // channel is live
    });

    socket.on('statsUpdate', () => {
      callbackRef.current();
    });

    socket.on('disconnect', (reason) => {
      setReady(false);
      // socket.io auto-reconnects by default; just log if needed
      void reason;
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { ready };
}
