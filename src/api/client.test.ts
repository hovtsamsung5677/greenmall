import { beforeEach, describe, expect, it } from 'vitest';
import { clearAccessToken, getAccessToken, setAccessToken } from './client';

describe('admin access token storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes the persisted token on logout', () => {
    setAccessToken('secret-token');
    expect(getAccessToken()).toBe('secret-token');

    clearAccessToken();

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('greenmall_admin')).toBeNull();
  });
});
