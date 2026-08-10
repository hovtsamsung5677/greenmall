import { useEffect, useMemo, useState } from 'react';
import { fetchCategories, fetchStores } from '../api/categories';
import {
  createAdminCategory,
  createAdminStore,
  deleteAdminCategory,
  deleteAdminStore,
  fetchAdminCategories,
  fetchAdminStores,
  login,
  updateAdminCategory,
  updateAdminStore,
  type CreateCategoryInput,
  type CreateStoreInput,
  type UpdateCategoryInput,
  type UpdateStoreInput,
} from '../api/admin';
import {
  fetchCurrentUser,
  setAccessToken,
  type AdminUser,
} from '../api/client';
import type { ApiCategory, ApiStore } from '../api/types';
import styles from './AdminPage.module.css';

type Tab = 'categories' | 'stores';

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
  categoryId: string;
  description: string;
  roomNumber: string;
  phone: string;
  email: string;
  website: string;
  searchKeywords: string;
  isActive: boolean;
  isVisible: boolean;
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
  categoryId: '',
  description: '',
  roomNumber: '',
  phone: '',
  email: '',
  website: '',
  searchKeywords: '',
  isActive: true,
  isVisible: true,
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
    categoryId: store.category?.id ?? '',
    description: store.description ?? '',
    roomNumber: store.roomNumber ?? '',
    phone: '',
    email: '',
    website: '',
    searchKeywords: '',
    isActive: store.isActive,
    isVisible: store.isVisible,
  };
}

export default function AdminPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [categoryForm, setCategoryForm] = useState<AdminCategoryForm>(emptyCategoryForm);
  const [storeForm, setStoreForm] = useState<AdminStoreForm>(emptyStoreForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      const [cats, storesList] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminStores(),
      ]);
      setCategories(cats);
      setStores(storesList);
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
    setEditingCategoryId(null);
    setEditingStoreId(null);
    setCategoryForm(emptyCategoryForm);
    setStoreForm(emptyStoreForm);
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

  function startEditStore(store: ApiStore) {
    setEditingStoreId(store.id);
    setStoreForm(storeToForm(store));
  }

  function startAddStore() {
    setEditingStoreId(null);
    setStoreForm(emptyStoreForm);
  }

  async function submitStore() {
    if (!storeForm.name.trim()) {
      setError('Store name is required');
      return;
    }

    setActionLoading(editingStoreId ?? 'new-store');
    setError(null);

    try {
      if (editingStoreId) {
        const dto: UpdateStoreInput = {
          name: storeForm.name.trim(),
          slug: storeForm.slug.trim() || undefined,
          categoryId: storeForm.categoryId || null,
          description: storeForm.description.trim() || undefined,
          roomNumber: storeForm.roomNumber.trim() || undefined,
          searchKeywords: storeForm.searchKeywords.trim() || undefined,
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
          categoryId: storeForm.categoryId || null,
          description: storeForm.description.trim() || undefined,
          roomNumber: storeForm.roomNumber.trim() || undefined,
          searchKeywords: storeForm.searchKeywords.trim() || undefined,
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

  const categoryOptions = useMemo(() => categories.filter((cat) => cat.isActive), [categories]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Green Mall Admin</h1>
          <p className={styles.userInfo}>
            {user.fullName ?? user.email} · {user.role}
          </p>
        </div>
        <button className={styles.ghostBtn} type="button" onClick={handleLogout}>
          Выйти
        </button>
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
      </nav>

      {error ? <p className={styles.error}>{error}</p> : null}

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
                    categories.map((category) => (
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
          ) : (
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
                    stores.map((store) => (
                      <div key={store.id} className={styles.item}>
                        <div>
                          <div className={styles.itemTitle}>{store.name}</div>
                          <div className={styles.itemMeta}>
                            {store.category?.name ?? 'Без категории'} ·{' '}
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
          )}
        </div>
      )}
    </div>
    );
  }
