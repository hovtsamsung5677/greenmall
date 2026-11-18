import type { ApiRouteEdge, ApiRouteNode } from '@api/types';

const START_NODE_PRIORITY: ApiRouteNode['type'][] = [
  'PANEL',
  'ENTRANCE',
  'INFO_DESK',
  'STORE_ANCHOR',
  'ROUTE_POINT',
];

/** Выбирает старт маршрута, отдавая приоритет подключённой панели. */
export function findRouteStartNode(
  nodes: ApiRouteNode[],
  edges: ApiRouteEdge[],
): ApiRouteNode | null {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.fromNodeId);
    connectedIds.add(edge.toNodeId);
  }

  for (const type of START_NODE_PRIORITY) {
    const connected = nodes.find((node) => node.type === type && connectedIds.has(node.id));
    if (connected) return connected;
    const fallback = nodes.find((node) => node.type === type);
    if (fallback) return fallback;
  }

  return null;
}
