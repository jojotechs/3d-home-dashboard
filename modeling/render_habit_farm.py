"""Render actual delivered asset over preserved city farm: all states, two sides."""
import bpy, math, sys, argparse
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/verification/h01';OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--quick',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/family-city.glb'))
district=bpy.data.objects['district_habits'];district.location=(0,0,0)
keep={district,*district.children_recursive}
for node in list(bpy.data.objects):
    if node not in keep:bpy.data.objects.remove(node,do_unlink=True)
for name in ['dynamic_habits','hit_habits']:
    root=bpy.data.objects[name]
    for node in [root,*root.children_recursive]:node.hide_render=True
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/habits/daisy.glb'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12 if args.quick else 32;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.5
scene.world=bpy.data.worlds.new('habit_study');scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background']
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.rotation_euler=(.5,-.55,-.5);sun.data.angle=.20
bpy.ops.object.light_add(type='AREA',location=(-30,-35,55));area=bpy.context.object;area.data.shape='DISK';area.data.size=60;area.rotation_euler=(-area.location).to_track_quat('-Z','Y').to_euler()

def visible(name,on):
    node=bpy.data.objects[name]
    for child in [node,*node.children_recursive]:child.hide_render=not on

def shot(name,target,direction,scale,night=False):
    bg.inputs[0].default_value=(.055,.11,.24,1) if night else (.78,.85,.81,1);bg.inputs[1].default_value=.45 if night else .65
    sun.data.energy=.6 if night else 2.2;sun.data.color=(.45,.60,1) if night else (1,.88,.7)
    area.data.energy=2000 if night else 14000;area.data.color=(.45,.62,1) if night else (1,.95,.83)
    target=Vector(target);camera.location=target+Vector(direction);camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
    scene.render.filepath=str(OUT/f'model-{name}.png');bpy.ops.render.render(write_still=True)

for state in ['empty','0','1','2','ready','0-ready']:
    for stage in range(3):visible(f'habit_daisy_stage_{stage}',state==str(stage) or state=='0-ready' and stage==0)
    visible('habit_daisy_ready','ready' in state)
    for view,direction in [('south',(25,-34,27)),('north',(-25,34,27))]:
        shot(f'{state}-{view}',(-14,11,1.5),direction,29)
visible('habit_daisy_stage_0',True);visible('habit_daisy_ready',True)
shot('farm-context',(0,0,4),(67,-99,91),125)
shot('farm-context-night',(0,0,4),(67,-99,91),125,True)
print('HABIT_FARM_RENDERED',OUT,flush=True)
