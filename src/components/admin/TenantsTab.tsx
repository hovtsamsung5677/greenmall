import type React from 'react';
import type { ApiTenant, ApiFileAsset } from '../../api/types';
import { resolveAssetUrl } from '../../api/fileAssets';
import styles from '../AdminPage.module.css';

export type AdminTenantForm = {
  name: string;
  legalName: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  logoAssetId: string;
  isActive: boolean;
};

export function tenantToForm(tenant: ApiTenant): AdminTenantForm {
  return {
    name: tenant.name,
    legalName: tenant.legalName ?? '',
    description: tenant.description ?? '',
    phone: tenant.phone ?? '',
    email: tenant.email ?? '',
    website: tenant.website ?? '',
    logoAssetId: tenant.logoAsset?.id ?? '',
    isActive: tenant.isActive,
  };
}

export const emptyTenantForm: AdminTenantForm = {
  name: '',
  legalName: '',
  description: '',
  phone: '',
  email: '',
  website: '',
  logoAssetId: '',
  isActive: true,
};

export type TenantsTabProps = {
  tenants: ApiTenant[];
  filteredTenants: ApiTenant[];
  tenantForm: AdminTenantForm;
  setTenantForm: React.Dispatch<React.SetStateAction<AdminTenantForm>>;
  editingTenantId: string | null;
  setEditingTenantId: (id: string | null) => void;
  actionLoading: string | null;
  fileAssets: ApiFileAsset[];
  error: string | null;
  onSubmit: () => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAddNew: () => void;
  onTenantLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadingTenantLogo: boolean;
  tenantLogoFileInputRef: React.RefObject<HTMLInputElement | null>;
};

export default function TenantsTab({
  tenants,
  filteredTenants,
  tenantForm,
  setTenantForm,
  editingTenantId,
  setEditingTenantId,
  actionLoading,
  fileAssets,
  error,
  onSubmit,
  onRemove,
  onAddNew,
  onTenantLogoUpload,
  uploadingTenantLogo,
  tenantLogoFileInputRef,
}: TenantsTabProps) {
  return (
    <>
      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>
          {editingTenantId ? 'Редактировать арендатора' : 'Новый арендатор'}
        </h2>
        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Название *</span>
            <input
              className={styles.input}
              value={tenantForm.name}
              onChange={(e) =>
                setTenantForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Юридическое название</span>
            <input
              className={styles.input}
              value={tenantForm.legalName}
              onChange={(e) =>
                setTenantForm((prev) => ({ ...prev, legalName: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Телефон</span>
            <input
              className={styles.input}
              value={tenantForm.phone}
              onChange={(e) =>
                setTenantForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              className={styles.input}
              type="email"
              value={tenantForm.email}
              onChange={(e) =>
                setTenantForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Сайт</span>
            <input
              className={styles.input}
              value={tenantForm.website}
              onChange={(e) =>
                setTenantForm((prev) => ({ ...prev, website: e.target.value }))
              }
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Описание</span>
            <textarea
              className={styles.textarea}
              value={tenantForm.description}
              onChange={(e) =>
                setTenantForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </label>
          <div className={styles.field}>
            <span className={styles.label}>Логотип</span>
            <div className={styles.assetRow}>
              {tenantForm.logoAssetId ? (
                <img
                  className={styles.assetThumb}
                  src={resolveAssetUrl(
                    fileAssets.find((a) => a.id === tenantForm.logoAssetId)?.url,
                  ) ?? ''}
                  alt="logo"
                />
              ) : (
                <div className={styles.assetThumbEmpty}>Нет</div>
              )}
              <input
                ref={tenantLogoFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onTenantLogoUpload}
              />
              <button
                className={styles.smallBtn}
                type="button"
                onClick={() => tenantLogoFileInputRef.current?.click()}
                disabled={uploadingTenantLogo}
              >
                {uploadingTenantLogo ? 'Загрузка…' : 'Загрузить с ПК'}
              </button>
              {tenantForm.logoAssetId ? (
                <button
                  className={styles.dangerBtn}
                  type="button"
                  onClick={() =>
                    setTenantForm((prev) => ({ ...prev, logoAssetId: '' }))
                  }
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={tenantForm.isActive}
              onChange={(e) =>
                setTenantForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            <span>Активен</span>
          </label>
          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              type="button"
              onClick={onSubmit}
              disabled={actionLoading !== null}
            >
              {editingTenantId ? 'Сохранить' : 'Создать'}
            </button>
            {editingTenantId ? (
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
        <h2 className={styles.panelTitle}>Арендаторы</h2>
        <div className={styles.list}>
          {tenants.length === 0 ? (
            <p className={styles.empty}>Арендаторы не найдены</p>
          ) : (
            filteredTenants.map((tenant) => (
              <div key={tenant.id} className={styles.item}>
                <div className={styles.itemMain}>
                  {tenant.logoAsset?.url ? (
                    <img
                      className={styles.assetThumb}
                      src={resolveAssetUrl(tenant.logoAsset.url) ?? ''}
                      alt={tenant.name}
                    />
                  ) : null}
                  <div>
                    <div className={styles.itemTitle}>{tenant.name}</div>
                    <div className={styles.itemMeta}>
                      {tenant.isActive ? 'Активен' : 'Скрыт'}
                      {tenant.phone ? ` · ${tenant.phone}` : ''}
                      {tenant.email ? ` · ${tenant.email}` : ''}
                    </div>
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={styles.smallBtn}
                    type="button"
                    onClick={() => {
                      setEditingTenantId(tenant.id);
                      setTenantForm(tenantToForm(tenant));
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    className={styles.dangerBtn}
                    type="button"
                    onClick={() => onRemove(tenant.id)}
                    disabled={actionLoading === `delete-tenant-${tenant.id}`}
                  >
                    {actionLoading === `delete-tenant-${tenant.id}` ? '...' : 'Удалить'}
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
