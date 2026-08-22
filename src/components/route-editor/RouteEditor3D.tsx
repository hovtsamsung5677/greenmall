import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';
import type { ApiRouteNode, ApiRouteEdge, ApiRouteNodeType } from '../../api/types';

export interface FloorPlanMetrics {
  width: number;
  height: number;
}

function resolveModelScale(
  model: THREE.Object3D,
  metrics: FloorPlanMetrics | null,
): { scale: number; center: THREE.Vector3 } {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
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

function planToScene(
  node: { x: number; y: number; z?: number | null },
  metrics: FloorPlanMetrics | null,
): [number, number, number] {
  if (!metrics) {
    return [node.x, (node.z ?? 0) || 0, node.y];
  }
  const sceneX = node.x - metrics.width / 2;
  const sceneZ = node.y - metrics.height / 2;
  const sceneY = (node.z ?? 0) || 0;
  return [sceneX, sceneY, sceneZ];
}

const NODE_COLORS: Record<ApiRouteNodeType, string> = {
  ROUTE_POINT: '#3B82F6',
  ENTRANCE: '#22C55E',
  PANEL: '#F59E0B',
  STORE_ANCHOR: '#EF4444',
  ELEVATOR: '#A855F7',
  ESCALATOR: '#A855F7',
  STAIRS: '#A855F7',
  TOILET: '#14B8A6',
  INFO_DESK: '#14B8A6',
  OTHER: '#64748B',
};

function FloorModel({
  url,
  groupRef,
  onClick,
  metrics,
}: {
  url: string;
  groupRef?: React.RefObject<Group | null>;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  metrics: FloorPlanMetrics | null;
}) {
  const gltf = useLoader(GLTFLoader, url);
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
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

function RouteGraph({
  nodes,
  edges,
  selectedNodeId,
  pendingFromId,
  onNodeClick,
  metrics,
}: {
  nodes: ApiRouteNode[];
  edges: ApiRouteEdge[];
  selectedNodeId: string | null;
  pendingFromId: string | null;
  onNodeClick: (id: string) => void;
  metrics: FloorPlanMetrics | null;
}) {
  const nodeById = useMemo(() => {
    const map = new Map<string, ApiRouteNode>();
    for (const node of nodes) map.set(node.id, node);
    return map;
  }, [nodes]);

  return (
    <group>
      {edges.map((edge) => {
        const from = nodeById.get(edge.fromNodeId);
        const to = nodeById.get(edge.toNodeId);
        if (!from || !to) return null;
        return (
          <Line
            key={edge.id}
            points={[planToScene(from, metrics), planToScene(to, metrics)]}
            color={edge.isActive ? '#94A3B8' : '#F87171'}
            lineWidth={2}
            dashed={!edge.isActive}
          />
        );
      })}

      {nodes.map((node) => {
        const position = planToScene(node, metrics);
        const color = NODE_COLORS[node.type] ?? '#64748B';
        const isSelected = node.id === selectedNodeId;
        const isPending = node.id === pendingFromId;
        const radius = isSelected || isPending ? 6 : 3.5;
        const hitRadius = 18;
        return (
          <group key={node.id} position={position}>
            <mesh
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onNodeClick(node.id);
              }}
            >
              <sphereGeometry args={[radius, 16, 16]} />
              <meshStandardMaterial
                color={isSelected || isPending ? '#FFFFFF' : color}
                emissive={color}
                emissiveIntensity={isSelected || isPending ? 0.9 : 0.4}
              />
            </mesh>
            <mesh
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onNodeClick(node.id);
              }}
              visible={false}
            >
              <sphereGeometry args={[hitRadius, 8, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export type RouteEditorMode = 'select' | 'add' | 'connect';

interface RouteEditor3DProps {
  modelUrl: string | null;
  floorId: string;
  nodes: ApiRouteNode[];
  edges: ApiRouteEdge[];
  selectedNodeId: string | null;
  pendingFromId: string | null;
  mode: RouteEditorMode;
  metrics: FloorPlanMetrics | null;
  onAddNode: (coords: { x: number; y: number; z: number }) => void;
  onNodeClick: (id: string) => void;
}

export default function RouteEditor3D({
  modelUrl,
  nodes,
  edges,
  selectedNodeId,
  pendingFromId,
  mode,
  metrics,
  onAddNode,
  onNodeClick,
}: RouteEditor3DProps) {
  const modelGroupRef = useRef<Group | null>(null);
  const [error, setError] = useState(false);

  if (!modelUrl) {
    return (
      <div style={{ padding: 24, color: '#64748B' }}>
        Нет 3D-модели этажа для редактирования.
      </div>
    );
  }

  const halfWidth = metrics ? metrics.width / 2 : 450;
  const halfHeight = metrics ? metrics.height / 2 : 300;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 480 }}>
      {error ? (
        <div style={{ padding: 24, color: '#EF4444' }}>
          Ошибка загрузки 3D-модели.
        </div>
      ) : (
        <Canvas
          camera={{ position: [0, 1200, 0.001], fov: 50, near: 0.1, far: 100000000 }}
          onCreated={() => setError(false)}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} />
          <Suspense fallback={null}>
            <FloorModel
              url={modelUrl}
              groupRef={modelGroupRef}
              metrics={metrics}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                if (mode !== 'add') return;
                e.stopPropagation();
                const p = e.point;
                onAddNode({
                  x: Math.round(p.x + halfWidth),
                  y: Math.round(p.z + halfHeight),
                  z: Math.round(Math.max(0, p.y)),
                });
              }}
            />
          </Suspense>

          <RouteGraph
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            pendingFromId={pendingFromId}
            metrics={metrics}
            onNodeClick={onNodeClick}
          />

          <OrbitControls
            makeDefault
            target={[0, 0, 0]}
            enableRotate
            enableZoom
            enablePan
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN,
            }}
          />
        </Canvas>
      )}
    </div>
  );
}
