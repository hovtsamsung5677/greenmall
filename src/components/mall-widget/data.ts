import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "shop",
    title: "Магазины",
    icon: "shop.png",
    floors: [1, 2, 3, 4],
    items: {
      1: [
        { name: "Продукты", count: 4 },
        { name: "Косметика и парфюмерия", count: 2 },
      ],
      2: [
        { name: "Аптека", count: 6 },
        { name: "Одежда", count: 1 },
        { name: "Обувь (детская, женская)", count: 2 },
        { name: "Бытовая техника и электроника", count: 1 },
        { name: "Книги и канцтовары", count: 3 },
      ],
      3: [{ name: "Ювелирные изделия", count: 2 }],
      4: [],
    },
  },
  {
    id: "eat",
    title: "Еда",
    icon: "eat.png",
    floors: [1, 2, 3],
    items: {
      1: [
        { name: "Фудкорт", count: 8 },
        { name: "Кофейни", count: 3 },
      ],
      2: [{ name: "Кафе и рестораны", count: 5 }],
      3: [],
    },
  },
  {
    id: "kids",
    title: "Детям",
    icon: "kids.png",
    floors: [1, 2, 3, 4],
    items: {
      1: [],
      2: [
        { name: "Детская одежда", count: 3 },
        { name: "Игрушки", count: 2 },
      ],
      3: [{ name: "Игровая комната", count: 1 }],
      4: [],
    },
  },
  {
    id: "razvl",
    title: "Развлечения",
    icon: "razvl.png",
    floors: [3, 4],
    items: {
      3: [{ name: "Кинотеатр", count: 1 }],
      4: [
        { name: "Колесо обозрения", count: 1 },
        { name: "Боулинг", count: 1 },
      ],
    },
  },
  {
    id: "uslugi",
    title: "Услуги",
    icon: "uslugi.png",
    floors: [1, 2],
    items: {
      1: [
        { name: "Информационная стойка", count: 2 },
        { name: "Банкоматы", count: 5 },
      ],
      2: [{ name: "Химчистка", count: 1 }],
    },
  },
];
