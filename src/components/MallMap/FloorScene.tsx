import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BackSide,
  Box3,
  ConeGeometry,
  CylinderGeometry,
  FrontSide,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TextureLoader,
  Vector3,
} from 'three';
import type { Group } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {
  ApiFloorIcon,
  ApiFloorTexture,
  ApiRouteNode,
  ApiRouteToStoreResponse,
} from '@api/types';
import FloorIconLayer, { type FloorIconLayerMetrics } from './FloorIconLayer';

export interface PlanMetrics {
  width: number;
  height: number;
}

// ==================== AnimatedRouteLine ====================

// Основной маршрут в фирменной палитре Green Mall: яркий лаймовый сердечник
// с тёмно-зелёной контрастной обводкой. Обводка не даёт линии сливаться с
// светлыми и оливковыми участками плана; emissive-слой подчёркивает анимацию.
const ROUTE_COLOR = '#C9F46B';
const ROUTE_CASING_COLOR = '#173A2C';
const ROUTE_CASING_RATIO = 1.65;

// Эвакуационный маршрут идёт ДРУГИМ цветом поверх основного — на карте сразу
// видно, куда бежать от магазина при пожаре. Красный + белый кожух резко
// отличается от фирменного лаймового основного маршрута.
export const EVACUATION_ROUTE_COLOR = '#DC2626';
const EVACUATION_ROUTE_CASING_COLOR = '#FFFFFF';
const EVACUATION_STAIRS_COLOR = '#DC2626';

// Задержка между прибытием в магазин и стартом эвакуационной линии: сначала
// посетитель видит, что дошёл до цели, и только потом — путь до лестницы.
export const EVACUATION_ROUTE_DELAY_MS = 3000;

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
 * Прерывистая линия по ломаной: два InstancedMesh (основная линия + кожух)
 * с одинаковыми матрицами. Различаются только радиусом. Количество видимых
 * штрихов управляется через `mesh.count` — это и есть «прорисовка» линии.
 */
function buildDashedBundle(
  points: Vector3[],
  radius: number,
  lineColor: string = ROUTE_COLOR,
  casingColor: string = ROUTE_CASING_COLOR,
): DashedBundle | null {
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
      emissive: color,
      emissiveIntensity: isCasing ? 0.08 : 0.85,
      roughness: isCasing ? 0.55 : 0.3,
      metalness: isCasing ? 0 : 0.05,
      // Тонкий тёмно-зелёный кожух отделяет лаймовую линию от пола.
      // У сердечника отключаем tone mapping, чтобы он оставался ярким
      // при любом освещении сцены.
      toneMapped: !isCasing,
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
    casing: buildMesh(radius * ROUTE_CASING_RATIO, casingColor, true),
    line: buildMesh(radius, lineColor, false),
    count: matrices.length,
  };
}

function MovingMarker({
  radius,
  color = ROUTE_COLOR,
  casingColor = ROUTE_CASING_COLOR,
}: {
  radius: number;
  color?: string;
  casingColor?: string;
}) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius * ROUTE_CASING_RATIO, 16, 16]} />
        <meshStandardMaterial
          color={casingColor}
          emissive={casingColor}
          emissiveIntensity={0.12}
          side={BackSide}
          roughness={0.35}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          roughness={0.3}
          toneMapped={false}
        />
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
  color = ROUTE_COLOR,
  casingColor = ROUTE_CASING_COLOR,
}: {
  points: [number, number, number][];
  onComplete?: () => void;
  speed?: number;
  dashSize?: number;
  color?: string;
  casingColor?: string;
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
    () => buildDashedBundle(vectors, Math.max(0.1, dashSize), color, casingColor),
    [vectors, dashSize, color, casingColor],
  );

  useEffect(() => {
    progress.current = 0;
    completedRef.current = false;
  }, [pointsKey, dashMeshes]);

  useFrame((state, delta) => {
    if (!dashMeshes) return;

    // Лёгкое дыхание свечения продолжается после построения маршрута.
    const lineMaterial = dashMeshes.line.material;
    if (lineMaterial instanceof MeshStandardMaterial) {
      lineMaterial.emissiveIntensity =
        0.72 + 0.24 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 5.5));
    }

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
      // Двигающийся маркер мягко пульсирует, выделяя текущую точку построения.
      markerRef.current.scale.setScalar(
        1 + 0.08 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 7)),
      );
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
        <MovingMarker radius={dashSize * 1.2} color={color} casingColor={casingColor} />
      </group>
    </group>
  );
}

// ==================== Пожарные лестницы ====================

/**
 * Маркер пожарной лестницы на 3D-модели этажа: шар у пола, тонкий стержень
 * и конус-«огонь» сверху. Виден всегда, даже без построенного маршрута —
 * посетитель заранее знает, где выход.
 */
function EvacuationStairsMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[9, 16, 16]} />
        <meshStandardMaterial
          color={EVACUATION_STAIRS_COLOR}
          emissive={EVACUATION_STAIRS_COLOR}
          emissiveIntensity={0.6}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 24, 0]}>
        <cylinderGeometry args={[2.5, 2.5, 30, 8]} />
        <meshStandardMaterial
          color={EVACUATION_STAIRS_COLOR}
          emissive={EVACUATION_STAIRS_COLOR}
          emissiveIntensity={0.4}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, 44, 0]}>
        <coneGeometry args={[6, 10, 4]} />
        <meshStandardMaterial
          color={EVACUATION_STAIRS_COLOR}
          emissive={EVACUATION_STAIRS_COLOR}
          emissiveIntensity={0.6}
          roughness={0.4}
        />
      </mesh>
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

// ==================== UpwardShaft ====================

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

// ==================== FloorScene ====================

export function FloorScene({
  gltf,
  groupRef,
  metrics,
  route,
  activeFloor,
  onReachTransfer,
  upwardShaft = null,
  debug = false,
  textures = [],
  icons = [],
  onIconClick,
  evacuationStairs = [],
  onEvacuationRouteStart,
}: {
  gltf: GLTF;
  groupRef?: React.RefObject<Group | null>;
  metrics: PlanMetrics | null;
  route: ApiRouteToStoreResponse | null;
  activeFloor: number;
  onReachTransfer?: (nextFloor: number) => void;
  upwardShaft?: UpwardShaft | null;
  debug?: boolean;
  textures?: ApiFloorTexture[];
  icons?: ApiFloorIcon[];
  onIconClick?: (icon: ApiFloorIcon) => void;
  evacuationStairs?: ApiRouteNode[];
  onEvacuationRouteStart?: () => void;
}) {
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);

  const meshByName = useMemo(() => {
    const map = new Map<string, THREE.Mesh[]>();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const name = child.userData?.name || child.name;
        if (!name) return;
        const list = map.get(name) || [];
        list.push(child);
        map.set(name, list);
      }
    });
    return map;
  }, [scene]);

  useEffect(() => {
    const activeTextures = textures.filter((t) => t.asset?.url);
    if (activeTextures.length === 0) return;

    const loader = new TextureLoader();
    const textureCache = new Map<string, THREE.Texture>();
    let cancelled = false;

    const originalMaterials = new Map<THREE.Mesh, {
      map: THREE.Texture | null;
      alphaMap: THREE.Texture | null;
      emissiveMap: THREE.Texture | null;
      transparent: boolean;
      opacity: number;
      alphaTest: number;
      emissive: THREE.Color;
      emissiveIntensity: number;
    }>();

    const applyTexture = (
      mesh: THREE.Mesh,
      texture: THREE.Texture,
      cfg: ApiFloorTexture,
    ) => {
      const material =
        cfg.materialSlot !== null && cfg.materialSlot !== undefined
          ? Array.isArray(mesh.material)
            ? mesh.material[parseInt(cfg.materialSlot, 10)]
            : mesh.material
          : mesh.material;

      if (!(material instanceof MeshStandardMaterial)) return;

      if (!originalMaterials.has(mesh)) {
        originalMaterials.set(mesh, {
          map: material.map,
          alphaMap: material.alphaMap,
          emissiveMap: material.emissiveMap,
          transparent: material.transparent,
          opacity: material.opacity,
          alphaTest: material.alphaTest,
          emissive: material.emissive.clone(),
          emissiveIntensity: material.emissiveIntensity,
        });
      }

      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.offset.set(cfg.positionX ?? 0, cfg.positionY ?? 0);
      texture.repeat.set(cfg.scaleX ?? 1, cfg.scaleY ?? 1);
      texture.rotation = (cfg.rotation ?? 0) * (Math.PI / 180);
      texture.needsUpdate = true;

      material.transparent = true;

      switch (cfg.blendMode) {
        case 'alphaMap':
          material.alphaMap = texture;
          material.alphaTest = 0;
          break;
        case 'emissiveMap':
          material.emissiveMap = texture;
          material.emissive = new THREE.Color(0xffffff);
          material.emissiveIntensity = 1;
          break;
        case 'normal':
        default:
          material.map = texture;
          break;
      }

      material.opacity = cfg.opacity ?? 1;
      material.needsUpdate = true;
    };

    const loadAndApply = async () => {
      for (const cfg of activeTextures) {
        if (cancelled) return;

        const url = cfg.asset!.url;
        let texture = textureCache.get(url);

        if (!texture) {
          try {
            texture = await new Promise<THREE.Texture>((resolve, reject) => {
              loader.load(
                url,
                (tex) => resolve(tex),
                undefined,
                (err) => reject(err),
              );
            });
            textureCache.set(url, texture);
          } catch {
            continue;
          }
        }

        if (cancelled) return;

        const meshes = meshByName.get(cfg.targetMesh);
        if (!meshes || meshes.length === 0) continue;

        for (const mesh of meshes) {
          applyTexture(mesh, texture, cfg);
        }
      }
    };

    loadAndApply();

    return () => {
      cancelled = true;
      for (const texture of textureCache.values()) {
        texture.dispose();
      }
      for (const [mesh, original] of originalMaterials.entries()) {
        if (!(mesh.material instanceof MeshStandardMaterial)) continue;
        mesh.material.map = original.map;
        mesh.material.alphaMap = original.alphaMap;
        mesh.material.emissiveMap = original.emissiveMap;
        mesh.material.transparent = original.transparent;
        mesh.material.opacity = original.opacity;
        mesh.material.alphaTest = original.alphaTest;
        mesh.material.emissive.copy(original.emissive);
        mesh.material.emissiveIntensity = original.emissiveIntensity;
        mesh.material.needsUpdate = true;
      }
    };
  }, [textures, meshByName]);

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
  const planToScene = useCallback(
    (p: { x: number; y: number; z?: number | null }): [number, number, number] => {
      const w = metrics?.width ?? 1;
      const h = metrics?.height ?? 1;
      return [p.x - w / 2, p.z ?? 0, p.y - h / 2];
    },
    [metrics],
  );

  // Маркеры пожарных лестниц этажа — доступны всегда, маршрут не нужен.
  const evacuationStairMarkers = useMemo(
    () =>
      (evacuationStairs ?? []).map((stair) => ({
        id: stair.id,
        position: planToScene(stair),
      })),
    [evacuationStairs, planToScene],
  );

  // Эвакуационная линия: точки сегментов лестницы на текущем этаже.
  const evacuationPoints = useMemo(() => {
    const segments = route?.evacuation?.route?.segments ?? [];
    const points = segments
      .filter((segment) => segment.floorNumber === activeFloor)
      .flatMap((segment) => segment.points.map(planToScene));
    return points as [number, number, number][];
  }, [route, activeFloor, planToScene]);

  // Линия эвакуации стартует только на цельном этаже маршрута: пока панель
  // ведёт посетителя через лифт, показывать путь до лестницы преждевременно.
  const isRouteDestinationFloor = useMemo(() => {
    if (!route?.segments?.length) return false;
    return route.segments[route.segments.length - 1].floorNumber === activeFloor;
  }, [route, activeFloor]);

  const [evacuationRouteVisible, setEvacuationRouteVisible] = useState(false);
  const evacuationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEvacuationRouteVisible(false);
  }, [route, activeFloor]);

  useEffect(
    () => () => {
      if (evacuationTimerRef.current) {
        clearTimeout(evacuationTimerRef.current);
        evacuationTimerRef.current = null;
      }
    },
    [],
  );

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
      if (change) {
        onReachTransfer?.(change.toFloor);
        return;
      }

      // Посетитель дошёл до магазина: через паузу запускаем эвакуационную
      // линию другим цветом — до ближайшей пожарной лестницы.
      if (!isRouteDestinationFloor || evacuationPoints.length < 2) return;
      if (evacuationTimerRef.current) {
        clearTimeout(evacuationTimerRef.current);
      }
      evacuationTimerRef.current = setTimeout(() => {
        evacuationTimerRef.current = null;
        setEvacuationRouteVisible(true);
        onEvacuationRouteStart?.();
      }, EVACUATION_ROUTE_DELAY_MS);
    };

    return (
      <group>
        <AnimatedRouteLine points={points} onComplete={handleComplete} />
        <mesh position={start}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={end}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={0.6} />
        </mesh>
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
<FloorIconLayer
        icons={icons}
        metrics={metrics}
        onIconClick={(id) => {
          const icon = icons.find((i) => i.id === id);
          if (icon) onIconClick?.(icon);
        }}
      />
      {routeOverlay || shaft || evacuationStairMarkers.length > 0 ? (
        <group position={[0, routeLiftY, 0]}>
          {routeOverlay}
          {shaft}
          {evacuationStairMarkers.map((marker) => (
            <EvacuationStairsMarker key={marker.id} position={marker.position} />
          ))}
          {evacuationRouteVisible && evacuationPoints.length >= 2 ? (
            <AnimatedRouteLine
              points={evacuationPoints}
              color={EVACUATION_ROUTE_COLOR}
              casingColor={EVACUATION_ROUTE_CASING_COLOR}
            />
          ) : null}
        </group>
      ) : null}
    </>
  );
}
