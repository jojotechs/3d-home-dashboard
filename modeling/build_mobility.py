"""Export reusable real-metre car and articulated pedestrian meshes."""
import bpy,sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'modeling'))
from refined_shared import *
from refined_districts import vehicle
bpy.ops.wm.read_factory_settings(use_empty=True);setup_materials()
root=empty('mobility_templates',None);groups=[]
def part(name,geo):
 o=empty(name,root);geo.emit(o,name);groups.append(o);return o
c=Geometry();vehicle(c,0,0,'cream')
minimum=min(v[2] for vs,_,_ in c.data.values() for v in vs)
car=Geometry();transfer(car,c,z=-minimum);part('motion_car',car)
torso=Geometry();torso.box((0,0,1.12),(.45,.29,.56),'cream',bevel=.075);part('walker_body',torso)
head=Geometry();head.ball((0,0,1.52),(.14,.13,.15),'sand',2);head.ball((0,.025,1.624),(.148,.139,.076),'wooddark',2);part('walker_head',head)
for side,name in [(-1,'left'),(1,'right')]:
 leg=Geometry();leg.rod((side*.105,0,.86),(side*.115,0,.20),.072,'roofblue',8);leg.box((side*.115,-.075,.07),(.17,.30,.14),'cream',bevel=.035);part('walker_leg_'+name,leg)
 arm=Geometry();arm.rod((side*.255,0,1.34),(side*.31,0,.96),.063,'cream',8);arm.ball((side*.32,0,.91),(.066,.064,.085),'sand',2);part('walker_arm_'+name,arm)

# One vertex-colour draw per part; no images or network textures.
mat=bpy.data.materials.new('mobility_vertex_colour');mat.use_nodes=True;bs=mat.node_tree.nodes['Principled BSDF'];bs.inputs['Roughness'].default_value=.68
col=mat.node_tree.nodes.new('ShaderNodeVertexColor');col.layer_name='CityColor';mat.node_tree.links.new(col.outputs['Color'],bs.inputs['Base Color'])
for group in groups:
 meshes=[o for o in group.children if o.type=='MESH']
 for o in meshes:
  me=o.data;old=list(me.materials);attr=me.color_attributes.new(name='CityColor',type='BYTE_COLOR',domain='CORNER')
  for p in me.polygons:
   color=old[p.material_index].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
   for li in p.loop_indices:attr.data[li].color=color
  me.materials.clear();me.materials.append(mat)
  for p in me.polygons:p.material_index=0
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();meshes[0].name=group.name+'_mesh'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/mobility.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16)
print('MOBILITY_ASSETS_COMPLETE',flush=True)
