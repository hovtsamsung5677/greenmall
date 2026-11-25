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
vi.mock('./StorePanoramaModal', () => ({
  default: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div role="dialog">Панорама {title}</div> : null,
}));

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

  it('shows and opens a panorama only when it is assigned to the store', async () => {
    const store = {
      id: 'panorama-store',
      slug: 'panorama-store',
      name: 'Панорамный магазин',
      floor: { id: 'floor-1', number: 1, name: '1 этаж' },
      category: null,
      panoramaAsset: { url: '/uploads/store-panorama.jpg' },
    } as ApiStore;

    const onPanoramaOpenChange = vi.fn();
    const { rerender } = render(<MallWidget open categories={[]} />);
    rerender(
      <MallWidget
        open
        categories={[]}
        storeCardRequest={{ store }}
        onPanoramaOpenChange={onPanoramaOpenChange}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: '3D-панорама' }));
    expect(onPanoramaOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('dialog')).toHaveTextContent('Панорама Панорамный магазин');
  });
});
