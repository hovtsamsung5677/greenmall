import { QRCodeSVG } from 'qrcode.react';
import { isUnreachableFromPhone } from '@utils/shareUrl';
import styles from '@styles/MallMap.module.css';

export interface ShareQrModalProps {
  lang: 'ru' | 'en';
  shareToken: string | null;
  shareLoading: boolean;
  shareError: string | null;
  shareUrl: string;
  onClose: () => void;
}

export function ShareQrModal({
  lang,
  shareToken,
  shareLoading,
  shareError,
  shareUrl,
  onClose,
}: ShareQrModalProps) {
  if (!shareToken && !shareLoading && !shareError) return null;

  return (
    <div className={styles.qrOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.qrModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-route-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="share-route-title" className={styles.qrModalTitle}>
          {lang === 'en' ? 'Scan to open on phone' : 'Отсканируйте, чтобы открыть на телефоне'}
        </h3>
        {shareLoading ? (
          <p className={styles.qrModalHint}>
            {lang === 'en' ? 'Generating code…' : 'Генерация кода…'}
          </p>
        ) : shareError ? (
          <p className={styles.qrModalError} role="alert">
            {shareError}
          </p>
        ) : shareToken ? (
          <>
            {isUnreachableFromPhone(shareUrl) ? (
              <p className={styles.qrModalError} role="alert">
                QR-код ведёт на loopback-адрес и с телефона не откроется. Откройте карту на
                компьютере по LAN-адресу вида {'http://<ip-компьютера>:5173'} и постройте
                маршрут заново.
              </p>
            ) : (
              <div className={styles.qrCodeBox}>
                <QRCodeSVG value={shareUrl} size={220} level="M" />
              </div>
            )}
            <p className={styles.qrModalHint}>
              Если камера не открывает ссылку — введите вручную: <code>{shareUrl}</code>
            </p>
            <p className={styles.qrModalHint}>
              {lang === 'en'
                ? 'Open the camera and scan — the route will open in your browser.'
                : 'Откройте камеру и отсканируйте — маршрут откроется в браузере.'}
            </p>
          </>
        ) : null}
        <button type="button" className={styles.qrModalClose} onClick={onClose}>
          {lang === 'en' ? 'Close' : 'Закрыть'}
        </button>
      </div>
    </div>
  );
}
