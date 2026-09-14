export function getLocalFloorModelUrl(floorNumber: number): string | null {
  if (!Number.isInteger(floorNumber) || floorNumber < 0) return null;
  return `/floors/${floorNumber}_floor.glb`;
}

export function resolveModelUrl(
  floorNumber: number | null | undefined,
  assetUrl: string | null,
  apiBaseUrl: string = (
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
  ).replace(/\/+$/, ''),
): string | null {
  const local = getLocalFloorModelUrl(floorNumber ?? 0);
  if (!local) return assetUrl;
  if (floorNumber == null || floorNumber < 0) return assetUrl;
  if (assetUrl) {
    return assetUrl.startsWith('http') ? assetUrl : `${apiBaseUrl.replace(/\/api$/, '')}${assetUrl}`;
  }
  return local;
}
