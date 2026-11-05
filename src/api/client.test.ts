import { beforeEach, describe, expect, it } from 'vitest';
import { ApiError, clearAccessToken, getAccessToken, setAccessToken, toApiError } from './client';

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

describe('API error normalization', () => {
  it('preserves safe validation messages and structured details', () => {
    const details = {
      statusCode: 400,
      message: ['Название обязательно', 'Slug уже используется'],
      code: 'VALIDATION_ERROR',
    };
    const error = toApiError({
      isAxiosError: true,
      response: { status: 400, data: details },
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Название обязательно. Slug уже используется');
    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toBe(details);
  });

  it('does not expose internal server errors to the user', () => {
    const error = toApiError({
      isAxiosError: true,
      response: {
        status: 500,
        data: { message: 'Prisma connection failed at db.internal:5432' },
      },
    });

    expect(error.message).toBe('Сервис временно недоступен. Попробуйте позже.');
    expect(error.message).not.toContain('Prisma');
  });

  it('returns a clear message for network failures', () => {
    const error = toApiError({ isAxiosError: true, request: {} });

    expect(error.status).toBeNull();
    expect(error.message).toBe('Не удалось связаться с сервером. Проверьте подключение к сети.');
  });
});
