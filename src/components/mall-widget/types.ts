export interface SubcategoryItem {
  name: string;
  count: number;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  floors: number[];
  items: Record<number, SubcategoryItem[]>;
}
