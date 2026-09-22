"""Validate the delivered compressed GLBs, not the generation source."""
import bpy, json, math, hashlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'modeling/finance-levels.json').read_text())
report = {}
for level, spec in manifest['levels'].items():
    path = ROOT/'public'/spec['url'].lstrip('/')
    assert path.exists(), f'Missing real finance Lv.{level} GLB'
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    root = bpy.data.objects[f'finance_level_{level}']
    assert root['districtId'] == 'finance' and root['financeLevel'] == int(level)
    meshes = [o for o in root.children_recursive if o.type == 'MESH']
    points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
    bounds = [[min(p[i] for p in points), max(p[i] for p in points)] for i in range(3)]
    assert all(math.isfinite(v) for p in points for v in p)
    assert bounds[0][0] >= -30.05 and bounds[0][1] <= 30.05, bounds
    assert bounds[1][0] >= -22.05 and bounds[1][1] <= 22.05, bounds
    assert 0 <= bounds[2][0] and bounds[2][1] <= spec['height'] <= 60, bounds
    actors = [o for o in root.children_recursive if o.get('financeMotion')]
    for actor in actors:
        verts=[o.matrix_world@v.co for o in actor.children_recursive if o.type=='MESH' for v in o.data.vertices]
        height=max(p.z for p in verts)-min(p.z for p in verts)
        assert 1.65 < height < 1.75, height
        for x,y in actor['route']:
            assert -29<x<29 and -21<y<21
    names={m.name for o in meshes for m in o.data.materials}
    assert any('finance_window' in n for n in names)
    assert any('finance_lamp' in n for n in names)
    assert root['lightAnchors'] and actors
    triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
    report[level]={'bounds_m':bounds,'triangles':triangles,'meshes':len(meshes),'moving_customers':len(actors),'lights':len(root['lightAnchors']),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
assert report['2']['bounds_m'][2][1] > report['1']['bounds_m'][2][1]+2
(ROOT/'exports').mkdir(exist_ok=True)
(ROOT/'exports/finance-level-validation.json').write_text(json.dumps(report,indent=2))
print('FINANCE_LEVEL_VALIDATION',json.dumps(report),flush=True)
