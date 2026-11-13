import { expect, it } from 'vitest';
import { matchesStore } from './storeSearch';
it('finds names, Russian brand aliases and configured synonyms', () => {
  expect(matchesStore({name:"O'STIN"}, 'ОСТИН')).toBe(true);
  expect(matchesStore({name:'Gloria Jeans'}, 'глория')).toBe(true);
  expect(matchesStore({name:'Магазин',searchKeywords:'подарки, сувениры'}, 'сувенир')).toBe(true);
  expect(matchesStore({name:'Пятёрочка'}, 'пятерочка')).toBe(true);
  expect(matchesStore({name:'POLARIS'}, 'обувь')).toBe(false);
});
