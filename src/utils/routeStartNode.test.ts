import { describe, expect, it } from 'vitest';
import type { ApiRouteEdge, ApiRouteNode } from '@api/types';
import { findRouteStartNode } from './routeStartNode';

function node(id: string, type: ApiRouteNode['type']): ApiRouteNode {
  return { id, type } as ApiRouteNode;
}

function edge(fromNodeId: string, toNodeId: string): ApiRouteEdge {
  return { fromNodeId, toNodeId } as ApiRouteEdge;
}

describe('findRouteStartNode', () => {
  it('prefers a connected panel over other connected nodes', () => {
    const nodes = [node('route', 'ROUTE_POINT'), node('panel', 'PANEL')];
    expect(findRouteStartNode(nodes, [edge('panel', 'route')])?.id).toBe('panel');
  });

  it('prefers a connected panel over a detached panel', () => {
    const nodes = [node('detached', 'PANEL'), node('connected', 'PANEL'), node('route', 'ROUTE_POINT')];
    expect(findRouteStartNode(nodes, [edge('connected', 'route')])?.id).toBe('connected');
  });

  it('falls back through the supported start node types', () => {
    expect(findRouteStartNode([node('entrance', 'ENTRANCE')], [])?.id).toBe('entrance');
    expect(findRouteStartNode([], [])).toBeNull();
  });
});
