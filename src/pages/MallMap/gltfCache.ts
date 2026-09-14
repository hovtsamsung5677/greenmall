import { useEffect, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfPromiseCache = new Map<string, Promise<GLTF>>();

export function loadGLTFCached(url: string): Promise<GLTF> {
  let promise = gltfPromiseCache.get(url);
  if (!promise) {
    promise = new Promise<GLTF>((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(url, resolve, undefined, reject);
    });
    gltfPromiseCache.set(url, promise);
    promise.catch(() => gltfPromiseCache.delete(url));
  }
  return promise;
}

export function clearGLTFCache(url: string) {
  gltfPromiseCache.delete(url);
}

export interface CachedGLTFState {
  gltf: GLTF | null;
  loading: boolean;
  error: Error | null;
}

export function useCachedGLTF(url: string | null): CachedGLTFState {
  const [state, setState] = useState<CachedGLTFState>({
    gltf: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!url) {
      setState({ gltf: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ gltf: null, loading: true, error: null });

    loadGLTFCached(url)
      .then((loaded) => {
        if (cancelled) return;
        setState({ gltf: loaded, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          gltf: null,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
