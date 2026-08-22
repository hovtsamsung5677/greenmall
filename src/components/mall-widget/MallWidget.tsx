import { useEffect, useMemo, useState } from "react";
import type { Category, SubcategoryItem } from "./types";
import { SearchIcon, ChevronUpIcon, BackIcon, FloorIcon } from "./icons";

import clothingIcon from "../../assets/icons/Одежда.svg";
import shoesIcon from "../../assets/icons/обувь.svg";
import electronicsIcon from "../../assets/icons/техника.svg";
import beautyIcon from "../../assets/icons/красота и здоровье.svg";
import sportIcon from "../../assets/icons/спорт.svg";
import homeGoodsIcon from "../../assets/icons/товары для дома.svg";
import cafesIcon from "../../assets/icons/кафе и рестораны.svg";
import groceriesIcon from "../../assets/icons/продукты.svg";
import kidsIcon from "../../assets/icons/детские товары.svg";
import entertainmentIcon from "../../assets/icons/развлечения.svg";
import servicesIcon from "../../assets/icons/услуги.svg";
import infrastructureIcon from "../../assets/icons/инфраструктура.svg";
import atmsIcon from "../../assets/icons/банкомат.svg";
import toiletsIcon from "../../assets/icons/туалеты.svg";
import parkingIcon from "../../assets/icons/парковка.svg";
import styles from "./MallWidget.module.css";

import patternImg from "../../assets/fons/fon_ecran_loading.png";

import { fetchCategories, fetchStores } from "../../api/categories";
import { resolveAssetUrl } from "../../api/fileAssets";
import type { ApiCategory, ApiStore, ApiFileAsset } from "../../api/types";

const ICON_MAP: Record<string, string | React.ComponentType<{ className?: string }>> = {
  clothing: clothingIcon,
  shoes: shoesIcon,
  electronics: electronicsIcon,
  "beauty-and-health": beautyIcon,
  sport: sportIcon,
  "home-goods": homeGoodsIcon,
  "cafes-and-restaurants": cafesIcon,
  groceries: groceriesIcon,
  "kids-goods": kidsIcon,
  entertainment: entertainmentIcon,
  services: servicesIcon,
  infrastructure: infrastructureIcon,
  atms: atmsIcon,
  toilets: toiletsIcon,
  parking: parkingIcon,
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

type Screen = "categories" | "detail" | "store-detail";

function translateCategory(slug: string, fallbackName: string, lang: 'ru' | 'en'): string {
  return CATEGORY_TRANSLATIONS[slug]?.[lang] ?? CATEGORY_TRANSLATIONS[slug]?.ru ?? fallbackName;
}

function translateStore(slug: string, fallbackName: string, lang: 'ru' | 'en'): string {
  return STORE_TRANSLATIONS[slug]?.[lang] ?? STORE_TRANSLATIONS[slug]?.ru ?? fallbackName;
}

export interface MallWidgetProps {
  open?: boolean;
  categories?: Category[];
  lang?: 'ru' | 'en';
  refreshKey?: number;
  onSelectItem?: (category: Category, floor: number, item: SubcategoryItem) => void;
  onPickStore?: (store: ApiStore) => void;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export default function MallWidget({
  open = false,
  categories: categoriesProp,
  lang = 'ru',
  refreshKey,
  onSelectItem,
  onPickStore,
  onExpand,
  onCollapse,
}: MallWidgetProps) {
  const [screen, setScreen] = useState<Screen>("categories");
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [selectedStore, setSelectedStore] = useState<ApiStore | null>(null);
  const [internalCategories, setInternalCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const categories = useMemo(
    () => categoriesProp ?? internalCategories,
    [categoriesProp, internalCategories],
  );

  const storesById = useMemo(() => {
    const map = new Map<string, ApiStore>();
    const source = categoriesProp ?? internalCategories;
    for (const cat of source) {
      for (const item of cat.items) {
        if (item.storeId && item.store) {
          map.set(item.storeId, item.store);
        }
      }
    }
    return map;
  }, [categoriesProp, internalCategories]);

  useEffect(() => {
    console.log('[MallWidget] mount/refresh useEffect', { categoriesProp: !!categoriesProp, lang, refreshKey });
    if (categoriesProp) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function loadCategories() {
      console.log('[MallWidget] loadCategories start', { categoriesProp: !!categoriesProp, lang, refreshKey });
      setLoading(true);
      setLoadError(false);
      try {
        const [apiCategories, apiStores] = await Promise.all([
          fetchCategories(),
          fetchStores(),
        ]);
         console.log('[MallWidget] loaded', { categories: apiCategories.length, stores: apiStores.length });
         if (cancelled) return;

        const storesByCategory = new Map<string, ApiStore[]>();
        const storesByIdMap = new Map<string, ApiStore>();
        const storesWithoutCategory: ApiStore[] = [];
        for (const store of apiStores) {
          if (store.category?.id) {
            const list = storesByCategory.get(store.category.id) ?? [];
            list.push(store);
            storesByCategory.set(store.category.id, list);
          } else {
            storesWithoutCategory.push(store);
          }
          storesByIdMap.set(store.id, store);
        }

        const mapped = apiCategories.map((category) => {
          const categoryStores = storesByCategory.get(category.id) ?? [];
          return {
            id: category.id,
            title: translateCategory(category.slug, category.name, lang),
            icon: category.icon ?? category.slug,
            items: categoryStores.map((store) => ({
              name: translateStore(store.slug, store.name, lang),
              count: 1,
              storeId: store.id,
              store,
            })),
          };
        });

        if (storesWithoutCategory.length > 0) {
          const uncategorized: Category = {
            id: '__uncategorized',
            title: lang === 'ru' ? 'Другое' : 'Other',
            icon: 'infrastructure',
            items: storesWithoutCategory.map((store) => ({
              name: translateStore(store.slug, store.name, lang),
              count: 1,
              storeId: store.id,
              store,
            })),
          };
          mapped.push(uncategorized);
        }

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

  useEffect(() => {
    console.log('[MallWidget] refreshKey useEffect', { categoriesProp: !!categoriesProp, lang, refreshKey });
    if (categoriesProp || refreshKey == null) return;

    let cancelled = false;

    async function reload() {
      setLoading(true);
      setLoadError(false);
      try {
        const [apiCategories, apiStores] = await Promise.all([
          fetchCategories(),
          fetchStores(),
        ]);
        if (cancelled) return;

        const storesByCategory = new Map<string, ApiStore[]>();
        const storesByIdMap = new Map<string, ApiStore>();
        const storesWithoutCategory: ApiStore[] = [];
        for (const store of apiStores) {
          if (store.category?.id) {
            const list = storesByCategory.get(store.category.id) ?? [];
            list.push(store);
            storesByCategory.set(store.category.id, list);
          } else {
            storesWithoutCategory.push(store);
          }
          storesByIdMap.set(store.id, store);
        }

         const mapped = apiCategories.map((category) => {
           const categoryStores = storesByCategory.get(category.id) ?? [];
           return {
             id: category.id,
             title: translateCategory(category.slug, category.name, lang),
             icon: category.icon ?? category.slug,
             items: categoryStores.map((store) => ({
               name: translateStore(store.slug, store.name, lang),
               count: 1,
               storeId: store.id,
               store,
             })),
           } satisfies Category & { items: (SubcategoryItem & { storeId: string; store: ApiStore })[] };
         });

        if (storesWithoutCategory.length > 0) {
          const uncategorized: Category = {
            id: '__uncategorized',
            title: lang === 'ru' ? 'Другое' : 'Other',
            icon: 'infrastructure',
            items: storesWithoutCategory.map((store) => ({
              name: translateStore(store.slug, store.name, lang),
              count: 1,
              storeId: store.id,
              store,
            })),
          };
          mapped.push(uncategorized);
        }

        setInternalCategories(mapped);
      } catch (error) {
        if (!cancelled) {
          console.error('MallWidget: failed to reload categories', error);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void reload();

    return () => {
      cancelled = true;
    };
  }, [categoriesProp, lang, refreshKey]);

  function openCategory(cat: Category) {
    setCurrentCategory(cat);
    setSelectedStore(null);
    setScreen("detail");
  }

  function openStore(store: ApiStore) {
    setSelectedStore(store);
    setScreen("store-detail");
  }

  function closeDetail() {
    setScreen("categories");
    setCurrentCategory(null);
    setSelectedStore(null);
  }

  function handleSelectItem(item: SubcategoryItem) {
    if (currentCategory) {
      onSelectItem?.(currentCategory, 0, item);
      if (item.store) {
        onPickStore?.(item.store);
      }
    }
  }

  function goBackToCategory() {
    setScreen("detail");
    setSelectedStore(null);
  }

  function getIconKey(cat: Category): string {
    if (cat.iconKey) return cat.iconKey;
    if (cat.icon && ICON_MAP[cat.icon]) return cat.icon;
    return cat.id;
  }

  const items: SubcategoryItem[] = currentCategory?.items ?? [];
  const isLoading = loading && categories.length === 0;

  function formatWorkingHours(workingHours: Record<string, unknown> | null): { days: string; time: string } {
    if (!workingHours || typeof workingHours !== 'object') return { days: '', time: '' };
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayNamesRu: Record<string, string> = { mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс' };

    let firstDay = '';
    let lastDay = '';
    let startTime = '';
    let endTime = '';

    for (const day of days) {
      const hours = workingHours[day];
      if (hours && typeof hours === 'object') {
        const h = hours as Record<string, unknown>;
        const start = typeof h.start === 'string' ? h.start : '';
        const end = typeof h.end === 'string' ? h.end : '';
        if (start && end) {
          if (!firstDay) {
            firstDay = dayNamesRu[day] || day;
            startTime = start;
          }
          lastDay = dayNamesRu[day] || day;
          endTime = end;
        }
      }
    }

    if (firstDay && lastDay && startTime && endTime) {
      const daysText = firstDay === lastDay ? firstDay : `${firstDay}-${lastDay}`;
      return { days: daysText, time: `${startTime}-${endTime}` };
    }
    return { days: '', time: '' };
  }

  return (
    <div className={`${styles.widget} ${screen === "store-detail" ? styles.widgetStoreDetail : ""}`}>
      <div className={styles.bgPattern} style={{ backgroundImage: `url(${patternImg})` }} />
      <div className={styles.topbar}>
         {screen === "categories" ? (
           <>
             <div className={`${styles.searchPill} ${styles.mainSearchPill}`}>
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
         ) : screen === "store-detail" && selectedStore ? (
          <>
              <div className={styles.searchPill}>
                <button className={styles.iconBtn} aria-label={lang === 'ru' ? 'Назад' : 'Back'} onClick={goBackToCategory}>
                  <BackIcon />
                </button>
                <span className={styles.title}>{selectedStore.name}</span>
              </div>
              <button className={styles.collapseBtn} aria-label={lang === 'ru' ? 'Свернуть' : 'Collapse'} onClick={onCollapse}>
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
                <button className={styles.floorBtn} aria-label={lang === 'ru' ? 'Этаж 0' : 'Floor 0'}>
                  0
                </button>
              </div>
                 <button className={styles.collapseBtn} aria-label={lang === 'ru' ? 'Свернуть' : 'Collapse'} onClick={onCollapse}>
                   <ChevronUpIcon />
                 </button>
          </>
        )}
      </div>

      <div
        className={`${styles.slideWrapper} ${open ? styles.slideWrapperOpen : ""} ${screen === "store-detail" ? styles.storeDetailSlideWrapper : ""}`}
      >
        <div className={`${styles.slideInner} ${screen === "store-detail" ? styles.storeDetailSlideInner : ""}`}>
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
                  const iconEntry = ICON_MAP[getIconKey(cat)];
                  const IconComp = (
                    typeof iconEntry === "function"
                      ? iconEntry
                      : null
                  ) as React.ComponentType<{ className?: string }> | null;
                  const iconUrl = typeof iconEntry === "string" ? iconEntry : null;
                  return (
                    <button
                      key={cat.id}
                      className={styles.catCard}
                      onClick={() => openCategory(cat)}
                    >
                      {iconUrl ? (
                        <img className={styles.catIcon} src={iconUrl} alt="" />
                      ) : IconComp ? (
                        <IconComp className={styles.catIcon} />
                      ) : (
                        <div className={styles.catIcon} />
                      )}
                      <span>{cat.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
           ) : screen === "store-detail" && selectedStore ? (
            <div className={`${styles.content} ${styles.storeDetailContent}`}>
              <div className={styles.storeCardScroll}>
              <div className={styles.storeCard}>
                {selectedStore.coverAsset ? (
                  <div className={styles.storeCover}>
                    <img src={resolveAssetUrl(selectedStore.coverAsset?.url)} alt={selectedStore.name} />
                    {selectedStore.logoAsset ? (
                      <div className={styles.storeLogo}>
                        <img src={resolveAssetUrl(selectedStore.logoAsset.url)} alt={selectedStore.name} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className={styles.storeBody}>
                  <div className={styles.storeTopRow}>
                    {selectedStore.category ? (
                      <span className={styles.storeCategory}>{selectedStore.category.name}</span>
                    ) : null}
                    {(() => {
                      const wh = formatWorkingHours(selectedStore.workingHours);
                      return wh.days || wh.time ? (
                        <span className={styles.storeHours}>
                          <span className={styles.storeHoursDays}>{wh.days}</span>
                          <span className={styles.storeHoursTime}>{wh.time}</span>
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <h3 className={styles.storeName}>{selectedStore.name}</h3>
                  {selectedStore.floor ? (
                    <p className={styles.storeFloor}>{selectedStore.floor.number} {lang === 'ru' ? 'этаж' : 'floor'}</p>
                  ) : null}
                  <button
                    className={styles.routeBtn}
                    onClick={() => selectedStore && onPickStore?.(selectedStore)}
                  >
                    {lang === 'ru' ? 'Продолжить маршрут' : 'Continue route'}
                  </button>
                </div>
              </div>
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
