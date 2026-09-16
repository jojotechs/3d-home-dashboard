"""Reproducible detailed city; Blender source and all web assets share geometry."""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'modeling'))
from refined_shared import setup_materials
from refined_home import build as build_home
from refined_districts import build as build_districts
from refined_landscape import build as build_landscape
from refined_travel import build as build_travel
MANIFEST=json.loads((ROOT/'modeling/scene-manifest.json').read_text())
random.seed(MANIFEST['scene']['seed'])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
GROUPS=[]
def group(name,parent=None,loc=(0,0,0),**extras):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=loc
 for k,v in extras.items():o[k]=v
 GROUPS.append(o);return o
city=group('city_root');base=group('static_city_base',city);sea=group('ocean',city)
DIST={};STATIC={};DYN={}
for d in MANIFEST['districts']:
 rid=d['district_id'];r=group('district_'+rid,city,d['world_center_blender_m'],districtId=rid)
 DIST[rid]=r;STATIC[rid]=group('static_'+rid,r);DYN[rid]=group('dynamic_'+rid,r)
 w,h=d['footprint_xy_m']
 group('anchor_label_'+rid,r,(0,0,d['max_building_height_m']+2),anchor='label',districtId=rid)
 group('anchor_focus_'+rid,r,(0,0,d['max_building_height_m']/3),anchor='focus',districtId=rid)
 group('hit_'+rid,r,hitWidth=w,hitDepth=h,districtId=rid)
GROUPS.extend(build_home(STATIC['home'],DYN['home'],MANIFEST['facility_slots']))
GROUPS.extend(build_districts(STATIC,DYN,MANIFEST['facility_slots']))
build_landscape(base,sea,MANIFEST['roads'])
build_travel(STATIC,base)
# Merge static geometry by top-level logical group while retaining dynamic roots.
def merge_group(g):
    meshes=[]
    def collect(p):
        for o in p.children:
            if o.type=='MESH':meshes.append(o)
            elif o.type=='EMPTY' and not any(k in o for k in ['kind','anchor','districtId','hitWidth','transportActor']):collect(o)
    collect(g)
    if len(meshes)>1:
        bpy.ops.object.select_all(action='DESELECT')
        # Joining must never mutate a cached primitive used by other groups.
        for o in meshes:
            o.data=o.data.copy()
            o.select_set(True)
        bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join()
        o=meshes[0];world=o.matrix_world.copy();o.parent=g;o.matrix_world=world;o.name=g.name+'_mesh'
for g in [base,sea,*STATIC.values()]+[o for o in GROUPS if 'kind' in o]+[o for o in bpy.data.objects if o.get('transportActor')]:merge_group(g)

# Bake the shared palette into vertex colours: one matte draw per logical group.
# Geometry and per-face colours are unchanged; glazing and metal retain their PBR.
vertex_mats={}
for category,rough,metal in [('matte',.74,0),('glass',.36,0),('metal',.74,.45),('cabin',.30,0)]:
 m=bpy.data.materials.new('city_'+category+'_vertex_color');m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 col=m.node_tree.nodes.new('ShaderNodeVertexColor');col.layer_name='CityColor'
 m.node_tree.links.new(col.outputs['Color'],bs.inputs['Base Color']);vertex_mats[category]=m
for ob in [o for o in bpy.data.objects if o.type=='MESH']:
 me=ob.data;old=list(me.materials);attrs=me.color_attributes.new(name='CityColor',type='BYTE_COLOR',domain='CORNER')
 cats=[];indices=[]
 for p in me.polygons:
  mat=old[p.material_index];bs=mat.node_tree.nodes.get('Principled BSDF');rgba=bs.inputs['Base Color'].default_value
  category='cabin' if 'cabin_glass' in mat.name else 'glass' if 'glass' in mat.name else 'metal' if mat.name in ['home_metal','home_steel'] else 'matte'
  if category not in cats:cats.append(category)
  indices.append(cats.index(category))
  for li in p.loop_indices:attrs.data[li].color=rgba
 me.materials.clear()
 for cat in cats:me.materials.append(vertex_mats[cat])
 for p,idx in zip(me.polygons,indices):p.material_index=idx

scene=bpy.context.scene;scene.world.color=(.6,.6,.6);scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.82,.86,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
bpy.ops.object.light_add(type='AREA',location=(-90,-120,230));key=bpy.context.object;key.name='sun_softbox';key.data.energy=180000;key.data.shape='DISK';key.data.size=140;key.rotation_euler=(Vector((0,0,0))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(0,0,150));sun=bpy.context.object;sun.data.energy=2;sun.data.angle=.25;sun.rotation_euler=(.4,-.5,-.5)
bpy.ops.object.camera_add(location=(90,-285,255));cam=bpy.context.object;cam.name='camera_overview';cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=320;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.4;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False

for folder in ['exports','renders','public/models']:(ROOT/folder).mkdir(exist_ok=True,parents=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'exports/family-city.blend'))
# Full city and each district: export local roots for independent later loading.
bpy.ops.object.select_all(action='DESELECT')
def select_tree(root):
    root.select_set(True)
    for child in root.children:select_tree(child)
select_tree(city)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/family-city.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_color_quantization=8)
for rid,root in DIST.items():
    bpy.ops.object.select_all(action='DESELECT');select_tree(root);pos=root.location.copy();root.location=(0,0,0)
    bpy.ops.export_scene.gltf(filepath=str(ROOT/f'exports/district_{rid}.glb'),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_color_quantization=8)
    root.location=pos

mesh_objects=[o for o in bpy.data.objects if o.type=='MESH']
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in mesh_objects)
node_report={'blender':bpy.app.version_string,'mesh_objects':len(mesh_objects),'expanded_triangles':triangles,'dynamic_groups':[{'name':o.name,**dict(o.items())} for o in GROUPS if 'kind' in o],'districts':list(DIST),'glb_bytes':(ROOT/'public/models/family-city.glb').stat().st_size}
(ROOT/'exports/build-report.json').write_text(json.dumps(node_report,indent=2,ensure_ascii=False))
print('CITY_BUILD_REPORT',json.dumps({k:v for k,v in node_report.items() if k!='dynamic_groups'}),flush=True)

# Blender opens the approved final stage; all alternatives remain in the export.
def hide_variant(o):
    o.hide_render=True;o.hide_set(True)
    for child in o.children:hide_variant(child)
for o in GROUPS:
    if o.get('kind')=='level' and o.get('maxLevel',99)<3:hide_variant(o)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'exports/family-city.blend'))

# Render representative mid-progress state, then four azimuths.
if '--no-renders' in sys.argv:
    print('BUILD_COMPLETE (render skipped)',flush=True)
    sys.exit(0)
def hide_branch(o):
    o.hide_render=True
    for child in o.children:hide_branch(child)
for o in GROUPS:
    if o.get('kind')=='growth' and o['slot']>=8:hide_branch(o)
    if o.get('kind')=='rubbish' and o['slot']>=3:hide_branch(o)
    if o.get('kind')=='carPacked':hide_branch(o)
views={'south':(90,-285,255),'east':(300,40,255),'north':(-70,285,255),'west':(-300,-40,255)}
if '--quick' in sys.argv:scene.render.resolution_percentage=65;scene.cycles.samples=12
for name,position in views.items():
    cam.location=position;cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(ROOT/f'renders/city-{name}.png')
    bpy.ops.render.render(write_still=True);print('RENDER_DONE',name,flush=True)
print('BUILD_COMPLETE',flush=True)
