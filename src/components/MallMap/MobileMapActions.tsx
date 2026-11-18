import styles from '@styles/MallMap.module.css';

type Language = 'ru' | 'en';

export function MobileMapActions({
  lang,
  open,
  onToggle,
  onOpenCategories,
  onToggleLanguage,
  onOpenRouteBuilder,
}: {
  lang: Language;
  open: boolean;
  onToggle: () => void;
  onOpenCategories: () => void;
  onToggleLanguage: () => void;
  onOpenRouteBuilder: () => void;
}) {
  const isEnglish = lang === 'en';

  return (
    <div className={styles.mobileActions}>
      {open ? (
        <div className={styles.mobileActionsMenu} role="menu" aria-label={isEnglish ? 'Map functions' : 'Функции карты'}>
          <button type="button" role="menuitem" className={styles.mobileActionsItem} onClick={onOpenCategories}>
            <span className={styles.mobileActionsIcon} aria-hidden="true">⌕</span>
            <span>{isEnglish ? 'Categories and search' : 'Категории и поиск'}</span>
          </button>
          <button type="button" role="menuitem" className={styles.mobileActionsItem} onClick={onToggleLanguage}>
            <span className={styles.mobileActionsIcon} aria-hidden="true">文</span>
            <span>{isEnglish ? 'Language: English' : 'Язык: Русский'}</span>
          </button>
          <button type="button" role="menuitem" className={styles.mobileActionsItem} onClick={onOpenRouteBuilder}>
            <span className={styles.mobileActionsIcon} aria-hidden="true">↝</span>
            <span>{isEnglish ? 'Route between stores' : 'Маршрут между магазинами'}</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className={`${styles.mobileActionsToggle} ${open ? styles.mobileActionsToggleOpen : ''}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-label={isEnglish ? 'Map menu' : 'Меню карты'}
      >
        <span aria-hidden="true">{open ? '×' : '☰'}</span>
        <span>{isEnglish ? (open ? 'Close' : 'Menu') : (open ? 'Закрыть' : 'Меню')}</span>
      </button>
    </div>
  );
}
