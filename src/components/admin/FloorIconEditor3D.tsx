import { Suspense, useMemo, useRef } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Box3, Vector3, MOUSE } from 'three';
import type { Group } from 'three';
import type { ApiFloorIcon } from '@api/types';
import FloorIconLayer, {
  type FloorIconLayerMetrics,
  floorIconSceneToPlan,
} from '../MallMap/FloorIconLayer';

export type FloorIconEditorMode = 'select' | 'place' | 'move';
const PICK_MODES: FloorIconEditorMode[] = ['place', 'move'];

function resolveModelScale(
  model: THREE.Object3D,
  metrics: FloorIconLayerMetrics | null,
): { scale: number; center: Vector3 } {
  const box = new Box3().setFromObject(model);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);

  const baseScale = 1;
  if (!metrics || size.x === 0 || size.z === 0) {
    return { scale: baseScale, center };
  }

  const scaleX = metrics.width / size.x;
  const scaleZ = metrics.height / size.z;
  const scale = Math.min(scaleX, scaleZ) || baseScale;
  return { scale, center };
}

function FloorModel({
  url,
  groupRef,
  onClick,
  metrics,
}: {
  url: string;
  groupRef?: React.RefObject<Group | null>;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  metrics: FloorIconLayerMetrics | null;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      }
    });
    return cloned;
  }, [gltf]);

  const { scale, center } = useMemo(
    () => resolveModelScale(scene, metrics),
    [scene, metrics],
  );

  return (
    <group
      ref={groupRef}
      onClick={onClick}
      scale={scale}
      position={[-center.x * scale, -center.y * scale, -center.z * scale]}
    >
      <primitive object={scene} />
    </group>
  );
}

interface FloorIconEditor3DProps {
  modelUrl: string | null;
  metrics: FloorIconLayerMetrics | null;
  icons: ApiFloorIcon[];
  selectedIconId: string | null;
  mode: FloorIconEditorMode;
  onModelClick: (coords: { x: number; y: number; z: number }) => void;
  onIconClick: (id: string) => void;
}

export default function FloorIconEditor3D({
  modelUrl,
  metrics,
  icons,
  selectedIconId,
  mode,
  onModelClick,
  onIconClick,
}: FloorIconEditor3DProps) {
  const modelGroupRef = useRef<Group | null>(null);

  if (!modelUrl || !modelUrl.endsWith('.glb')) {
    return (
      <div style={{ padding: 24, color: '#64748B' }}>
        {!modelUrl
          ? 'Нет 3D-модели этажа. Загрузите модель этажа в разделе «Карта».'
          : `Некорректный URL модели: ${modelUrl}`}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 480 }}>
      <Canvas
        camera={{ position: [0, 1200, 0.001], fov: 50, near: 0.1, far: 100000000 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 20, 10]} intensity={1.2} />
        <Suspense fallback={null}>
          <FloorModel
            url={modelUrl}
            groupRef={modelGroupRef}
            metrics={metrics}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              if (!PICK_MODES.includes(mode)) return;
              e.stopPropagation();
              const coords = floorIconSceneToPlan(e.point, metrics);
              onModelClick({
                x: Math.round(coords.x * 10) / 10,
                y: Math.round(coords.y * 10) / 10,
                z: Math.round(coords.z * 10) / 10,
              });
            }}
          />
        </Suspense>

        <FloorIconLayer
          icons={icons}
          metrics={metrics}
          selectedIconId={selectedIconId}
          onIconClick={onIconClick}
        />

        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enableRotate
          enableZoom
          enablePan
          mouseButtons={{
            LEFT: MOUSE.ROTATE,
            MIDDLE: MOUSE.DOLLY,
            RIGHT: MOUSE.PAN,
          }}
        />
      </Canvas>
    </div>
  );
}
