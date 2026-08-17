import { useEffect, useState, useCallback } from 'react';
import styles from './LoadingScreen.module.css';

import logoGreenMall from '../assets/icons/logo_greenmall.png';
import fingerIcon from '../assets/icons/finger_icon.png';
import bgPattern from '../assets/fons/fon_ecran_loading.png';
import translatorRu from '../assets/icons/переводчик рус.svg';
import translatorEn from '../assets/icons/переводчик англ.svg';

// подставьте реальные расширения ваших файлов (.png / .svg)
// например: import logoGreenMall from '../assets/icons/logo_greenmall.png';

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

type Lang = 'ru' | 'en';

interface LoadingScreenProps {
  /** вызывается при тапе/клике по экрану */
  onContinue?: () => void;
  onOpenAdmin?: () => void;
}

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

export default function LoadingScreen({ onContinue, onOpenAdmin }: LoadingScreenProps) {
  const [now, setNow] = useState(() => new Date());
  const [lang, setLang] = useState<Lang>('ru');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(timer);
  }, []);

  const toggleLang = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLang((prev) => (prev === 'en' ? 'ru' : 'en'));
  }, []);

  return (
    <div
      className={styles.screen}
      style={{ backgroundImage: `url(${bgPattern})` }}
      onClick={onContinue}
      role="button"
      tabIndex={0}
    >
      <header className={styles.topBar}>
        <div className={styles.dateTime}>
          <span className={styles.time}>{formatTime(now)}</span>
          <span className={styles.date}>{formatDate(now, lang)}</span>
        </div>

         <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {onOpenAdmin ? (
              <button
                className={styles.adminBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAdmin();
                }}
                type="button"
              >
                Admin
              </button>
            ) : null}
            <button className={styles.langSwitch} onClick={toggleLang} type="button">
            <img
              src={lang === 'ru' ? translatorRu : translatorEn}
              alt={lang === 'ru' ? 'Переключить на английский' : 'Switch to Russian'}
              className={styles.translatorIcon}
              draggable={false}
            />
          </button>
          </div>
      </header>

      <main className={styles.center}>
        <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
      </main>

      <footer className={styles.footer}>
        <span className={styles.tapText}>
          {lang === 'ru' ? 'Коснитесь' : 'Tap to continue'}
        </span>
        <img src={fingerIcon} alt="" className={styles.fingerIcon} draggable={false} />
      </footer>
    </div>
  );
}
