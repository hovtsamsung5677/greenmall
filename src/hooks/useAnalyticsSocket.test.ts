import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';
import { useAnalyticsSocket } from './useAnalyticsSocket';

type Handler = (...args: unknown[]) => void;

const handlers = new Map<string, Handler>();
const socket = {
  on: vi.fn((event: string, handler: Handler) => {
    handlers.set(event, handler);
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(),
}));

describe('useAnalyticsSocket', () => {
  beforeEach(() => {
    handlers.clear();
    vi.clearAllMocks();
    vi.mocked(io).mockReturnValue(socket as never);
  });

  it('updates ready when the socket connects and disconnects', () => {
    const { result, unmount } = renderHook(() => useAnalyticsSocket(vi.fn()));
    expect(result.current.ready).toBe(false);

    act(() => handlers.get('connect')?.());
    expect(result.current.ready).toBe(true);

    act(() => handlers.get('disconnect')?.('transport close'));
    expect(result.current.ready).toBe(false);

    unmount();
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });

  it('uses the latest stats callback without reconnecting', () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const { rerender } = renderHook(({ callback }) => useAnalyticsSocket(callback), {
      initialProps: { callback: firstCallback },
    });

    rerender({ callback: secondCallback });
    act(() => handlers.get('statsUpdate')?.());

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledOnce();
    expect(io).toHaveBeenCalledOnce();
  });
});
