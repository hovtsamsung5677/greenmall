import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchFloors, fetchFloorScene } from '@api/floors';
import { resolveModelUrl } from '@utils/floors';
import {
  fetchAdminFloorIcons,
  createFloorIcon,
  updateFloorIcon,
  deleteFloorIcon,
} from '@api/floorIcons';
import { uploadFileAsset, resolveAssetUrl } from '@api/fileAssets';
import { fetchAdminStores } from '@api/admin';
import type { ApiFloor, ApiFloorIcon, ApiStore } from '@api/types';
import FloorIconEditor3D, {
  type FloorIconEditorMode,
} from './FloorIconEditor3D';
import type { FloorIconLayerMetrics } from '@components/MallMap/FloorIconLayer';
import styles from '@styles/FloorIconsTab.module.css';

interface IconDraft {
  name: string;
  assetId: string;
  assetUrl: string;
  sizePct: number;
  rotationDeg: number;
  storeId: string;
}

const emptyDraft: IconDraft = {
  name: '',
  assetId: '',
  assetUrl: '',
  sizePct: 5,
  rotationDeg: 0,
  storeId: '',
};

const SIZE_MIN_PCT = 1;
const SIZE_MAX_PCT = 30;

/** Приводит размер/поворот к диапазонам слайдеров: в БД могут лежать
 *  «странные» значения от старых тестов, слайдер не должен ломаться. */
function clampDraft(draft: IconDraft): IconDraft {
  return {
    ...draft,
    sizePct: Math.min(
      SIZE_MAX_PCT,
      Math.max(SIZE_MIN_PCT, Math.round(draft.sizePct)),
    ),
    rotationDeg: ((Math.round(draft.rotationDeg) % 360) + 360) % 360,
  };
}

const MODE_LABELS: Record<FloorIconEditorMode, string> = {
  select: 'Выбрать',
  place: '+ Иконка',
  move: 'Переместить',
};

export default function FloorIconsTab() {
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [floorId, setFloorId] = useState('');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [icons, setIcons] = useState<ApiFloorIcon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<FloorIconEditorMode>('place');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<IconDraft>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchFloors()
      .then((list) => {
        const active = list.filter((f) => f.isActive);
        setFloors(active.length ? active : list);
        const first = (active.length ? active : list)[0];
        if (first) setFloorId(first.id);
      })
      .catch(() => setError('Не удалось загрузить этажи'));
  }, []);

  const loadIcons = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const list = await fetchAdminFloorIcons(id);
      setIcons(list);
      setSelectedId(null);
      setDraft(emptyDraft);
    } catch {
      setError('Не удалось загрузить иконки этажа');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!floorId) return;
    void loadIcons(floorId);
  }, [floorId, loadIcons]);

  useEffect(() => {
    if (!floorId) return;
    let cancelled = false;
    const floor = floors.find((f) => f.id === floorId);
    setModelUrl(null);
    fetchFloorScene(floorId)
      .then((scene) => {
        if (cancelled) return;
        const url = scene.floor.modelAsset?.url ?? scene.floor.mapAsset?.url ?? null;
        setModelUrl(resolveModelUrl(floor?.number, url));
      })
      .catch(() => {
        if (!cancelled) setModelUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [floorId, floors]);

  useEffect(() => {
    fetchAdminStores()
      .then(setStores)
      .catch(() => setStores([]));
  }, []);

  const metrics = useMemo<FloorIconLayerMetrics | null>(() => {
    const floor = floors.find((f) => f.id === floorId);
    if (!floor) return null;
    return { width: floor.width ?? 900, height: floor.height ?? 600 };
  }, [floors, floorId]);

  const floorIcons = useMemo(
    () => icons.filter((i) => i.floorId === floorId),
    [icons, floorId],
  );

  const selectedIcon = useMemo(
    () => floorIcons.find((i) => i.id === selectedId) ?? null,
    [floorIcons, selectedId],
  );

  useEffect(() => {
    if (selectedIcon) {
      setDraft(
        clampDraft({
          name: selectedIcon.name,
          assetId: selectedIcon.assetId,
          assetUrl: selectedIcon.asset?.url ?? '',
          sizePct: Math.round((selectedIcon.scaleX || 0.05) * 100),
          rotationDeg: selectedIcon.rotation ?? 0,
          storeId: selectedIcon.storeId ?? '',
        }),
      );
    } else {
      setDraft((prev) => ({
        ...prev,
        name: '',
        storeId: '',
      }));
    }
  }, [selectedIcon]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const asset = await uploadFileAsset(file, 'IMAGE');
      setDraft((prev) => ({
        ...prev,
        assetId: asset.id,
        assetUrl: asset.url,
        name: prev.name || (asset.originalName ?? asset.filename),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить PNG');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleModelClick(coords: { x: number; y: number; z: number }) {
    if (!floorId) return;

    if (mode === 'move' && selectedId) {
      setBusyId(selectedId);
      setError(null);
      try {
        const updated = await updateFloorIcon(selectedId, coords);
        setIcons((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка перемещения');
      } finally {
        setBusyId(null);
      }
      return;
    }

    if (!draft.assetId) {
      setError('Сначала загрузите PNG-иконку');
      setMode('place');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createFloorIcon({
        name: draft.name.trim() || 'Иконка',
        floorId,
        assetId: draft.assetId,
        storeId: draft.storeId || null,
        x: coords.x,
        y: coords.y,
        z: coords.z,
        rotation: draft.rotationDeg,
        scaleX: draft.sizePct / 100,
        scaleY: draft.sizePct / 100,
      });
      setIcons((prev) => [...prev, created]);
      setSelectedId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания иконки');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSelected() {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateFloorIcon(selectedId, {
        name: draft.name.trim() || 'Иконка',
        storeId: draft.storeId || null,
        rotation: draft.rotationDeg,
        scaleX: draft.sizePct / 100,
        scaleY: draft.sizePct / 100,
      });
      setIcons((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await deleteFloorIcon(id);
      setIcons((prev) => prev.filter((i) => i.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setBusyId(null);
    }
  }

  const floorWidth = metrics?.width ?? 0;
  const floorHeight = metrics?.height ?? 0;

  return (
    <div className={styles.root}>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>Этаж</span>
          <select
            className={styles.select}
            value={floorId}
            onChange={(e) => {
              setFloorId(e.target.value);
              setSelectedId(null);
            }}
          >
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (#{f.number})
              </option>
            ))}
          </select>
        </label>

        <div className={styles.modes}>
          {(Object.keys(MODE_LABELS) as FloorIconEditorMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.modeBtn} ${mode === m ? styles.modeActive : ''}`}
              onClick={() => setMode(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <span className={styles.hint}>
          {mode === 'place'
            ? 'Кликните по 3D-модели, чтобы поставить иконку'
            : mode === 'move' && selectedIcon
              ? 'Кликните по модели, чтобы переместить выбранную иконку'
              : 'Кликните по иконке, чтобы выбрать её'}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.canvasWrap}>
          {loading ? (
            <div className={styles.loading}>Загрузка иконок…</div>
          ) : (
            <FloorIconEditor3D
              modelUrl={modelUrl}
              metrics={metrics}
              icons={floorIcons}
              selectedIconId={selectedId}
              mode={mode}
              onModelClick={handleModelClick}
              onIconClick={setSelectedId}
            />
          )}
          {saving ? <div className={styles.busy}>Сохранение…</div> : null}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sideBlock}>
            <h3 className={styles.sideTitle}>PNG-иконка</h3>
            <div className={styles.field}>
              <span className={styles.label}>Файл с ПК</span>
              <div className={styles.assetRow}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/*"
                  className={styles.fileInput}
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {draft.assetUrl ? (
                  <img
                    className={styles.preview}
                    src={resolveAssetUrl(draft.assetUrl)}
                    alt="icon"
                  />
                ) : (
                  <div className={styles.previewEmpty}>Нет файла</div>
                )}
              </div>
            </div>
            <label className={styles.field}>
              <span className={styles.label}>Название</span>
              <input
                className={styles.input}
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Размер: {draft.sizePct}% от ширины этажа
              </span>
              <input
                type="range"
                min={SIZE_MIN_PCT}
                max={SIZE_MAX_PCT}
                step={1}
                value={draft.sizePct}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, sizePct: Number(e.target.value) }))
                }
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Поворот: {draft.rotationDeg}°</span>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={draft.rotationDeg}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, rotationDeg: Number(e.target.value) }))
                }
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Магазин (необязательно)</span>
              <select
                className={styles.select}
                value={draft.storeId}
                onChange={(e) => setDraft((prev) => ({ ...prev, storeId: e.target.value }))}
              >
                <option value="">— без привязки —</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleSaveSelected}
                disabled={!selectedId || saving}
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
              {selectedId ? (
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => {
                    setSelectedId(null);
                    setDraft(emptyDraft);
                  }}
                >
                  Отмена
                </button>
              ) : null}
            </div>
            <p className={styles.muted}>
              Габарит этажа: {Math.round(floorWidth)} × {Math.round(floorHeight)} ед.
            </p>
          </div>

          <div className={styles.sideBlock}>
            <h3 className={styles.sideTitle}>Иконки на этаже ({floorIcons.length})</h3>
            <ul className={styles.list}>
              {floorIcons.length === 0 ? (
                <li className={styles.empty}>Иконок пока нет</li>
              ) : (
                floorIcons.map((icon) => (
                  <li
                    key={icon.id}
                    className={`${styles.listItem} ${icon.id === selectedId ? styles.listItemActive : ''}`}
                    onClick={() => setSelectedId(icon.id)}
                  >
                    {icon.asset?.url ? (
                      <img
                        className={styles.thumb}
                        src={resolveAssetUrl(icon.asset.url)}
                        alt={icon.name}
                      />
                    ) : null}
                    <div className={styles.listMain}>
                      <strong>{icon.name}</strong>
                      <span className={styles.muted}>
                        x: {icon.x} y: {icon.y} z: {icon.z}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.delBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRemove(icon.id);
                      }}
                      disabled={busyId === icon.id}
                    >
                      {busyId === icon.id ? '…' : '✕'}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
