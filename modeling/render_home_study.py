"""Real Blender renders for the central-home art sample and level comparison."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'exports/family-city.blend'))
scene=bpy.context.scene
home=bpy.data.objects['district_home']
keep=set()
def collect(o):
 keep.add(o)
 for c in o.children:collect(c)
collect(home)
for o in list(bpy.data.objects):
 if o not in keep and o.type not in ['CAMERA','LIGHT'] and o.name!='city_root':bpy.data.objects.remove(o,do_unlink=True)

def mat(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True
 m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*color,1)
 m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85
 return m
def cube(name,loc,size,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:
  b=o.modifiers.new('soft edges','BEVEL');b.width=bevel;b.segments=3
  o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o
cube('sample_foundation',(0,0,-.6),(60.4,40.4,1.1),mat('study_edge',(.69,.70,.65)),.12)
cube('studio_floor',(0,0,-1.3),(2000,2000,.1),mat('studio_paper',(.9,.885,.83)))
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.84,.9,1,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
sun=bpy.data.objects['Sun'] if 'Sun' in bpy.data.objects else bpy.data.objects.get('sun_softbox')
for o in bpy.data.objects:
 if o.type=='LIGHT' and o.data.type=='SUN':
  o.data.energy=2.6;o.data.angle=.12;o.rotation_euler=(.4,-.5,-.55)
 if o.type=='LIGHT' and o.data.type=='AREA':
  o.location=(-40,-55,100);o.data.energy=34000;o.data.size=75;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.4
scene.render.resolution_x=1600;scene.render.resolution_y=1120;scene.render.resolution_percentage=100
cam=scene.camera
def level(n):
 def vis(o,on):
  o.hide_render=not on;o.hide_viewport=not on
  for c in o.children:vis(c,on)
 for o in bpy.data.objects:
  if o.get('kind')=='level':vis(o,o.get('minLevel',1)<=n)
def camera(pos,target=(0,0,3),scale=77):
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale
def render(name):
 scene.render.filepath=str(ROOT/f'renders/{name}.png');bpy.ops.render.render(write_still=True);print('HOME_RENDER_DONE',name,flush=True)
camera((53,-83,70));level(3)
if '--quick' in sys.argv:
 scene.cycles.samples=20;scene.render.resolution_percentage=65
 render('home-v2-preview')
else:
 for n in [1,2,3]:
  level(n);render(f'home-v2-level-{n}')
 level(3);camera((-53,83,70));render('home-v2-rear')
 camera((22,-28,30),target=(0,10,6),scale=31);render('home-v2-house-detail')
 camera((2,-37,30),target=(-15,-4,3),scale=28);render('home-v2-dining-detail')
 camera((53,-83,70));level(3)
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'exports/home-art-study.blend'))
 print('HOME_STUDY_COMPLETE',flush=True)
