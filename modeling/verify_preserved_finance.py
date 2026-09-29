"""Compare delivered Lv.7 with the original prosperous GLB, allowing Draco quantization only."""
import bpy,json
from pathlib import Path
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[1]
names=[f'finance_tower_{i}_level_3_mesh' for i in range(6)]+['static_finance_mesh']
def meshes(path):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
 return {name:([v.co.copy() for v in bpy.data.objects[name].data.vertices],sum(len(p.vertices)-2 for p in bpy.data.objects[name].data.polygons)) for name in names}
original=meshes(ROOT/'public/models/family-city.glb');delivered=meshes(ROOT/'public/models/finance/level-7.glb');report={}
for name in names:
 a,ta=original[name];b,tb=delivered[name];distances=[]
 for source,target in [(a,b),(b,a)]:
  tree=KDTree(len(target))
  for i,v in enumerate(target):tree.insert(v,i)
  tree.balance();distances.append(max(tree.find(v)[2] for v in source))
 assert ta==tb,(name,ta,tb)
 assert max(distances)<.002,(name,distances)
 report[name]={'source_vertices':len(a),'delivered_vertices':len(b),'triangles':ta,'max_bidirectional_vertex_error_m':max(distances)}
(ROOT/'exports/preserved-finance-validation.json').write_text(json.dumps(report,indent=2))
print('PRESERVED_FINANCE',json.dumps(report),flush=True)
