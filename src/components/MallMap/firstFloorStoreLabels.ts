/** Visual coordinates only. Never use these for route nodes or store entrances.
 * Plan: 900 × 600; scene API /floors/1_floor.glb, SHA256
 * 4a92a5acdbf241e4156be801c85b42e289e788b0aba8c4ea5da427b85c191a4b.
 * Rectangles are conservative interior areas, NOT full cadastral room outlines.
 * Matched against the GLB and the three supplied first-floor 2GIS close-ups.
 */
export interface StoreLabelPlacement {
  slug: string;
  interior: readonly [number, number, number, number];
  compact: boolean;
}

const room = (slug: string, interior: StoreLabelPlacement['interior'], compact = false): StoreLabelPlacement => ({ slug, interior, compact });

export const FIRST_FLOOR_STORE_LABELS: readonly StoreLabelPlacement[] = [
  room('pyaterochka', [55, 220, 150, 340]),
  room('ostin', [170, 220, 218, 380]),
  room('befree', [235, 260, 280, 380]),
  room('gloria-jeans', [335, 90, 410, 315]),
  room('x-man', [337, 337, 382, 382]),
  room('eshche', [485, 215, 578, 325]),
  room('podruzhka', [513, 345, 580, 382]),
  room('m-kosmetik', [630, 256, 700, 285]),
  room('magnit', [722, 258, 819, 308]),
  room('yahont', [74, 355, 123, 373], true),
  room('burger-king', [15, 455, 120, 490]),
  room('zoomarket', [94, 414, 111, 438], true),
  room('katrin', [121, 414, 135, 438], true),
  room('letual', [225, 465, 283, 499]),
  room('elita-floor-1', [314, 422, 347, 439], true),
  room('polaris', [362, 423, 415, 456]),
  // Dodo occupies the L below/left of POLARIS. Its bottom wing is unobstructed.
  room('dodo-pizza', [359, 473, 415, 501]),
  room('romantic', [515, 435, 586, 490]),
  room('ulybka-radugi', [604, 434, 645, 480]),
  room('zodiak', [601, 495, 619, 516], true),
  room('apteka-ekonom', [632, 496, 663, 515], true),
  room('studiya-narashchivaniya-volos', [611, 352, 631, 400], true),
  room('goryachie-sloyki', [657, 393, 669, 405], true),
  room('little-tokyo-bubble-tea', [690, 389, 707, 405], true),
  room('usadba', [797, 340, 813, 357], true),
  room('avtobusnaya-kassa', [800, 367, 843, 375], true),
  room('bank-vtb', [801, 391, 835, 455]),
  room('mts', [752, 434, 783, 445], true),
  room('9-41', [678, 463, 690, 492], true),
  room('pati-dekor', [678, 504, 690, 516], true),
  room('akvarelka', [751, 475, 766, 485], true),
];

/** The screenshots identify these businesses but do not establish a safe room
 * centre on this GLB (mostly freestanding kiosks). Do not fall back to anchors. */
export const UNRESOLVED_FIRST_FLOOR_LABELS = [
  '5post', 'artgold', 'for-you', 'good-lucky', 'hohoro-coffee',
  'ojuvi-parfum', 'sokolov', 'uvenco', 'vendshop', 'megafon-yota',
  'komfortnyy-ugolok', 'timka',
] as const;

export function labelCenter({ interior: [left, top, right, bottom] }: StoreLabelPlacement) {
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

export interface LabelBox { x: number; y: number; width: number; height: number }
export function boxesOverlap(a: LabelBox, b: LabelBox, gap = 4) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 + gap;
}

/** Radius of the largest screen-space circle around the projected centre that
 * fits in the convex interior. This also handles a tilted/rotated camera. */
export function projectedClearance(center: { x: number; y: number }, polygon: { x: number; y: number }[]) {
  return Math.min(...polygon.map((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    return Math.abs((b.x - a.x) * (a.y - center.y) - (a.x - center.x) * (b.y - a.y)) /
      Math.max(0.001, Math.hypot(b.x - a.x, b.y - a.y));
  }));
}
