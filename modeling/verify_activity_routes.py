"""Check pedestrian body clearance against the actual compressed finance GLBs."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[1]
plans=json.loads((ROOT/'modeling/finance-activities.json').read_text())
report={}
for level,plan in plans['levels'].items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/finance/level-{level}.glb'))
    root=bpy.data.objects[f'finance_level_{level}']
    vertices=[];faces=[]
    for o in root.children:
        if o.type!='MESH':continue
        offset=len(vertices);vertices.extend([o.matrix_world@v.co for v in o.data.vertices])
        faces.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons])
    geometry=BVHTree.FromPolygons(vertices,faces)
    failures=[];samples=0;minimum=100
    for a,b in plan['edges']:
        start=Vector(plan['nodes'][a]);end=Vector(plan['nodes'][b]);steps=math.ceil((end-start).length/.15)
        for step in range(steps+1):
            position=start.lerp(end,step/steps)
            # Leg, torso and head clearance for a 1.7 m person; paths stop outside doors.
            for height in [.35,.9,1.45]:
                p=position+Vector((0,0,height));nearest=geometry.find_nearest(p)
                if nearest[0] is None:continue
                clearance=nearest[3];minimum=min(minimum,clearance);samples+=1
                if clearance<.24:failures.append({'edge':[a,b],'point':list(p),'clearance':clearance})
    report[level]={'samples':samples,'minimum_clearance_m':minimum,'collisions':failures}
(ROOT/'exports').mkdir(exist_ok=True)
(ROOT/'exports/activity-route-validation.json').write_text(json.dumps(report,indent=2))
for level,result in report.items():
    print('ACTIVITY_ROUTES',level,result['samples'],result['minimum_clearance_m'],'collisions',len(result['collisions']),flush=True)
assert all(not result['collisions'] for result in report.values()), 'Activity routes collide with delivered geometry: see exports/activity-route-validation.json'
