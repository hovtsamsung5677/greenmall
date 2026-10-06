import { useEffect, useReducer } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfPromiseCache = new Map<string, Promise<GLTF>>();

// Результаты и ошибки хранятся ОТДЕЛЬНО от промисов. Хук читает их синхронно во
// время рендера, поэтому уже загруженная модель доступна в том же кадре, в котором
// сменился URL. Без этого между этажами возникает кадр-заглушка: сначала React
// отдаёт предыдущую модель, затем effect ставит loading, и только потом появляется
// новая — на переходе это читается как мигание.
const gltfResultCache = new Map<string, GLTF>();
const gltfErrorCache = new Map<string, Error>();

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function loadGLTFCached(url: string): Promise<GLTF> {
  let promise = gltfPromiseCache.get(url);
  if (!promise) {
    promise = new Promise<GLTF>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(url, resolve, undefined, reject);
    });
    gltfPromiseCache.set(url, promise);
    promise
      .then((gltf) => {
        gltfResultCache.set(url, gltf);
      })
      .catch((err: unknown) => {
        gltfErrorCache.set(url, toError(err));
        gltfPromiseCache.delete(url);
      });
  }
  return promise;
}

export function clearGLTFCache(url: string) {
  gltfPromiseCache.delete(url);
  gltfResultCache.delete(url);
  gltfErrorCache.delete(url);
}

export interface CachedGLTFState {
  gltf: GLTF | null;
  loading: boolean;
  error: Error | null;
}

export function useCachedGLTF(url: string | null): CachedGLTFState {
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!url) return;
    if (gltfResultCache.has(url) || gltfErrorCache.has(url)) return;
    let cancelled = false;
    const rerenderIfAlive = () => {
      if (!cancelled) rerender();
    };
    void loadGLTFCached(url).then(rerenderIfAlive, rerenderIfAlive);
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return { gltf: null, loading: false, error: null };

  const gltf = gltfResultCache.get(url) ?? null;
  const error = gltfErrorCache.get(url) ?? null;
  return { gltf, loading: gltf === null && error === null, error };
}