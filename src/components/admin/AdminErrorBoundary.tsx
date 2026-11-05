import React from 'react';

export class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) console.error('[Admin] render error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section role="alert" style={{ padding: 24, color: '#b91c1c', whiteSpace: 'pre-wrap' }}>
        <h2>Не удалось открыть раздел администратора</h2>
        <p>{this.state.error.message}</p>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Попробовать снова
        </button>
      </section>
    );
  }
}
