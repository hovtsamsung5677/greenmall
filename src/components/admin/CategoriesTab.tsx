import type React from 'react';
import type { ApiCategory } from '../../api/types';
import styles from '../AdminPage.module.css';

export type AdminCategoryForm = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: string;
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

export type CategoriesTabProps = {
  categories: ApiCategory[];
  filteredCategories: ApiCategory[];
  categoryForm: AdminCategoryForm;
  setCategoryForm: React.Dispatch<React.SetStateAction<AdminCategoryForm>>;
  editingCategoryId: string | null;
  setEditingCategoryId: (id: string | null) => void;
  actionLoading: string | null;
  error: string | null;
  onSubmit: () => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAddNew: () => void;
};

export default function CategoriesTab({
  categories,
  filteredCategories,
  categoryForm,
  setCategoryForm,
  editingCategoryId,
  setEditingCategoryId,
  actionLoading,
  error,
  onSubmit,
  onRemove,
  onAddNew,
}: CategoriesTabProps) {
  return (
    <>
      {error ? <p className={styles.error}>{error}</p> : null}

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
              onClick={onSubmit}
              disabled={actionLoading !== null}
            >
              {editingCategoryId ? 'Сохранить' : 'Создать'}
            </button>
            {editingCategoryId ? (
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
                    onClick={() => {
                      setEditingCategoryId(category.id);
                      setCategoryForm(categoryToForm(category));
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    className={styles.dangerBtn}
                    type="button"
                    onClick={() => onRemove(category.id)}
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
  );
}

export { emptyCategoryForm };
