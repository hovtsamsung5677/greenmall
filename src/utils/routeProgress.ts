interface RouteSegmentLike {
  floorNumber: number;
}

interface SegmentedRouteLike {
  segments?: RouteSegmentLike[] | null;
}

export function getRouteSegment<T extends RouteSegmentLike>(
  route: { segments?: T[] | null } | null,
  segmentIndex: number,
): T | null {
  return route?.segments?.[segmentIndex] ?? null;
}

export function getNextRouteFloor(
  route: SegmentedRouteLike | null,
  segmentIndex: number,
): number | null {
  return route?.segments?.[segmentIndex + 1]?.floorNumber ?? null;
}
