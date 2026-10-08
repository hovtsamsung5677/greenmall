import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  TextureLoader,
  Vector3,
} from 'three';
import type { Group } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ApiRouteToStoreResponse, ApiFloorTexture } from '@api/types';

export interface PlanMetrics {
  width: number;
  height: number;
}

// ==================== AnimatedRouteLine ====================

// Линия маршрута — чёрная прерывистая. Чтобы она читалась и на светлом, и на
// тёмном полу, каждый штрих оборачивается тонким белым «кожухом» (casing) —
// приём из 2D-картографии: тёмная линия с контрастной обводкой.
const ROUTE_COLOR = '#000000';
const ROUTE_CASING_COLOR = '#FFFFFF';
const ROUTE_CASING_RATIO = 1.3;

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

  const DASH_LENGTH = 10;
  const GAP_LENGTH = 5;

  const totalLength = useMemo(() => {
    let len = 0;
    for (let i = 0; i < vectors.length - 1; i++) {
      len += vectors[i].distanceTo(vectors[i + 1]);
    }
    return len;
  }, [vectors]);

  const dashes = useMemo(() => {
    if (totalLength === 0 || vectors.length < 2) return [] as { a: Vector3; b: Vector3 }[];
    const step = DASH_LENGTH + GAP_LENGTH;
    const count = Math.max(1, Math.floor(totalLength / step));
    const result: { a: Vector3; b: Vector3 }[] = [];
    for (let i = 0; i < count; i++) {
      const startDist = i * step;
      const endDist = Math.min(startDist + DASH_LENGTH, totalLength);
      const a = getPointOnPolyline(vectors, totalLength, startDist);
      const b = getPointOnPolyline(vectors, totalLength, endDist);
      if (a && b) result.push({ a, b });
    }
    return result;
  }, [vectors, totalLength]);

  const dashMeshes = useMemo(() => {
    if (dashes.length === 0) return null;
    const radius = Math.max(0.1, dashSize);
    const up = new Vector3(0, 1, 0);

    // Матрицы считаем один раз и переиспользуем для обоих слоёв: кожух и линия
    // совпадают по геометрии, различается только радиус.
    const matrices = dashes.map(({ a, b }) => {
      const length = Math.max(0.01, a.distanceTo(b));
      const dummy = new Object3D();
      dummy.position.addVectors(a, b).multiplyScalar(0.5);
      dummy.quaternion.setFromUnitVectors(up, new Vector3().subVectors(b, a).normalize());
      dummy.scale.set(1, length, 1);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });

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
      const mesh = new InstancedMesh(geometry, material, dashes.length);
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
    };
  }, [dashes, dashSize]);

  useEffect(() => {
    progress.current = 0;
    completedRef.current = false;
  }, [pointsKey, dashMeshes]);

  useFrame((_, delta) => {
    if (!dashMeshes || dashes.length === 0) return;

    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta / speed);
    }

    const visibleCount = Math.max(
      0,
      Math.min(dashes.length, Math.floor(progress.current * dashes.length)),
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
        <mesh>
          <sphereGeometry args={[dashSize * 1.2 * ROUTE_CASING_RATIO, 16, 16]} />
          <meshStandardMaterial color={ROUTE_CASING_COLOR} side={BackSide} roughness={0.45} />
        </mesh>
        <mesh>
          <sphereGeometry args={[dashSize * 1.2, 16, 16]} />
          <meshStandardMaterial color={ROUTE_COLOR} roughness={0.45} />
        </mesh>
      </group>
    </group>
  );
}

// ==================== FloorScene ====================

export function FloorScene({
  gltf,
  groupRef,
  metrics,
  route,
  activeFloor,
  onReachTransfer,
  debug = false,
  textures = [],
}: {
  gltf: GLTF;
  groupRef?: React.RefObject<Group | null>;
  metrics: PlanMetrics | null;
  route: ApiRouteToStoreResponse | null;
  activeFloor: number;
  onReachTransfer?: (nextFloor: number) => void;
  debug?: boolean;
  textures?: ApiFloorTexture[];
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

  return (
    <>
      {debug && <axesHelper args={[500]} />}
      <group ref={groupRef} scale={uniformScale}>
        <group position={[-center.x, -center.y, -center.z]}>
          <primitive object={scene} />
        </group>
      </group>
      {routeOverlay ? <group position={[0, routeLiftY, 0]}>{routeOverlay}</group> : null}
    </>
  );
}
