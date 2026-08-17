import type { ApiStore } from '../../api/types';

export interface SubcategoryItem {
  name: string;
  count: number;
  storeId?: string;
  store?: ApiStore;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  items: Array<SubcategoryItem & { storeId: string; store: ApiStore }>;
  iconKey?: string;
}
