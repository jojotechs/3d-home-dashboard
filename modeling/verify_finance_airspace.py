"""Conservative swept-sphere clearance for the delivered physical advertisement carriers."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
report={}
for level in [k for k in json.loads((ROOT/'modeling/finance-levels.json').read_text())['levels'] if int(k)>=9]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/finance/level-{level}.glb'))
    root=bpy.data.objects[f'finance_level_{level}'];actors=[o for o in root.children if o.get('financeMotion')=='fly']
    moving={child for a in actors for child in a.children_recursive};vertices=[];faces=[]
    for o in root.children_recursive:
        if o.type!='MESH' or o in moving:continue
        offset=len(vertices);vertices.extend([o.matrix_world@v.co for v in o.data.vertices]);faces.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons])
    geometry=BVHTree.FromPolygons(vertices,faces);results=[]
    for actor in actors:
        local=[actor.matrix_world.inverted()@o.matrix_world@v.co for o in actor.children_recursive if o.type=='MESH' for v in o.data.vertices]
        radius=max(p.length for p in local);route=[Vector(p) for p in actor['route']];clearance=100;samples=0
        for i,a in enumerate(route):
            b=route[(i+1)%len(route)];steps=max(1,math.ceil((b-a).length/.15))
            for step in range(steps+1):
                p=a.lerp(b,step/steps);distance=geometry.find_nearest(p)[3]-radius
                assert distance>.5,(actor.name,list(p),distance)
                assert abs(p.x)+radius<30 and abs(p.y)+radius<22 and p.z+radius<60
                clearance=min(clearance,distance);samples+=1
        results.append({'actor':actor.name,'samples':samples,'radius_m':radius,'minimum_clearance_m':clearance,'route':[list(p) for p in actor['route']]})
    for i,a in enumerate(results):
        for b in results[i+1:]:
            # Full route envelopes must remain separate regardless of phase or playback speed.
            distance=min((Vector(p)-Vector(q)).length for p in a['route'] for q in b['route'])-a['radius_m']-b['radius_m']
            assert distance>1,(a['actor'],b['actor'],distance)
    report[level]=results
(ROOT/'exports/finance-airspace-validation.json').write_text(json.dumps(report,indent=2));print('FINANCE_AIRSPACE',json.dumps(report),flush=True)
