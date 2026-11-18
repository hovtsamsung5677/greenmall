export type InfrastructureKind = 'toilet' | 'elevator' | 'stairs';
export interface InfrastructurePlacement {
  id: string;
  kind: InfrastructureKind;
  x: number;
  y: number;
  label: string;
  storeSlug?: string;
  number?: number;
}

// Visual positions on the 900×600 scene-API models, matched to the supplied
// 2GIS floor plans. These are NOT route nodes, entrances or transfer endpoints.
const toilet = (id: string, x: number, y: number, floor: number): InfrastructurePlacement => ({ id, kind: 'toilet', x, y, label: 'Туалет', storeSlug: `toilet-${id}-floor-${floor}` });
const lift = (number: number, x: number, y: number, floor: number): InfrastructurePlacement => ({ id: `lift-${number}`, kind: 'elevator', number, x, y, label: `Лифт ${number}`, storeSlug: `lift-${number}-floor-${floor}` });
const stairs = (id: string, x: number, y: number): InfrastructurePlacement => ({ id, kind: 'stairs', x, y, label: 'Лестница' });

export const INFRASTRUCTURE_BY_FLOOR: Readonly<Record<number, readonly InfrastructurePlacement[]>> = {
  1: [
    toilet('west', 280, 429, 1),
    toilet('middle', 621, 332, 1),
    toilet('east', 842, 346, 1),
    lift(1, 314, 382, 1), lift(2, 782, 395, 1),
    stairs('stairs-west', 177, 430),
    stairs('stairs-middle', 520, 500),
    stairs('stairs-east', 795, 486),
  ],
  2: [
    toilet('west', 295, 440, 2), toilet('east', 880, 335, 2),
    lift(1, 335, 384, 2), lift(2, 825, 430, 2),
    stairs('stairs-west', 188, 451), stairs('stairs-east', 822, 519),
  ],
  3: [
    toilet('east', 690, 200, 3), lift(2, 578, 325, 3),
    stairs('stairs-east', 570, 555),
  ],
  4: [
    toilet('east', 770, 90, 4), lift(2, 620, 302, 4),
    stairs('stairs-east', 610, 540),
  ],
};
