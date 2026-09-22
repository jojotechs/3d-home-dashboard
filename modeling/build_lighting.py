"""Companion Blender lighting fixtures, preserving all approved district meshes."""
import bpy,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'modeling'))
from refined_shared import *
bpy.ops.wm.read_factory_settings(use_empty=True)
PALETTE.update({'night_warm':'#FFE8B6','night_blue':'#93CBFF','night_red':'#FF6556'})
setup_materials();root=empty('city_lighting_rig',None);g=Geometry();anchors=[]
def lantern(x,y,scale=1,z=0,new=False,pool=5.0):
 if new:
  a=Geometry();lamp(a,0,0);transfer(g,a,x,y,z=z,scale=scale)
 g.box((x,y,z+4.10*scale),(.46*scale,.46*scale,.62*scale),'night_warm',bevel=.035*scale)
 anchors.append({'x':x,'y':y,'z':z+3.95*scale,'ground':max(.7,z+.25),'radius':pool,'kind':'warm'})
# Existing lamps: exact source coordinates, with an emissive insert in the lantern.
for x in [-33.8,33.8]:
 for j,y in enumerate(range(-74,26,11)):
  if j%2==0:lantern(x,y+4)
for x in [-98,-60,-18,21,60,98]:lantern(x,24);lantern(x,-24)
for x,y in [(-27,-17.5),(27,-18),(-28,1),(28,4),(9,3)]:lantern(x,y,pool=4)
# Finance fixtures belong to the active independent finance GLB. Legacy rig stays preserved.
for x in [-64,-22,8,39,64]:lantern(x+38,56-19.8,pool=4.5)
for x,y in [(-28,-17),(28,-17),(13,18)]:lantern(x+76,y-56)
for x,y in [(-26,-5),(26,-5),(-12,-18),(12,-18)]:lantern(x+76,y)
for x in [-25,25]:lantern(x,-74)
# A restrained ring of new coastal lamps, clear of the 6 m carriageway.
for x in range(-100,107,23):
 lantern(x,-90.3,new=True)
 if not -16<x<72:lantern(x,90.3,new=True)
for y in range(-69,79,24):
 for x in [-118.3,118.3]:lantern(x,y,new=True)
# Bridge fixtures occupy the existing curb; light spill lands on its deck.
a,b=(114,-28),(173,-72.25);d=Vector((b[0]-a[0],b[1]-a[1])).normalized();n=Vector((-d.y,d.x))
for along in [16,39,62]:
 p=Vector(a)+d*along+n*3.35;lantern(p.x,p.y,.78,.57,True,5.3)
# Airport forecourt and station entrance.
for x in [211,226,253,270]:lantern(x,-83.7,.84,.45,True,5.4)
for x in [-7,63]:lantern(x,91,.88,.20,True,5.0)
for x in [4,20,36,52]:
 g.box((x,103+8,5.76),(4.7,.23,.08),'night_warm')
 anchors.append({'x':x,'y':111,'z':5.76,'ground':1.405,'radius':3.2,'kind':'warm'})
# Real airport edge lamps and terminal canopy strips.
for x in range(-58,61,8):
 for y in [-72.7,-59.3]:g.ball((237+x,-103+y,1.04),(.16,.16,.13),'night_blue',1)
for x in [-52,52]:
 for y in [-70,-68,-66,-64,-62]:g.ball((237+x,-103+y,.65),(.17,.17,.09),'night_warm',1)
for x in [-5,5,15,25]:g.box((237+x,-84.2,4.30),(6.5,.20,.08),'night_warm')
g.ball((200,-93,22.1),(.20,.20,.20),'night_red',2)
g.ball((-72,-96,10.3),(.5,.5,.42),'night_warm',2)
for x in [-125.5,141.5]:
 for y in [106.1,115.9]:g.box((x,y,2.8),(.30,.14,.18),'night_warm')
g.emit(root,'night_fixtures')
root['lightAnchors']=anchors;root['assetVersion']='0.8';root['unit']='metre'
for name in ['night_warm','night_blue','night_red']:
 mat=MATERIALS[name];bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Emission Color'].default_value=bs.inputs['Base Color'].default_value;bs.inputs['Emission Strength'].default_value=2.2
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'exports/city-lighting-rig.blend'))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/city-lighting-v1.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16)
(ROOT/'exports/lighting-fixtures.json').write_text(json.dumps({'version':'0.8','lantern_count':len(anchors),'anchors':anchors,'checks':['fixture scale follows 1 m scene units','roadside poles sit outside carriageways','existing lamps reused as inserts','runway lights follow the expanded airport airside']},indent=2))
print('LIGHTING_RIG_COMPLETE',len(anchors),flush=True)
