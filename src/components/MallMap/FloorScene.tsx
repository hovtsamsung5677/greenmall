import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Box3,
  CylinderGeometry,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import type { Group } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ApiRouteToStoreResponse } from '../../api/types';

export interface PlanMetrics {
  width: number;
  height: number;
}

// ==================== AnimatedRouteLine ====================

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
  const markerRef = useRef<Mesh>(null);
  const progress = useRef(0);
  const completedRef = useRef(false);

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

  const instancedMesh = useMemo(() => {
    if (dashes.length === 0) return null;
    const radius = Math.max(0.1, dashSize);
    const geometry = new CylinderGeometry(radius, radius, 1, 12);
    const material = new MeshStandardMaterial({
      color: '#000000',
      emissive: '#000000',
      emissiveIntensity: 0.6,
    });
    const mesh = new InstancedMesh(geometry, material, dashes.length);
    mesh.count = 0;

    const dummy = new Object3D();
    const mid = new Vector3();
    const dir = new Vector3();
    const quat = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const scale = new Vector3();

    for (let i = 0; i < dashes.length; i++) {
      const { a, b } = dashes[i];
      const length = Math.max(0.01, a.distanceTo(b));
      mid.addVectors(a, b).multiplyScalar(0.5);
      dir.subVectors(b, a);
      dir.normalize();
      quat.setFromUnitVectors(up, dir);
      scale.set(1, length, 1);

      dummy.position.copy(mid);
      dummy.quaternion.copy(quat);
      dummy.scale.copy(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }, [dashes, dashSize]);

  useEffect(() => {
    progress.current = 0;
    completedRef.current = false;
  }, [points]);

  useFrame((_, delta) => {
    if (!instancedMesh || dashes.length === 0) return;

    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + delta / speed);
    }

    const visibleCount = Math.max(
      0,
      Math.min(dashes.length, Math.floor(progress.current * dashes.length)),
    );
    if (instancedMesh.count !== visibleCount) {
      instancedMesh.count = visibleCount;
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

  if (!instancedMesh) return null;

  return (
    <group>
      <primitive object={instancedMesh} />
      <mesh ref={markerRef}>
        <sphereGeometry args={[dashSize * 1.2, 16, 16]} />
        <meshStandardMaterial color="#000000" emissive="#000000" emissiveIntensity={0.6} />
      </mesh>
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
}: {
  gltf: GLTF;
  groupRef?: React.RefObject<Group | null>;
  metrics: PlanMetrics | null;
  route: ApiRouteToStoreResponse | null;
  activeFloor: number;
  onReachTransfer?: (nextFloor: number) => void;
  debug?: boolean;
}) {
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);

  // 1) Считаем bbox и масштаб.
  const { uniformScale } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    if (metrics && size.x > 0 && size.z > 0) {
      const s = Math.min(metrics.width / size.x, metrics.height / size.z);
      if (isFinite(s) && s > 0) return { uniformScale: s };
    }
    return { uniformScale: 1 };
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

  const planToScene = useCallback(
    (p: { x: number; y: number; z?: number | null }): [number, number, number] => {
      const w = metrics?.width ?? 1;
      const h = metrics?.height ?? 1;
      return [p.x - w / 2, (p.z ?? 0) || 0, p.y - h / 2];
    },
    [metrics],
  );

  const routeOverlay = useMemo(() => {
    if (!route || route.routePath.length < 2) return null;
    const segment = route.segments?.find((s) => s.floorNumber === activeFloor) ?? null;
    if (!segment || segment.points.length < 2) return null;
    const points = segment.points.map(planToScene);
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
  }, [route, planToScene, activeFloor, onReachTransfer]);

  return (
    <>
      {debug && <axesHelper args={[500]} />}
      {/* Внешняя группа — только масштаб. */}
      <group ref={groupRef} scale={uniformScale}>
        {/* Внутренняя группа — только смещение к центру. */}
        <group position={[-center.x, -center.y, -center.z]}>
          <primitive object={scene} />
        </group>
      </group>
      {routeOverlay}
    </>
  );
}
