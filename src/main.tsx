import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '@/App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function showFatalError(message: string, stack?: string) {
  const existing = document.getElementById('fatal-error-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'fatal-error-banner';
  banner.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:#1f2937;color:#fca5a5;padding:24px;font-family:monospace;font-size:13px;white-space:pre-wrap;overflow:auto;';
  banner.textContent = `Критическая ошибка:\n${message}\n\n${stack ?? ''}`;
  document.body.appendChild(banner);
}

window.addEventListener('error', (e) => {
  showFatalError(e.message, e.error?.stack);
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason as { message?: string; stack?: string } | undefined;
  showFatalError(reason?.message ?? String(e.reason), reason?.stack);
});

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
