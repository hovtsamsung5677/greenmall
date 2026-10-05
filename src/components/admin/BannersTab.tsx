import React from 'react';
import type { ApiStore, ApiFileAsset } from '@api/types';
import styles from '@styles/AdminPage.module.css';
import {
  createHeaderBanner,
  updateHeaderBanner,
  deleteHeaderBanner,
  fetchAdminHeaderBanners,
  fetchActiveHeaderBanner,
  type HeaderBanner,
} from '@api/headerBanners';
import { uploadFileAsset, resolveAssetUrl } from '@api/fileAssets';

export type BannerForm = {
  title: string;
  subtitle: string;
  linkUrl: string;
  assetId: string;
  targetStoreId: string;
  isActive: boolean;
  sortOrder: string;
};

const emptyBannerForm: BannerForm = {
  title: '',
  subtitle: '',
  linkUrl: '',
  assetId: '',
  targetStoreId: '',
  isActive: true,
  sortOrder: '0',
};

function bannerToForm(banner: HeaderBanner): BannerForm {
  return {
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    linkUrl: banner.linkUrl ?? '',
    assetId: banner.asset?.id ?? '',
    targetStoreId: banner.targetStore?.id ?? '',
    isActive: banner.isActive,
    sortOrder: String(banner.sortOrder ?? 0),
  };
}

export type BannersTabProps = {
  stores: ApiStore[];
  fileAssets: ApiFileAsset[];
  actionLoading: string | null;
  error: string | null;
  setError: (error: string | null) => void;
  onRefresh: () => Promise<void>;
};

export default function BannersTab({
  stores,
  fileAssets: initialFileAssets,
  actionLoading,
  error,
  setError,
  onRefresh,
}: BannersTabProps) {
  const [banners, setBanners] = React.useState<HeaderBanner[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [bannerForm, setBannerForm] = React.useState<BannerForm>(emptyBannerForm);
  const [editingBannerId, setEditingBannerId] = React.useState<string | null>(null);
  const [activePreview, setActivePreview] = React.useState<HeaderBanner | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [fileAssets, setFileAssets] = React.useState<ApiFileAsset[]>(initialFileAssets);

  const load = React.useCallback(
    async (p = 1) => {
      setError(null);
      try {
        const data = await fetchAdminHeaderBanners(p, 20);
        setBanners(data.items);
        setTotal(data.total);
        setPage(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load banners');
      }
    },
    [setError],
  );

  React.useEffect(() => {
    load(1);
  }, [load]);

  React.useEffect(() => {
    setFileAssets(initialFileAssets);
  }, [initialFileAssets]);

  React.useEffect(() => {
    fetchActiveHeaderBanner()
      .then(setActivePreview)
      .catch(() => setActivePreview(null));
  }, []);

  async function submitBanner() {
    if (!bannerForm.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim() || undefined,
      linkUrl: bannerForm.linkUrl.trim() || undefined,
      assetId: bannerForm.assetId || undefined,
      targetStoreId: bannerForm.targetStoreId || undefined,
      isActive: bannerForm.isActive,
      sortOrder: Number(bannerForm.sortOrder) || 0,
    };

    try {
      if (editingBannerId) {
        const updated = await updateHeaderBanner(editingBannerId, payload);
        setBanners((prev) =>
          prev.map((b) => (b.id === updated.id ? updated : b)),
        );
      } else {
        const created = await createHeaderBanner(payload);
        setBanners((prev) => [created, ...prev]);
        setTotal((t) => t + 1);
      }

      setBannerForm(emptyBannerForm);
      setEditingBannerId(null);
      await onRefresh();
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const asset = await uploadFileAsset(file, 'IMAGE');
      setBannerForm((prev) => ({ ...prev, assetId: asset.id }));
      setFileAssets((prev) => [asset, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  }

  async function removeBanner(id: string) {
    setError(null);
    try {
      const deleted = await deleteHeaderBanner(id);
      setBanners((prev) => prev.map((b) => (b.id === deleted.id ? deleted : b)));
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete banner');
    }
  }

  const imageOptions = React.useMemo(
    () => fileAssets.filter((a) => a.mimeType?.startsWith('image/') || a.mimeType?.startsWith('video/')),
    [fileAssets],
  );

  const storeOptions = React.useMemo(() => stores, [stores]);

  const previewAsset = React.useMemo(() => {
    const id = bannerForm.assetId;
    return fileAssets.find((a) => a.id === id) ?? null;
  }, [bannerForm.assetId, fileAssets]);

  const targetStore = React.useMemo(() => {
    const id = bannerForm.targetStoreId;
    return stores.find((s) => s.id === id) ?? null;
  }, [bannerForm.targetStoreId, stores]);

  return (
    <>
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.fullWidth}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            {editingBannerId ? 'Редактировать баннер' : 'Новый баннер'}
          </h2>
          <div className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Заголовок *</span>
              <input
                className={styles.input}
                value={bannerForm.title}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Подзаголовок</span>
              <input
                className={styles.input}
                value={bannerForm.subtitle}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, subtitle: e.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Ссылка</span>
              <input
                className={styles.input}
                value={bannerForm.linkUrl}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, linkUrl: e.target.value }))
                }
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Изображение / GIF</span>
              <select
                className={styles.input}
                value={bannerForm.assetId}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, assetId: e.target.value }))
                }
              >
                <option value="">— без изображения —</option>
                {imageOptions.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.originalName ?? asset.filename}
                  </option>
                ))}
              </select>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ marginTop: 8 }}
              />
              <span className={styles.hint}>
                Рекомендуемый размер: 1200×400 px. Поддерживаются JPG, PNG, GIF, WEBP.
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Магазин</span>
              <select
                className={styles.input}
                value={bannerForm.targetStoreId}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, targetStoreId: e.target.value }))
                }
              >
                <option value="">— без привязки —</option>
                {storeOptions.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} ({store.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Порядок</span>
              <input
                className={styles.input}
                type="number"
                min={0}
                value={bannerForm.sortOrder}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                }
              />
            </label>
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={bannerForm.isActive}
                onChange={(e) =>
                  setBannerForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              <span>Активен</span>
            </label>
            <div className={styles.actions}>
              <button
                className={styles.primaryBtn}
                type="button"
                onClick={submitBanner}
                disabled={saving || actionLoading !== null}
              >
                {saving ? 'Сохранение…' : editingBannerId ? 'Сохранить' : 'Создать'}
              </button>
              {editingBannerId ? (
                <button
                  className={styles.ghostBtn}
                  type="button"
                  onClick={() => {
                    setBannerForm(emptyBannerForm);
                    setEditingBannerId(null);
                  }}
                >
                  Отмена
                </button>
              ) : null}
            </div>
          </div>
          {(bannerForm.title || previewAsset) ? (
            <div className={styles.preview}>
              <div className={styles.storePreviewCard}>
                <div className={styles.previewCover} style={{ aspectRatio: 'auto' }}>
                  {previewAsset ? (
                    <img src={resolveAssetUrl(previewAsset.url)} alt={bannerForm.title || 'Banner preview'} />
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
        <h2 className={styles.panelTitle}>Баннеры</h2>
        <div className={styles.list}>
          {banners.length === 0 ? (
            <p className={styles.empty}>Баннеры не найдены</p>
          ) : (
            banners.map((banner) => (
              <div key={banner.id} className={styles.item}>
                <div>
                  <div className={styles.itemTitle}>{banner.title}</div>
                  <div className={styles.itemMeta}>
                    {banner.subtitle ?? ''} · {banner.isActive ? 'Активен' : 'Скрыт'} ·{' '}
                    {banner.placement}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={styles.smallBtn}
                    type="button"
                    onClick={() => {
                      setEditingBannerId(banner.id);
                      setBannerForm(bannerToForm(banner));
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    className={styles.dangerBtn}
                    type="button"
                    onClick={() => removeBanner(banner.id)}
                    disabled={actionLoading === `delete-banner-${banner.id}`}
                  >
                    {actionLoading === `delete-banner-${banner.id}` ? '...' : 'Удалить'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {activePreview && activePreview.asset ? (
        <section className={styles.panel}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <img
              src={resolveAssetUrl(activePreview.asset.url)}
              alt={activePreview.title}
              style={{ maxHeight: 200, borderRadius: 12, objectFit: 'contain' }}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
