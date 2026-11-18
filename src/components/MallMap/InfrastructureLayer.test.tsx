import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { ApiStore } from '@api/types';
import { InfrastructureLayer } from './InfrastructureLayer';
import { INFRASTRUCTURE_BY_FLOOR } from './infrastructurePlacements';

vi.mock('@react-three/drei', () => ({ Html: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
afterEach(cleanup);

describe('infrastructure floor markers', () => {
  it('switches floors without retaining another floor’s lifts or toilets', () => {
    const { rerender } = render(<InfrastructureLayer floor={1} elevation={10} stores={[]} />);
    expect(screen.getAllByRole('button', { name: 'Туалет' })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Лифт 1' })).toBeInTheDocument();
    rerender(<InfrastructureLayer floor={4} elevation={10} stores={[]} />);
    expect(screen.getAllByRole('button', { name: 'Туалет' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Лифт 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Лифт 2' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Лестница' })).toHaveLength(1);
    rerender(<InfrastructureLayer floor={-1} elevation={10} stores={[]} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
  it('has unique visual placements within each verified plan', () => {
    for (const points of Object.values(INFRASTRUCTURE_BY_FLOOR)) {
      expect(new Set(points.map(p => p.id)).size).toBe(points.length);
      expect(new Set(points.map(p => `${p.x},${p.y}`)).size).toBe(points.length);
      for (const p of points) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(900);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(600);
      }
    }
  });
  it('opens the matching infrastructure card and exposes its selected state', () => {
    const store = { id: 'lift-store', slug: 'lift-1-floor-1', name: 'Лифт 1', floor: { number: 1 }, isActive: true, isVisible: true } as ApiStore;
    const onStoreClick = vi.fn();
    render(<InfrastructureLayer floor={1} elevation={10} stores={[store]} selectedStoreId={store.id} onStoreClick={onStoreClick} />);
    const lift = screen.getByRole('button', { name: 'Лифт 1' });
    expect(lift).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(lift);
    expect(onStoreClick).toHaveBeenCalledWith(store);
  });
});
