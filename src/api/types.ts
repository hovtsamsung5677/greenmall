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
