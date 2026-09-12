export function getLocalFloorModelUrl(floorNumber: number): string | null {
  return `/floors/${floorNumber}_floor.glb`;
}

export function resolveModelUrl(
  floorNumber: number,
  assetUrl: string | null,
  apiBaseUrl: string = (
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
  ).replace(/\/+$/, ''),
): string | null {
  const local = getLocalFloorModelUrl(floorNumber);
  if (local) return local;
  if (assetUrl) {
    return assetUrl.startsWith('http') ? assetUrl : `${apiBaseUrl.replace(/\/api$/, '')}${assetUrl}`;
  }
  return null;
}
