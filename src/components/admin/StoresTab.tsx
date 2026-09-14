import type React from 'react';
import type { ApiStore, ApiCategory, ApiTenant, ApiFloor, ApiFileAsset } from '@api/types';
import type { UpdateStoreInput, CreateStoreInput } from '@api/admin';
import { resolveAssetUrl } from '@api/fileAssets';
import styles from '@styles/AdminPage.module.css';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type DayHours = { open: boolean; from: string; to: string };
export type WorkingHoursForm = Record<DayKey, DayHours>;

export const WEEK_DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Понедельник' },
  { key: 'tue', label: 'Вторник' },
  { key: 'wed', label: 'Среда' },
  { key: 'thu', label: 'Четверг' },
  { key: 'fri', label: 'Пятница' },
  { key: 'sat', label: 'Суббота' },
  { key: 'sun', label: 'Воскресенье' },
];

export type AdminStoreForm = {
  name: string;
  slug: string;
  tenantId: string;
  categoryId: string;
  floorId: string;
  description: string;
  roomNumber: string;
  phone: string;
  email: string;
  website: string;
  workingHours: WorkingHoursForm;
  searchKeywords: string;
  logoAssetId: string;
  coverAssetId: string;
  isActive: boolean;
  isVisible: boolean;
};

export function emptyWorkingHours(): WorkingHoursForm {
  return {
    mon: { open: true, from: '10:00', to: '22:00' },
    tue: { open: true, from: '10:00', to: '22:00' },
    wed: { open: true, from: '10:00', to: '22:00' },
    thu: { open: true, from: '10:00', to: '22:00' },
    fri: { open: true, from: '10:00', to: '22:00' },
    sat: { open: true, from: '10:00', to: '22:00' },
    sun: { open: true, from: '10:00', to: '22:00' },
  };
}

export function parseWorkingHours(value: unknown): WorkingHoursForm {
  const result = emptyWorkingHours();
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    for (const day of WEEK_DAYS) {
      const entry = raw[day.key];
      if (entry && typeof entry === 'object') {
        const e = entry as Record<string, unknown>;
        const from = typeof e.from === 'string' ? e.from : '';
        const to = typeof e.to === 'string' ? e.to : '';
        if (from && to) {
          result[day.key] = { open: true, from, to };
        } else {
          result[day.key] = { open: false, from: result[day.key].from, to: result[day.key].to };
        }
      }
    }
  }
  return result;
}

export function serializeWorkingHours(form: WorkingHoursForm): Record<string, { start: string; end: string }> | undefined {
  const out: Record<string, { start: string; end: string }> = {};
  for (const day of WEEK_DAYS) {
    const d = form[day.key];
    if (d.open && d.from && d.to) {
      out[day.key] = { start: d.from, end: d.to };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function formatWorkingHoursFromForm(form: WorkingHoursForm): string {
  const openDays = WEEK_DAYS.filter((d) => form[d.key].open && form[d.key].from && form[d.key].to);
  if (openDays.length === 0) return '';
  const first = openDays[0];
  const last = openDays[openDays.length - 1];
  const short: Record<DayKey, string> = {
    mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс',
  };
  const range = first.key === last.key ? short[first.key] : `${short[first.key]}-${short[last.key]}`;
  return `${range}: ${form[first.key].from}-${form[first.key].to}`;
}

export function storeToForm(store: ApiStore): AdminStoreForm {
  return {
    name: store.name,
    slug: store.slug,
    tenantId: store.tenant?.id ?? '',
    categoryId: store.category?.id ?? '',
    floorId: store.floorId ?? '',
    description: store.description ?? '',
    roomNumber: store.roomNumber ?? '',
    phone: store.phone ?? '',
    email: store.email ?? '',
    website: store.website ?? '',
    workingHours: parseWorkingHours(store.workingHours),
    searchKeywords: store.searchKeywords ?? '',
    logoAssetId: store.logoAsset?.id ?? '',
    coverAssetId: store.coverAsset?.id ?? '',
    isActive: store.isActive,
    isVisible: store.isVisible,
  };
}

export const emptyStoreForm: AdminStoreForm = {
  name: '',
  slug: '',
  tenantId: '',
  categoryId: '',
  floorId: '',
  description: '',
  roomNumber: '',
  phone: '',
  email: '',
  website: '',
  workingHours: emptyWorkingHours(),
  searchKeywords: '',
  logoAssetId: '',
  coverAssetId: '',
  isActive: true,
  isVisible: true,
};

export type StoresTabProps = {
  stores: ApiStore[];
  filteredStores: ApiStore[];
  storeForm: AdminStoreForm;
  setStoreForm: React.Dispatch<React.SetStateAction<AdminStoreForm>>;
  editingStoreId: string | null;
  setEditingStoreId: (id: string | null) => void;
  actionLoading: string | null;
  categories: ApiCategory[];
  tenants: ApiTenant[];
  floors: ApiFloor[];
  fileAssets: ApiFileAsset[];
  categoryOptions: ApiCategory[];
  error: string | null;
  onSubmit: () => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAddNew: () => void;
  onCoverUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadingCover: boolean;
  coverFileInputRef: React.RefObject<HTMLInputElement | null>;
  logoFileInputRef: React.RefObject<HTMLInputElement | null>;
};

export default function StoresTab({
  stores,
  filteredStores,
  storeForm,
  setStoreForm,
  editingStoreId,
  setEditingStoreId,
  actionLoading,
  categories,
  tenants,
  floors,
  fileAssets,
  categoryOptions,
  error,
  onSubmit,
  onRemove,
  onAddNew,
  onCoverUpload,
  onLogoUpload,
  uploadingCover,
  coverFileInputRef,
  logoFileInputRef,
}: StoresTabProps) {
  return (
    <>
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          {editingStoreId ? 'Редактировать магазин' : 'Новый магазин'}
        </h2>
        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Название *</span>
            <input
              className={styles.input}
              value={storeForm.name}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Slug</span>
            <input
              className={styles.input}
              value={storeForm.slug}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, slug: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Категория</span>
            <select
              className={styles.input}
              value={storeForm.categoryId}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, categoryId: e.target.value }))
              }
            >
              <option value="">— без категории —</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Арендатор</span>
            <select
              className={styles.input}
              value={storeForm.tenantId}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, tenantId: e.target.value }))
              }
            >
              <option value="">— без арендатора —</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Этаж</span>
            <select
              className={styles.input}
              value={storeForm.floorId}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, floorId: e.target.value }))
              }
            >
              <option value="">— не выбран —</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.number} — {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Описание</span>
            <textarea
              className={styles.textarea}
              value={storeForm.description}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Кабинет / номер</span>
            <input
              className={styles.input}
              value={storeForm.roomNumber}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, roomNumber: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Телефон</span>
            <input
              className={styles.input}
              value={storeForm.phone}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              value={storeForm.email}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Сайт</span>
            <input
              className={styles.input}
              value={storeForm.website}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, website: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Часы работы</span>
            <div className={styles.whEditor}>
              {WEEK_DAYS.map((day) => {
                const d = storeForm.workingHours[day.key];
                return (
                  <div key={day.key} className={styles.whRow}>
                    <label className={styles.whOpen}>
                      <input
                        type="checkbox"
                        checked={d.open}
                        onChange={(e) =>
                          setStoreForm((prev) => ({
                            ...prev,
                            workingHours: {
                              ...prev.workingHours,
                              [day.key]: { ...d, open: e.target.checked },
                            },
                          }))
                        }
                      />
                      <span>{day.label}</span>
                    </label>
                    <div className={styles.whTimes}>
                      <input
                        type="time"
                        className={styles.input}
                        value={d.from}
                        disabled={!d.open}
                        onChange={(e) =>
                          setStoreForm((prev) => ({
                            ...prev,
                            workingHours: {
                              ...prev.workingHours,
                              [day.key]: { ...d, from: e.target.value },
                            },
                          }))
                        }
                      />
                      <span className={styles.whDash}>—</span>
                      <input
                        type="time"
                        className={styles.input}
                        value={d.to}
                        disabled={!d.open}
                        onChange={(e) =>
                          setStoreForm((prev) => ({
                            ...prev,
                            workingHours: {
                              ...prev.workingHours,
                              [day.key]: { ...d, to: e.target.value },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <span className={styles.hint}>Отметьте дни и укажите время. Снятый чекбокс — выходной.</span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Логотип</span>
            <div className={styles.coverField}>
              <select
                className={styles.input}
                value={storeForm.logoAssetId}
                onChange={(e) =>
                  setStoreForm((prev) => ({ ...prev, logoAssetId: e.target.value }))
                }
              >
                <option value="">— без логотипа —</option>
                {fileAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.originalName ?? a.filename}
                  </option>
                ))}
              </select>
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/*"
                onChange={onLogoUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => logoFileInputRef.current?.click()}
                disabled={uploadingCover}
              >
                Загрузить лого
              </button>
            </div>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Обложка</span>
            <div className={styles.coverField}>
              <select
                className={styles.input}
                value={storeForm.coverAssetId}
                onChange={(e) =>
                  setStoreForm((prev) => ({ ...prev, coverAssetId: e.target.value }))
                }
              >
                <option value="">— без обложки —</option>
                {fileAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.originalName ?? a.filename}
                  </option>
                ))}
              </select>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={onCoverUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => coverFileInputRef.current?.click()}
                disabled={uploadingCover}
              >
                {uploadingCover ? 'Загрузка…' : 'Загрузить с ПК'}
              </button>
            </div>
          </label>
          {storeForm.coverAssetId ? (
            <div className={styles.coverPreview}>
              <img
                src={resolveAssetUrl(fileAssets.find((a) => a.id === storeForm.coverAssetId)?.url) ?? ''}
                alt=""
              />
            </div>
          ) : null}
          <label className={styles.field}>
            <span className={styles.label}>Ключевые слова</span>
            <input
              className={styles.input}
              value={storeForm.searchKeywords}
              onChange={(e) =>
                setStoreForm((prev) => ({ ...prev, searchKeywords: e.target.value }))
              }
            />
          </label>
          <div className={styles.checkboxRow}>
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={storeForm.isActive}
                onChange={(e) =>
                  setStoreForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              <span>Активен</span>
            </label>
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={storeForm.isVisible}
                onChange={(e) =>
                  setStoreForm((prev) => ({ ...prev, isVisible: e.target.checked }))
                }
              />
              <span>Видимый</span>
            </label>
          </div>
          {storeForm.name ? (
            <div className={styles.preview}>
              <h3 className={styles.previewTitle}>Предпросмотр карточки</h3>
              <div className={styles.storePreviewCard}>
                {storeForm.coverAssetId ? (
                  <div className={styles.previewCover}>
                    <img
                      src={resolveAssetUrl(fileAssets.find((a) => a.id === storeForm.coverAssetId)?.url) ?? ''}
                      alt=""
                    />
                    {storeForm.logoAssetId ? (
                      <div className={styles.previewLogo}>
                        <img
                          src={resolveAssetUrl(fileAssets.find((a) => a.id === storeForm.logoAssetId)?.url) ?? ''}
                          alt=""
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className={styles.previewBody}>
                  <div className={styles.previewTopRow}>
                    {storeForm.categoryId ? (
                      <span className={styles.previewCategory}>
                        {categoryOptions.find((c) => c.id === storeForm.categoryId)?.name ?? ''}
                      </span>
                    ) : null}
                    {storeForm.workingHours ? (
                      <span className={styles.previewHours}>
                        {formatWorkingHoursFromForm(storeForm.workingHours)}
                      </span>
                    ) : null}
                  </div>
                  <h4 className={styles.previewName}>{storeForm.name}</h4>
                  {storeForm.floorId ? (
                    <p className={styles.previewFloor}>
                      {floors.find((f) => f.id === storeForm.floorId)?.number ?? ''} этаж
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              type="button"
              onClick={onSubmit}
              disabled={actionLoading !== null}
            >
              {editingStoreId ? 'Сохранить' : 'Создать'}
            </button>
            {editingStoreId ? (
              <button
                className={styles.ghostBtn}
                type="button"
                onClick={onAddNew}
              >
                Отмена
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Магазины</h2>
        <div className={styles.list}>
          {stores.length === 0 ? (
            <p className={styles.empty}>Магазины не найдены</p>
          ) : (
            filteredStores.map((store) => (
              <div key={store.id} className={styles.item}>
                <div>
                  <div className={styles.itemTitle}>{store.name}</div>
                  <div className={styles.itemMeta}>
                    {store.category?.name ?? 'Без категории'} ·{' '}
                    {store.floor ? `Этаж ${store.floor.number}` : ''}
                    {store.floor && store.category?.name ? ' · ' : ''}
                    {store.isActive ? 'Активен' : 'Скрыт'} ·{' '}
                    {store.isVisible ? 'Видимый' : 'Скрыт в поиске'}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={styles.smallBtn}
                    type="button"
                    onClick={() => {
                      setEditingStoreId(store.id);
                      setStoreForm(storeToForm(store));
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    className={styles.dangerBtn}
                    type="button"
                    onClick={() => onRemove(store.id)}
                    disabled={actionLoading === `delete-store-${store.id}`}
                  >
                    {actionLoading === `delete-store-${store.id}` ? '...' : 'Удалить'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
