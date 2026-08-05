import { useState } from "react";
import type { Category, SubcategoryItem } from "./types";
import { CATEGORIES } from "./data";
import { SearchIcon, ChevronUpIcon, BackIcon, CloseIcon } from "./icons";
import styles from "./MallWidget.module.css";

import shopImg from "../../assets/icons/shop.png";
import eatImg from "../../assets/icons/eat.png";
import kidsImg from "../../assets/icons/kids.png";
import razvlImg from "../../assets/icons/razvl.png";
import uslugiImg from "../../assets/icons/uslugi.png";
import patternImg from "../../assets/fons/fon_ecran_loading.png";

const ICON_MAP: Record<string, string> = {
  shop: shopImg,
  eat: eatImg,
  kids: kidsImg,
  razvl: razvlImg,
  uslugi: uslugiImg,
};

type Screen = "categories" | "detail";

export interface MallWidgetProps {
  open?: boolean;
  categories?: Category[];
  onSelectItem?: (category: Category, floor: number, item: SubcategoryItem) => void;
  onExpand?: () => void;
  onCollapse?: () => void;
}

export default function MallWidget({
  open = false,
  categories = CATEGORIES,
  onSelectItem,
  onExpand,
  onCollapse,
}: MallWidgetProps) {
  const [screen, setScreen] = useState<Screen>("categories");
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [currentFloor, setCurrentFloor] = useState<number | null>(null);

  function openCategory(cat: Category) {
    setCurrentCategory(cat);
    setCurrentFloor(cat.floors[0] ?? null);
    setScreen("detail");
  }

  function closeDetail() {
    setScreen("categories");
    setCurrentCategory(null);
    setCurrentFloor(null);
  }

  function handleSelectItem(item: SubcategoryItem) {
    if (currentCategory && currentFloor !== null) {
      onSelectItem?.(currentCategory, currentFloor, item);
    }
  }

  const items: SubcategoryItem[] =
    currentCategory && currentFloor !== null
      ? currentCategory.items[currentFloor] ?? []
      : [];

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
              <span className={styles.searchPlaceholder}>Куда отправимся?</span>
            </div>
            <button
              className={`${styles.collapseBtn} ${open ? styles.collapseBtnOpen : ""}`}
              aria-label={open ? "Свернуть" : "Открыть"}
              onClick={open ? onCollapse : onExpand}
            >
              <ChevronUpIcon />
            </button>
          </>
        ) : (
          <>
            <div className={styles.searchPill}>
              <button className={styles.iconBtn} aria-label="Назад" onClick={closeDetail}>
                <BackIcon />
              </button>
              <span className={styles.title}>{currentCategory?.title}</span>
              <button className={styles.iconBtn} aria-label="Закрыть" onClick={closeDetail}>
                <CloseIcon />
              </button>
            </div>
                <button className={styles.collapseBtn} aria-label="Свернуть" onClick={onCollapse}>
                  <ChevronUpIcon />
                </button>
          </>
        )}
      </div>

      <div
        className={`${styles.slideWrapper} ${open ? styles.slideWrapperOpen : ""}`}
      >
        <div className={styles.slideInner}>
          {screen === "categories" ? (
            <div className={styles.content}>
              <div className={styles.grid}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={styles.catCard}
                    onClick={() => openCategory(cat)}
                  >
                    <img src={ICON_MAP[cat.id]} alt={cat.title} />
                    <span>{cat.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : currentCategory ? (
            <div className={styles.content}>
              <div className={styles.floors}>
                {currentCategory.floors.map((floor) => (
                  <button
                    key={floor}
                    className={`${styles.floorOption} ${floor === currentFloor ? styles.active : ""}`}
                    onClick={() => setCurrentFloor(floor)}
                  >
                    <span className={styles.floorRadio} />
                    <span>{floor} этаж</span>
                  </button>
                ))}
              </div>

              <div className={styles.subcatList}>
                {items.length === 0 ? (
                  <div className={styles.emptyState}>На этом этаже пока ничего нет</div>
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
