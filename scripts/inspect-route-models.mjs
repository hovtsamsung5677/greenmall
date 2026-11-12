// Read-only diagnostic: project the GLB with the same transform as RouteEditor3D.
import fs from 'node:fs/promises';
import { Box3, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const out = new URL('../../route-audit/', import.meta.url);
await fs.mkdir(out, { recursive: true });
const base = 'http://localhost:3000/api/public';
async function get(path) {
  const response = await fetch(base + path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}
const floors = await get('/floors');
for (const floor of floors.filter(f => f.number > 0)) {
  const scene = await get(`/floors/${floor.id}/scene`);
  const modelUrl = new URL(scene.floor.modelAsset.url, 'http://localhost:3000');
  const modelResponse = await fetch(modelUrl);
  if (!modelResponse.ok) throw new Error(`Model ${modelUrl}: ${modelResponse.status}`);
  const bytes = Buffer.from(await modelResponse.arrayBuffer());
  const loader = new GLTFLoader();
  loader.register(() => ({ name: 'DIAGNOSTIC_NO_TEXTURES', loadTexture: () => Promise.resolve(null) }));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(gltf.scene);
  const size = box.getSize(new Vector3()), center = box.getCenter(new Vector3());
  const scale = Math.min(floor.width / size.x, floor.height / size.z);
  const triangles = [];
  gltf.scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position, idx = mesh.geometry.index;
    const count = idx ? idx.count : p.count;
    for (let i = 0; i < count; i += 3) {
      const vertices = [0,1,2].map(j => new Vector3().fromBufferAttribute(p, idx ? idx.getX(i+j) : i+j).applyMatrix4(mesh.matrixWorld));
      const area = Math.abs((vertices[1].x-vertices[0].x)*(vertices[2].z-vertices[0].z)-(vertices[2].x-vertices[0].x)*(vertices[1].z-vertices[0].z))*scale*scale;
      if (area < .01) continue;
      const group = mesh.geometry.groups.find(g => i >= g.start && i < g.start + g.count);
      const mat = Array.isArray(mesh.material) ? mesh.material[group?.materialIndex ?? 0] : mesh.material;
      triangles.push({ p: vertices.map(v => [(v.x-center.x)*scale+floor.width/2,(v.z-center.z)*scale+floor.height/2]), h: vertices.reduce((s,v)=>s+v.y,0)/3, color: '#' + mat.color.getHexString(), mesh: mesh.name });
    }
  });
  triangles.sort((a,b)=>a.h-b.h);
  const graph = await get(`/floors/${floor.id}/route-graph`);
  await fs.writeFile(new URL(`floor-${floor.number}.json`,out),JSON.stringify({floor,triangles,graph}));
  console.log(floor.number, triangles.length, Object.keys(graph));
}
