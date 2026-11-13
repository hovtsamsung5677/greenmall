const aliases = [
  ['gloria jeans', 'глория джинс'], ['ostin', 'остин'], ['befree', 'бифри'],
  ['polaris', 'поларис'], ['kari', 'кари'], ['zolla', 'золла'],
  ['askona', 'аскона'], ['sokolov', 'соколов'], ['додо', 'dodo'],
  ['летуаль', 'лэтуаль'], ['пятерочка', 'пятёрочка'], ['super 8', 'кинотеатр', 'кино'],
];
const normalize = (value: string) => value.toLowerCase().replace(/ё/g, 'е').replace(/['’]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export function matchesStore(store: {name: string; slug?: string; searchKeywords?: string | null; category?: {name: string} | null}, query: string) {
  const name = normalize(store.name);
  const terms = aliases.filter(group => group.some(term => name.includes(normalize(term)))).flat();
  const haystack = normalize([store.name, store.slug, store.searchKeywords, store.category?.name, ...terms].join(' '));
  return normalize(query).split(/\s+/).every(term => haystack.includes(term));
}
