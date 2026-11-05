import { useState } from 'react';
import type { ApiStore } from '@api/types';
import styles from '@styles/MallMap.module.css';

export interface RouteBuilderWindowProps {
  stores: ApiStore[];
  fromStoreId: string | null;
  toStoreId: string | null;
  error: string | null;
  loading: boolean;
  onFromChange: (id: string | null) => void;
  onToChange: (id: string | null) => void;
  onBuild: () => void;
}

export function RouteBuilderWindow({
  stores,
  fromStoreId,
  toStoreId,
  error,
  loading,
  onFromChange,
  onToChange,
  onBuild,
}: RouteBuilderWindowProps) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const fromName = stores.find((store) => store.id === fromStoreId)?.name ?? 'Откуда';
  const toName = stores.find((store) => store.id === toStoreId)?.name ?? 'Куда';
  const buildDisabled = !fromStoreId || !toStoreId || fromStoreId === toStoreId || loading;

  function renderStoreOptions(
    selectedId: string | null,
    onSelect: (id: string | null) => void,
    close: () => void,
  ) {
    if (!stores.length) {
      return <div className={styles.routeBuilderDropdownItem}>Нет магазинов</div>;
    }
    return stores.map((store) => (
      <button
        key={store.id}
        type="button"
        className={`${styles.routeBuilderDropdownItem} ${
          store.id === selectedId ? styles.routeBuilderDropdownItemSelected : ''
        }`}
        onClick={() => {
          onSelect(store.id);
          close();
        }}
      >
        {store.name}
      </button>
    ));
  }

  return (
    <div className={styles.routeBuilderWindow}>
      <div className={styles.routeBuilderHeader}>
        <span className={styles.routeBuilderTitle}>Маршрут между магазинами</span>
      </div>
      <div className={styles.routeBuilderSelects}>
        <div className={styles.routeBuilderDropdown}>
          <button
            type="button"
            className={styles.routeBuilderSelect}
            onClick={() => setFromOpen((open) => !open)}
            aria-expanded={fromOpen}
            aria-controls="route-from-options"
            aria-haspopup="listbox"
          >
            {fromName}
          </button>
          {fromOpen ? (
            <div id="route-from-options" className={styles.routeBuilderDropdownList} role="listbox">
              {renderStoreOptions(fromStoreId, onFromChange, () => setFromOpen(false))}
            </div>
          ) : null}
        </div>
        <div className={styles.routeBuilderDropdown}>
          <button
            type="button"
            className={styles.routeBuilderSelect}
            onClick={() => setToOpen((open) => !open)}
            aria-expanded={toOpen}
            aria-controls="route-to-options"
            aria-haspopup="listbox"
          >
            {toName}
          </button>
          {toOpen ? (
            <div id="route-to-options" className={styles.routeBuilderDropdownList} role="listbox">
              {renderStoreOptions(toStoreId, onToChange, () => setToOpen(false))}
            </div>
          ) : null}
        </div>
      </div>
      {error ? <div className={styles.routeBuilderError} role="alert">{error}</div> : null}
      <button
        type="button"
        className={styles.routeBuilderBuild}
        onClick={onBuild}
        disabled={buildDisabled}
      >
        {loading ? 'Построение…' : 'Построить маршрут'}
      </button>
    </div>
  );
}
