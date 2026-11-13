import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from '@api/admin';
import { clearAccessToken, fetchCurrentUser, setAccessToken } from '@api/client';
import { useAdminSession } from './useAdminSession';

vi.mock('@api/admin', () => ({ login: vi.fn() }));
vi.mock('@api/client', () => ({
  AUTH_EXPIRED_EVENT: 'greenmall:auth-expired',
  clearAccessToken: vi.fn(),
  fetchCurrentUser: vi.fn(),
  setAccessToken: vi.fn(),
}));

const user = { id: '1', email: 'admin@example.com', fullName: 'Admin', role: 'ADMIN' };

describe('useAdminSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restores the current session and loads admin data', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(user);
    const loadData = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminSession({ loadData, resetData: vi.fn() }));

    await waitFor(() => expect(result.current.user).toEqual(user));
    expect(loadData).toHaveBeenCalledOnce();
  });

  it('stores a token after a successful login and clears it on logout', async () => {
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('unauthorized'));
    vi.mocked(login).mockResolvedValue({ accessToken: 'token', user });
    const resetData = vi.fn();
    const { result } = renderHook(() =>
      useAdminSession({ loadData: vi.fn().mockResolvedValue(undefined), resetData }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setEmail('admin@example.com');
      result.current.setPassword('secret');
    });
    await act(async () => result.current.handleLogin({ preventDefault: vi.fn() } as never));
    expect(setAccessToken).toHaveBeenCalledWith('token');
    expect(result.current.user).toEqual(user);

    act(() => result.current.logout());
    expect(clearAccessToken).toHaveBeenCalledOnce();
    expect(resetData).toHaveBeenCalledOnce();
    expect(result.current.user).toBeNull();
  });
});
