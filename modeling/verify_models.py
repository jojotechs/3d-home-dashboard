"""Independent GLB re-import and deterministic state render verification."""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'exports/family-city.blend'))
scene=bpy.context.scene;scene.cycles.samples=12;scene.render.resolution_percentage=100;scene.render.resolution_x=1000;scene.render.resolution_y=720
nodes=[o for o in bpy.data.objects if o.get('kind')]
def visibility(o,value):
    o.hide_render=not value
    for child in o.children:visibility(child,value)
def set_state(levels=None,car_a=True,habit=7,chores=3):
    levels=levels or {}
    for o in nodes:
        data=dict(o.items());kind=data['kind'];on=True
        if kind=='level':on=data['minLevel']<=levels.get(data['district'],3)<=data.get('maxLevel',99)
        elif kind=='growth':on=data['slot']<(habit if data['plot']==0 else 8)
        elif kind=='rubbish':on=data['slot']<chores
        elif kind=='carWork':on=car_a if data['carId']=='car_a' else True
        elif kind=='carPacked':on=False
        visibility(o,on)
def snapshot():return {o.name:not o.hide_render for o in nodes}
set_state();before=snapshot();set_state(car_a=False);after=snapshot()
changed=[k for k in before if before[k]!=after[k]];assert changed==['work_car_a'],changed
set_state(habit=7);before=snapshot();set_state(habit=8);after=snapshot();assert [k for k in before if before[k]!=after[k]]==['plot_0_slot_7']
set_state(chores=3);before=snapshot();set_state(chores=2);after=snapshot();assert [k for k in before if before[k]!=after[k]]==['chore_group_2']
for region in ['health','home']:
    previous=set()
    for level in [1,2,3]:
        set_state({region:level});current={o.name for o in nodes if o.get('district')==region and not o.hide_render}
        assert previous<=current,(region,level)
        if level>1:assert len(current)>len(previous),(region,level)
        assert not bpy.data.objects['static_'+region].hide_render
        previous=current
for level in [1,2,3]:
    set_state({'finance':level})
    current=[o for o in nodes if o.get('district')=='finance' and not o.hide_render]
    assert len(current)==6,(level,[o.name for o in current])
    assert all(o['minLevel']==level==o['maxLevel'] for o in current)

manifest=json.loads((ROOT/'modeling/scene-manifest.json').read_text());centers={d['district_id']:d['world_center_blender_m'] for d in manifest['districts']}
cam=scene.camera
def render(region,name,levels=None,**state):
    set_state(levels,**state);target=Vector(centers[region])+Vector((0,0,2));cam.location=target+Vector((40,-85,85));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=170 if region=='health' else 82;scene.render.filepath=str(ROOT/f'renders/{name}.png');bpy.ops.render.render(write_still=True)
if '--no-renders' not in sys.argv:
    for region in ['health','home']:
        for level in [1,2,3]:render(region,f'{region}-level-{level}',{region:level})
    render('cars','cars-before',car_a=True);render('cars','cars-after',car_a=False)
    render('habits','habits-before',habit=7);render('habits','habits-after',habit=8)
    render('chores','chores-before',chores=3);render('chores','chores-after',chores=2)
    set_state();scene.render.resolution_x=1440;scene.render.resolution_y=1000;cam.data.ortho_scale=320
    for name,pos in {'south':(90,-285,255),'east':(300,40,255),'north':(-70,285,255),'west':(-300,-40,255)}.items():
        cam.location=pos;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(ROOT/f'renders/city-{name}.png');bpy.ops.render.render(write_still=True)

# GLB is re-imported into a fresh scene, not validated from the source alone.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/family-city.glb'))
imported=list(bpy.data.objects)
names={o.name for o in imported}
for rid in centers:
    assert 'district_'+rid in names,rid
    assert 'anchor_label_'+rid in names,rid
for expected in ['work_car_a','work_car_b','health_court','health_gym','health_play','health_yoga','health_service','home_dining','home_grill','home_gazebo','home_activity','home_children','plot_0_slot_7','chore_group_2']:
    assert expected in names,expected
# Verify exclusive financial stages on the actual compressed asset too.
finance_nodes=[o for o in imported if o.get('district')=='finance' and o.get('kind')=='level']
assert len(finance_nodes)==18,len(finance_nodes)
finance_bounds={}
for i in range(6):
    building=[o for o in finance_nodes if o.name.startswith(f'finance_tower_{i}_level_')]
    assert sorted(o['minLevel'] for o in building)==[1,2,3]
    assert all(o['minLevel']==o['maxLevel'] for o in building)
    assert len({o['developmentStage'] for o in building})==3
    assert len({o['architecture'] for o in building})==1
    levels=[]
    for level in [1,2,3]:
        meshes=[c for o in building if o['minLevel']<=level<=o['maxLevel'] for c in o.children_recursive if c.type=='MESH']
        points=[c.matrix_world@v.co for c in meshes for v in c.data.vertices]
        # Blender's glTF importer converts back to Z-up.
        high=max(v.z for v in points);levels.append(high)
        assert all(centers['finance'][0]-30.1<=v.x<=centers['finance'][0]+30.1 and centers['finance'][1]-22.1<=v.y<=centers['finance'][1]+22.1 for v in points)
    assert levels[0]<levels[1]<levels[2],(i,levels)
    assert levels[-1]<=60,(i,levels)
    finance_bounds[building[0]['architecture']]=[round(v,3) for v in levels]
assert len(finance_bounds)==6
(ROOT/'exports/finance-validation.json').write_text(json.dumps({'status':'passed','finance_tier_heights_m':finance_bounds,'checks':['six approved prosperous architectural types survive compressed GLB import','18 complete finance buildings in three exclusive development stages','exactly six buildings visible at each stage, no overlapping older variants','all buildings fit existing 60 x 44 m parcel and 60 m height envelope']},indent=2))
for o in imported:
    if o.type=='MESH':
        assert len(o.data.vertices)>0,o.name
        assert all(math.isfinite(v) for v in o.matrix_world.translation),o.name
        assert all(s>0 for s in o.scale),o.name
report={'status':'passed','checks':['car_a changes only its own group','one habit completion changes one slot','one chore completion changes one rubbish group','health and home levels strictly additive','finance uses exclusive complete development stages','six finance types and tier heights verified after GLB re-import','all districts and anchors survive GLB re-import','required dynamic nodes survive GLB re-import','mesh vertices present and transforms finite with positive scale'],'imported_objects':len(imported),'render_evidence_count':0 if '--no-renders' in sys.argv else 16,'browser_qa':'Whole-city browser QA is recorded in exports/browser-city-qa.json; finance v0.4 QA in exports/browser-finance-v4-qa.json; this script validates model structure'}
(ROOT/'exports/model-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('MODEL_VALIDATION',json.dumps(report),flush=True)
