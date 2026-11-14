import { FIRST_FLOOR_STORE_LABELS, type StoreLabelPlacement } from './firstFloorStoreLabels';

// Visual room interiors, independent of entrances and route graph coordinates.
// Matched to the saved scene-API GLB projections (900 × 600) and supplied 2GIS plans.
const room = (slug: string, interior: StoreLabelPlacement['interior'], compact = false): StoreLabelPlacement => ({ slug, interior, compact });

export const STORE_LABELS_BY_FLOOR: Readonly<Record<number, readonly StoreLabelPlacement[]>> = {
  1: FIRST_FLOOR_STORE_LABELS,
  2: [
    room('sportmaster', [15, 215, 160, 510]),
    room('zolla', [177, 220, 223, 395]),
    room('chitay-gorod', [244, 255, 302, 385]),
    room('askona', [351, 310, 389, 386]),
    room('cleopatra', [175, 495, 202, 520], true),
    room('kseniya-rikalina', [220, 500, 270, 520]),
    room('kari-kids', [360, 115, 460, 290]),
    room('kari-giper', [520, 115, 610, 290]),
    room('myasnoy', [330, 430, 530, 518]),
    room('atele', [632, 339, 665, 345], true),
    room('kolibri', [632, 352, 663, 387]),
    // Two businesses share the same large northern room on the 2GIS plan.
    room('mazhor', [690, 325, 767, 363]),
    room('mazhorka', [785, 325, 840, 363]),
    room('metrologiya', [868, 354, 895, 364], true),
    room('mazhor-kids', [868, 372, 895, 415]),
    room('bombitta-room', [868, 425, 895, 446]),
    room('felichita', [632, 449, 663, 490]),
    room('shopaholic', [640, 503, 805, 532]),
    room('svoboda', [840, 503, 895, 532]),
  ],
  3: [
    // Arcade and air hockey occupy zones of the cinema's shared hall.
    room('arkadnyy-avtomat', [240, 60, 320, 130]),
    room('super-8', [365, 100, 500, 240]),
    room('aerohokkey', [540, 60, 620, 130]),
    room('fun-kids', [665, 260, 720, 505]),
    room('studiya-angliyskogo-yazyka', [280, 525, 345, 590]),
    room('ak-bars-med', [360, 525, 540, 590]),
    room('vr-nerealnoe-mesto', [600, 525, 720, 590]),
  ],
  4: [
    room('studiya-krasoty-floor-4', [552, 119, 577, 182]),
    room('parikmaherskaya-floor-4', [589, 119, 616, 182]),
    room('antek', [735, 265, 810, 302]),
    room('psk-karkas', [735, 315, 810, 350]),
    room('nasha-stolitsa', [735, 365, 810, 400]),
    room('everiya-life', [735, 420, 810, 475]),
    room('spetsstroy', [380, 495, 575, 590]),
    room('fiesta-floor-4', [650, 495, 810, 590]),
  ],
};

// No confirmed indoor room for this kiosk; never substitute its route anchor.
export const UNRESOLVED_UPPER_FLOOR_LABELS = ['artphoto'] as const;
