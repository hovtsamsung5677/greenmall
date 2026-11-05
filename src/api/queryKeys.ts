export const queryKeys = {
  floors: ['floors'] as const,
  floorScene: (floorId: string | null | undefined) => ['floorScene', floorId] as const,
  floorGraph: (floorId: string | null | undefined) => ['floorGraph', floorId] as const,
  floorIcons: (floorId: string | null | undefined) => ['floorIcons', floorId] as const,
  stores: (limit: number) => ['stores', { limit }] as const,
  activeHeaderBanner: ['headerBanner', 'active'] as const,
  panelByNode: (nodeId: string | null | undefined) => ['panel', 'byNode', nodeId] as const,
  sharedRoute: (token: string) => ['sharedRoute', token] as const,
};
