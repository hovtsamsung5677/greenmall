import type { HeaderBanner } from '@api/headerBanners';
import HeaderAdvertisement from './HeaderAdvertisement';
import logoGreenMall from '@assets/icons/logo2.webp';
import qrStyles from './ShareMapButton.module.css';
import translatorRu from '@assets/icons/переводчик рус.svg';
import translatorEn from '@assets/icons/переводчик англ.svg';
import styles from '@styles/MallMap.module.css';
import headerStyles from './HeaderControls.module.css';

type Language = 'ru' | 'en';
const WEEKDAYS = {
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};
const MONTHS = {
  ru: ['Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function MallMapHeader({
  lang,
  onLangChange,
  onOpenAdmin,
  now,
  banner,
}: {
  lang: Language;
  onLangChange: (next: Language) => void;
  onOpenAdmin?: () => void;
  now: Date;
  banner: HeaderBanner | null;
}) {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const date = `${WEEKDAYS[lang][now.getDay()]}, ${now.getDate()} ${MONTHS[lang][now.getMonth()]}`;
  return (
    <header className={styles.header}>
      <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
      <HeaderAdvertisement banner={banner} />
      <div className={`${styles.headerRight} ${headerStyles.controls}`}>
        <div className={styles.dateTime}>
          <span className={`${styles.time} ${headerStyles.time}`}>{time}</span>
          <span className={`${styles.date} ${headerStyles.date}`}>{date}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {onOpenAdmin ? (
            <button className={styles.adminBtn} type="button" onClick={onOpenAdmin}>
              Admin
            </button>
          ) : null}
          <button
            className={`${styles.langSwitch} ${headerStyles.language}`}
            type="button"
            onClick={() => onLangChange(lang === 'en' ? 'ru' : 'en')}
          >
            <img
              src={lang === 'ru' ? translatorRu : translatorEn}
              alt={lang === 'ru' ? 'Переключить на английский' : 'Switch to Russian'}
              className={`${styles.translatorIcon} ${headerStyles.icon}`}
              draggable={false}
            />
          </button>
        </div>
      </div>
    </header>
  );
}

export function FloorControls({
  floors,
  activeFloor,
  onFloorChange,
}: {
  floors: number[];
  activeFloor: number;
  onFloorChange: (floor: number) => void;
}) {
  return (
    <div className={styles.floorControls}>
      {floors.map((floor) => (
        <button
          key={floor}
          type="button"
          className={`${styles.floorBtn} ${activeFloor === floor ? styles.floorBtnActive : ''}`}
          onClick={() => onFloorChange(floor)}
          aria-pressed={activeFloor === floor}
        >
          {floor}
        </button>
      ))}
    </div>
  );
}

export function ZoomControls({
  lang,
  onZoomIn,
  onZoomOut,
  onShare,
  shareLoading,
  hasRoute,
}: {
  lang: Language;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onShare: () => void;
  shareLoading: boolean;
  hasRoute: boolean;
}) {
  return (
    <div className={styles.zoomControls}>
      <button
        type="button"
        className={`${styles.qrBtn} ${qrStyles.button}`}
        aria-label={lang === 'en' ? 'Map to go' : 'Карта с собой'}
        onClick={onShare}
        disabled={shareLoading || !hasRoute}
      >
        <span className={qrStyles.label}>{lang === 'en' ? 'Map to go' : 'Карта с собой'}</span>
        <span className={qrStyles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M2 2h7v7H2V2zm2 2v3h3V4H4zm11-2h7v7h-7V2zm2 2v3h3V4h-3zM2 15h7v7H2v-7zm2 2v3h3v-3H4z" />
            <path d="M11 2h2v3h-2zm0 5h2v5h-2zM2 11h3v2H2zm5 0h2v2H7zm8 0h3v3h-3zm5 0h2v2h-2zm-9 4h3v3h-3zm5 1h3v3h-3zm4-1h2v4h-2zm-9 5h3v2h-3zm5 1h6v1h-6z" />
          </svg>
        </span>
      </button>
      <button type="button" className={styles.zoomBtn} aria-label="Уменьшить" onClick={onZoomOut}>
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" className={styles.zoomBtn} aria-label="Увеличить" onClick={onZoomIn}>
        <svg viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
