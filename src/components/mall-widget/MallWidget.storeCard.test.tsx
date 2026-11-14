import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiStore } from '@api/types';
import MallWidget from './MallWidget';

vi.mock('@api/tracking', () => ({
  trackStoreSelected: vi.fn(),
  trackStoreCardViewed: vi.fn(),
  trackCategorySelected: vi.fn(),
}));
vi.mock('@api/promotions', () => ({ fetchPublicPromotions: vi.fn().mockResolvedValue([]) }));

describe('store marker card integration', () => {
  it('opens a requested card without routing, then preserves the explicit route action', async () => {
    const store = {
      id: 'magnit',
      slug: 'magnit',
      name: 'МАГНИТ',
      floor: { number: 1 },
      category: null,
    } as ApiStore;
    const onPickStore = vi.fn();
    const onCollapse = vi.fn();
    const { rerender } = render(<MallWidget open categories={[]} onPickStore={onPickStore} />);
    rerender(
      <MallWidget
        open
        categories={[]}
        onPickStore={onPickStore}
        onCollapse={onCollapse}
        storeCardRequest={{ store }}
      />,
    );
    const routeButton = await screen.findByRole('button', { name: 'Продолжить маршрут' });
    expect(screen.getByRole('heading', { name: 'МАГНИТ' })).toBeInTheDocument();
    expect(onPickStore).not.toHaveBeenCalled();
    fireEvent.click(routeButton);
    expect(onPickStore).toHaveBeenCalledWith(store);
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть' }));
    expect(onCollapse).toHaveBeenCalledOnce();
    expect(screen.queryByRole('heading', { name: 'МАГНИТ' })).not.toBeInTheDocument();
  });
});
