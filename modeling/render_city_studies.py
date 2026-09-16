"""Reviewable Blender renders: every district, growth tiers, four city angles."""
import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'exports/family-city.blend'))
scene=bpy.context.scene;cam=scene.camera
manifest=json.loads((ROOT/'modeling/scene-manifest.json').read_text());districts=manifest['districts']
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100;scene.render.resolution_x=1440;scene.render.resolution_y=1008
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.4
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.84,.9,1,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
for o in bpy.data.objects:
 if o.type=='LIGHT' and o.data.type=='SUN':o.data.energy=2.6;o.data.angle=.12;o.rotation_euler=(.4,-.5,-.55)
 if o.type=='LIGHT' and o.data.type=='AREA':o.location=(-50,-80,130);o.data.energy=60000;o.data.size=95;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()

def surface(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1);return m
floor_mat=surface('study_paper',(.9,.885,.83));edge_mat=surface('study_edge',(.69,.70,.65))
def cube(name,loc,size,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size;o.data.materials.append(mat);return o
floor=cube('study_floor',(0,0,-1.2),(2000,2000,.1),floor_mat)
base=cube('study_foundation',(0,0,-.4),(60.4,40.4,.8),edge_mat)

def visibility(o,on):
 o.hide_render=not on
 for c in o.children:visibility(c,on)
def set_state(level=3):
 for o in bpy.data.objects:
  if o.get('kind'):
   k=o['kind'];on=True
   if k=='level':on=o.get('minLevel',1)<=level<=o.get('maxLevel',99)
   if k=='growth':on=o['slot']<8
   if k=='rubbish':on=o['slot']<3
   if k=='carPacked':on=False
   visibility(o,on)
def point(pos,target,scale):
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale

def render(name):
 prefix=sys.argv[sys.argv.index('--prefix')+1] if '--prefix' in sys.argv else 'v4';scene.render.filepath=str(ROOT/f'renders/{prefix}-{name}.png');bpy.ops.render.render(write_still=True);print('CITY_STUDY_DONE',name,flush=True)

selected=sys.argv[sys.argv.index('--district')+1] if '--district' in sys.argv else None
for d in districts:
 if '--city-only' in sys.argv:continue
 rid=d['district_id']
 if selected and selected!=rid:continue
 for o in [bpy.data.objects['static_city_base'],bpy.data.objects['ocean']]+[bpy.data.objects['district_'+v['district_id']] for v in districts]:visibility(o,False)
 root=bpy.data.objects['district_'+rid];pos=root.location.copy();root.location=(0,0,0);visibility(root,True)
 # State toggles are limited to this district after other districts are hidden.
 def level(n):
  for o in root.children_recursive:
   if o.get('kind'):
    kind=o['kind'];on=True
    if kind=='level':on=o.get('minLevel',1)<=n<=o.get('maxLevel',99)
    elif kind=='growth':on=o['slot']<8
    elif kind=='rubbish':on=o['slot']<3
    elif kind=='carPacked':on=False
    visibility(o,on)
 w,depth=d['footprint_xy_m'];base.scale=(w+.4,depth+.4,.8)
 sc=159 if rid=='health' else 109 if rid=='habits' else 118 if rid=='finance' else 78
 target=(0,0,23 if rid=='finance' else 3)
 point((53,-83,75 if rid!='finance' else 85),target,sc)
 for n in ([1,2,3] if rid in ['health','learning','finance'] else [3]):
  level(n);render(rid+(f'-level-{n}' if rid in ['health','learning','finance'] else ''))
 if rid in ['finance','cars','habits','health','learning']:
  point((-53,83,75),target,sc);render(rid+'-rear')
 root.location=pos
if not selected or '--include-city' in sys.argv:
 floor.hide_render=True;base.hide_render=True
 visibility(bpy.data.objects['city_root'],True);set_state()
 scene.render.resolution_x=1680;scene.render.resolution_y=1120
 for o in bpy.data.objects:
  if o.type=='LIGHT' and o.data.type=='AREA':o.location=(-90,-120,230);o.data.energy=180000;o.data.size=140;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 for name,pos in {'south':(90,-285,255),'east':(300,40,255),'north':(-70,285,255),'west':(-300,-40,255)}.items():
  point(pos,(0,0,0),340);render('city-'+name)
print('CITY_STUDIES_COMPLETE',flush=True)
