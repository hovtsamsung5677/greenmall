import { publicApiGet } from './client';

export interface PublicPanel {
  id: string;
  code: string;
  name: string;
  floorId: string | null;
}

export function fetchPanelByRouteNode(nodeId: string, signal?: AbortSignal): Promise<PublicPanel> {
  return publicApiGet<PublicPanel>(`/public/panels/by-node/${nodeId}`, signal);
}
