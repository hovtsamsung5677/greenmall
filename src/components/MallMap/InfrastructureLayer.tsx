import { Html } from '@react-three/drei';
import toiletIcon from '@assets/icons/туалеты.svg';
import type { ApiStore } from '@api/types';
import { INFRASTRUCTURE_BY_FLOOR } from './infrastructurePlacements';
import styles from './InfrastructureLayer.module.css';

export function InfrastructureLayer({ floor, elevation, stores, selectedStoreId, onStoreClick }: { floor: number; elevation: number; stores: ApiStore[]; selectedStoreId?: string; onStoreClick?: (store: ApiStore) => void }) {
  return <>{(INFRASTRUCTURE_BY_FLOOR[floor] ?? []).map(point => {
    const store = stores.find(item => item.slug === point.storeSlug && item.floor?.number === floor && item.isActive && item.isVisible);
    const selected = store?.id === selectedStoreId;
    return (
    <Html key={point.id} center position={[point.x - 450, elevation, point.y - 300]} zIndexRange={[31, 0]} style={{ pointerEvents: 'none' }}>
      <button className={styles.marker} type="button" aria-label={point.label} title={point.label} aria-pressed={selected} disabled={!store} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); if (store) onStoreClick?.(store); }}>
        {point.kind === 'toilet' ? <img src={toiletIcon} alt="" /> : (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {point.kind === 'stairs' ? <>
              <path d="M3 20h5v-5h5v-5h5V5h3" />
              <path d="M3 13 13 3M8 3h5v5" />
            </> : <>
              <rect x="5" y="8" width="14" height="13" rx="1.5" />
              <path d="M12 9v11M3 6V2M1 4l2-2 2 2M21 2v4m-2-2 2 2 2-2" />
            </>}
          </svg>
        )}
        {point.number != null && <span className={styles.number} aria-hidden="true">{point.number}</span>}
        <span className={styles.tooltip} aria-hidden="true">{point.label}</span>
      </button>
    </Html>
  );})}</>;
}
