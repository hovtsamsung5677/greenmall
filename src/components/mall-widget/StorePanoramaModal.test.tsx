import { render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StorePanoramaModal from './StorePanoramaModal';

const texture = vi.hoisted(() => ({ colorSpace: '' }));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: PropsWithChildren) => <div data-testid="panorama-canvas">{children}</div>,
}));

vi.mock('@react-three/drei', () => ({
  useTexture: () => texture,
  OrbitControls: () => null,
}));

class SuccessfulImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe('StorePanoramaModal', () => {
  const originalImage = window.Image;

  beforeEach(() => {
    window.Image = SuccessfulImage as unknown as typeof Image;
  });

  afterEach(() => {
    window.Image = originalImage;
  });

  it('does not restart loading when the parent supplies a new close callback', async () => {
    const { rerender } = render(
      <StorePanoramaModal
        open
        title="МАГНИТ"
        imageUrl="/uploads/panorama.jpg"
        onClose={() => undefined}
      />,
    );

    await waitFor(() => expect(screen.queryByText('Загрузка панорамы…')).not.toBeInTheDocument());
    expect(screen.getByTestId('panorama-canvas')).toBeInTheDocument();

    rerender(
      <StorePanoramaModal
        open
        title="МАГНИТ"
        imageUrl="/uploads/panorama.jpg"
        onClose={() => undefined}
      />,
    );

    expect(screen.queryByText('Загрузка панорамы…')).not.toBeInTheDocument();
  });
});
