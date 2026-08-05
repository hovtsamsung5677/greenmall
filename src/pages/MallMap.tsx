import { useState } from 'react';
import styles from './MallMap.module.css';

import logoGreenMall from '../assets/icons/logo2.png';
import tochkaIcon from '../assets/icons/tochka_icon.png';
import qrCodeIcon from '../assets/icons/qr_code.png';
import qrCodeEngIcon from '../assets/icons/qr_code_eng.png';
import MallWidget from '../components/mall-widget/MallWidget';

const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_RU = [
  'Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь',
  'Июль', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FLOORS = [1, 2, 3, 4];


const FLOOR_PLACEHOLDER_COLOR: Record<number, string> = {
  1: '#9BA0AB',
  2: '#8B93A6',
  3: '#A3907C',
  4: '#7C97A3',
};

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDate(date: Date, lang: 'ru' | 'en'): string {
  const weekdays = lang === 'ru' ? WEEKDAYS_RU : WEEKDAYS_EN;
  const months = lang === 'ru' ? MONTHS_RU : MONTHS_EN;
  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  return `${weekday}, ${day} ${month}`;
}

export default function MallMap() {
  const [now] = useState(() => new Date());
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(2, Math.max(0.5, +(prev + delta).toFixed(2))));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
        <div className={styles.adSlot} aria-hidden="true" />
        <div className={styles.dateTime}>
          <div className={styles.dateTimeText}>
            <span className={styles.time}>{formatTime(now)}</span>
            <span className={styles.date}>{formatDate(now, lang)}</span>
          </div>
          <span className={styles.divider} />
          <button
            className={styles.langSwitch}
            type="button"
            onClick={() => setLang((p) => (p === 'en' ? 'ru' : 'en'))}
          >
            <svg className={styles.globeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
              <ellipse cx="12" cy="12" rx="4" ry="9" stroke="currentColor" strokeWidth="1.6" />
              <path d="M3 12h18" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>
      </header>

      <div className={styles.mapArea}>
        <MallWidget
          open={filtersOpen}
          lang={lang}
          onExpand={() => setFiltersOpen(true)}
          onCollapse={() => setFiltersOpen(false)}
        />

        <div
          className={styles.modelViewport}
          style={{ transform: `scale(${zoom})` }}
        >
          <div
            className={styles.modelPlaceholder}
            style={{ backgroundColor: FLOOR_PLACEHOLDER_COLOR[activeFloor] }}
          >
            <span className={styles.modelPlaceholderLabel}>
              3D-модель · этаж {activeFloor}
            </span>
          </div>
        </div>

        <div className={styles.floorControls}>
          {FLOORS.map((floor) => (
            <button
              key={floor}
              type="button"
              className={`${styles.floorBtn} ${activeFloor === floor ? styles.floorBtnActive : ''}`}
              onClick={() => setActiveFloor(floor)}
              aria-pressed={activeFloor === floor}
            >
              {floor}
            </button>
          ))}
          <button type="button" className={styles.locationBtn} aria-label="Моё местоположение">
            <img src={tochkaIcon} alt="" className={styles.locationIcon} draggable={false} />
          </button>
        </div>

        <div className={styles.zoomControls}>
          <button type="button" className={styles.qrBtn} aria-label="QR-код">
            <img src={lang === 'en' ? qrCodeEngIcon : qrCodeIcon} alt="QR" />
          </button>
          <button type="button" className={styles.zoomBtn} aria-label="Уменьшить" onClick={() => handleZoom(-0.1)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" className={styles.zoomBtn} aria-label="Увеличить" onClick={() => handleZoom(0.1)}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
