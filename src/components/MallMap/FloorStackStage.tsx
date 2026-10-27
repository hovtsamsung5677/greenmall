import React, { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';
import { CAMERA_HEIGHT_DEFAULT } from './SceneCanvas';

function easeInOutCubic(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const CAMERA_IN_RATIO = 0.2;
const CAMERA_OUT_RATIO = 0.2;

export interface FloorStackStageProps {
  current: React.ReactNode;
  next: React.ReactNode;
  gap: number;
  direction: 'up' | 'down';
  active: boolean;
  duration: number;
  /** Final top-view camera position (already accounts for floor and current zoom). */
  normalCameraPosition?: [number, number, number];
  onComplete?: () => void;
  controlsRef?: React.RefObject<any>;
}

/**
 * Smoothly swaps the visible floor like a lift travelling between levels.
 * The current and upcoming scenes stay mounted together so the route animation
 * does not restart when the transfer begins. The vertical floor movement and
 * the animated route connector use the same middle part of the timeline.
 */
export default function FloorStackStage({
  current,
  next,
  gap,
  direction,
  active,
  duration,
  normalCameraPosition,
  onComplete,
  controlsRef,
}: FloorStackStageProps) {
  const movingRef = useRef<Group>(null);
  const nextRef = useRef<Group>(null);
  const elapsed = useRef(0);
  const finished = useRef(false);
  const wasActive = useRef(false);
  const dampingBeforeTransfer = useRef<boolean | null>(null);
  const startCameraPosition = useRef(new THREE.Vector3(0, CAMERA_HEIGHT_DEFAULT, 0.001));
  const startCameraTarget = useRef(new THREE.Vector3(0, 0, 0));

  const isUp = direction === 'up';
  const endCamera = normalCameraPosition ?? [0, CAMERA_HEIGHT_DEFAULT, 0.001];

  // Keep the camera on the same azimuth as the initial top view (positive Z).
  // Moving it along X made the floor appear to yaw/turn right during transfer.
  const sidePos = new THREE.Vector3(0, gap * 1.05, gap * 4.6);
  // Keep the stacked pair centred while the floors pass each other. Targeting
  // +/- gap/2 made the camera drift toward one floor and then snap back.
  const sideTarget = new THREE.Vector3(0, 0, 0);
  const normalPos = new THREE.Vector3(endCamera[0], endCamera[1], endCamera[2]);
  const normalTarget = new THREE.Vector3(0, 0, 0);
  const tmpPosition = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();

  useLayoutEffect(() => {
    const moving = movingRef.current;
    const upcoming = nextRef.current;
    const controls = controlsRef?.current;
    if (!moving || !upcoming) return;

    moving.position.y = 0;
    upcoming.position.y = isUp ? gap : -gap;

    if (active && !wasActive.current) {
      elapsed.current = 0;
      finished.current = false;
      if (controls?.object) {
        startCameraPosition.current.copy(controls.object.position);
        startCameraTarget.current.copy(controls.target);
      }
      if (controls) {
        dampingBeforeTransfer.current = Boolean(controls.enableDamping);
        controls.enabled = false;
        // OrbitControls damping fights direct camera interpolation and creates
        // a small wobble at the start/end of the transfer.
        controls.enableDamping = false;
        controls.update();
      }
    } else if (!active && wasActive.current && controls) {
      controls.target.copy(normalTarget);
      if (controls.object) {
        controls.object.position.copy(normalPos);
        controls.object.updateProjectionMatrix();
      }
      controls.enabled = true;
      if (dampingBeforeTransfer.current !== null) {
        controls.enableDamping = dampingBeforeTransfer.current;
      }
      dampingBeforeTransfer.current = null;
      controls.update();
    }

    wasActive.current = active;
  }, [active, gap, direction, controlsRef]);

  useFrame((_, delta) => {
    const moving = movingRef.current;
    const upcoming = nextRef.current;
    if (!moving || !upcoming || !active) return;

    elapsed.current = Math.min(Math.max(0, duration), elapsed.current + Math.min(delta, 0.05));
    const t = duration > 0 ? elapsed.current / duration : 1;
    const controls = controlsRef?.current;

    // Camera moves to a profile view, holds while the route travels between
    // levels, then eases back to the exact top view used by the target floor.
    let cameraInT = 0;
    let cameraOutT = 0;
    if (t < CAMERA_IN_RATIO) {
      cameraInT = easeInOutCubic(t / CAMERA_IN_RATIO);
    } else if (t > 1 - CAMERA_OUT_RATIO) {
      cameraOutT = easeInOutCubic((t - (1 - CAMERA_OUT_RATIO)) / CAMERA_OUT_RATIO);
    }

    if (t < CAMERA_IN_RATIO) {
      tmpPosition.lerpVectors(startCameraPosition.current, sidePos, cameraInT);
      tmpTarget.lerpVectors(startCameraTarget.current, sideTarget, cameraInT);
    } else if (t <= 1 - CAMERA_OUT_RATIO) {
      tmpPosition.copy(sidePos);
      tmpTarget.copy(sideTarget);
    } else {
      tmpPosition.lerpVectors(sidePos, normalPos, cameraOutT);
      tmpTarget.lerpVectors(sideTarget, normalTarget, cameraOutT);
    }

    // The same 60% time window is used by the animated shaft line. This makes
    // the glowing route marker arrive as the destination floor settles in.
    const travelStart = CAMERA_IN_RATIO;
    const travelEnd = 1 - CAMERA_OUT_RATIO;
    const floorT = easeInOutCubic((t - travelStart) / (travelEnd - travelStart));
    moving.position.y = (isUp ? -1 : 1) * gap * THREE.MathUtils.clamp(floorT, 0, 1);

    if (controls?.object) {
      controls.object.position.copy(tmpPosition);
      controls.object.updateProjectionMatrix();
    }
    if (controls) {
      controls.target.copy(tmpTarget);
      controls.update();
    }

    if (t >= 1 && !finished.current) {
      finished.current = true;
      moving.position.y = isUp ? -gap : gap;
      upcoming.position.y = isUp ? gap : -gap;
      // Keep OrbitControls disabled until React swaps the target scene and the
      // layout effect above restores the camera and controls in one step.
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
