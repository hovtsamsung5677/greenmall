import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import { fetchCategories, fetchStores } from '../api/categories';
import { fetchFloors } from '../api/floors';
import { fetchFileAssets, uploadFileAsset, resolveAssetUrl } from '../api/fileAssets';
import { fetchAdminTenants } from '../api/admin';
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
} from '../api/admin';
import {
  fetchCurrentUser,
  setAccessToken,
  type AdminUser,
} from '../api/client';
import type {
  ApiCategory,
  ApiStore,
  ApiFloor,
  ApiFileAsset,
  ApiTenant,
} from '../api/types';
import styles from './AdminPage.module.css';

type Tab = 'categories' | 'stores' | 'tenants';

type AdminCategoryForm = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
};

type AdminStoreForm = {
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

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type DayHours = { open: boolean; from: string; to: string };
type WorkingHoursForm = Record<DayKey, DayHours>;

const WEEK_DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Понедельник' },
  { key: 'tue', label: 'Вторник' },
  { key: 'wed', label: 'Среда' },
  { key: 'thu', label: 'Четверг' },
  { key: 'fri', label: 'Пятница' },
  { key: 'sat', label: 'Суббота' },
  { key: 'sun', label: 'Воскресенье' },
];

function emptyWorkingHours(): WorkingHoursForm {
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

function parseWorkingHours(value: unknown): WorkingHoursForm {
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

function serializeWorkingHours(form: WorkingHoursForm): Record<string, { start: string; end: string }> | undefined {
  const out: Record<string, { start: string; end: string }> = {};
  for (const day of WEEK_DAYS) {
    const d = form[day.key];
    if (d.open && d.from && d.to) {
      out[day.key] = { start: d.from, end: d.to };
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function formatWorkingHoursFromForm(form: WorkingHoursForm): string {
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

type AdminTenantForm = {
  name: string;
  legalName: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  logoAssetId: string;
  isActive: boolean;
};

const emptyCategoryForm: AdminCategoryForm = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  sortOrder: '0',
  isActive: true,
};

const emptyStoreForm: AdminStoreForm = {
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

const emptyTenantForm: AdminTenantForm = {
  name: '',
  legalName: '',
  description: '',
  phone: '',
  email: '',
  website: '',
  logoAssetId: '',
  isActive: true,
};

function categoryToForm(category: ApiCategory): AdminCategoryForm {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    icon: category.icon ?? '',
    sortOrder: String(category.sortOrder ?? 0),
    isActive: category.isActive,
  };
}

function storeToForm(store: ApiStore): AdminStoreForm {
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

function tenantToForm(tenant: ApiTenant): AdminTenantForm {
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
  const coverFileInputRef = React.useRef<HTMLInputElement>(null);
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);
  const tenantLogoFileInputRef = React.useRef<HTMLInputElement>(null);

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

  function startEditCategory(category: ApiCategory) {
    setEditingCategoryId(category.id);
    setCategoryForm(categoryToForm(category));
  }

  function startAddCategory() {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategoryForm);
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

      startAddCategory();
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

  function startEditTenant(tenant: ApiTenant) {
    setEditingTenantId(tenant.id);
    setTenantForm(tenantToForm(tenant));
  }

  function startAddTenant() {
    setEditingTenantId(null);
    setTenantForm(emptyTenantForm);
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

      startAddTenant();
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

  function startEditStore(store: ApiStore) {
    setEditingStoreId(store.id);
    setStoreForm(storeToForm(store));
  }

  function startAddStore() {
    setEditingStoreId(null);
    setStoreForm(emptyStoreForm);
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

      startAddStore();
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

  const activeListCount = tab === 'categories' ? filteredCategories.length : tab === 'stores' ? filteredStores.length : filteredTenants.length;

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
      </nav>

      {error ? <p className={styles.error}>{error}</p> : null}

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
          {activeListCount} {tab === 'categories' ? 'категорий' : tab === 'stores' ? 'магазинов' : 'арендаторов'}
        </span>
      </div>

      {loading ? (
        <p className={styles.empty}>Загрузка...</p>
      ) : (
        <div className={styles.layout}>
          {tab === 'categories' ? (
            <>
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>
                  {editingCategoryId ? 'Редактировать категорию' : 'Новая категория'}
                </h2>
                <div className={styles.form}>
                  <label className={styles.field}>
                    <span className={styles.label}>Название *</span>
                    <input
                      className={styles.input}
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Slug</span>
                    <input
                      className={styles.input}
                      value={categoryForm.slug}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({ ...prev, slug: e.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Описание</span>
                    <textarea
                      className={styles.textarea}
                      value={categoryForm.description}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Иконка</span>
                    <input
                      className={styles.input}
                      value={categoryForm.icon}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Порядок</span>
                    <input
                      className={styles.input}
                      type="number"
                      min={0}
                      value={categoryForm.sortOrder}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      checked={categoryForm.isActive}
                      onChange={(e) =>
                        setCategoryForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                    />
                    <span>Активна</span>
                  </label>
                  <div className={styles.actions}>
                    <button
                      className={styles.primaryBtn}
                      type="button"
                      onClick={submitCategory}
                      disabled={actionLoading !== null}
                    >
                      {editingCategoryId ? 'Сохранить' : 'Создать'}
                    </button>
                    {editingCategoryId ? (
                      <button
                        className={styles.ghostBtn}
                        type="button"
                        onClick={startAddCategory}
                      >
                        Отмена
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Категории</h2>
                <div className={styles.list}>
                  {categories.length === 0 ? (
                    <p className={styles.empty}>Категории не найдены</p>
                  ) : (
                    filteredCategories.map((category) => (
                      <div key={category.id} className={styles.item}>
                        <div>
                          <div className={styles.itemTitle}>{category.name}</div>
                          <div className={styles.itemMeta}>
                            {category.slug} · {category.isActive ? 'Активна' : 'Скрыта'}
                          </div>
                        </div>
                        <div className={styles.itemActions}>
                          <button
                            className={styles.smallBtn}
                            type="button"
                            onClick={() => startEditCategory(category)}
                          >
                            Редактировать
                          </button>
                          <button
                            className={styles.dangerBtn}
                            type="button"
                            onClick={() => removeCategory(category.id)}
                            disabled={actionLoading === `delete-category-${category.id}`}
                          >
                            {actionLoading === `delete-category-${category.id}` ? '...' : 'Удалить'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : tab === 'stores' ? (
            <>
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
                        onChange={handleLogoUpload}
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
                        onChange={handleCoverUpload}
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
                        src={resolveAssetUrl(fileAssets.find(a => a.id === storeForm.coverAssetId)?.url) ?? ''}
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
                              src={resolveAssetUrl(fileAssets.find(a => a.id === storeForm.coverAssetId)?.url) ?? ''}
                              alt=""
                            />
                            {storeForm.logoAssetId ? (
                              <div className={styles.previewLogo}>
                                <img
                                  src={resolveAssetUrl(fileAssets.find(a => a.id === storeForm.logoAssetId)?.url) ?? ''}
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
                                {categoryOptions.find(c => c.id === storeForm.categoryId)?.name ?? ''}
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
                              {floors.find(f => f.id === storeForm.floorId)?.number ?? ''} этаж
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
                      onClick={submitStore}
                      disabled={actionLoading !== null}
                    >
                      {editingStoreId ? 'Сохранить' : 'Создать'}
                    </button>
                    {editingStoreId ? (
                      <button
                        className={styles.ghostBtn}
                        type="button"
                        onClick={startAddStore}
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
                            {store.floor ? `Этаж ${store.floor.number}` : ''}{store.floor && store.category?.name ? ' · ' : ''}
                            {store.isActive ? 'Активен' : 'Скрыт'} ·{' '}
                            {store.isVisible ? 'Видимый' : 'Скрыт в поиске'}
                          </div>
                        </div>
                        <div className={styles.itemActions}>
                          <button
                            className={styles.smallBtn}
                            type="button"
                            onClick={() => startEditStore(store)}
                          >
                            Редактировать
                          </button>
                          <button
                            className={styles.dangerBtn}
                            type="button"
                            onClick={() => removeStore(store.id)}
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
          ) : tab === 'tenants' ? (
            <>
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
                        onChange={handleTenantLogoUpload}
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
                      onClick={submitTenant}
                      disabled={actionLoading !== null}
                    >
                      {editingTenantId ? 'Сохранить' : 'Создать'}
                    </button>
                    {editingTenantId ? (
                      <button
                        className={styles.ghostBtn}
                        type="button"
                        onClick={startAddTenant}
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
                            onClick={() => startEditTenant(tenant)}
                          >
                            Редактировать
                          </button>
                          <button
                            className={styles.dangerBtn}
                            type="button"
                            onClick={() => removeTenant(tenant.id)}
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
          ) : null}
        </div>
      )}
    </div>
  );
}
