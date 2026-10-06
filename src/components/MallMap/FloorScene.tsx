import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BackSide,
  Box3,
  CylinderGeometry,
  FrontSide,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import type { Group, Matrix4 } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ApiRouteToStoreResponse } from '@api/types';

export interface PlanMetrics {
  width: number;
  height: number;
}

// ==================== Общее для линий маршрута ====================

// Линия маршрута — чёрная прерывистая. Чтобы она читалась и на светлом, и на
// тёмном полу, каждый штрих оборачивается тонким белым «кожухом» (casing) —
// приём из 2D-картографии: тёмная линия с контрастной обводкой.
const ROUTE_COLOR = '#000000';
const ROUTE_CASING_COLOR = '#FFFFFF';
const ROUTE_CASING_RATIO = 1.3;

const DASH_LENGTH = 10;
const GAP_LENGTH = 5;

const UP = new Vector3(0, 1, 0);

const START_POINT_COLOR = '#F59E0B';
const END_POINT_COLOR = '#EF4444';

/** Перевод координат плана этажа в мировые координаты сцены. */
export function makePlanToScene(metrics: PlanMetrics | null) {
  return (p: { x: number; y: number; z?: number | null }): [number, number, number] => {
    const w = metrics?.width ?? 1;
    const h = metrics?.height ?? 1;
    return [p.x - w / 2, p.z ?? 0, p.y - h / 2];
  };
}

function getPointOnPolyline(
  points: Vector3[],
  totalLength: number,
  distance: number,
): Vector3 | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0].clone();
  if (distance <= 0) return points[0].clone();
  if (distance >= totalLength) return points[points.length - 1].clone();

  let traveled = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = a.distanceTo(b);
    if (distance <= traveled + segLen) {
      const t = (distance - traveled) / segLen;
      return new Vector3().lerpVectors(a, b, Math.min(t, 1));
    }
    traveled += segLen;
  }
  return points[points.length - 1].clone();
}

function polylineLength(points: Vector3[]): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += points[i].distanceTo(points[i + 1]);
  }
  return len;
}

interface DashedBundle {
  casing: InstancedMesh;
  line: InstancedMesh;
  count: number;
}

/**
 * Прерывистая линия по ломаной: два InstancedMesh (чёрная линия + белый кожух)
 * с одинаковыми матрицами. Различаются только радиусом. Количество видимых
 * штрихов управляется через `mesh.count` — это и есть «прорисовка» линии.
 */
function buildDashedBundle(points: Vector3[], radius: number): DashedBundle | null {
  if (points.length < 2) return null;

  const totalLength = polylineLength(points);
  if (!(totalLength > 0)) return null;

  const step = DASH_LENGTH + GAP_LENGTH;
  const dashCount = Math.max(1, Math.floor(totalLength / step));

  const matrices: Matrix4[] = [];
  for (let i = 0; i < dashCount; i++) {
    const startDist = i * step;
    const endDist = Math.min(startDist + DASH_LENGTH, totalLength);
    const a = getPointOnPolyline(points, totalLength, startDist);
    const b = getPointOnPolyline(points, totalLength, endDist);
    if (!a || !b) continue;

    const length = Math.max(0.01, a.distanceTo(b));
    const dummy = new Object3D();
    dummy.position.addVectors(a, b).multiplyScalar(0.5);
    dummy.quaternion.setFromUnitVectors(UP, new Vector3().subVectors(b, a).normalize());
    dummy.scale.set(1, length, 1);
    dummy.updateMatrix();
    matrices.push(dummy.matrix.clone());
  }
  if (matrices.length === 0) return null;

  const buildMesh = (meshRadius: number, color: string, isCasing: boolean) => {
    const geometry = new CylinderGeometry(meshRadius, meshRadius, 1, 12);
    const material = new MeshStandardMaterial({
      color,
      roughness: 0.45,
      metalness: 0,
      // Кожух — это «вывернутый» цилиндр: рисуем только его задние стенки.
      // Иначе сплошной кожух большего радиуса просто закрыл бы собой
      // чёрную линию, лежащую внутри него. Задние стенки видны только там,
      // где чёрной линии нет, — получается белая обводка.
      side: isCasing ? BackSide : FrontSide,
    });
    const mesh = new InstancedMesh(geometry, material, matrices.length);
    mesh.count = 0;
    mesh.frustumCulled = false;
    for (let i = 0; i < matrices.length; i += 1) {
      mesh.setMatrixAt(i, matrices[i]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  };

  return {
    casing: buildMesh(radius * ROUTE_CASING_RATIO, ROUTE_CASING_COLOR, true),
    line: buildMesh(radius, ROUTE_COLOR, false),
    count: matrices.length,
  };
}

function MovingMarker({ radius }: { radius: number }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius * ROUTE_CASING_RATIO, 16, 16]} />
        <meshStandardMaterial color={ROUTE_CASING_COLOR} side={BackSide} roughness={0.45} />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color={ROUTE_COLOR} roughness={0.45} />
      </mesh>
    </group>
  );
}

function PointMarker({ position, color, radius }: { position: [number, number, number]; color: string; radius: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
    </mesh>
  );
}

// ==================== AnimatedRouteLine ====================

export function AnimatedRouteLine({
  points,
  onComplete,
  speed = 2.5,
  dashSize = 4,
}: {
  points: [number, number, number][];
  onComplete?: () => void;
  speed?: number;
  dashSize?: number;
}) {
  const markerRef = useRef<Group>(null);
  const progress = useRef(0);
  const completedRef = useRef(false);

  // Ключ по содержимому, а не по ссылке на массив: ререндер родителя не должен
  // перезапускать анимацию маршрута с нуля.
  const pointsKey = useMemo(
    () => points.map((p) => `${p[0]},${p[1]},${p[2]}`).join('|'),
    [points],
  );

  const vectors = useMemo(
    () => points.map((p) => new Vector3(p[0], p[1], p[2])),
    [points],
  );

  const totalLength = useMemo(() => polylineLength(vectors), [vectors]);

  const dashMeshes = useMemo(
    () => buildDashedBundle(vectors, Math.max(0.1, dashSize)),
    [vectors, dashSize],
  );

  useEffect(() => {
    progress.current = 0;
    completedRef.current = false;
  }, [pointsKey, dashMeshes]);

  useFrame((_, delta) => {
    if (!dashMeshes) return;

    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta / speed);
    }

    const visibleCount = Math.max(
      0,
      Math.min(dashMeshes.count, Math.floor(progress.current * dashMeshes.count)),
    );
    if (dashMeshes.line.count !== visibleCount) {
      dashMeshes.line.count = visibleCount;
      dashMeshes.casing.count = visibleCount;
    }

    const markerDist = progress.current * totalLength;
    const markerPos = getPointOnPolyline(vectors, totalLength, markerDist);
    if (markerRef.current && markerPos) {
      markerRef.current.position.copy(markerPos);
    }

    if (progress.current >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  });

  if (!dashMeshes) return null;

  return (
    <group>
      <primitive object={dashMeshes.casing} />
      <primitive object={dashMeshes.line} />
      <group ref={markerRef}>
        <MovingMarker radius={dashSize * 1.2} />
      </group>
    </group>
  );
}

// ==================== AnimatedShaftLine ====================

/**
 * Вертикальная «шахта» перехода между этажами. Живёт в системе координат
 * текущего этажа (внутри поднятой на routeLiftY группы маршрута), поэтому
 * нижний конец точно совпадает с концом нарисованной линии, а верхний — с
 * началом сегмента следующего этажа.
 */
export function AnimatedShaftLine({
  from,
  to,
  duration = 1.2,
  radius = 6,
  markerRadius = 8,
}: {
  from: [number, number, number];
  to: [number, number, number];
  duration?: number;
  radius?: number;
  markerRadius?: number;
}) {
  const markerRef = useRef<Group>(null);
  const progress = useRef(0);

  const fromKey = useMemo(() => from.join(','), [from]);
  const toKey = useMemo(() => to.join(','), [to]);

  const vectors = useMemo(
    () => [new Vector3(...from), new Vector3(...to)],
    [from, to],
  );

  const totalLength = useMemo(() => polylineLength(vectors), [vectors]);

  const dashMeshes = useMemo(() => buildDashedBundle(vectors, radius), [vectors, radius]);

  useEffect(() => {
    progress.current = 0;
  }, [fromKey, toKey, dashMeshes]);

  useFrame((_, delta) => {
    if (!dashMeshes) return;
    if (progress.current < 1) {
      progress.current =
        duration > 0 ? Math.min(1, progress.current + delta / duration) : 1;
    }

    const visibleCount = Math.max(
      0,
      Math.min(dashMeshes.count, Math.ceil(progress.current * dashMeshes.count)),
    );
    if (dashMeshes.line.count !== visibleCount) {
      dashMeshes.line.count = visibleCount;
      dashMeshes.casing.count = visibleCount;
    }

    const markerPos = getPointOnPolyline(vectors, totalLength, progress.current * totalLength);
    if (markerRef.current && markerPos) {
      markerRef.current.position.copy(markerPos);
    }
  });

  if (!dashMeshes) return null;

  return (
    <group>
      <primitive object={dashMeshes.casing} />
      <primitive object={dashMeshes.line} />
      {/* Нижняя точка чуть крупнее маркера конца линии этажа — иначе две
          концентрические сферы одинакового радиуса дают z-fighting. */}
      <PointMarker position={from} color={START_POINT_COLOR} radius={markerRadius * 1.4} />
      <PointMarker position={to} color={END_POINT_COLOR} radius={markerRadius} />
      <group ref={markerRef}>
        <MovingMarker radius={markerRadius * 1.2} />
      </group>
    </group>
  );
}

// ==================== FloorScene ====================

export interface UpwardShaft {
  /** Конец линии текущего этажа (в координатах плана текущего этажа). */
  fromPoint: [number, number, number];
  /** Начало линии следующего этажа (в координатах плана следующего этажа). */
  toPoint: [number, number, number];
  /** Вертикальное расстояние между этажами. */
  gap: number;
  /** Направление перехода: 'up' — текущий уходит вниз, следующий сверху;
   *  'down' — текущий уходит вверх, целевой выезжает снизу. */
  direction: 'up' | 'down';
  duration?: number;
}

export function FloorScene({
  gltf,
  groupRef,
  metrics,
  route,
  activeFloor,
  onReachTransfer,
  upwardShaft = null,
  debug = false,
}: {
  gltf: GLTF;
  groupRef?: React.RefObject<Group | null>;
  metrics: PlanMetrics | null;
  route: ApiRouteToStoreResponse | null;
  activeFloor: number;
  onReachTransfer?: (nextFloor: number) => void;
  upwardShaft?: UpwardShaft | null;
  debug?: boolean;
}) {
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);

  // 1) Считаем bbox, масштаб и итоговый размер модели в МИРОВЫХ единицах.
  //    Модель приводится к plan-габаритам (width x height) и центрируется,
  //    поэтому её мировые габариты равны size * uniformScale.
  const { uniformScale, modelWorldSize } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    if (metrics && size.x > 0 && size.z > 0) {
      const s = Math.min(metrics.width / size.x, metrics.height / size.z);
      if (isFinite(s) && s > 0) {
        return { uniformScale: s, modelWorldSize: size.clone().multiplyScalar(s) };
      }
    }
    return { uniformScale: 1, modelWorldSize: size.clone() };
  }, [scene, metrics]);

  // 2) Центрирование делаем ВНУТРИ группы, ПОСЛЕ её масштаба.
  //    Это принципиально: T * S != S * T, и если мы применим позицию
  //    к родителю вместе со scale, получим неправильное смещение.
  //    Здесь: outer — scale; inner — position = -center (в масштабированной СК).
  const center = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const c = new Vector3();
    box.getCenter(c);
    return c;
  }, [scene]);

  // planToScene уже отдаёт координаты в мировой системе (габарит этажа,
  // центрированный по X/Z). Дополнительного масштабирования/смещения не нужно.
  const planToScene = useMemo(() => makePlanToScene(metrics), [metrics]);

  // Маршрут рисуется ПОВЕРХ модели: поднимаем его над верхней границей плиты
  // перекрытия, иначе линия оказывается внутри геометрии пола и не видна.
  const routeLiftY = useMemo(() => {
    const halfHeight = modelWorldSize.y / 2;
    const clearance = Math.max(6, (metrics?.width ?? 900) * 0.01);
    return halfHeight + clearance;
  }, [modelWorldSize.y, metrics?.width]);

  const routeOverlay = useMemo(() => {
    if (!route || route.routePath.length < 1) return null;
    // Этаж может встречаться в маршруте несколько раз (спуск/подъём) —
    // склеиваем все чанки этого этажа в один непрерывный путь.
    const floorSegments = (route.segments ?? []).filter(
      (s) => s.floorNumber === activeFloor,
    );
    if (floorSegments.length === 0) return null;
    const points = floorSegments.flatMap((s) => s.points.map(planToScene));
    if (points.length < 1) return null;
    const start = points[0];
    const end = points[points.length - 1];

    const handleComplete = () => {
      const changes = route.floorChanges ?? [];
      const change = changes.find((ch) => ch.fromFloor === activeFloor);
      if (change) onReachTransfer?.(change.toFloor);
    };

    return (
      <group>
        <AnimatedRouteLine points={points} onComplete={handleComplete} />
        <PointMarker position={start} color={START_POINT_COLOR} radius={8} />
        <PointMarker position={end} color={END_POINT_COLOR} radius={8} />
      </group>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, planToScene, activeFloor]);

  const shaft = useMemo(() => {
    if (!upwardShaft) return null;
    const toY = upwardShaft.direction === 'up' ? upwardShaft.gap : -upwardShaft.gap;
    return (
      <AnimatedShaftLine
        from={upwardShaft.fromPoint}
        to={[upwardShaft.toPoint[0], toY, upwardShaft.toPoint[2]]}
        duration={upwardShaft.duration}
      />
    );
  }, [upwardShaft]);

  return (
    <>
      {debug && <axesHelper args={[500]} />}
      <group ref={groupRef} scale={uniformScale}>
        <group position={[-center.x, -center.y, -center.z]}>
          <primitive object={scene} />
        </group>
      </group>
      {routeOverlay || shaft ? (
        <group position={[0, routeLiftY, 0]}>
          {routeOverlay}
          {shaft}
        </group>
      ) : null}
    </>
  );
}