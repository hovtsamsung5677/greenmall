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
  isActive: boolean;
  isVisible: boolean;
  category: ApiStoreCategory | null;
  floor: ApiStoreFloor | null;
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

export interface ApiFloorScene {
  floor: ApiFloorSceneFloor;
  objects: unknown[];
  routeNodes: unknown[];
  routeEdges: unknown[];
  categories: unknown[];
  stores: unknown[];
  meta: {
    schemaVersion: string;
    generatedAt: string;
    purpose: string;
  };
}
