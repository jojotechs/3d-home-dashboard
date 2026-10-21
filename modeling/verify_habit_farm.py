"""Import delivered farm + original city GLBs; check bounds and body-clear paths."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/verification/h01';OUT.mkdir(parents=True,exist_ok=True)
catalog=json.loads((ROOT/'modeling/habit-farm.json').read_text())
asset=ROOT/'public'/catalog['asset'].lstrip('/')
city=ROOT/'public/models/family-city.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(city))
district=bpy.data.objects['district_habits'];district.location=(0,0,0)
static=bpy.data.objects['static_habits'];legacy=bpy.data.objects['dynamic_habits']
assert len([o for o in legacy.children if o.get('kind')=='growth'])==72
preserved_meshes=[o for o in static.children_recursive if o.type=='MESH']
bpy.context.view_layer.update()
original_points=[o.matrix_world@v.co for o in preserved_meshes for v in o.data.vertices]
bpy.ops.import_scene.gltf(filepath=str(asset));bpy.context.view_layer.update()
root=bpy.data.objects[catalog['root']]
assert root['districtId']=='habits' and root['units']=='metres'
assert list(bpy.data.objects[catalog['plot']].location)==catalog['plotCenterBlender']
nodes={name:bpy.data.objects[name] for name in [catalog['neutral'],*catalog['stages'],catalog['ready']]}
report={'asset':catalog['asset'],'sha256':hashlib.sha256(asset.read_bytes()).hexdigest(),
        'bytes':asset.stat().st_size,'original_city_sha256':hashlib.sha256(city.read_bytes()).hexdigest(),
        'preserved_static_vertices':len(original_points),'hidden_legacy_growth_roots':72,'nodes':{}}

def mesh_points(node):
    meshes=[o for o in node.children_recursive if o.type=='MESH']
    points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
    return meshes,points

for name,node in nodes.items():
    meshes,points=mesh_points(node)
    bounds=[[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
    assert all(math.isfinite(v) for p in points for v in p)
    assert -30<=bounds[0][0]<=bounds[0][1]<=30
    assert -46<=bounds[1][0]<=bounds[1][1]<=46
    assert .2<=bounds[2][0]<=bounds[2][1]<=4
    # Signs overhang the original front fence by <1 m, entirely off its opening.
    if name!=catalog['neutral']:
        assert -25<=bounds[0][0] and bounds[0][1]<=-3
        assert 3<=bounds[1][0] and bounds[1][1]<=20
    triangles=sum(len(face.vertices)-2 for o in meshes for face in o.data.polygons)
    report['nodes'][name]={'bounds_m':bounds,'meshes':len(meshes),'triangles':triangles}

# Independently measure real plant heights and their increasing silhouettes.
tops=[]
for name in catalog['stages']:
    meshes,_=mesh_points(nodes[name]);points=[o.matrix_world@v.co for o in meshes if any(m.name.startswith('habit_stem') for m in o.data.materials) for v in o.data.vertices]
    tops.append(max(p.z for p in points))
assert tops[0]<tops[1]<tops[2],tops
report['stem_top_z_m']=tops

# The same physical 1.7 m person can enter the actual farm, turn off the main
# path and pass through the existing gate into the new central bed walkway.
route=[(0,-41,.55),(0,1,.55),(-14,1,.55),(-14,5,.85),(-14,16,.85)]
clearances={}
for name in catalog['stages']:
    meshes=preserved_meshes+mesh_points(nodes[catalog['neutral']])[0]+mesh_points(nodes[name])[0]+mesh_points(nodes[catalog['ready']])[0]
    vertices=[];faces=[]
    for mesh in meshes:
        offset=len(vertices);vertices.extend(mesh.matrix_world@v.co for v in mesh.data.vertices)
        faces.extend(tuple(offset+i for i in p.vertices) for p in mesh.data.polygons)
    tree=BVHTree.FromPolygons(vertices,faces);minimum=100;samples=0;collisions=[]
    for a,b in zip(route,route[1:]):
        start,end=Vector(a),Vector(b);steps=math.ceil((end-start).length/.2)
        for step in range(steps+1):
            position=start.lerp(end,step/steps)
            for height in [.35,.9,1.45]:
                point=position+Vector((0,0,height));nearest=tree.find_nearest(point)
                if nearest[0] is None:continue
                distance=nearest[3];minimum=min(minimum,distance);samples+=1
                if distance<.24:collisions.append({'point':list(point),'clearance_m':distance})
    clearances[name]={'samples':samples,'minimum_clearance_m':minimum,'collisions':collisions}
report['body_clearance']=clearances;report['route_blender_m']=route
report['max_visible_meshes']=len(mesh_points(nodes[catalog['neutral']])[0])+max(len(mesh_points(nodes[name])[0]) for name in catalog['stages'])+len(mesh_points(nodes[catalog['ready']])[0])
report['total_meshes']=sum(n['meshes'] for n in report['nodes'].values())
report['total_triangles']=sum(n['triangles'] for n in report['nodes'].values())
assert report['total_triangles']<100000,report['total_triangles']
(OUT/'model-validation.json').write_text(json.dumps(report,indent=2))
assert all(not result['collisions'] for result in clearances.values()),'Body clearance collision; see model-validation.json'
print('HABIT_MODEL_VALIDATED',json.dumps(report),flush=True)
