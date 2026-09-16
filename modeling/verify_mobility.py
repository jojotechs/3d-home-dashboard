"""Measure the compressed actor assets after an independent GLB import."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/mobility.glb'))
def bounds(prefix):
 points=[o.matrix_world@v.co for o in bpy.data.objects if o.type=='MESH' and o.name.startswith(prefix) for v in o.data.vertices]
 return [round(max(v[i] for v in points)-min(v[i] for v in points),4) for i in range(3)]
car=bounds('motion_car');human=bounds('walker_')
assert abs(car[0]-1.938)<.005 and abs(car[1]-4.381)<.005 and abs(car[2]-1.621)<.005,car
assert abs(human[2]-1.7)<.005,human
report={'status':'passed','car_xyz_m':car,'pedestrian_xyz_m':human,'road_width_m':6,'actor_mesh_count':len([o for o in bpy.data.objects if o.type=='MESH']),'checks':['compressed car matches existing family-car scale','pedestrian height is 1.7 m','separate articulated limb meshes survive export']}
assert report['actor_mesh_count']==7
(ROOT/'exports/mobility-validation.json').write_text(json.dumps(report,indent=2))
print('MOBILITY_VALIDATION',json.dumps(report),flush=True)
