import React from 'react';
import type { ApiStore, ApiFileAsset, ApiTenant } from '@api/types';
import styles from '@styles/AdminPage.module.css';
import {
  fetchAdminPromotions,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
  type CreatePromotionInput,
  type PromotionAdmin,
  type UpdatePromotionInput,
} from '@api/promotionsAdmin';
import { uploadFileAsset, resolveAssetUrl } from '@api/fileAssets';

export type PromotionForm = CreatePromotionInput & { id?: string | null };

export const emptyPromotionForm: PromotionForm = {
  title: '',
  slug: '',
  description: null,
  terms: null,
  buttonText: null,
  buttonUrl: null,
  tenantId: null,
  storeId: null,
  imageAssetId: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
  sortOrder: 0,
  metadata: null,
};

export type PromotionsTabProps = {
  promotions: PromotionAdmin[];
  filteredPromotions: PromotionAdmin[];
  promotionForm: PromotionForm;
  setPromotionForm: React.Dispatch<React.SetStateAction<PromotionForm>>;
  editingPromotionId: string | null;
  setEditingPromotionId: (id: string | null) => void;
  actionLoading: string | null;
  stores: ApiStore[];
  tenants: ApiTenant[];
  fileAssets: ApiFileAsset[];
  error: string | null;
  onSubmit: () => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAddNew: () => void;
  onEdit: (promotion: PromotionAdmin) => void;
};

const imageOptions = (fileAssets: ApiFileAsset[]) =>
  fileAssets.filter((a) => a.mimeType?.startsWith('image/') || a.mimeType?.startsWith('image/'));

export default function PromotionsTab({
  promotions,
  filteredPromotions,
  promotionForm,
  setPromotionForm,
  editingPromotionId,
  setEditingPromotionId,
  actionLoading,
  stores,
  tenants,
  fileAssets: initialFileAssets,
  error,
  onSubmit,
  onRemove,
  onAddNew,
  onEdit,
}: PromotionsTabProps) {
  const [fileAssets, setFileAssets] = React.useState<ApiFileAsset[]>(initialFileAssets);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    setFileAssets(initialFileAssets);
  }, [initialFileAssets]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const asset = await uploadFileAsset(file, 'IMAGE');
      setFileAssets((prev) => [asset, ...prev]);
      setPromotionForm((prev) => ({ ...prev, imageAssetId: asset.id }));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  }

  const previewAsset = React.useMemo(() => {
    return fileAssets.find((a) => a.id === promotionForm.imageAssetId) ?? null;
  }, [promotionForm.imageAssetId, fileAssets]);

  return (
    <>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.fullWidth}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            {editingPromotionId ? 'Редактировать акцию' : 'Новая акция'}
          </h2>
          <div className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Заголовок *</span>
              <input
                className={styles.input}
                value={promotionForm.title}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Slug *</span>
              <input
                className={styles.input}
                value={promotionForm.slug}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Описание</span>
              <textarea
                className={styles.input}
                value={promotionForm.description ?? ''}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Условия</span>
              <textarea
                className={styles.input}
                value={promotionForm.terms ?? ''}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, terms: e.target.value }))}
                rows={3}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Текст кнопки</span>
              <input
                className={styles.input}
                value={promotionForm.buttonText ?? ''}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, buttonText: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Ссылка кнопки</span>
              <input
                className={styles.input}
                value={promotionForm.buttonUrl ?? ''}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, buttonUrl: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Магазин</span>
              <select
                className={styles.input}
                value={promotionForm.storeId ?? ''}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, storeId: e.target.value || null }))}
              >
                <option value="">— без магазина —</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Арендатор</span>
              <select
                className={styles.input}
                value={promotionForm.tenantId ?? ''}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, tenantId: e.target.value || null }))}
              >
                <option value="">— без арендатора —</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Изображение</span>
              <select
                className={styles.input}
                value={promotionForm.imageAssetId ?? ''}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, imageAssetId: e.target.value || null }))}
              >
                <option value="">— без изображения —</option>
                {fileAssets
                  .filter((a) => a.mimeType?.startsWith('image/'))
                  .map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.originalName ?? asset.filename}
                    </option>
                  ))}
              </select>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ marginTop: 8 }}
              />
              <span className={styles.hint}>
                Рекомендуемый размер: 800×400 px. Поддерживаются JPG, PNG, GIF, WEBP.
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Дата начала</span>
              <input
                className={styles.input}
                type="datetime-local"
                value={(promotionForm.startsAt ?? '').slice(0, 16)}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, startsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Дата окончания</span>
              <input
                className={styles.input}
                type="datetime-local"
                value={(promotionForm.endsAt ?? '').slice(0, 16)}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Порядок</span>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={promotionForm.sortOrder}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={promotionForm.isActive}
                onChange={(e) => setPromotionForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
              <span>Активна</span>
            </label>
            <div className={styles.actions}>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={onSubmit}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'new-promotion' || actionLoading === editingPromotionId
                  ? 'Сохранение…'
                  : editingPromotionId
                  ? 'Сохранить'
                  : 'Создать'}
              </button>
              {editingPromotionId ? (
                <button
                  className={styles.ghostBtn}
                  type="button"
                  onClick={() => {
                    setEditingPromotionId(null);
                    onAddNew();
                  }}
                >
                  Отмена
                </button>
              ) : null}
            </div>
          </div>
          {promotionForm.title || previewAsset ? (
            <div className={styles.preview}>
              <div className={styles.storePreviewCard}>
                <div className={styles.previewCover} style={{ aspectRatio: 'auto' }}>
                  {previewAsset ? (
                    <img src={resolveAssetUrl(previewAsset.url)} alt={promotionForm.title || 'Preview'} />
                  ) : (
                    <div style={{ padding: 16, color: '#666' }}>Без изображения</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Акции ({filteredPromotions.length})</h2>
        <div className={styles.list}>
          {filteredPromotions.length === 0 ? (
            <p className={styles.empty}>Акции не найдены</p>
          ) : (
            filteredPromotions.map((promotion) => (
              <div key={promotion.id} className={styles.item}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {promotion.imageAsset ? (
                    <img src={resolveAssetUrl(promotion.imageAsset.url)} alt={promotion.title} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                  ) : null}
                  <div>
                    <div className={styles.itemTitle}>{promotion.title}</div>
                    <div className={styles.itemMeta}>
                      slug: {promotion.slug} · {promotion.isActive ? 'Активна' : 'Скрыта'} ·{' '}
                      {promotion.sortOrder}
                    </div>
                    {promotion.store ? <div className={styles.itemMeta}>Магазин: {promotion.store.name}</div> : null}
                    {promotion.startsAt ? <div className={styles.itemMeta}>Начало: {new Date(promotion.startsAt).toLocaleString()}</div> : null}
                    {promotion.endsAt ? <div className={styles.itemMeta}>Конец: {new Date(promotion.endsAt).toLocaleString()}</div> : null}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.smallBtn} type="button" onClick={() => onEdit(promotion)}>
                    Редактировать
                  </button>
                  <button
                    className={styles.dangerBtn}
                    type="button"
                    onClick={() => onRemove(promotion.id)}
                    disabled={actionLoading === `delete-promotion-${promotion.id}`}
                  >
                    {actionLoading === `delete-promotion-${promotion.id}` ? '...' : 'Удалить'}
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