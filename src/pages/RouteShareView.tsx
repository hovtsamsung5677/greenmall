import { useQuery } from '@tanstack/react-query';
import { getSharedRoute } from '@api/sharedRoutes';
import SharedRouteScene, { type SharedRouteSceneProps } from '@components/SharedRouteScene';
import logoGreenMall from '@assets/icons/logo2.webp';
import styles from '@styles/MallMap.module.css';
import type { ApiRouteToStoreResponse } from '@api/types';

export default function RouteShareView({ token }: { token: string }) {
  const { data: route, isLoading, error } = useQuery<ApiRouteToStoreResponse>({
    queryKey: ['sharedRoute', token],
    queryFn: () => getSharedRoute<ApiRouteToStoreResponse>(token),
    enabled: !!token,
  });

  const routeError = error instanceof Error ? error.message : error ? String(error) : null;

  if (isLoading && !routeError) {
    return (
      <div className={styles.page}>
        <div className={styles.modelPlaceholder} style={{ backgroundColor: '#9BA0AB' }}>
          <span className={styles.modelPlaceholderLabel}>Загрузка маршрута…</span>
        </div>
      </div>
    );
  }

  if (routeError) {
    return (
      <div className={styles.page}>
        <div className={styles.modelPlaceholder} style={{ backgroundColor: '#ffcccc' }}>
          <span className={styles.modelPlaceholderLabel}>{routeError}</span>
        </div>
      </div>
    );
  }

  const routeStatusContent = route?.totalDistance != null ? (
    <div className={styles.routeStatus}>
      <span>
        {route?.targetStore?.name
          ? `Маршрут до «${route.targetStore.name}»`
          : 'Маршрут'}:{' '}
        {route?.totalDistance} ед. · {route?.instructions.length} шагов
      </span>
    </div>
  ) : null;

  const sharedProps: SharedRouteSceneProps = {
    route: route ?? null,
    phoneFrame: false,
    headerContent: (
      <header className={styles.header}>
        <div className={styles.headerRight} style={{ width: '100%', justifyContent: 'center' }}>
          <img src={logoGreenMall} alt="GreenMall" className={styles.logo} draggable={false} />
        </div>
      </header>
    ),
    routeStatusContent,
  };

  return <SharedRouteScene {...sharedProps} />;
}
