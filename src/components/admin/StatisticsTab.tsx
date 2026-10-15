import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchNavigationDaily,
  fetchNavigationHourly,
  fetchNavigationRoutesByStore,
  fetchNavigationSummary,
  type NavigationAnalyticsDailyItem,
  type NavigationAnalyticsHourlyItem,
} from '@api/analytics';
import styles from '@styles/AdminPage.module.css';

type PeriodDays = 7 | 30 | 90;

const PERIOD_OPTIONS: { value: PeriodDays; label: string }[] = [
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
  { value: 90, label: '90 дней' },
];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatDayLabel(iso: string): string {
  return iso.slice(8, 10) + '.' + iso.slice(5, 7);
}

function formatHourLabel(hour: number): string {
  return String(hour).padStart(2, '0') + ':00';
}

function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

const DAILY_SERIES: {
  key: keyof Omit<NavigationAnalyticsDailyItem, 'date'>;
  label: string;
  color: string;
}[] = [
  { key: 'panelClicks', label: 'Клики по панели', color: '#C2C353' },
  { key: 'routesBuilt', label: 'Маршруты', color: '#7c8f3e' },
  { key: 'qrScans', label: 'QR-сканы', color: '#4b5563' },
];

function DailyActivityChart({ items }: { items: NavigationAnalyticsDailyItem[] }) {
  const max = Math.max(
    1,
    ...items.flatMap((item) =>
      DAILY_SERIES.map((series) => item[series.key] as number),
    ),
  );
  const dayWidth = 30;
  const chartWidth = Math.max(640, items.length * dayWidth);
  const chartHeight = 220;
  const paddingLeft = 40;
  const paddingBottom = 24;
  const plotHeight = chartHeight - paddingBottom;

  return (
    <div className={styles.chartScroll}>
      <svg
        width={chartWidth}
        height={chartHeight}
        role="img"
        aria-label="Активность по дням"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={paddingLeft}
              x2={chartWidth - 8}
              y1={plotHeight * (1 - ratio) + 4}
              y2={plotHeight * (1 - ratio) + 4}
              stroke="#e7e4d9"
              strokeWidth={1}
            />
            <text
              x={paddingLeft - 6}
              y={plotHeight * (1 - ratio) + 8}
              textAnchor="end"
              fontSize={10}
              fill="#6d7058"
            >
              {formatNumber(Math.round(max * ratio))}
            </text>
          </g>
        ))}
        {items.map((item, index) => {
          const groupX = paddingLeft + index * dayWidth + 6;
          return (
            <g key={item.date}>
              <title>{`${item.date}: ${DAILY_SERIES.map(
                (series) => `${series.label} — ${item[series.key]}`,
              ).join(', ')}`}</title>
              {DAILY_SERIES.map((series, seriesIndex) => {
                const value = item[series.key] as number;
                const barHeight = (value / max) * (plotHeight - 8);
                return (
                  <rect
                    key={series.key}
                    x={groupX + seriesIndex * 8}
                    y={plotHeight - barHeight + 4}
                    width={7}
                    height={Math.max(barHeight, value > 0 ? 2 : 0)}
                    fill={series.color}
                    rx={1.5}
                  />
                );
              })}
              {index % Math.ceil(items.length / 12) === 0 ? (
                <text
                  x={groupX + 10}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6d7058"
                >
                  {formatDayLabel(item.date)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HourlyActivityChart({ items }: { items: NavigationAnalyticsHourlyItem[] }) {
  const max = Math.max(1, ...items.map((item) => item.events));
  const peakHour = items.reduce(
    (peak, item) => (item.events > peak.events ? item : peak),
    items[0] ?? { hour: 0, events: 0 },
  );
  const barWidth = 24;
  const chartWidth = Math.max(640, items.length * barWidth + 16);
  const chartHeight = 220;
  const paddingLeft = 40;
  const paddingBottom = 24;
  const plotHeight = chartHeight - paddingBottom;

  return (
    <div className={styles.chartScroll}>
      <svg
        width={chartWidth}
        height={chartHeight}
        role="img"
        aria-label="Активность по времени суток"
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1={paddingLeft}
              x2={chartWidth - 8}
              y1={plotHeight * (1 - ratio) + 4}
              y2={plotHeight * (1 - ratio) + 4}
              stroke="#e7e4d9"
              strokeWidth={1}
            />
            <text
              x={paddingLeft - 6}
              y={plotHeight * (1 - ratio) + 8}
              textAnchor="end"
              fontSize={10}
              fill="#6d7058"
            >
              {formatNumber(Math.round(max * ratio))}
            </text>
          </g>
        ))}
        {items.map((item, index) => {
          const barHeight = (item.events / max) * (plotHeight - 8);
          const isPeak = item.hour === peakHour.hour && item.events > 0;
          return (
            <g key={item.hour}>
              <title>{`${formatHourLabel(item.hour)} — ${item.events} событий`}</title>
              <rect
                x={paddingLeft + index * barWidth + 6}
                y={plotHeight - barHeight + 4}
                width={barWidth - 10}
                height={Math.max(barHeight, item.events > 0 ? 2 : 0)}
                fill={isPeak ? '#9FA044' : '#C2C353'}
                rx={3}
              />
              <text
                x={paddingLeft + index * barWidth + barWidth / 2}
                y={chartHeight - 8}
                textAnchor="middle"
                fontSize={10}
                fill={isPeak ? '#2F3A18' : '#6d7058'}
                fontWeight={isPeak ? 700 : 400}
              >
                {String(item.hour).padStart(2, '0')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type StatisticsTabProps = {
  onRefreshKey?: number;
};

export default function StatisticsTab({ onRefreshKey = 0 }: StatisticsTabProps) {
  const [periodDays, setPeriodDays] = React.useState<PeriodDays>(30);

  const query = React.useMemo(
    () => ({ from: isoDaysAgo(periodDays) }),
    [periodDays],
  );

  const summaryQuery = useQuery({
    queryKey: ['admin', 'navigation-analytics', 'summary', query],
    queryFn: () => fetchNavigationSummary(query),
  });

  const dailyQuery = useQuery({
    queryKey: ['admin', 'navigation-analytics', 'daily', query],
    queryFn: () => fetchNavigationDaily(query),
  });

  const hourlyQuery = useQuery({
    queryKey: ['admin', 'navigation-analytics', 'hourly', query],
    queryFn: () => fetchNavigationHourly(query),
  });

  const routesByStoreQuery = useQuery({
    queryKey: ['admin', 'navigation-analytics', 'routes-by-store', query],
    queryFn: () => fetchNavigationRoutesByStore(query),
  });

  React.useEffect(() => {
    if (onRefreshKey > 0) {
      void summaryQuery.refetch();
      void dailyQuery.refetch();
      void hourlyQuery.refetch();
      void routesByStoreQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRefreshKey]);

  const loading =
    summaryQuery.isLoading ||
    dailyQuery.isLoading ||
    hourlyQuery.isLoading ||
    routesByStoreQuery.isLoading;

  const errorMessage =
    summaryQuery.error instanceof Error
      ? summaryQuery.error.message
      : dailyQuery.error instanceof Error
        ? dailyQuery.error.message
        : hourlyQuery.error instanceof Error
          ? hourlyQuery.error.message
          : routesByStoreQuery.error instanceof Error
            ? routesByStoreQuery.error.message
            : null;

  const summary = summaryQuery.data;
  const dailyItems = dailyQuery.data?.items ?? [];
  const hourlyItems = hourlyQuery.data?.items ?? [];
  const routeItems = routesByStoreQuery.data?.items ?? [];
  const routesTotal = routeItems.reduce((total, item) => total + item.routesBuilt, 0);
  const peakHour = hourlyItems.reduce(
    (peak, item) => (item.events > peak.events ? item : peak),
    hourlyItems[0] ?? { hour: 0, events: 0 },
  );

  return (
    <>
      <div className={styles.periodSelector}>
        <span className={styles.label}>Период</span>
        <div className={styles.periodButtons}>
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.periodBtn} ${
                periodDays === option.value ? styles.periodBtnActive : ''
              }`}
              onClick={() => setPeriodDays(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className={styles.hint}>
          Данные ведутся в UTC. «Сегодня» — текущий UTC-день.
        </span>
      </div>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      {loading && !summary ? (
        <p className={styles.empty}>Загрузка статистики…</p>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Клики по панели за день</span>
            <span className={styles.statValue}>
              {formatNumber(summary?.panelClicksToday ?? 0)}
            </span>
            <span className={styles.statHint}>
              за период: {formatNumber(summary?.panelClicks ?? 0)}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Маршрутов построено</span>
            <span className={styles.statValue}>
              {formatNumber(summary?.routesBuilt ?? 0)}
            </span>
            <span className={styles.statHint}>
              до магазинов: {formatNumber(routesTotal)}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Сканирований QR</span>
            <span className={styles.statValue}>
              {formatNumber(summary?.qrScans ?? 0)}
            </span>
            <span className={styles.statHint}>
              переходов в онлайн-карту
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Уникальных сессий</span>
            <span className={styles.statValue}>
              {formatNumber(summary?.uniqueSessions ?? 0)}
            </span>
            <span className={styles.statHint}>
              сессий начато: {formatNumber(summary?.sessionsStarted ?? 0)}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Пиковый час</span>
            <span className={styles.statValue}>
              {peakHour.events > 0 ? formatHourLabel(peakHour.hour) : '—'}
            </span>
            <span className={styles.statHint}>
              {peakHour.events > 0
                ? `${formatNumber(peakHour.events)} событий`
                : 'нет данных за период'}
            </span>
          </div>
        </div>
      )}

      <section className={`${styles.panel} ${styles.fullWidth}`}>
        <h2 className={styles.panelTitle}>Активность по дням</h2>
        <div className={styles.chartLegend}>
          {DAILY_SERIES.map((series) => (
            <span key={series.key} className={styles.legendItem}>
              <span
                className={styles.legendSwatch}
                style={{ backgroundColor: series.color }}
              />
              {series.label}
            </span>
          ))}
        </div>
        {dailyItems.length > 0 ? (
          <DailyActivityChart items={dailyItems} />
        ) : (
          <p className={styles.empty}>Нет данных за выбранный период</p>
        )}
      </section>

      <section className={`${styles.panel} ${styles.fullWidth}`}>
        <h2 className={styles.panelTitle}>Активность по времени суток</h2>
        <p className={styles.hint}>
          Когда стойка пользуется наибольшим спросом (по часам UTC)
        </p>
        {hourlyItems.length > 0 ? (
          <HourlyActivityChart items={hourlyItems} />
        ) : (
          <p className={styles.empty}>Нет данных за выбранный период</p>
        )}
      </section>

      <section className={`${styles.panel} ${styles.fullWidth}`}>
        <h2 className={styles.panelTitle}>Маршруты до магазинов</h2>
        {routeItems.length === 0 ? (
          <p className={styles.empty}>Маршруты за выбранный период не построены</p>
        ) : (
          <div className={styles.list}>
            {routeItems.map((item) => (
              <div key={item.storeId} className={styles.item}>
                <div>
                  <div className={styles.itemTitle}>
                    {item.store?.name ?? `Магазин ${item.storeId}`}
                  </div>
                  <div className={styles.itemMeta}>
                    {item.store
                      ? `${item.store.slug}${
                          item.store.floorNumber != null
                            ? ` · Этаж ${item.store.floorNumber}`
                            : ''
                        }`
                      : 'магазин удалён'}
                  </div>
                </div>
                <div className={styles.routeCount}>
                  <span className={styles.routeCountValue}>
                    {formatNumber(item.routesBuilt)}
                  </span>
                  <span className={styles.routeCountLabel}>маршрутов</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
