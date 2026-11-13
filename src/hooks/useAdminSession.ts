import { useEffect, useRef, useState, type FormEvent } from 'react';
import { login } from '@api/admin';
import {
  AUTH_EXPIRED_EVENT,
  clearAccessToken,
  fetchCurrentUser,
  setAccessToken,
  type AdminUser,
} from '@api/client';

interface AdminSessionOptions {
  loadData: () => Promise<void>;
  resetData: () => void;
}

export function useAdminSession({ loadData, resetData }: AdminSessionOptions) {
  const loadDataRef = useRef(loadData);
  const resetDataRef = useRef(resetData);
  loadDataRef.current = loadData;
  resetDataRef.current = resetData;

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCurrentUser()
      .then(async (currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        await loadDataRef.current();
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setError('Сессия истекла. Войдите снова.');
      setLoading(false);
      resetDataRef.current();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoginLoading(true);
    try {
      const response = await login(email, password);
      setAccessToken(response.accessToken);
      setUser(response.user);
      await loadDataRef.current();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Не удалось войти');
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    clearAccessToken();
    setUser(null);
    setPassword('');
    setError(null);
    resetDataRef.current();
  }

  return {
    user,
    loading,
    setLoading,
    email,
    setEmail,
    password,
    setPassword,
    error,
    loginLoading,
    handleLogin,
    logout,
  };
}
