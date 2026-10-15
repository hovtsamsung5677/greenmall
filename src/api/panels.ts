import { apiGet } from './client';

export interface PublicPanel {
  id: string;
  code: string;
  name: string;
  floorId: string | null;
}

export function fetchPanelByRouteNode(nodeId: string): Promise<PublicPanel> {
  return apiGet<PublicPanel>(`/public/panels/by-node/${nodeId}`);
}
