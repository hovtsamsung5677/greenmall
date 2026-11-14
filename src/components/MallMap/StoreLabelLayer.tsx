import { useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { ApiStore } from '@api/types';
import clothing from '@assets/icons/Одежда.svg';
import shoes from '@assets/icons/обувь.svg';
import electronics from '@assets/icons/техника.svg';
import beauty from '@assets/icons/красота и здоровье.svg';
import sport from '@assets/icons/спорт.svg';
import home from '@assets/icons/товары для дома.svg';
import cafes from '@assets/icons/кафе и рестораны.svg';
import groceries from '@assets/icons/продукты.svg';
import kids from '@assets/icons/детские товары.svg';
import entertainment from '@assets/icons/развлечения.svg';
import services from '@assets/icons/услуги.svg';
import infrastructure from '@assets/icons/инфраструктура.svg';
import atms from '@assets/icons/банкомат.svg';
import { boxesOverlap, labelCenter, projectedClearance, type LabelBox } from './firstFloorStoreLabels';
import { STORE_LABELS_BY_FLOOR } from './storeLabelPlacements';
import styles from './StoreLabelLayer.module.css';

const icons: Record<string, string> = {
  clothing, shoes, electronics, 'beauty-and-health': beauty, sport,
  'home-goods': home, 'cafes-and-restaurants': cafes, groceries,
  'kids-goods': kids, entertainment, services, infrastructure, atms,
};

export function StoreLabelLayer({ stores, floor, elevation, onStoreClick }: {
  stores: ApiStore[];
  floor: number;
  elevation: number;
  onStoreClick?: (store: ApiStore) => void;
}) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const entries = useMemo(() => (STORE_LABELS_BY_FLOOR[floor] ?? []).flatMap(placement => {
    const store = stores.find(item => item.slug === placement.slug && item.floor?.number === floor && item.isActive && item.isVisible);
    return store ? [{ placement, store, center: labelCenter(placement) }] : [];
  }).sort((a, b) => Number(a.placement.compact) - Number(b.placement.compact)), [stores, floor]);

  useFrame(({ camera, size }) => {
    const accepted: LabelBox[] = [];
    const project = (x: number, y: number) => {
      const p = new Vector3(x - 450, elevation, y - 300).project(camera);
      return { x: (p.x + 1) * size.width / 2, y: (1 - p.y) * size.height / 2, z: p.z };
    };
    const visibleIcons: LabelBox[] = [];
    const projected = entries.map(entry => {
      const { placement, center } = entry;
      const p = project(center.x, center.y);
      const [l, t, r, b] = placement.interior;
      const radius = projectedClearance(p, [project(l, t), project(r, t), project(r, b), project(l, b)]);
      const iconSize = Math.min(placement.compact ? 19 : 26, Math.floor(radius * 1.25));
      const box = { x: p.x, y: p.y, width: iconSize, height: iconSize };
      const visible = iconSize >= 9 && p.z > -1 && p.z < 1 && p.x >= 0 && p.x <= size.width && p.y >= 0 && p.y <= size.height &&
        !visibleIcons.some(other => boxesOverlap(other, box));
      if (visible) visibleIcons.push(box);
      return { ...entry, p, iconSize, visible, box };
    });
    for (const { store, p, iconSize, visible } of projected) {
      const button = buttons.current.get(store.id);
      if (!button) continue;
      const textWidth = Math.min(160, Math.max(64, store.name.length * 9 + 12));
      // Reserve two lines: uppercase Cyrillic and wide glyphs must not collide
      // with the next marker even when browser font metrics differ.
      const textHeight = 32;
      const textBox = { x: p.x, y: p.y + iconSize / 2 + 5 + textHeight / 2, width: textWidth, height: textHeight };
      const showText = visible && iconSize >= 14 &&
        !visibleIcons.some(box => boxesOverlap(box, textBox)) &&
        !accepted.some(box => boxesOverlap(box, textBox));
      button.style.visibility = visible ? 'visible' : 'hidden';
      button.style.setProperty('--store-icon-size', `${iconSize}px`);
      button.style.setProperty('--store-label-width', `${textWidth}px`);
      button.dataset.label = showText ? 'true' : 'false';
      if (showText) accepted.push(textBox);
    }
  });

  return <>{entries.map(({ store, center }) => <Html
    key={store.id} center position={[center.x - 450, elevation, center.y - 300]}
    zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}
  >
    <button
      ref={element => { if (element) buttons.current.set(store.id, element); else buttons.current.delete(store.id); }}
      className={styles.marker} type="button" aria-label={store.name} title={store.name}
      onPointerDown={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); onStoreClick?.(store); }}
    >
      {store.category && icons[store.category.slug]
        ? <img src={icons[store.category.slug]} alt="" draggable={false} />
        : <span className={styles.neutral} aria-hidden="true">●</span>}
      <span className={styles.name}>{store.name}</span>
    </button>
  </Html>)}</>;
}
