export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTenant {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoAsset: Partial<ApiFileAsset> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStoreFloor {
  id: string;
  number: number;
  name: string;
}

export interface ApiStoreCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ApiStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  roomNumber: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  workingHours: Record<string, unknown> | null;
  searchKeywords: string | null;
  category: ApiStoreCategory | null;
  floor: ApiStoreFloor | null;
  floorId: string | null;
  logoAsset: Partial<ApiFileAsset> | null;
  coverAsset: Partial<ApiFileAsset> | null;
  tenant: ApiTenant | null;
  tenantId: string | null;
  isActive: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFileAsset {
  id: string;
  filename: string;
  originalName: string | null;
  url: string;
  mimeType: string | null;
  size: number | null;
  provider: string | null;
  kind: string;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFloor {
  id: string;
  number: number;
  name: string;
  mapImageUrl: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  unit: string | null;
  mapAssetId: string | null;
  modelAssetId: string | null;
  metadata: unknown | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFloorSceneFloor {
  id: string;
  number: number;
  name: string;
  width: number | null;
  height: number | null;
  depth: number | null;
  unit: string | null;
  mapImageUrl: string | null;
  mapAssetId: string | null;
  modelAssetId: string | null;
  mapAsset: ApiFileAsset | null;
  modelAsset: ApiFileAsset | null;
  metadata: unknown | null;
}

export type ApiMapObjectType =
  | 'STORE'
  | 'TOILET'
  | 'ATM'
  | 'ENTRANCE'
  | 'EXIT'
  | 'ELEVATOR'
  | 'ESCALATOR'
  | 'STAIRS'
  | 'PARKING'
  | 'INFO'
  | 'FOODCOURT'
  | 'REST_ZONE'
  | 'AD_ZONE';

export interface ApiMapObject {
  id: string;
  type: ApiMapObjectType;
  name: string;
  description: string | null;
  floorId: string;
  storeId: string | null;
  categoryId: string | null;
  x: number | null;
  y: number | null;
  z: number | null;
  width: number | null;
  height: number | null;
  rotationX: number | null;
  rotationY: number | null;
  rotationZ: number | null;
  scaleX: number | null;
  scaleY: number | null;
  scaleZ: number | null;
  externalObjectId: string | null;
  polygonData: unknown | null;
  metadata: unknown | null;
  sortOrder: number;
}

export interface ApiSceneStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  roomNumber: string | null;
  categoryId: string | null;
  tenantId: string | null;
  floorId: string | null;
  mapObjectIds: string[];
  routeNodeIds: string[];
  primaryMapObjectId: string | null;
  primaryRouteNodeId: string | null;
  logoAsset: unknown | null;
  coverAsset: unknown | null;
  workingHours: unknown | null;
  searchKeywords: string | null;
}

export interface ApiFloorScene {
  floor: ApiFloorSceneFloor;
  objects: ApiMapObject[];
  routeNodes: unknown[];
  routeEdges: unknown[];
  categories: unknown[];
  stores: ApiSceneStore[];
  meta: {
    schemaVersion: string;
    generatedAt: string;
    purpose: string;
  };
}

export type ApiRouteNodeType =
  | 'ROUTE_POINT'
  | 'ENTRANCE'
  | 'PANEL'
  | 'STORE_ANCHOR'
  | 'ELEVATOR'
  | 'ESCALATOR'
  | 'STAIRS'
  | 'TOILET'
  | 'INFO_DESK'
  | 'OTHER';

export interface ApiRouteNode {
  id: string;
  floorId: string;
  type: ApiRouteNodeType;
  name: string | null;
  code: string | null;
  x: number;
  y: number;
  z: number | null;
  rotationX: number | null;
  rotationY: number | null;
  rotationZ: number | null;
  scaleX: number | null;
  scaleY: number | null;
  scaleZ: number | null;
  mapObjectId: string | null;
  metadata: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRouteNodeFloor {
  id: string;
  number: number;
  name: string;
}

export interface ApiRouteEdgeNodeRef {
  id: string;
  type: ApiRouteNodeType;
  name: string | null;
  x: number;
  y: number;
  z: number | null;
}

export interface ApiRouteEdge {
  id: string;
  floorId: string;
  fromNodeId: string;
  toNodeId: string;
  distance: number | null;
  weight: number | null;
  isBidirectional: boolean;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  fromNode: ApiRouteEdgeNodeRef;
  toNode: ApiRouteEdgeNodeRef;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRoutePathPoint {
  nodeId: string;
  type: ApiRouteNodeType | null;
  name: string | null;
  code: string | null;
  x: number;
  y: number;
  z: number;
  floorId: string;
  floorNumber: number;
  mapObjectId: string | null;
  sortOrder: number;
}

export interface ApiRouteSegment {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  distance: number;
  weight: number;
  isBidirectional: boolean;
  floorId: string;
  label: string | null;
}

export interface ApiRouteInstruction {
  order: number;
  type: 'START' | 'MOVE' | 'ARRIVE';
  title: string;
  description: string;
  nodeId: string;
  x: number;
  y: number;
  z: number;
}

export interface ApiRouteResponse {
  fromNode: ApiRouteNode;
  toNode: ApiRouteNode;
  nodes: ApiRouteNode[];
  edges: ApiRouteEdge[];
  totalDistance: number;
  totalWeight: number;
  routePath: ApiRoutePathPoint[];
  routeSegments: ApiRouteSegment[];
  instructions: ApiRouteInstruction[];
  meta: {
    schemaVersion: string;
    generatedAt: string;
    purpose: string;
    rendering: {
      supports2D: boolean;
      supports3D: boolean;
      coordinateSystem: string;
      usesXYZ: boolean;
    };
  };
}

export interface ApiRouteToStoreResponse extends ApiRouteResponse {
  targetStore: {
    id: string;
    name: string;
    slug: string;
    roomNumber: string | null;
    primaryRouteNodeId: string | null;
  } | null;
}
