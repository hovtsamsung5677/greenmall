import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import React from 'react';
import { fetchCategories, fetchStores } from '@api/categories';
import { fetchFloors } from '@api/floors';
import { fetchFileAssets, uploadFileAsset, resolveAssetUrl } from '@api/fileAssets';
import { fetchAdminTenants } from '@api/admin';
import {
  createAdminCategory,
  createAdminStore,
  createAdminTenant,
  deleteAdminCategory,
  deleteAdminStore,
  deleteAdminTenant,
  fetchAdminCategories,
  fetchAdminStores,
  login,
  updateAdminCategory,
  updateAdminStore,
  updateAdminTenant,
  type CreateCategoryInput,
  type CreateStoreInput,
  type CreateTenantInput,
  type UpdateCategoryInput,
  type UpdateStoreInput,
  type UpdateTenantInput,
} from '@api/admin';
import {
  fetchCurrentUser,
  setAccessToken,
  type AdminUser,
} from '@api/client';
import type {
  ApiCategory,
  ApiStore,
  ApiFloor,
  ApiFileAsset,
  ApiTenant,
} from '@api/types';
import CategoriesTab, { emptyCategoryForm, type AdminCategoryForm } from '@components/admin/CategoriesTab';
import StoresTab, {
  emptyStoreForm,
  serializeWorkingHours,
  type AdminStoreForm,
} from '@components/admin/StoresTab';
import TenantsTab, {
  emptyTenantForm,
  type AdminTenantForm,
} from '@components/admin/TenantsTab';
import styles from '@styles/AdminPage.module.css';

const RouteAdminPanel = lazy(() => import('../components/route-editor/RouteAdminPanel'));
const RouteSharePreview = lazy(() => import('./RouteSharePreview'));

class RouteAdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[RouteAdmin] render error', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#b91c1c', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>
          <h2>Ошибка вкладки «Маршруты»</h2>
          <p>{this.state.error.message}</p>
          <pre>{this.state.error.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

type Tab = 'categories' | 'stores' | 'tenants' | 'routes' | 'mobile';

export interface AdminPageProps {
  onClose?: () => void;
}

export default function AdminPage({ onClose }: AdminPageProps = {}) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [tenants, setTenants] = useState<ApiTenant[]>([]);
  const [fileAssets, setFileAssets] = useState<ApiFileAsset[]>([]);
  const [categoryForm, setCategoryForm] = useState<AdminCategoryForm>(emptyCategoryForm);
  const [storeForm, setStoreForm] = useState<AdminStoreForm>(emptyStoreForm);
  const [tenantForm, setTenantForm] = useState<AdminTenantForm>(emptyTenantForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingTenantLogo, setUploadingTenantLogo] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const coverFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const tenantLogoFileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const me = await fetchCurrentUser();
        if (cancelled) return;
        setUser(me);
        await loadData();
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadData() {
    try {
      const [cats, storesList, floorsList, tenantsList, assets] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminStores(),
        fetchFloors(),
        fetchAdminTenants(),
        fetchFileAssets(),
      ]);
      setCategories(cats);
      setStores(storesList);
      setFloors(floorsList);
      setTenants(tenantsList);
      setFileAssets(assets);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const response = await login(loginEmail, loginPassword);
      setAccessToken(response.accessToken);
      setUser(response.user);
      await loadData();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setCategories([]);
    setStores([]);
    setFloors([]);
    setFileAssets([]);
    setEditingCategoryId(null);
    setEditingStoreId(null);
    setEditingTenantId(null);
    setCategoryForm(emptyCategoryForm);
    setStoreForm(emptyStoreForm);
    setTenantForm(emptyTenantForm);
  }

  async function submitCategory() {
    if (!categoryForm.name.trim()) {
      setError('Category name is required');
      return;
    }

    setActionLoading(editingCategoryId ?? 'new-category');
    setError(null);

    try {
      if (editingCategoryId) {
        const dto: UpdateCategoryInput = {
          name: categoryForm.name.trim(),
          slug: categoryForm.slug.trim() || undefined,
          description: categoryForm.description.trim() || undefined,
          icon: categoryForm.icon.trim() || undefined,
          sortOrder: Number(categoryForm.sortOrder) || 0,
          isActive: categoryForm.isActive,
        };
        const updated = await updateAdminCategory(editingCategoryId, dto);
        setCategories((prev) =>
          prev.map((cat) => (cat.id === updated.id ? updated : cat)),
        );
      } else {
        const dto: CreateCategoryInput = {
          name: categoryForm.name.trim(),
          slug: categoryForm.slug.trim() || undefined,
          description: categoryForm.description.trim() || undefined,
          icon: categoryForm.icon.trim() || undefined,
          sortOrder: Number(categoryForm.sortOrder) || 0,
          isActive: categoryForm.isActive,
        };
        const created = await createAdminCategory(dto);
        setCategories((prev) => [...prev, created]);
      }

      setCategoryForm(emptyCategoryForm);
      setEditingCategoryId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setActionLoading(null);
    }
  }

  async function removeCategory(id: string) {
    setActionLoading(`delete-category-${id}`);
    setError(null);

    try {
      const deleted = await deleteAdminCategory(id);
      setCategories((prev) => prev.map((cat) => (cat.id === deleted.id ? deleted : cat)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setActionLoading(null);
    }
  }

  async function submitStore() {
    if (!storeForm.name.trim()) {
      setError('Store name is required');
      return;
    }

    if (!storeForm.tenantId) {
      setError('Tenant is required');
      return;
    }

    if (!storeForm.categoryId) {
      setError('Category is required');
      return;
    }

    setActionLoading(editingStoreId ?? 'new-store');
    setError(null);

    const workingHoursParsed = serializeWorkingHours(storeForm.workingHours);

    try {
      if (editingStoreId) {
        const dto: UpdateStoreInput = {
          name: storeForm.name.trim(),
          slug: storeForm.slug.trim() || undefined,
          tenantId: storeForm.tenantId || null,
          categoryId: storeForm.categoryId || null,
          floorId: storeForm.floorId || null,
          description: storeForm.description.trim() || undefined,
          roomNumber: storeForm.roomNumber.trim() || undefined,
          phone: storeForm.phone.trim() || undefined,
          email: storeForm.email.trim() || undefined,
          website: storeForm.website.trim() || undefined,
          workingHours: workingHoursParsed,
          searchKeywords: storeForm.searchKeywords.trim() || undefined,
          logoAssetId: storeForm.logoAssetId || null,
          coverAssetId: storeForm.coverAssetId || null,
          isActive: storeForm.isActive,
          isVisible: storeForm.isVisible,
        };
        const updated = await updateAdminStore(editingStoreId, dto);
        setStores((prev) =>
          prev.map((store) => (store.id === updated.id ? updated : store)),
        );
      } else {
        const dto: CreateStoreInput = {
          name: storeForm.name.trim(),
          slug: storeForm.slug.trim() || undefined,
          tenantId: storeForm.tenantId || null,
          categoryId: storeForm.categoryId || null,
          floorId: storeForm.floorId || null,
          description: storeForm.description.trim() || undefined,
          roomNumber: storeForm.roomNumber.trim() || undefined,
          phone: storeForm.phone.trim() || undefined,
          email: storeForm.email.trim() || undefined,
          website: storeForm.website.trim() || undefined,
          workingHours: workingHoursParsed,
          searchKeywords: storeForm.searchKeywords.trim() || undefined,
          logoAssetId: storeForm.logoAssetId || null,
          coverAssetId: storeForm.coverAssetId || null,
          isActive: storeForm.isActive,
          isVisible: storeForm.isVisible,
        };
        const created = await createAdminStore(dto);
        setStores((prev) => [...prev, created]);
      }

      setStoreForm(emptyStoreForm);
      setEditingStoreId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save store');
    } finally {
      setActionLoading(null);
    }
  }

  async function removeStore(id: string) {
    setActionLoading(`delete-store-${id}`);
    setError(null);

    try {
      const deleted = await deleteAdminStore(id);
      setStores((prev) => prev.map((store) => (store.id === deleted.id ? deleted : store)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete store');
    } finally {
      setActionLoading(null);
    }
  }

  async function submitTenant() {
    if (!tenantForm.name.trim()) {
      setError('Tenant name is required');
      return;
    }

    setActionLoading(editingTenantId ?? 'new-tenant');
    setError(null);

    try {
      if (editingTenantId) {
        const dto: UpdateTenantInput = {
          name: tenantForm.name.trim(),
          legalName: tenantForm.legalName.trim() || undefined,
          description: tenantForm.description.trim() || undefined,
          phone: tenantForm.phone.trim() || undefined,
          email: tenantForm.email.trim() || undefined,
          website: tenantForm.website.trim() || undefined,
          logoAssetId: tenantForm.logoAssetId || null,
          isActive: tenantForm.isActive,
        };
        const updated = await updateAdminTenant(editingTenantId, dto);
        setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const dto: CreateTenantInput = {
          name: tenantForm.name.trim(),
          legalName: tenantForm.legalName.trim() || undefined,
          description: tenantForm.description.trim() || undefined,
          phone: tenantForm.phone.trim() || undefined,
          email: tenantForm.email.trim() || undefined,
          website: tenantForm.website.trim() || undefined,
          logoAssetId: tenantForm.logoAssetId || null,
          isActive: tenantForm.isActive,
        };
        const created = await createAdminTenant(dto);
        setTenants((prev) => [...prev, created]);
      }

      setTenantForm(emptyTenantForm);
      setEditingTenantId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tenant');
    } finally {
      setActionLoading(null);
    }
  }

  async function removeTenant(id: string) {
    setActionLoading(`delete-tenant-${id}`);
    setError(null);

    try {
      const deleted = await deleteAdminTenant(id);
      setTenants((prev) => prev.map((t) => (t.id === deleted.id ? deleted : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenant');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setError(null);
    try {
      const asset = await uploadFileAsset(file, 'STORE_COVER');
      setFileAssets((prev) => [asset, ...prev]);
      setStoreForm((prev) => ({ ...prev, coverAssetId: asset.id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload cover');
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setError(null);
    try {
      const asset = await uploadFileAsset(file, 'STORE_LOGO');
      setFileAssets((prev) => [asset, ...prev]);
      setStoreForm((prev) => ({ ...prev, logoAssetId: asset.id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingCover(false);
      if (logoFileInputRef.current) {
        logoFileInputRef.current.value = '';
      }
    }
  }

  async function handleTenantLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTenantLogo(true);
    setError(null);
    try {
      const asset = await uploadFileAsset(file, 'TENANT_LOGO');
      setFileAssets((prev) => [asset, ...prev]);
      setTenantForm((prev) => ({ ...prev, logoAssetId: asset.id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingTenantLogo(false);
      if (tenantLogoFileInputRef.current) {
        tenantLogoFileInputRef.current.value = '';
      }
    }
  }

  const categoryOptions = useMemo(() => categories.filter((cat) => cat.isActive), [categories]);

  async function refreshData() {
    setRefreshing(true);
    setError(null);
    try {
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обновить данные');
    } finally {
      setRefreshing(false);
    }
  }

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [categories, search]);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category?.name ?? '').toLowerCase().includes(q) ||
        (s.roomNumber ?? '').toLowerCase().includes(q),
    );
  }, [stores, search]);

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.legalName ?? '').toLowerCase().includes(q),
    );
  }, [tenants, search]);

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Green Mall Admin</h1>
          <p className={styles.loginSubtitle}>Вход в панель управления</p>
          <form className={styles.loginForm} onSubmit={handleLogin}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                className={styles.input}
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@greenmall.local"
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <input
                className={styles.input}
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </label>
            {loginError ? <p className={styles.error}>{loginError}</p> : null}
            <button className={styles.primaryBtn} type="submit" disabled={loginLoading}>
              {loginLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Green Mall Admin</h1>
          <p className={styles.userInfo}>
            {user.fullName ?? user.email} · {user.role}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onClose ? (
            <button className={styles.ghostBtn} type="button" onClick={onClose}>
              ← Назад
            </button>
          ) : null}
          <button
            className={styles.ghostBtn}
            type="button"
            onClick={refreshData}
            disabled={refreshing}
          >
            {refreshing ? 'Обновление…' : 'Обновить'}
          </button>
          <button className={styles.ghostBtn} type="button" onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </header>

      <nav className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'categories' ? styles.tabActive : ''}`}
          onClick={() => setTab('categories')}
        >
          Категории
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'stores' ? styles.tabActive : ''}`}
          onClick={() => setTab('stores')}
        >
          Магазины
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'tenants' ? styles.tabActive : ''}`}
          onClick={() => setTab('tenants')}
        >
          Арендаторы
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'routes' ? styles.tabActive : ''}`}
          onClick={() => setTab('routes')}
        >
          Маршруты
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'mobile' ? styles.tabActive : ''}`}
          onClick={() => setTab('mobile')}
        >
          QR-страница
        </button>
      </nav>

      {tab === 'routes' ? (
        <RouteAdminErrorBoundary>
          <Suspense fallback={<div className={styles.loading}>Загрузка редактора…</div>}>
            <RouteAdminPanel />
          </Suspense>
        </RouteAdminErrorBoundary>
      ) : tab === 'mobile' ? (
        <Suspense fallback={<div className={styles.loading}>Загрузка QR-страницы…</div>}>
          <RouteSharePreview />
        </Suspense>
      ) : (
        <>
          <div className={styles.searchRow}>
            <input
              className={styles.input}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, slug, кабинету…"
            />
            {search ? (
              <button className={styles.ghostBtn} type="button" onClick={() => setSearch('')}>
                Сбросить
              </button>
            ) : null}
            <span className={styles.searchCount}>
              {tab === 'categories'
                ? `${filteredCategories.length} категорий`
                : tab === 'stores'
                  ? `${filteredStores.length} магазинов`
                  : `${filteredTenants.length} арендаторов`}
            </span>
          </div>

          {loading ? (
            <p className={styles.empty}>Загрузка...</p>
          ) : (
            <div className={styles.layout}>
              {tab === 'categories' && (
                <CategoriesTab
                  categories={categories}
                  filteredCategories={filteredCategories}
                  categoryForm={categoryForm}
                  setCategoryForm={setCategoryForm}
                  editingCategoryId={editingCategoryId}
                  setEditingCategoryId={setEditingCategoryId}
                  actionLoading={actionLoading}
                  error={error}
                  onSubmit={submitCategory}
                  onRemove={removeCategory}
                  onAddNew={() => {
                    setCategoryForm(emptyCategoryForm);
                    setEditingCategoryId(null);
                  }}
                />
              )}
              {tab === 'stores' && (
                <StoresTab
                  stores={stores}
                  filteredStores={filteredStores}
                  storeForm={storeForm}
                  setStoreForm={setStoreForm}
                  editingStoreId={editingStoreId}
                  setEditingStoreId={setEditingStoreId}
                  actionLoading={actionLoading}
                  categories={categories}
                  tenants={tenants}
                  floors={floors}
                  fileAssets={fileAssets}
                  categoryOptions={categoryOptions}
                  error={error}
                  onSubmit={submitStore}
                  onRemove={removeStore}
                  onAddNew={() => {
                    setStoreForm(emptyStoreForm);
                    setEditingStoreId(null);
                  }}
                  onCoverUpload={handleCoverUpload}
                  onLogoUpload={handleLogoUpload}
                  uploadingCover={uploadingCover}
                  coverFileInputRef={coverFileInputRef}
                  logoFileInputRef={logoFileInputRef}
                />
              )}
              {tab === 'tenants' && (
                <TenantsTab
                  tenants={tenants}
                  filteredTenants={filteredTenants}
                  tenantForm={tenantForm}
                  setTenantForm={setTenantForm}
                  editingTenantId={editingTenantId}
                  setEditingTenantId={setEditingTenantId}
                  actionLoading={actionLoading}
                  fileAssets={fileAssets}
                  error={error}
                  onSubmit={submitTenant}
                  onRemove={removeTenant}
                  onAddNew={() => {
                    setTenantForm(emptyTenantForm);
                    setEditingTenantId(null);
                  }}
                  onTenantLogoUpload={handleTenantLogoUpload}
                  uploadingTenantLogo={uploadingTenantLogo}
                  tenantLogoFileInputRef={tenantLogoFileInputRef}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
