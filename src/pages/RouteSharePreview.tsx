import logoGreenMall from '@assets/icons/logo2.webp';
import SharedRouteScene from '@components/SharedRouteScene';
import styles from '@styles/MallMap.module.css';

export default function RouteSharePreview() {
  return (
    <SharedRouteScene
      route={null}
      phoneFrame
      headerContent={
        <header className={styles.header}>
          <div className={styles.headerRight} style={{ width: '100%', justifyContent: 'center' }}>
            <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
          </div>
        </header>
      }
      footerContent={
        <div style={{ padding: 12, textAlign: 'center', color: '#7c7c7c', fontSize: 13 }}>
          Предпросмотр страницы по QR (без маршрута)
        </div>
      }
    />
  );
}
