import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiStore } from '@api/types';
import { RouteBuilderWindow } from './RouteBuilderWindow';

const stores = [
  { id: 'from', name: 'Первый магазин' },
  { id: 'to', name: 'Второй магазин' },
] as ApiStore[];

function renderBuilder(overrides: Partial<React.ComponentProps<typeof RouteBuilderWindow>> = {}) {
  const props: React.ComponentProps<typeof RouteBuilderWindow> = {
    stores,
    fromStoreId: null,
    toStoreId: null,
    error: null,
    loading: false,
    onFromChange: vi.fn(),
    onToChange: vi.fn(),
    onBuild: vi.fn(),
    ...overrides,
  };
  render(<RouteBuilderWindow {...props} />);
  return props;
}

describe('RouteBuilderWindow', () => {
  it('selects a store from the origin dropdown', () => {
    const props = renderBuilder();
    fireEvent.click(screen.getByRole('button', { name: 'Откуда' }));
    fireEvent.click(screen.getByRole('button', { name: 'Первый магазин' }));
    expect(props.onFromChange).toHaveBeenCalledWith('from');
  });

  it('enables route building only for two different stores', () => {
    const props = renderBuilder({ fromStoreId: 'from', toStoreId: 'to' });
    const buildButton = screen.getByRole('button', { name: 'Построить маршрут' });
    expect(buildButton).toBeEnabled();
    fireEvent.click(buildButton);
    expect(props.onBuild).toHaveBeenCalledOnce();
  });

  it('keeps route building disabled for the same store', () => {
    renderBuilder({ fromStoreId: 'from', toStoreId: 'from' });
    expect(screen.getByRole('button', { name: 'Построить маршрут' })).toBeDisabled();
  });
});
