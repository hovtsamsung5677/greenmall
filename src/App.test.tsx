import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@pages/LoadingScreen', () => ({
  default: ({ onOpenAdmin }: { onOpenAdmin: () => void }) => (
    <button onClick={onOpenAdmin}>Open admin</button>
  ),
}));

vi.mock('@pages/AdminPage', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose}>Close admin</button>
  ),
}));

describe('App navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('closes a directly opened admin page without navigating away from the app', async () => {
    window.history.replaceState({}, '', '/admin');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Close admin' }));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.getByRole('button', { name: 'Open admin' })).toBeVisible();
  });

  it('opens admin with an application history entry', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Open admin' }));

    await waitFor(() => expect(window.location.pathname).toBe('/admin'));
    expect(await screen.findByRole('button', { name: 'Close admin' })).toBeVisible();
  });
});
