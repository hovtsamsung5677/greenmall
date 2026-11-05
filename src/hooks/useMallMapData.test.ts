import { describe, expect, it } from 'vitest';
import type { ApiRouteEdge, ApiRouteNode } from '@api/types';
import { findPanelNodeId } from './useMallMapData';

const node = (id: string, type: ApiRouteNode['type']): ApiRouteNode =>
  ({ id, type }) as ApiRouteNode;
const edge = (fromNodeId: string, toNodeId: string): ApiRouteEdge =>
  ({ fromNodeId, toNodeId }) as ApiRouteEdge;

describe('findPanelNodeId', () => {
  it('prefers a panel connected to the route graph', () => {
    expect(
      findPanelNodeId(
        [node('detached', 'PANEL'), node('connected', 'PANEL'), node('route', 'ROUTE_POINT')],
        [edge('connected', 'route')],
      ),
    ).toBe('connected');
  });

  it('falls back to a detached panel when the graph has no connected panel', () => {
    expect(findPanelNodeId([node('panel', 'PANEL')], [])).toBe('panel');
  });

  it('returns null when the floor has no panel', () => {
    expect(findPanelNodeId([node('route', 'ROUTE_POINT')], [])).toBeNull();
  });
});
