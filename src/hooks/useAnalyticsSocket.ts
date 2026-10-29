import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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
  const socketRef = useRef<Socket | null>(null);
  const callbackRef = useRef(onStatsUpdate);

  // always call latest callback without re-creating the socket
  callbackRef.current = onStatsUpdate;

  useEffect(() => {
    const socket = io(`${API_ORIGIN}/analytics`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
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
      // socket.io auto-reconnects by default; just log if needed
      void reason;
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ready: socketRef.current?.connected ?? false };
}
