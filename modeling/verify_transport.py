"""Verify movable actors from compressed geometry, not just modelling source."""
import bpy,json,sys,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/family-city.glb'))
report={'status':'passed','actors':{},'preserved':{}}
for name,mode in [('transport_aircraft','air'),('transport_aircraft_2','air'),('transport_aircraft_3','air'),('transport_train','rail'),('transport_train_2','rail')]:
    root=bpy.data.objects[name]
    assert root.get('transportActor')==mode
    assert root.parent.name=='static_'+('airport' if mode=='air' else 'rail')
    meshes=[o for o in root.children_recursive if o.type=='MESH']
    points=[root.matrix_world.inverted()@o.matrix_world@v.co for o in meshes for v in o.data.vertices]
    bounds=[[round(min(p[i] for p in points),4),round(max(p[i] for p in points),4)] for i in range(3)]
    dimensions=[b-a for a,b in bounds]
    assert 25<dimensions[0]<27 if mode=='air' else 52<dimensions[0]<53
    assert 25<dimensions[1]<27 if mode=='air' else 2.7<dimensions[1]<3
    assert any('cabin' in m.name for o in meshes for m in o.data.materials),name
    report['actors'][name]={'node':name,'meshes':len(meshes),'bounds_local_blender_m':bounds,'dimensions_m':dimensions}
before=json.loads((ROOT/'exports/v8-before-hashes.json').read_text())
for file,checksum in before.items():
    if file in ['public/models/family-city.glb','exports/district_airport.glb','exports/district_rail.glb']:continue
    same=hashlib.sha256((ROOT/file).read_bytes()).hexdigest()==checksum
    assert same,file
    report['preserved'][file]=same
(ROOT/'exports/transport-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('TRANSPORT_VALIDATION',json.dumps(report),flush=True)
