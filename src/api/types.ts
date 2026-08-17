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
