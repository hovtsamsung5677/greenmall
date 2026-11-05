import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchFloors, fetchFloorScene } from '@api/floors';
import { queryKeys } from '@api/queryKeys';
import { resolveModelUrl } from '@utils/floors';
import type { ApiFloor, ApiFloorScene } from '@api/types';
import { useMemo } from 'react';

export function useFloors() {
  return useQuery({
    queryKey: queryKeys.floors,
    queryFn: ({ signal }) => fetchFloors(signal),
  });
}

export function useFloorScene(floorNumber: number | null | undefined) {
  const { data: floors = [], ...floorsQuery } = useFloors();
  const queryClient = useQueryClient();

  const floor = useMemo(() => floors.find((f) => f.number === floorNumber) ?? null, [floors, floorNumber]);
  const floorId = floor?.id;

  const sceneQuery = useQuery({
    queryKey: queryKeys.floorScene(floorId),
    queryFn: ({ signal }) => fetchFloorScene(floorId!, signal),
    enabled: !!floorId,
  });

  const assetUrl = sceneQuery.data?.floor.modelAsset?.url ?? null;
  const modelUrl = floorNumber != null ? resolveModelUrl(floorNumber, assetUrl) : null;

  const floorsErrorMessage = useMemo(() => {
    const err = floorsQuery.error;
    return err instanceof Error ? err.message : err ? String(err) : null;
  }, [floorsQuery.error]);

  const sceneErrorMessage = useMemo(() => {
    const err = sceneQuery.error;
    return err instanceof Error ? err.message : err ? String(err) : null;
  }, [sceneQuery.error]);

  const retry = () => {
    if (!floorId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.floors });
    queryClient.invalidateQueries({ queryKey: queryKeys.floorScene(floorId) });
  };

  return {
    floors,
    floor,
    scene: sceneQuery.data,
    modelUrl,
    floorNumber,
    loading: floorsQuery.isLoading || sceneQuery.isLoading,
    error: floorsErrorMessage ?? sceneErrorMessage ?? null,
    floorsError: floorsErrorMessage,
    sceneError: sceneErrorMessage,
    retry,
    isFloorsLoading: floorsQuery.isLoading,
    isSceneLoading: sceneQuery.isLoading,
  };
}
