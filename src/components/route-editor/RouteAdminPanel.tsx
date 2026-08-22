import { useEffect, useMemo, useState } from 'react';
import {
  fetchRouteNodes,
  createRouteNode,
  deleteRouteNode,
  type CreateRouteNodeInput,
} from '../../api/routeNodes';
import {
  fetchRouteEdges,
  createRouteEdge,
  deleteRouteEdge,
} from '../../api/routeEdges';
import { fetchFloors, fetchFloorScene } from '../../api/floors';
import { fetchMapObjects } from '../../api/mapObjects';
import type {
  ApiFloor,
  ApiRouteNode,
  ApiRouteEdge,
  ApiRouteNodeType,
  ApiMapObject,
} from '../../api/types';
import RouteEditor3D, { type RouteEditorMode } from './RouteEditor3D';
import styles from './RouteAdminPanel.module.css';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
).replace(/\/api$/, '');

const localFloorModelModules = import.meta.glob('../../../floors/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const LOCAL_FLOOR_MODELS: Record<number, string> = Object.entries(
  localFloorModelModules,
).reduce<Record<number, string>>((acc, [path, url]) => {
  const match = /(-?\d+)_floor\.glb$/i.exec(path);
  if (match) {
    acc[Number(match[1])] = url;
  }
  return acc;
}, {});

function resolveModelUrl(floorNumber: number, assetUrl: string | null): string | null {
  if (LOCAL_FLOOR_MODELS[floorNumber]) {
    return LOCAL_FLOOR_MODELS[floorNumber];
  }
  if (assetUrl) {
    return assetUrl.startsWith('http') ? assetUrl : `${API_BASE_URL}${assetUrl}`;
  }
  return null;
}

const NODE_TYPE_LABELS: Record<ApiRouteNodeType, string> = {
  ROUTE_POINT: 'Точка маршрута',
  ENTRANCE: 'Вход',
  PANEL: 'Стойка',
  STORE_ANCHOR: 'Якорь магазина',
  ELEVATOR: 'Лифт',
  ESCALATOR: 'Эскалатор',
  STAIRS: 'Лестница',
  TOILET: 'Туалет',
  INFO_DESK: 'Инфо-стойка',
  OTHER: 'Прочее',
};

export default function RouteAdminPanel() {
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [floorId, setFloorId] = useState<string>('');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [nodes, setNodes] = useState<ApiRouteNode[]>([]);
  const [edges, setEdges] = useState<ApiRouteEdge[]>([]);
  const [mapObjects, setMapObjects] = useState<ApiMapObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<RouteEditorMode>('select');
  const [newNodeType, setNewNodeType] = useState<ApiRouteNodeType>('ROUTE_POINT');
  const [anchorMapObjectId, setAnchorMapObjectId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingFromId, setPendingFromId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [show3D, setShow3D] = useState(false);

  useEffect(() => {
    fetchFloors()
      .then((list) => {
        setFloors(list);
        const active = list.find((f) => f.isActive) ?? list[0];
        if (active) setFloorId(active.id);
      })
      .catch(() => setError('Не удалось загрузить этажи'));
  }, []);

  useEffect(() => {
    if (!floorId) return;
    setLoading(true);
    setError(null);
    Promise.all([fetchRouteNodes(floorId), fetchRouteEdges(floorId), fetchMapObjects(floorId)])
      .then(([n, e, m]) => {
        setNodes(n);
        setEdges(e);
        setMapObjects(m);
        setSelectedNodeId(null);
        setPendingFromId(null);
      })
      .catch(() => setError('Не удалось загрузить граф маршрута'))
      .finally(() => setLoading(false));
  }, [floorId]);

  useEffect(() => {
    if (!floorId) return;
    setModelUrl(null);
    const floor = floors.find((f) => f.id === floorId);
    fetchFloorScene(floorId)
      .then((scene) =>
        setModelUrl(resolveModelUrl(floor?.number ?? 0, scene.floor.modelAsset?.url ?? null)),
      )
      .catch(() => setModelUrl(null));
  }, [floorId, floors]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const planMetrics = useMemo(() => {
    const floor = floors.find((f) => f.id === floorId);
    if (!floor) return null;
    return {
      width: floor.width ?? 900,
      height: floor.height ?? 600,
    };
  }, [floors, floorId]);

  async function handleAddNode(coords: { x: number; y: number; z: number }) {
    if (!floorId) return;
    setBusy(true);
    setError(null);
    try {
      const input: CreateRouteNodeInput = {
        floorId,
        type: newNodeType,
        x: coords.x,
        y: coords.y,
        z: coords.z,
        name: NODE_TYPE_LABELS[newNodeType],
        mapObjectId:
          anchorMapObjectId && newNodeType !== 'ROUTE_POINT' && newNodeType !== 'OTHER'
            ? anchorMapObjectId
            : null,
      };
      const created = await createRouteNode(input);
      setNodes((prev) => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания узла');
    } finally {
      setBusy(false);
    }
  }

  function handleNodeClick(id: string) {
    if (mode === 'connect') {
      if (!pendingFromId) {
        setPendingFromId(id);
        return;
      }
      if (pendingFromId === id) {
        setPendingFromId(null);
        return;
      }
      void connectNodes(pendingFromId, id);
      return;
    }
    setSelectedNodeId(id);
  }

  async function connectNodes(fromNodeId: string, toNodeId: string) {
    if (!floorId) return;
    setBusy(true);
    setError(null);
    try {
      const from = nodes.find((n) => n.id === fromNodeId);
      const to = nodes.find((n) => n.id === toNodeId);
      const distance = from && to
        ? Math.round(Math.hypot(from.x - to.x, from.y - to.y))
        : undefined;
      const created = await createRouteEdge({
        floorId,
        fromNodeId,
        toNodeId,
        distance,
        isBidirectional: true,
      });
      setEdges((prev) => [...prev, created]);
      setPendingFromId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания ребра');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteNode(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteRouteNode(id);
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) =>
        prev.filter((e) => e.fromNodeId !== id && e.toNodeId !== id),
      );
      if (selectedNodeId === id) setSelectedNodeId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления узла');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteEdge(id: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteRouteEdge(id);
      setEdges((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления ребра');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>Этаж</span>
          <select
            className={styles.select}
            value={floorId}
            onChange={(e) => setFloorId(e.target.value)}
          >
            {floors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (#{f.number})
              </option>
            ))}
          </select>
        </label>

        <div className={styles.modes}>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'select' ? styles.modeActive : ''}`}
            onClick={() => {
              setMode('select');
              setPendingFromId(null);
            }}
          >
            Выбрать
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'add' ? styles.modeActive : ''}`}
            onClick={() => {
              setMode('add');
              setPendingFromId(null);
            }}
          >
            + Узел
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'connect' ? styles.modeActive : ''}`}
            onClick={() => {
              setMode('connect');
              setPendingFromId(null);
            }}
          >
            Соединить
          </button>
        </div>

        {mode === 'add' ? (
          <label className={styles.field}>
            <span>Тип узла</span>
            <select
              className={styles.select}
              value={newNodeType}
              onChange={(e) => {
                setNewNodeType(e.target.value as ApiRouteNodeType);
                setAnchorMapObjectId('');
              }}
            >
              {(Object.keys(NODE_TYPE_LABELS) as ApiRouteNodeType[]).map((t) => (
                <option key={t} value={t}>
                  {NODE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === 'add' &&
        newNodeType !== 'ROUTE_POINT' &&
        newNodeType !== 'OTHER' ? (
          <label className={styles.field}>
            <span>Привязать к объекту</span>
            <select
              className={styles.select}
              value={anchorMapObjectId}
              onChange={(e) => setAnchorMapObjectId(e.target.value)}
            >
              <option value="">— без привязки —</option>
              {mapObjects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === 'connect' && pendingFromId ? (
          <span className={styles.hint}>Выберите второй узел для ребра</span>
        ) : null}

        <button
          type="button"
          className={styles.modeBtn}
          onClick={() => setShow3D((v) => !v)}
        >
          {show3D ? 'Скрыть 3D' : 'Показать 3D'}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.body}>
        <div className={styles.canvasWrap}>
          {loading ? (
            <div className={styles.loading}>Загрузка графа…</div>
          ) : show3D ? (
            <RouteEditor3D
              modelUrl={modelUrl}
              floorId={floorId}
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              pendingFromId={pendingFromId}
              mode={mode}
              metrics={planMetrics}
              onAddNode={handleAddNode}
              onNodeClick={handleNodeClick}
            />
          ) : (
            <div className={styles.loading}>
              3D-редактор скрыт. Нажмите «Показать 3D» выше.
            </div>
          )}
          {busy ? <div className={styles.busy}>Сохранение…</div> : null}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sideBlock}>
            <h3 className={styles.sideTitle}>Узлы ({nodes.length})</h3>
            <ul className={styles.list}>
              {nodes.map((node) => (
                <li
                  key={node.id}
                  className={`${styles.listItem} ${node.id === selectedNodeId ? styles.listItemActive : ''}`}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <div>
                    <strong>{NODE_TYPE_LABELS[node.type]}</strong>
                    <span className={styles.muted}>
                      {' '}
                      x:{node.x} y:{node.y} z:{node.z ?? 0}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.delBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteNode(node.id);
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.sideBlock}>
            <h3 className={styles.sideTitle}>Рёбра ({edges.length})</h3>
            <ul className={styles.list}>
              {edges.map((edge) => (
                <li key={edge.id} className={styles.listItem}>
                  <div className={styles.muted}>
                    {edge.fromNodeId.slice(0, 6)} → {edge.toNodeId.slice(0, 6)}
                    {edge.distance != null ? ` · ${edge.distance}` : ''}
                  </div>
                  <button
                    type="button"
                    className={styles.delBtn}
                    onClick={() => void handleDeleteEdge(edge.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selectedNode ? (
            <div className={styles.sideBlock}>
              <h3 className={styles.sideTitle}>Выбранный узел</h3>
              <p className={styles.muted}>ID: {selectedNode.id}</p>
              <p className={styles.muted}>Тип: {NODE_TYPE_LABELS[selectedNode.type]}</p>
              <p className={styles.muted}>
                Координаты: x={selectedNode.x} y={selectedNode.y} z={selectedNode.z ?? 0}
              </p>
              {selectedNode.mapObjectId ? (
                <p className={styles.muted}>MapObject: {selectedNode.mapObjectId}</p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
