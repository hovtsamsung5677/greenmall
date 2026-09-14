export function getLocalFloorModelUrl(floorNumber: number): string | null {
  if (!Number.isInteger(floorNumber)) return null;
  const normalized = floorNumber < 0 ? 0 : floorNumber;
  return `/floors/${normalized}_floor.glb`;
}

export function resolveModelUrl(
  floorNumber: number | null | undefined,
  assetUrl: string | null,
  apiBaseUrl: string = (
    import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
  ).replace(/\/+$/, ''),
): string | null {
  if (floorNumber == null || floorNumber < 0) {
    return getLocalFloorModelUrl(0);
  }

  const local = getLocalFloorModelUrl(floorNumber);
  if (!local) return assetUrl;
  if (assetUrl) {
    return assetUrl.startsWith('http') ? assetUrl : `${apiBaseUrl.replace(/\/api$/, '')}${assetUrl}`;
  }
  return local;
}
