"""Measure the delivered geometry's skyline coverage; not planning floor area/FAR."""
import bpy, json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
report={}
for level in [7,8,9,10]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/finance/level-{level}.glb'))
    root=bpy.data.objects[f'finance_level_{level}'];vertices=[];faces=[]
    for o in root.children_recursive:
        if o.type!='MESH':continue
        parent=o;effect=False
        while parent and parent!=root:
            effect=effect or any(parent.get(key) for key in ['financeMotion','financeHologram','financeLightShow','financeAccent'])
            parent=parent.parent
        if effect:continue
        offset=len(vertices);vertices.extend(o.matrix_world@v.co for v in o.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in o.data.polygons)
    geometry=BVHTree.FromPolygons(vertices,faces)
    coverage={str(z):0 for z in [6,15,30]};volume=0
    for ix in range(120):
        for iy in range(88):
            hit=geometry.ray_cast(Vector((-29.75+ix*.5,-21.75+iy*.5,80)),Vector((0,0,-1)))[0]
            height=hit.z if hit else 0
            for threshold in coverage:
                if height>=int(threshold):coverage[threshold]+=.25
            if height>=6:volume+=height*.25
    report[level]={'coverage_above_m2':coverage,'skyline_volume_proxy_m3':round(volume,1)}
out=ROOT/'exports/finance-density-validation.json';out.write_text(json.dumps(report,indent=2))
print('FINANCE_DENSITY',json.dumps(report),flush=True)
for level in [8,9,10]:
    for height in ['6','15']:
        assert report[level]['coverage_above_m2'][height]>report[7]['coverage_above_m2'][height],f'Lv.{level} is sparser than Lv.7 above {height} m'
    assert report[level]['skyline_volume_proxy_m3']>report[level-1]['skyline_volume_proxy_m3'],f'Lv.{level} has not increased skyline volume'
