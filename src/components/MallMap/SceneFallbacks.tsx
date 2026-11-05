import React from 'react';
import styles from '@styles/MallMap.module.css';

export function ModelError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.modelPlaceholder} style={{ backgroundColor: '#ffcccc' }} role="alert">
      <span className={styles.modelPlaceholderLabel}>Ошибка загрузки 3D-модели</span>
      <button type="button" onClick={onRetry} style={{ marginTop: 12, padding: '8px 16px' }}>
        Повторить
      </button>
    </div>
  );
}

export class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.error('[SceneErrorBoundary] 3D render error', error);
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
