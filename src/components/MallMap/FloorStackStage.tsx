import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';
import { CAMERA_HEIGHT_DEFAULT } from './SceneCanvas';

const TRANSFER_DURATION = 1.5;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface FloorStackStageProps {
  current: React.ReactNode;
  next: React.ReactNode;
  gap: number;
  direction: 'up' | 'down';
  active: boolean;
  duration: number;
  onComplete?: () => void;
  controlsRef?: React.RefObject<any>;
}

/**
 * «Стопка этажей» во время межэтажного перехода.
 *
 * Визуально: посетитель смотрит на здание сбоку (профиль).
 * При подъёме (direction='up') текущий этаж уезжает вниз, следующий въезжает
 * сверху. При спуске (direction='down') — наоборот: текущий уезжает вверх,
 * целевой этаж выезжает снизу. Когда стрелка шахты доходит до целевого этажа,
 * камера возвращается в обычный вид сверху и включается OrbitControls.
 *
 * Движущая группа (movingRef) и upcoming-группа (nextRef) живут в дереве
 * постоянно — иначе React перемонтировал бы current и перезапустил
 * доигранную линию маршрута в момент старта перехода.
 */
export default function FloorStackStage({
  current,
  next,
  gap,
  direction,
  active,
  duration,
  onComplete,
  controlsRef,
}: FloorStackStageProps) {
  const movingRef = useRef<Group>(null);
  const nextRef = useRef<Group>(null);
  const elapsed = useRef(0);
  const finished = useRef(false);

  const isUp = direction === 'up';

  useEffect(() => {
    if (active) {
      elapsed.current = 0;
      finished.current = false;
    }
  }, [active]);

  useLayoutEffect(() => {
    const moving = movingRef.current;
    const upcoming = nextRef.current;
    const controls = controlsRef?.current;
    if (!moving || !upcoming) return;
    moving.position.y = 0;
    upcoming.position.y = isUp ? gap : -gap;
    if (!active && controls) {
      controls.target.set(0, 0, 0);
      controls.object.position.set(0, CAMERA_HEIGHT_DEFAULT, 0.001);
      controls.object.updateProjectionMatrix();
      controls.enabled = true;
      controls.update();
    }
  }, [active, gap, direction, controlsRef]);

  const sidePos = useMemo(() => new THREE.Vector3(gap * 6.0, gap * 1.2, gap * 0.8), [gap]);
  const sideTarget = useMemo(
    () => new THREE.Vector3(0, isUp ? gap * 0.5 : -gap * 0.5, 0),
    [gap, direction],
  );
  const normalPos = useMemo(() => new THREE.Vector3(0, CAMERA_HEIGHT_DEFAULT, 0.001), []);
  const normalTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const moving = movingRef.current;
    const upcoming = nextRef.current;
    if (!moving || !upcoming) return;

    if (!active) {
      finished.current = true;
      return;
    }

    elapsed.current = Math.min(duration, elapsed.current + delta);
    const t = duration > 0 ? elapsed.current / duration : 1;

    const controls = controlsRef?.current;
    if (controls?.enabled) {
      controls.enabled = false;
    }

    let floorT: number;
    if (t < 0.15) floorT = 0;
    else if (t < 0.85) floorT = easeInOutCubic((t - 0.15) / 0.7);
    else floorT = 1;

    if (isUp) {
      moving.position.y = -gap * floorT;
    } else {
      moving.position.y = gap * floorT;
    }

    let camPos: THREE.Vector3;
    let camTarget: THREE.Vector3;
    if (t < 0.15) {
      const p = easeInOutCubic(t / 0.15);
      tmp.lerpVectors(normalPos, sidePos, p);
      camPos = tmp.clone();
      tmp.lerpVectors(normalTarget, sideTarget, p);
      camTarget = tmp.clone();
    } else if (t < 0.85) {
      camPos = sidePos.clone();
      camTarget = sideTarget.clone();
    } else {
      const p = easeInOutCubic((t - 0.85) / 0.15);
      tmp.lerpVectors(sidePos, normalPos, p);
      camPos = tmp.clone();
      tmp.lerpVectors(sideTarget, normalTarget, p);
      camTarget = tmp.clone();
    }

    if (controls?.object) {
      controls.object.position.copy(camPos);
      controls.object.updateProjectionMatrix();
    }
    if (controls) {
      controls.target.copy(camTarget);
      controls.update();
    }

    if (t >= 1 && !finished.current) {
      finished.current = true;
      if (controls?.object) {
        controls.object.position.set(0, CAMERA_HEIGHT_DEFAULT, 0.001);
        controls.object.updateProjectionMatrix();
      }
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.enabled = true;
        controls.update();
      }
      onComplete?.();
    }
  });

  return (
    <group ref={movingRef}>
      <group>{current}</group>
      <group ref={nextRef}>{next}</group>
    </group>
  );
}