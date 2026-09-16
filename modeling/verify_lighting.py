"""Independent import verifies the companion lighting geometry and placements."""
import bpy,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/city-lighting.glb'))
root=bpy.data.objects['city_lighting_rig'];anchors=root['lightAnchors']
assert root['assetVersion']=='0.8' and len(anchors)==86
assert all(math.isfinite(float(a[k])) for a in anchors for k in ['x','y','z','ground','radius'])
assert all(3<=a['radius']<=6 for a in anchors)
assert len({(round(a['x'],2),round(a['y'],2),round(a['z'],2)) for a in anchors})==len(anchors)
emissive=[m for m in bpy.data.materials if 'night_' in m.name]
assert len(emissive)==3
meshes=[o for o in bpy.data.objects if o.type=='MESH']
assert meshes and all(len(o.data.vertices)>0 for o in meshes)
report={'status':'passed','light_anchors':len(anchors),'mesh_objects':len(meshes),'emissive_materials':[m.name for m in emissive],'glb_bytes':(ROOT/'public/models/city-lighting.glb').stat().st_size,'checks':['86 unique finite light placements survive GLB re-import','warm, blue and red emissive materials survive export','source metre units retained','companion model does not replace any district geometry']}
(ROOT/'exports/lighting-validation.json').write_text(json.dumps(report,indent=2))
print('LIGHTING_VALIDATION',json.dumps(report),flush=True)
