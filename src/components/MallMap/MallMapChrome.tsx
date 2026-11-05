import type { HeaderBanner } from '@api/headerBanners';
import { resolveAssetUrl } from '@api/fileAssets';
import logoGreenMall from '@assets/icons/logo2.webp';
import qrCodeIcon from '@assets/icons/qr_code.webp';
import qrCodeEngIcon from '@assets/icons/qr_code_eng.webp';
import translatorRu from '@assets/icons/переводчик рус.svg';
import translatorEn from '@assets/icons/переводчик англ.svg';
import styles from '@styles/MallMap.module.css';

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
      {banner?.asset ? (
        <div className={styles.headerBanner}>
          <img
            src={resolveAssetUrl(banner.asset.url)}
            alt={banner.title}
            className={styles.headerBannerImage}
            onClick={() =>
              banner.linkUrl && window.open(banner.linkUrl, '_blank', 'noopener,noreferrer')
            }
            style={{ cursor: banner.linkUrl ? 'pointer' : 'default' }}
          />
        </div>
      ) : null}
      <div className={styles.headerRight}>
        <div className={styles.dateTime}>
          <span className={styles.time}>{time}</span>
          <span className={styles.date}>{date}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {onOpenAdmin ? (
            <button className={styles.adminBtn} type="button" onClick={onOpenAdmin}>
              Admin
            </button>
          ) : null}
          <button
            className={styles.langSwitch}
            type="button"
            onClick={() => onLangChange(lang === 'en' ? 'ru' : 'en')}
          >
            <img
              src={lang === 'ru' ? translatorRu : translatorEn}
              alt={lang === 'ru' ? 'Переключить на английский' : 'Switch to Russian'}
              className={styles.translatorIcon}
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
        className={styles.qrBtn}
        aria-label={lang === 'en' ? 'Share route via QR' : 'Поделиться маршрутом через QR'}
        onClick={onShare}
        disabled={shareLoading || !hasRoute}
      >
        <img src={lang === 'en' ? qrCodeEngIcon : qrCodeIcon} alt="" />
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
