export const ROUTE_TRAVEL_SPEED = 180;

export function advanceRouteDistance(
  currentDistance: number,
  deltaSeconds: number,
  totalLength: number,
  speed = ROUTE_TRAVEL_SPEED,
): number {
  if (totalLength <= 0) return 0;
  const safeCurrent = Math.max(0, currentDistance);
  const safeDelta = Math.max(0, deltaSeconds);
  const safeSpeed = Math.max(0, speed);
  return Math.min(totalLength, safeCurrent + safeDelta * safeSpeed);
}
