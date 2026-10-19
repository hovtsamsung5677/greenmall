import { useEffect, useMemo, useState } from 'react';
import {
  fetchRouteNodes,
  fetchAllRouteNodes,
  createRouteNode,
  updateRouteNode,
  deleteRouteNode,
  type CreateRouteNodeInput,
} from '@api/routeNodes';
import {
  fetchRouteEdges,
  createRouteEdge,
  deleteRouteEdge,
} from '@api/routeEdges';
import { fetchFloors, fetchFloorScene } from '@api/floors';
import { fetchMapObjects } from '@api/mapObjects';
import { resolveModelUrl } from '@utils/floors';
import type {
  ApiFloor,
  ApiRouteNode,
  ApiRouteEdge,
  ApiRouteNodeType,
  ApiMapObject,
} from '@api/types';
import RouteEditor3D, { type RouteEditorMode } from './RouteEditor3D';
import styles from '@styles/RouteAdminPanel.module.css';

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

/** Пожарная лестница: узел STAIRS с metadata.isEvacuation. */
function isEvacuationStair(node: ApiRouteNode): boolean {
  if (node.type !== 'STAIRS') return false;
  const { metadata } = node;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  return Boolean((metadata as Record<string, unknown>).isEvacuation);
}

function withEvacuationFlag(
  metadata: ApiRouteNode['metadata'],
  isEvacuation: boolean,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  return { ...base, isEvacuation: isEvacuation };
}

const VERTICAL_NODE_TYPES: ApiRouteNodeType[] = ['ELEVATOR', 'ESCALATOR', 'STAIRS'];

function VerticalNodeMatches({
  matches,
  floors,
  nodeTypeLabels,
}: {
  matches: ApiRouteNode[];
  floors: ApiFloor[];
  nodeTypeLabels: Record<string, string>;
}) {
  if (matches.length === 0) return null;
  return (
    <div style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
        Связанные узлы на других этажах:
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 13 }}>
        {matches.map((n) => {
          const f = floors.find((fl) => fl.id === n.floorId);
          return (
            <li key={n.id} style={{ padding: '2px 0', color: '#334155' }}>
              {f ? `Этаж #${f.number} (${f.name})` : n.floorId}:{' '}
              {nodeTypeLabels[n.type]} {n.name || ''}
            </li>
          );
        })}
      </ul>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
        {matches.length === 1
          ? 'Этот узел будет соединён с 1 узлом на другом этаже'
          : `Этот узел будет соединён с ${matches.length} узлами на других этажах`}
      </div>
    </div>
  );
}

export default function RouteAdminPanel() {
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [floorId, setFloorId] = useState<string>('');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [nodes, setNodes] = useState<ApiRouteNode[]>([]);
  const [edges, setEdges] = useState<ApiRouteEdge[]>([]);
  const [allVerticalNodes, setAllVerticalNodes] = useState<ApiRouteNode[]>([]);
  const [mapObjects, setMapObjects] = useState<ApiMapObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<RouteEditorMode>('select');
  const [newNodeType, setNewNodeType] = useState<ApiRouteNodeType>('ROUTE_POINT');
  const [newNodeCode, setNewNodeCode] = useState('');
  const [newNodeEvacuation, setNewNodeEvacuation] = useState(false);
  const [anchorMapObjectId, setAnchorMapObjectId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingAnchorMapObjectId, setEditingAnchorMapObjectId] = useState<string>('');
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

    // Граф и объекты карты загружаются независимо: отказ объектов карты
    // не должен обнулять узлы и рёбра — иначе редактор выглядит пустым.
    Promise.all([
      fetchRouteNodes(floorId),
      fetchRouteEdges(floorId),
    ])
      .then(([n, e]) => {
        setNodes(n);
        setEdges(e);
        setSelectedNodeId(null);
        setEditingCode('');
        setPendingFromId(null);
      })
      .catch(() => {
        setNodes([]);
        setEdges([]);
        setError('Не удалось загрузить граф маршрута');
      })
      .finally(() => setLoading(false));

    Promise.all([
      fetchAllRouteNodes(['ELEVATOR', 'ESCALATOR', 'STAIRS']),
    ])
      .then(([allVertical]) => setAllVerticalNodes(allVertical))
      .catch(() => setAllVerticalNodes([]));

    fetchMapObjects(floorId)
      .then((m) => setMapObjects(m))
      .catch(() => setMapObjects([]));
  }, [floorId]);

  useEffect(() => {
    if (!floorId) return;
    setModelUrl(null);
    const floor = floors.find((f) => f.id === floorId);
    fetchFloorScene(floorId)
      .then((scene) => {
        const floorNumber = floor?.number;
        const assetUrl = scene.floor.modelAsset?.url ?? null;
        setModelUrl(resolveModelUrl(floorNumber, assetUrl));
      })
      .catch(() => setModelUrl(null));
  }, [floorId, floors]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  useEffect(() => {
    setEditingCode(selectedNode?.code ?? '');
    setEditingAnchorMapObjectId(selectedNode?.mapObjectId ?? '');
  }, [selectedNode?.code, selectedNode?.mapObjectId]);

  const planMetrics = useMemo(() => {
    const floor = floors.find((f) => f.id === floorId);
    if (!floor) return null;
    return {
      width: floor.width ?? 900,
      height: floor.height ?? 600,
    };
  }, [floors, floorId]);

  const floorMapObjects = useMemo(() => {
    if (!floorId) return [];
    return mapObjects.filter((obj) => obj.floorId === floorId);
  }, [mapObjects, floorId]);

  function isVerticalType(type: ApiRouteNodeType): boolean {
    return type === 'ELEVATOR' || type === 'ESCALATOR' || type === 'STAIRS';
  }

  const verticalTypeLabels = {
    ELEVATOR: 'Лифт',
    ESCALATOR: 'Эскалатор',
    STAIRS: 'Лестница',
  };

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
        code: newNodeCode.trim() || undefined,
        mapObjectId:
          anchorMapObjectId && newNodeType !== 'ROUTE_POINT' && newNodeType !== 'OTHER'
            ? anchorMapObjectId
            : null,
        metadata:
          newNodeType === 'STAIRS' && newNodeEvacuation
            ? { isEvacuation: true }
            : undefined,
      };
      const created = await createRouteNode(input);
      setNodes((prev) => [...prev, created]);
      setNewNodeCode('');
      setNewNodeEvacuation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания узла');
    } finally {
      setBusy(false);
    }
  }

  async function handleEvacuationFlagChange(node: ApiRouteNode, isEvacuation: boolean) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateRouteNode(node.id, {
        metadata: withEvacuationFlag(node.metadata, isEvacuation),
      });
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Ошибка сохранения признака эвакуации',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveNode(coords: { x: number; y: number; z: number }) {
    if (!selectedNodeId || !selectedNode) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateRouteNode(selectedNodeId, {
        x: coords.x,
        y: coords.y,
        z: coords.z,
      });
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setSelectedNodeId(updated.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка перемещения узла');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateNodeCode() {
    if (!selectedNodeId || !selectedNode) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateRouteNode(selectedNodeId, {
        code: editingCode.trim() || undefined,
      });
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения кода');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateNodeBinding() {
    if (!selectedNodeId || !selectedNode) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateRouteNode(selectedNodeId, {
        mapObjectId: editingAnchorMapObjectId || null,
      });
      setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления привязки');
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
          <button
            type="button"
            className={`${styles.modeBtn} ${mode === 'move' ? styles.modeActive : ''}`}
            onClick={() => {
              setMode('move');
              setPendingFromId(null);
            }}
            disabled={!selectedNodeId}
          >
            Переместить
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
                setNewNodeCode('');
                setNewNodeEvacuation(false);
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
               {floorMapObjects.map((obj) => (
                 <option key={obj.id} value={obj.id}>
                   {obj.name}
                 </option>
               ))}
             </select>
           </label>
         ) : null}

         {mode === 'add' &&
         isVerticalType(newNodeType) ? (
           <label className={styles.field}>
             <span>Код (для связи между этажами)</span>
             <input
               className={styles.input}
               value={newNodeCode}
               onChange={(e) => setNewNodeCode(e.target.value)}
               placeholder="напр. elevator-1, stairs-a"
             />
             <span className={styles.hint}>
               Узлы с одинаковым кодом на разных этажах автоматически соединяются
             </span>
           </label>
         ) : null}

         {mode === 'add' && isVerticalType(newNodeType) && newNodeCode.trim()
           ? (
             <VerticalNodeMatches
               matches={allVerticalNodes.filter(
                 (n) => n.code === newNodeCode.trim() && n.floorId !== floorId,
               )}
               floors={floors}
               nodeTypeLabels={verticalTypeLabels}
             />
           ) : null}

        {mode === 'add' && newNodeType === 'STAIRS' ? (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={newNodeEvacuation}
              onChange={(e) => setNewNodeEvacuation(e.target.checked)}
            />
            <span>Пожарная лестница</span>
          </label>
        ) : null}

        {mode === 'connect' && pendingFromId ? (
          <span className={styles.hint}>Выберите второй узел для ребра</span>
        ) : null}

        {mode === 'move' && selectedNodeId ? (
          <span className={styles.hint}>
            Выберите точку на этаже, чтобы переместить узел «{selectedNode?.name || selectedNodeId.slice(0, 6)}»
          </span>
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
              onMoveNode={handleMoveNode}
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
              {isVerticalType(selectedNode.type) ? (
                <label className={styles.field}>
                  <span>Код (для связи между этажами)</span>
                  <input
                    className={styles.input}
                    value={editingCode}
                    onChange={(e) => setEditingCode(e.target.value)}
                    placeholder="напр. elevator-1, stairs-a"
                  />
                  <button
                    type="button"
                    className={styles.modeBtn}
                    onClick={handleUpdateNodeCode}
                    disabled={!selectedNode}
                  >
                    Сохранить код
                  </button>
                </label>
              ) : null}
              {isVerticalType(selectedNode.type) && editingCode.trim() ? (
                <VerticalNodeMatches
                  matches={allVerticalNodes.filter(
                    (n) => n.code === editingCode.trim() && n.id !== selectedNode.id,
                  )}
                  floors={floors}
                  nodeTypeLabels={verticalTypeLabels}
                />
              ) : null}
              {selectedNode.type === 'STAIRS' ? (
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={isEvacuationStair(selectedNode)}
                    onChange={(e) =>
                      void handleEvacuationFlagChange(selectedNode, e.target.checked)
                    }
                  />
                  <span>Пожарная лестница (эвакуация)</span>
                </label>
              ) : null}
              {selectedNode &&
              selectedNode.type !== 'ROUTE_POINT' &&
              selectedNode.type !== 'OTHER' ? (
                <label className={styles.field}>
                  <span>Привязать к объекту</span>
                  <select
                    className={styles.select}
                    value={editingAnchorMapObjectId}
                    onChange={(e) => setEditingAnchorMapObjectId(e.target.value)}
                  >
                     <option value="">— без привязки —</option>
                     {floorMapObjects.map((obj) => (
                       <option key={obj.id} value={obj.id}>
                         {obj.name}
                       </option>
                     ))}
                  </select>
                  <button
                    type="button"
                    className={styles.modeBtn}
                    onClick={handleUpdateNodeBinding}
                    disabled={!selectedNode}
                  >
                    Сохранить привязку
                  </button>
                </label>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
