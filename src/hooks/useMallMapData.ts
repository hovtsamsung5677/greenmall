import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStores } from '@api/categories';
import { fetchEvacuationStairs } from '@api/evacuationStairs';
import { fetchPublicFloorIcons } from '@api/floorIcons';
import { fetchActiveHeaderBanner } from '@api/headerBanners';
import { fetchPanelByRouteNode } from '@api/panels';
import { queryKeys } from '@api/queryKeys';
import { fetchPublicRouteEdges } from '@api/routeEdges';
import { fetchPublicRouteNodes } from '@api/routeNodes';
import type {
  ApiFloor,
  ApiFloorIcon,
  ApiRouteEdge,
  ApiRouteNode,
  ApiSceneStore,
  ApiStore,
} from '@api/types';

const EMPTY_ROUTE_NODES: ApiRouteNode[] = [];
const EMPTY_ROUTE_EDGES: ApiRouteEdge[] = [];
const EMPTY_FLOOR_ICONS: ApiFloorIcon[] = [];
const EMPTY_STORES: ApiStore[] = [];

export function findPanelNodeId(nodes: ApiRouteNode[], edges: ApiRouteEdge[]): string | null {
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.fromNodeId);
    connectedIds.add(edge.toNodeId);
  }
  const panelNode =
    nodes.find((node) => node.type === 'PANEL' && connectedIds.has(node.id)) ??
    nodes.find((node) => node.type === 'PANEL');
  return panelNode?.id ?? null;
}

export function useMallMapData(
  floors: ApiFloor[],
  activeFloor: number,
  sceneStores?: ApiSceneStore[],
) {
  const activeFloorData = useMemo(
    () => floors.find((floor) => floor.number === activeFloor) ?? null,
    [floors, activeFloor],
  );

  const floorGraphQuery = useQuery({
    queryKey: queryKeys.floorGraph(activeFloorData?.id),
    queryFn: async ({ signal }) => {
      const floorId = activeFloorData!.id;
      const [nodes, edges, stairs] = await Promise.all([
        fetchPublicRouteNodes(floorId, signal),
        fetchPublicRouteEdges(floorId, signal),
        fetchEvacuationStairs(floorId, signal),
      ]);
      return { nodes, edges, stairs };
    },
    enabled: !!activeFloorData,
  });
  const routeNodes = floorGraphQuery.data?.nodes ?? EMPTY_ROUTE_NODES;
  const routeEdges = floorGraphQuery.data?.edges ?? EMPTY_ROUTE_EDGES;

  const panelNodeId = useMemo(() => {
    if (!routeNodes.length) return null;
    return findPanelNodeId(routeNodes, routeEdges);
  }, [routeNodes, routeEdges]);

  const panelQuery = useQuery({
    queryKey: queryKeys.panelByNode(panelNodeId),
    queryFn: ({ signal }) => fetchPanelByRouteNode(panelNodeId!, signal),
    enabled: !!panelNodeId,
    retry: false,
  });

  const floorIconsQuery = useQuery({
    queryKey: queryKeys.floorIcons(activeFloorData?.id),
    queryFn: ({ signal }) => fetchPublicFloorIcons(activeFloorData!.id, signal),
    enabled: !!activeFloorData,
  });

  const headerBannerQuery = useQuery({
    queryKey: queryKeys.activeHeaderBanner,
    queryFn: ({ signal }) => fetchActiveHeaderBanner(signal),
    retry: false,
  });

  const storesQuery = useQuery({
    queryKey: queryKeys.stores(500),
    queryFn: ({ signal }) => fetchStores(500, signal),
  });

  return {
    activeFloorData,
    routeNodes,
    routeEdges,
    evacuationStairs: floorGraphQuery.data?.stairs ?? EMPTY_ROUTE_NODES,
    floorIcons: floorIconsQuery.data ?? EMPTY_FLOOR_ICONS,
    panelId: panelQuery.data?.id ?? null,
    headerBanner: headerBannerQuery.data ?? null,
    allStores:
      storesQuery.data ?? (sceneStores as unknown as ApiStore[] | undefined) ?? EMPTY_STORES,
    graphError: floorGraphQuery.error,
  };
}
