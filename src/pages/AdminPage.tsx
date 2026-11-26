import { useMemo, useState, lazy, Suspense } from 'react';
import React from 'react';
import { fetchCategories, fetchStores } from '@api/categories';
import { fetchFloors } from '@api/floors';
import { fetchFileAssets, uploadFileAsset, resolveAssetUrl } from '@api/fileAssets';
import {
  fetchAdminPromotions,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
  type CreatePromotionInput,
  type PromotionAdmin,
  type UpdatePromotionInput,
} from '@api/promotionsAdmin';
import {
  createAdminCategory,
  createAdminStore,
  createAdminTenant,
  deleteAdminCategory,
  deleteAdminStore,
  deleteAdminTenant,
  fetchAdminCategories,
  fetchAdminStores,
  fetchAdminTenants,
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
import { useAdminSession } from '@hooks/useAdminSession';
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
import BannersTab, { type BannersTabProps } from '@components/admin/BannersTab';
import StatisticsTab from '@components/admin/StatisticsTab';
import { AdminErrorBoundary } from '@components/admin/AdminErrorBoundary';
import styles from '@styles/AdminPage.module.css';

const RouteAdminPanel = lazy(() => import('@components/route-editor/RouteAdminPanel'));
const FloorIconsTab = lazy(() => import('@components/admin/FloorIconsTab'));
const PromotionsTab = lazy(() => import('@components/admin/PromotionsTab'));
const RouteSharePreview = lazy(() => import('./RouteSharePreview'));

const emptyPromotionForm: CreatePromotionInput & { id?: string | null } = {
  title: '',
  slug: '',
  description: '',
  terms: '',
  buttonText: '',
  buttonUrl: '',
  tenantId: null,
  storeId: null,
  imageAssetId: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
  sortOrder: 0,
  metadata: null,
};

type Tab = 'categories' | 'stores' | 'tenants' | 'routes' | 'mobile' | 'banners' | 'icons' | 'statistics' | 'promotions';

type AdminIconName = 'grid' | 'store' | 'users' | 'route' | 'phone' | 'image' | 'pin' | 'chart' | 'tag';

const SECTION_INFO: Record<Tab, { title: string; description: string; icon: AdminIconName }> = {
  categories: { title: 'Категории', description: 'Структура каталога и группировка магазинов.', icon: 'grid' },
  stores: { title: 'Магазины', description: 'Карточки, расположение, медиа и часы работы.', icon: 'store' },
  tenants: { title: 'Арендаторы', description: 'Контакты и данные компаний торгового центра.', icon: 'users' },
  routes: { title: 'Маршруты', description: 'Точки, рёбра и переходы между этажами.', icon: 'route' },
  mobile: { title: 'QR-страница', description: 'Мобильная карта для посетителей GreenMall.', icon: 'phone' },
  banners: { title: 'Баннеры', description: 'Рекламные изображения, форматы и расписание.', icon: 'image' },
  icons: { title: 'Иконки на карте', description: 'Обозначения объектов на моделях этажей.', icon: 'pin' },
  statistics: { title: 'Аналитика', description: 'Использование навигации и ключевые показатели.', icon: 'chart' },
  promotions: { title: 'Акции', description: 'Предложения магазинов, сроки и публикация.', icon: 'tag' },
};

const NAV_GROUPS: Array<{ label: string; items: Tab[] }> = [
  { label: 'Каталог', items: ['stores', 'categories', 'tenants'] },
  { label: 'Контент', items: ['banners', 'promotions'] },
  { label: 'Навигация', items: ['routes', 'icons', 'mobile'] },
  { label: 'Отчёты', items: ['statistics'] },
];

const SEARCHABLE_TABS: Tab[] = ['categories', 'stores', 'tenants', 'promotions'];

function AdminIcon({ name }: { name: AdminIconName }) {
  const paths: Record<AdminIconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    store: <><path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6"/><path d="M8 20v-6h8v6"/><path d="M3 10c0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0 0 2 3 2 3 0"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    route: <><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M8.5 16.5 16 8.5M6 15V7a3 3 0 0 1 3-3h4"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
    tag: <><path d="M20.6 13.6 11 4H4v7l9.6 9.6a2 2 0 0 0 2.8 0l4.2-4.2a2 2 0 0 0 0-2.8Z"/><circle cx="7.5" cy="7.5" r="1"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export interface AdminPageProps {
  onClose?: () => void;
}

export default function AdminPage({ onClose }: AdminPageProps = {}) {
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('categories');
  const [compact, setCompact] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [tenants, setTenants] = useState<ApiTenant[]>([]);
  const [fileAssets, setFileAssets] = useState<ApiFileAsset[]>([]);
  const [promotions, setPromotions] = useState<PromotionAdmin[]>([]);
  const [promotionForm, setPromotionForm] = useState<CreatePromotionInput & { id?: string | null }>(emptyPromotionForm);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<AdminCategoryForm>(emptyCategoryForm);
  const [storeForm, setStoreForm] = useState<AdminStoreForm>(emptyStoreForm);
  const [tenantForm, setTenantForm] = useState<AdminTenantForm>(emptyTenantForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingTenantLogo, setUploadingTenantLogo] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const coverFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const panoramaFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const tenantLogoFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const {
    user,
    loading,
    setLoading,
    email: loginEmail,
    setEmail: setLoginEmail,
    password: loginPassword,
    setPassword: setLoginPassword,
    error: loginError,
    loginLoading,
    handleLogin,
    logout: handleLogout,
  } = useAdminSession({ loadData, resetData: resetAdminData });

  async function loadData() {
    try {
      const [cats, storesList, floorsList, tenantsList, assets, promotionsList] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminStores(),
        fetchFloors(),
        fetchAdminTenants(),
        fetchFileAssets(),
        fetchAdminPromotions(),
      ]);
      setCategories(cats);
      setStores(storesList);
      setFloors(floorsList);
      setTenants(tenantsList);
      setFileAssets(assets);
      setPromotions(promotionsList);
    } finally {
      setLoading(false);
    }
  }

  function resetAdminData() {
    setCategories([]);
    setStores([]);
    setFloors([]);
    setTenants([]);
    setFileAssets([]);
    setPromotions([]);
    setEditingCategoryId(null);
    setEditingStoreId(null);
    setEditingTenantId(null);
    setEditingPromotionId(null);
    setCategoryForm(emptyCategoryForm);
    setStoreForm(emptyStoreForm);
    setTenantForm(emptyTenantForm);
    setPromotionForm(emptyPromotionForm);
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
          panoramaAssetId: storeForm.panoramaAssetId || null,
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
          panoramaAssetId: storeForm.panoramaAssetId || null,
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

  async function submitPromotion() {
    if (!promotionForm.title.trim()) {
      setError('Название акции обязательно');
      return;
    }
    if (!promotionForm.slug.trim()) {
      setError('Slug акции обязательно');
      return;
    }

    setActionLoading(editingPromotionId ?? 'new-promotion');
    setError(null);

    try {
      const dto: CreatePromotionInput = {
        title: promotionForm.title.trim(),
        slug: promotionForm.slug.trim(),
        description: promotionForm.description?.trim() || null,
        terms: promotionForm.terms?.trim() || null,
        buttonText: promotionForm.buttonText?.trim() || null,
        buttonUrl: promotionForm.buttonUrl?.trim() || null,
        tenantId: promotionForm.tenantId || null,
        storeId: promotionForm.storeId || null,
        imageAssetId: promotionForm.imageAssetId || null,
        startsAt: promotionForm.startsAt || null,
        endsAt: promotionForm.endsAt || null,
        isActive: promotionForm.isActive ?? true,
        sortOrder: Number(promotionForm.sortOrder) || 0,
        metadata: promotionForm.metadata ?? null,
      };

      if (editingPromotionId) {
        const updated = await updateAdminPromotion(editingPromotionId, dto);
        setPromotions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createAdminPromotion(dto);
        setPromotions((prev) => [created, ...prev]);
      }
      setEditingPromotionId(null);
      setPromotionForm(emptyPromotionForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save promotion');
    } finally {
      setActionLoading(null);
    }
  }

  async function removePromotion(id: string) {
    setActionLoading(`delete-promotion-${id}`);
    setError(null);

    try {
      const deleted = await deleteAdminPromotion(id);
      setPromotions((prev) => prev.map((p) => (p.id === deleted.id ? deleted : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete promotion');
    } finally {
      setActionLoading(null);
    }
  }

  function startEditPromotion(promotion: PromotionAdmin) {
    setEditingPromotionId(promotion.id);
    setPromotionForm({
      id: promotion.id,
      title: promotion.title,
      slug: promotion.slug,
      description: promotion.description ?? '',
      terms: promotion.terms ?? '',
      buttonText: promotion.buttonText ?? '',
      buttonUrl: promotion.buttonUrl ?? '',
      tenantId: promotion.tenantId,
      storeId: promotion.storeId,
      imageAssetId: promotion.imageAssetId,
      startsAt: promotion.startsAt,
      endsAt: promotion.endsAt,
      isActive: promotion.isActive,
      sortOrder: promotion.sortOrder,
      metadata: null,
    });
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

  async function handlePanoramaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    setError(null);
    try {
      const asset = await uploadFileAsset(file, 'IMAGE');
      setFileAssets((prev) => [asset, ...prev]);
      setStoreForm((prev) => ({ ...prev, panoramaAssetId: asset.id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload panorama');
    } finally {
      setUploadingCover(false);
      if (panoramaFileInputRef.current) panoramaFileInputRef.current.value = '';
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
      setRefreshKey((prev) => prev + 1);
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
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginBrand}>
            <span className={styles.brandMark}>G</span>
            <div>
              <h1 className={styles.loginTitle}>GreenMall</h1>
              <p className={styles.loginSubtitle}>Панель управления</p>
            </div>
          </div>
          <div className={styles.loginIntro}>
            <h2>Вход для сотрудников</h2>
            <p>Управление каталогом, навигацией и рекламными материалами торгового центра.</p>
          </div>
          <form className={styles.loginForm} onSubmit={handleLogin}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                className={styles.input}
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@greenmall.local"
                autoComplete="username"
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
                autoComplete="current-password"
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
    <div className={`${styles.page} ${compact ? styles.compact : ''}`}>
      <header className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>G</span>
          <div className={styles.brandCopy}>
            <span className={styles.brandTitleRow}>
              <strong className={styles.brandName}>GreenMall</strong>
              <span className={styles.brandBadge}>Admin</span>
            </span>
            <span className={styles.brandMeta}>Панель управления ТЦ</span>
          </div>
        </div>
        <nav className={styles.tabs} aria-label="Разделы управления">
          {NAV_GROUPS.map((group) => (
            <div className={styles.navGroup} key={group.label}>
              <span className={styles.navGroupTitle}>{group.label}</span>
              {group.items.map((item) => {
                const info = SECTION_INFO[item];
                return (
                  <button
                    type="button"
                    className={`${styles.tab} ${tab === item ? styles.tabActive : ''}`}
                    onClick={() => setTab(item)}
                    aria-current={tab === item ? 'page' : undefined}
                    key={item}
                  >
                    <span className={styles.tabIcon}><AdminIcon name={info.icon} /></span>
                    <span className={styles.tabText}>{info.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <div className={styles.profile}>
            <span className={styles.profileAvatar}>
              {(user.fullName ?? user.email).slice(0, 1).toUpperCase()}
              <span className={styles.profileStatus} aria-hidden="true" />
            </span>
            <span className={styles.profileText}>
              <strong className={styles.profileName}>{user.fullName ?? user.email}</strong>
              <span className={styles.profileRole}>{user.role}</span>
            </span>
          </div>
          <button
            className={`${styles.logoutBtn} gm-admin-logout`}
            type="button"
            onClick={handleLogout}
          >
            <span aria-hidden="true">↗</span>
            <span>Выйти</span>
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <header className={styles.header}>
          <div className={styles.headerTitleRow}>
            <span className={styles.headerIcon}><AdminIcon name={SECTION_INFO[tab].icon} /></span>
            <div>
              <span className={styles.sectionEyebrow}>GreenMall Admin</span>
              <h1 className={styles.heading}>{SECTION_INFO[tab].title}</h1>
              <p className={styles.sectionDescription}>{SECTION_INFO[tab].description}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.ghostBtn} type="button" aria-pressed={compact}
              onClick={() => setCompact(value => !value)} title="Уменьшить отступы в формах и списках">
              {compact ? 'Обычный вид' : 'Компактно'}
            </button>
            {onClose ? (
              <button className={styles.ghostBtn} type="button" onClick={onClose}>
                Вернуться к карте
              </button>
            ) : null}
            <button
              className={styles.refreshBtn}
              type="button"
              onClick={refreshData}
              disabled={refreshing}
            >
              <span aria-hidden="true" className={refreshing ? styles.spinning : ''}>↻</span>
              {refreshing ? 'Обновление…' : 'Обновить данные'}
            </button>
          </div>
        </header>
        <main className={styles.content}>
      {SEARCHABLE_TABS.includes(tab) ? (
        <div className={styles.searchRow} role="search">
          <span className={styles.searchIcon} aria-hidden="true">⌕</span>
          <input
            className={styles.input}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Поиск: ${SECTION_INFO[tab].title.toLowerCase()}…`}
            aria-label={`Поиск в разделе «${SECTION_INFO[tab].title}»`}
          />
          {search ? (
            <button className={styles.clearSearchBtn} type="button" onClick={() => setSearch('')}>
              Очистить
            </button>
          ) : null}
          <span className={styles.searchCount} aria-live="polite">
            {tab === 'categories'
              ? `${filteredCategories.length} категорий`
              : tab === 'stores'
                ? `${filteredStores.length} магазинов`
                : tab === 'tenants'
                  ? `${filteredTenants.length} арендаторов`
                  : `${promotions.filter((promotion) => {
                      const query = search.trim().toLowerCase();
                      return !query || promotion.title.toLowerCase().includes(query) || promotion.slug.toLowerCase().includes(query);
                    }).length} акций`}
          </span>
        </div>
      ) : null}

      {tab === 'routes' ? (
            <AdminErrorBoundary>
          <Suspense fallback={<div className={styles.loading}>Загрузка редактора…</div>}>
            <RouteAdminPanel />
          </Suspense>
            </AdminErrorBoundary>
      ) : tab === 'mobile' ? (
        <Suspense fallback={<div className={styles.loading}>Загрузка QR-страницы…</div>}>
          <RouteSharePreview />
        </Suspense>
      ) : tab === 'icons' ? (
        <Suspense fallback={<div className={styles.loading}>Загрузка редактора иконок…</div>}>
          <FloorIconsTab />
        </Suspense>
      ) : tab === 'statistics' ? (
        <StatisticsTab onRefreshKey={refreshKey} />
      ) : tab === 'promotions' ? (
        <Suspense fallback={<div className={styles.loading}>Загрузка акций…</div>}>
          <PromotionsTab
            promotions={promotions}
            filteredPromotions={promotions.filter((p) => {
              const q = search.trim().toLowerCase();
              if (!q) return true;
              return (
                p.title.toLowerCase().includes(q) ||
                p.slug.toLowerCase().includes(q) ||
                p.store?.name.toLowerCase().includes(q)
              );
            })}
            promotionForm={promotionForm}
            setPromotionForm={setPromotionForm}
            editingPromotionId={editingPromotionId}
            setEditingPromotionId={setEditingPromotionId}
            actionLoading={actionLoading}
            stores={stores}
            tenants={tenants}
            fileAssets={fileAssets}
            error={error}
            onSubmit={submitPromotion}
            onRemove={removePromotion}
            onAddNew={() => {
              setEditingPromotionId(null);
              setPromotionForm(emptyPromotionForm);
            }}
            onEdit={startEditPromotion}
          />
        </Suspense>
      ) : (
        <>
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
                  onPanoramaUpload={handlePanoramaUpload}
                  uploadingCover={uploadingCover}
                  coverFileInputRef={coverFileInputRef}
                  logoFileInputRef={logoFileInputRef}
                  panoramaFileInputRef={panoramaFileInputRef}
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
              {tab === 'banners' && (
                <BannersTab
                  stores={stores}
                  fileAssets={fileAssets}
                  actionLoading={actionLoading}
                  error={error}
                  setError={setError}
                  onRefresh={loadData}
                />
              )}
            </div>
          )}
        </>
      )}
        </main>
      </div>
    </div>
  );
}
