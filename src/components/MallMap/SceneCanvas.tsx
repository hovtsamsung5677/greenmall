import React, { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MOUSE, TOUCH } from 'three';
import type { Group } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ApiRouteToStoreResponse } from '@api/types';
import { FloorScene, type PlanMetrics, type UpwardShaft } from './FloorScene';
import FloorStackStage from './FloorStackStage';

export const CAMERA_HEIGHT_DEFAULT = 900;
export const CAMERA_HEIGHT_GROUND = 120000;

export interface CameraConfig {
  position: [number, number, number];
  fov: number;
  near: number;
  far: number;
}

export function makeCameraConfig(activeFloor: number): CameraConfig {
  const y = activeFloor === 0 ? CAMERA_HEIGHT_GROUND : CAMERA_HEIGHT_DEFAULT;
  return {
    position: [0, y, 0.001],
    fov: 50,
    near: 1,
    far: 200000,
  };
}

export function CameraController({
  activeFloor,
  controlsRef,
  justOpened,
  zoom,
}: {
  activeFloor: number;
  controlsRef: React.RefObject<any>;
  justOpened?: boolean;
  zoom: number;
}) {
  const { camera } = useThree();

  // 1) Первичный сброс камеры — только при justOpened.
  useEffect(() => {
    if (!justOpened) return;
    const controls = controlsRef.current;
    if (!controls) return;
    const y = activeFloor === 0 ? CAMERA_HEIGHT_GROUND : CAMERA_HEIGHT_DEFAULT;
    controls.target.set(0, 0, 0);
    camera.position.set(0, y, 0.001);
    camera.updateProjectionMatrix();
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justOpened, activeFloor]);

  // 2) Зум — двигаем камеру вдоль луча target→camera.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cam = controls.object ?? camera;
    if (!cam) return;

    const baseY = activeFloor === 0 ? CAMERA_HEIGHT_GROUND : CAMERA_HEIGHT_DEFAULT;
    const desiredDistance = baseY * (2 / Math.max(0.01, zoom));

    const dir = cam.position.clone().sub(controls.target);
    const len = dir.length();
    if (len < 1e-3) {
      cam.position.set(0, desiredDistance, 0.001);
    } else {
      dir.normalize();
      cam.position.copy(controls.target).addScaledVector(dir, desiredDistance);
    }
    cam.updateProjectionMatrix();
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  return null;
}

export interface SceneTransfer {
  gap: number;
  duration: number;
  direction: 'up' | 'down';
  onComplete: () => void;
}

export function SceneCanvas({
  gltf,
  nextGltf,
  metrics,
  nextMetrics,
  route,
  activeFloor,
  transfer = null,
  shaft = null,
  onReachTransfer,
  onTransferComplete,
  controlsRef,
  controlsEnabled,
  cameraConfig,
  canvasStyle,
  justOpened,
  zoom,
  debug,
  onContextLost,
}: {
  gltf: GLTF | null;
  nextGltf?: GLTF | null;
  metrics: PlanMetrics | null;
  nextMetrics?: PlanMetrics | null;
  route: ApiRouteToStoreResponse | null;
  activeFloor: number;
  transfer?: SceneTransfer | null;
  shaft?: UpwardShaft | null;
  onReachTransfer?: (nextFloor: number) => void;
  onTransferComplete?: () => void;
  controlsRef: React.RefObject<any>;
  controlsEnabled: boolean;
  cameraConfig: CameraConfig;
  canvasStyle: React.CSSProperties;
  justOpened?: boolean;
  zoom: number;
  debug?: boolean;
  onContextLost?: () => void;
}) {
  const groupRef = useRef<Group | null>(null);

  // Обе модели живут в неизменной структуре дерева (см. FloorStackStage),
  // иначе доигранная линия маршрута перезапустилась бы в момент перехода.
  const currentScene = gltf ? (
    <FloorScene
      gltf={gltf}
      groupRef={groupRef}
      metrics={metrics}
      route={route}
      activeFloor={activeFloor}
      onReachTransfer={onReachTransfer}
      upwardShaft={shaft}
      debug={debug}
    />
  ) : null;

  const nextScene = transfer && nextGltf ? (
    <FloorScene
      gltf={nextGltf}
      metrics={nextMetrics ?? metrics}
      route={null}
      activeFloor={activeFloor}
      debug={debug}
    />
  ) : null;

  return (
    <Canvas
      camera={cameraConfig}
      style={canvasStyle}
      dpr={[1, 2]}
      gl={{ powerPreference: 'high-performance', antialias: true }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        canvas.addEventListener(
          'webglcontextlost',
          () => {
            console.warn('[MallMap] WebGL context lost — remounting Canvas');
            onContextLost?.();
          },
          false,
        );
      }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} />
      <FloorStackStage
        current={currentScene}
        next={nextScene}
        gap={transfer?.gap ?? 0}
        direction={transfer?.direction ?? 'up'}
        active={Boolean(transfer)}
        duration={transfer?.duration ?? 1.5}
        onComplete={onTransferComplete}
        controlsRef={controlsRef}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0, 0]}
        enabled={controlsEnabled}
        enableDamping
        dampingFactor={0.08}
        enableZoom={false}
        enablePan
        mouseButtons={{
          LEFT: MOUSE.ROTATE,
          MIDDLE: MOUSE.DOLLY,
          RIGHT: MOUSE.PAN,
        }}
        touches={{
          ONE: TOUCH.ROTATE,
          TWO: TOUCH.DOLLY_PAN,
        }}
      />
      <CameraController
        activeFloor={activeFloor}
        controlsRef={controlsRef}
        justOpened={justOpened}
        zoom={zoom}
      />
    </Canvas>
  );
}