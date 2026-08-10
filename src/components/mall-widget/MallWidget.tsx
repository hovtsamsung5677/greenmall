import { useEffect, useMemo, useState } from "react";
import type { Category, SubcategoryItem } from "./types";
import { SearchIcon, ChevronUpIcon, BackIcon, FloorIcon } from "./icons";
import {
  ClothingIcon,
  ShoesIcon,
  ElectronicsIcon,
  BeautyHealthIcon,
  SportIcon,
  HomeGoodsIcon,
  CafesRestaurantsIcon,
  GroceriesIcon,
  KidsGoodsIcon,
  EntertainmentIcon,
  ServicesIcon,
  InfrastructureIcon,
  AtmsIcon,
  ToiletsIcon,
  ParkingIcon,
} from "./icons";
import styles from "./MallWidget.module.css";

import patternImg from "../../assets/fons/fon_ecran_loading.png";

import { fetchCategories, fetchStores } from "../../api/categories";
import type { ApiCategory, ApiStore } from "../../api/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  clothing: ClothingIcon,
  shoes: ShoesIcon,
  electronics: ElectronicsIcon,
  "beauty-and-health": BeautyHealthIcon,
  sport: SportIcon,
  "home-goods": HomeGoodsIcon,
  "cafes-and-restaurants": CafesRestaurantsIcon,
  groceries: GroceriesIcon,
  "kids-goods": KidsGoodsIcon,
  entertainment: EntertainmentIcon,
  services: ServicesIcon,
  infrastructure: InfrastructureIcon,
  atms: AtmsIcon,
  toilets: ToiletsIcon,
  parking: ParkingIcon,
};

const CATEGORY_TRANSLATIONS: Record<string, Record<'ru' | 'en', string>> = {
  clothing: { ru: 'Одежда', en: 'Clothing' },
  shoes: { ru: 'Обувь', en: 'Shoes' },
  electronics: { ru: 'Техника', en: 'Electronics' },
  'beauty-and-health': { ru: 'Красота и здоровье', en: 'Beauty & Health' },
  sport: { ru: 'Спорт', en: 'Sport' },
  'home-goods': { ru: 'Товары для дома', en: 'Home Goods' },
  'cafes-and-restaurants': { ru: 'Кафе и рестораны', en: 'Cafes & Restaurants' },
  groceries: { ru: 'Продукты', en: 'Groceries' },
  'kids-goods': { ru: 'Детские товары', en: 'Kids Goods' },
  entertainment: { ru: 'Развлечения', en: 'Entertainment' },
  services: { ru: 'Услуги', en: 'Services' },
  infrastructure: { ru: 'Инфраструктура', en: 'Infrastructure' },
  atms: { ru: 'Банкоматы', en: 'ATMs' },
  toilets: { ru: 'Туалеты', en: 'Toilets' },
  parking: { ru: 'Парковка', en: 'Parking' },
};

const STORE_TRANSLATIONS: Record<string, Record<'ru' | 'en', string>> = {
  sportmaster: { ru: 'Спортмастер', en: 'Sportmaster' },
  technopark: { ru: 'Технопарк', en: 'Technopark' },
  'green-coffee': { ru: 'Кофейня GREEN', en: 'GREEN Coffee' },
};

type Screen = "categories" | "detail";

function translateCategory(slug: string, fallbackName: string, lang: 'ru' | 'en'): string {
  return CATEGORY_TRANSLATIONS[slug]?.[lang] ?? CATEGORY_TRANSLATIONS[slug]?.ru ?? fallbackName;
}

function translateStore(slug: string, fallbackName: string, lang: 'ru' | 'en'): string {
  return STORE_TRANSLATIONS[slug]?.[lang] ?? STORE_TRANSLATIONS[slug]?.ru ?? fallbackName;
}

function buildWidgetCategories(
  apiCategories: ApiCategory[],
  apiStores: ApiStore[],
  lang: 'ru' | 'en',
): Category[] {
  const storesByCategory = new Map<string, ApiStore[]>();
  for (const store of apiStores) {
    if (!store.category?.id) continue;
    const list = storesByCategory.get(store.category.id) ?? [];
    list.push(store);
    storesByCategory.set(store.category.id, list);
  }

  return apiCategories.map((category) => {
    const categoryStores = storesByCategory.get(category.id) ?? [];

    return {
      id: category.slug,
      title: translateCategory(category.slug, category.name, lang),
      icon: category.icon ?? category.slug,
      items: categoryStores.map((store) => ({ name: translateStore(store.slug, store.name, lang), count: 1 })),
    } satisfies Category;
  });
}

export interface MallWidgetProps {
  open?: boolean;
  categories?: Category[];
  lang?: 'ru' | 'en';
  onSelectItem?: (category: Category, floor: number, item: SubcategoryItem) => void;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export default function MallWidget({
  open = false,
  categories: categoriesProp,
  lang = 'ru',
  onSelectItem,
  onExpand,
  onCollapse,
}: MallWidgetProps) {
  const [screen, setScreen] = useState<Screen>("categories");
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [internalCategories, setInternalCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const categories = useMemo(
    () => categoriesProp ?? internalCategories,
    [categoriesProp, internalCategories],
  );

  useEffect(() => {
    if (categoriesProp) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function loadCategories() {
      setLoading(true);
      setLoadError(false);
      try {
        const [apiCategories, apiStores] = await Promise.all([
          fetchCategories(),
          fetchStores(),
        ]);
        if (cancelled) return;

        const mapped = buildWidgetCategories(apiCategories, apiStores, lang);
        setInternalCategories(mapped);
      } catch (error) {
        if (!cancelled) {
          console.error('MallWidget: failed to load categories', error);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCategories();
    intervalId = setInterval(() => {
      void loadCategories();
    }, 30000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [categoriesProp, lang]);

  function openCategory(cat: Category) {
    setCurrentCategory(cat);
    setScreen("detail");
  }

  function closeDetail() {
    setScreen("categories");
    setCurrentCategory(null);
  }

  function handleSelectItem(item: SubcategoryItem) {
    if (currentCategory) {
      onSelectItem?.(currentCategory, 0, item);
    }
  }

  function getIconKey(cat: Category): string {
    if (cat.iconKey) return cat.iconKey;
    if (cat.icon && ICON_MAP[cat.icon]) return cat.icon;
    return cat.id;
  }

  const items: SubcategoryItem[] = currentCategory?.items ?? [];

  const isLoading = loading && categories.length === 0;

  return (
    <div className={styles.widget}>
      <div className={styles.bgPattern} style={{ backgroundImage: `url(${patternImg})` }} />
      <div className={styles.topbar}>
        {screen === "categories" ? (
          <>
            <div className={styles.searchPill}>
              <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
               <span className={styles.searchPlaceholder}>{lang === 'ru' ? 'Куда отправимся?' : 'Where to?'}</span>
            </div>
             <button
               className={`${styles.collapseBtn} ${open ? styles.collapseBtnOpen : ""}`}
               aria-label={lang === 'ru' ? (open ? 'Свернуть' : 'Открыть') : (open ? 'Collapse' : 'Open')}
               onClick={open ? onCollapse : onExpand}
             >
              <ChevronUpIcon />
            </button>
          </>
        ) : (
          <>
              <div className={styles.searchPill}>
                <button className={styles.iconBtn} aria-label={lang === 'ru' ? 'Назад' : 'Back'} onClick={closeDetail}>
                  <BackIcon />
                </button>
                <span className={styles.title}>{currentCategory?.title}</span>
                <button className={styles.floorBtn} aria-label={lang === 'ru' ? 'Этаж -1' : 'Floor -1'}>
                  -1
                </button>
              </div>
                 <button className={styles.collapseBtn} aria-label={lang === 'ru' ? 'Свернуть' : 'Collapse'} onClick={onCollapse}>
                   <ChevronUpIcon />
                 </button>
          </>
        )}
      </div>

      <div
        className={`${styles.slideWrapper} ${open ? styles.slideWrapperOpen : ""}`}
      >
        <div className={styles.slideInner}>
          {isLoading ? (
            <div className={styles.content}>
              <div className={styles.grid}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className={styles.catCard}>
                    <div className={styles.catIcon} />
                    <span>&nbsp;</span>
                  </div>
                ))}
              </div>
            </div>
          ) : screen === "categories" ? (
            <div className={styles.content}>
                {loadError ? (
                  <div className={styles.emptyState}>{lang === 'ru' ? 'Не удалось загрузить категории' : 'Failed to load categories'}</div>
                ) : null}
              <div className={styles.grid}>
                {categories.map((cat) => {
                  const IconComponent = ICON_MAP[getIconKey(cat)];
                  return (
                    <button
                      key={cat.id}
                      className={styles.catCard}
                      onClick={() => openCategory(cat)}
                    >
                      {IconComponent ? (
                        <IconComponent className={styles.catIcon} />
                      ) : (
                        <div className={styles.catIcon} />
                      )}
                      <span>{cat.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : currentCategory ? (
            <div className={styles.content}>
              <div className={styles.subcatList}>
                {items.length === 0 ? (
                  <div className={styles.emptyState}>{lang === 'ru' ? 'В этой категории пока ничего нет' : 'Nothing here yet'}</div>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.name}
                      className={styles.subcatItem}
                      onClick={() => handleSelectItem(item)}
                    >
                      <span className={styles.name}>{item.name}</span>
                      <span className={styles.count}>{item.count}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
