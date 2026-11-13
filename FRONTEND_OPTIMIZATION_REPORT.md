# Отчёт по оптимизации фронтенда Green Mall

Дата: 05.11.2026
Статус: черновик

---

## 1. Что сделано уже

- Клиент для публичной рекламы (api/publicAds.ts)
- Компонент баннера (components/PublicAdBanner.tsx)
- Баннер встроен в SharedRouteScene.tsx над картой
- Стили баннера в MallMap.module.css
- Тип PublicAd в api/types.ts

---

## 2. Проблемы производительности

### 2.1 Быстрые победы (сделать сразу)

1. console.log в продакшене (MallMap.tsx, handleBuildRouteToStore) — обернуть в if (import.meta.env.DEV)
2. Лишний рендер showRouteToast (MallMap.tsx) — useState(true) сразу
3. fetchStores(500) при каждой смене этажа (MallMap.tsx) — грузить один раз
4. fetchActiveHeaderBanner и fetchStores без кэша (MallMap.tsx) — react-query с staleTime 60000
5. Глобальный staleTime react-query не задан — выставить в QueryClient

### 2.2 Средний приоритет

6. Code splitting отсутствует (AdminPage, RouteEditor3D) — React.lazy + Suspense
7. Список магазинов не виртуализирован (RouteBuilderWindow, до 500) — виртуальный скролл
8. Камера обновляется каждый кадр (SharedRouteScene.tsx, TopDownControls) — только при zoom/target
9. Слишком большая дальность камеры (far: 100000000) — поставить 10000
10. Кэш GLTF растёт бесконечно (MallMap/gltfCache.ts) — LRU-вытеснение

### 2.3 Косметика

11. PublicAdBanner показывается на десктопе (SharedRouteScene.tsx) — только на мобильных
12. Картинки без loading="lazy" (логотип, баннер, QR) — добавить lazy
13. socket.io-client возможно не используется (package.json) — проверить

---

## 3. Рекомендуемый порядок работ

1. Убрать console.log (#1)
2. Исправить showRouteToast (#2)
3. Кэшировать список магазинов (#3, #4)
4. Выставить глобальный staleTime (#5)
5. Code splitting для админки (#6)
6. Виртуализация списка (#7)
7. Оптимизация камеры (#8, #9)
8. LRU кэш GLTF (#10)

---

## 4. Ожидаемый результат

- Меньше HTTP-запросов при переключении этажей
- Быстрее загрузка начального экрана
- Меньше лагов при перемещении камеры
- Меньше потребления памяти
- Чистая консоль без логов в проде

---

## 5. Как проверить

- DevTools Network — нет повторных запросов магазинов и баннера
- DevTools Console — нет console.log в проде
- DevTools Performance — сравнить FPS до и после
- npm run build — проверить размер бандла