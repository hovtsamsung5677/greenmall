import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Texture } from 'three';
import type { ApiFloorIcon } from '@api/types';
import { resolveAssetUrl } from '@api/fileAssets';

export interface FloorIconLayerMetrics {
  width: number;
  height: number;
}

/** Координаты плана этажа → мировые координаты сцены (модель отцентрована по X/Z). */
export function floorIconPlanToScene(
  icon: { x: number; y: number; z?: number },
  metrics: FloorIconLayerMetrics | null,
): [number, number, number] {
  const w = metrics?.width ?? 0;
  const h = metrics?.height ?? 0;
  return [icon.x - w / 2, icon.z ?? 0, icon.y - h / 2];
}

/** Мировые координаты сцены → координаты плана этажа. */
export function floorIconSceneToPlan(
  p: { x: number; y: number; z: number },
  metrics: FloorIconLayerMetrics | null,
): { x: number; y: number; z: number } {
  const w = metrics?.width ?? 0;
  const h = metrics?.height ?? 0;
  return { x: p.x + w / 2, y: p.z + h / 2, z: p.y };
}

function FloorIconSprite({
  icon,
  metrics,
  selected,
  onSelect,
}: {
  icon: ApiFloorIcon;
  metrics: FloorIconLayerMetrics | null;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [texture, setTexture] = useState<Texture | null>(null);
  const assetUrl = icon.asset?.url ?? '';

  useEffect(() => {
    if (!assetUrl) return;
    let disposed = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      resolveAssetUrl(assetUrl),
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        setTexture(tex);
      },
      undefined,
      () => setTexture(null),
    );
    return () => {
      disposed = true;
    };
  }, [assetUrl]);

  useEffect(() => {
    return () => {
      texture?.dispose();
    };
  }, [texture]);

  // Размер иконки в мировых единицах: scaleX/scaleY — доли от габарита этажа.
  // Соотношение сторон сохраняется, а суммарный размер ограничен — иначе
  // «сломанные» данные (например scaleX=2) рисуют иконку поверх всего этажа.
  const worldSize = useMemo(() => {
    const w = metrics?.width ?? 0;
    const h = metrics?.height ?? 0;
    if (w <= 0 || h <= 0) {
      const fallback = Math.max(1, icon.scaleX * 100);
      return { width: fallback, height: fallback };
    }

    const desiredWidth = w * icon.scaleX;
    const desiredHeight = h * icon.scaleY;
    const MAX_RATIO = 0.5;

    let shrink = 1;
    if (desiredWidth > w * MAX_RATIO) {
      shrink = Math.min(shrink, (w * MAX_RATIO) / desiredWidth);
    }
    if (desiredHeight > h * MAX_RATIO) {
      shrink = Math.min(shrink, (h * MAX_RATIO) / desiredHeight);
    }

    return {
      width: Math.max(1, desiredWidth * shrink),
      height: Math.max(1, desiredHeight * shrink),
    };
  }, [metrics, icon.scaleX, icon.scaleY]);

  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  if (!texture) return null;

  return (
    <group position={floorIconPlanToScene(icon, metrics)}>
      {/* Невидимая область клика побольше самой иконки. */}
      <mesh
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect?.(icon.id);
        }}
      >
        <planeGeometry args={[worldSize.width * 1.6, worldSize.height * 1.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef}>
        <planeGeometry args={[worldSize.width, worldSize.height]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={selected ? 1 : 0.95}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {selected ? (
        <mesh position={[0, worldSize.height * 0.75, 0]}>
          <sphereGeometry args={[Math.max(2, worldSize.width * 0.05), 12, 12]} />
          <meshBasicMaterial color="#22c55e" toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

export default function FloorIconLayer({
  icons,
  metrics,
  selectedIconId = null,
  onIconClick,
}: {
  icons: ApiFloorIcon[];
  metrics: FloorIconLayerMetrics | null;
  selectedIconId?: string | null;
  onIconClick?: (id: string) => void;
}) {
  return (
    <group>
      {icons.map((icon) => (
        <FloorIconSprite
          key={icon.id}
          icon={icon}
          metrics={metrics}
          selected={icon.id === selectedIconId}
          onSelect={onIconClick}
        />
      ))}
    </group>
  );
}
