"""Render actual re-imported delivered GLBs from opposing views, day/night and at 200px."""
import bpy, math, argparse, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--levels',type=int,nargs='+',default=[1,2])
parser.add_argument('--output',default='docs/verification/t08')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=ROOT/args.output;OUT.mkdir(parents=True,exist_ok=True)
for level in args.levels:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/finance/level-{level}.glb'))
    root=bpy.data.objects[f'finance_level_{level}']
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=1100;scene.render.resolution_y=820;scene.render.resolution_percentage=100
    scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.3
    scene.world=bpy.data.worlds.new('finance_study');scene.world.use_nodes=True
    bg=scene.world.node_tree.nodes['Background']
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=79;scene.camera=cam
    bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.rotation_euler=(.5,-.55,-.5);sun.data.angle=.20
    bpy.ops.object.light_add(type='AREA',location=(-30,-35,55));area=bpy.context.object;area.data.shape='DISK';area.data.size=60;area.rotation_euler=(-area.location).to_track_quat('-Z','Y').to_euler()
    lights=[]
    for a in root['lightAnchors']:
        bpy.ops.object.light_add(type='POINT',location=(a['x'],a['y'],a['z']));o=bpy.context.object;o.data.color=(1,.65,.34);o.data.shadow_soft_size=1;lights.append(o)
    washes=[]
    for spec in root.get('financeEffects',{}).get('beams',[]):
        start=Vector(spec['from']);direction=Vector(spec['to'])-start
        bpy.ops.object.light_add(type='SPOT',location=start);o=bpy.context.object
        o.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();o.data.color=(1,.75,.45)
        o.data.spot_size=math.atan2(spec['radius'],direction.length)*3.4;o.data.spot_blend=.65;washes.append(o)
    for night in [False,True]:
        bg.inputs[0].default_value=(.055,.11,.24,1) if night else (.78,.85,.81,1);bg.inputs[1].default_value=.45 if night else .65
        sun.data.energy=.45 if night else 2.2;sun.data.color=(.37,.54,1) if night else (1,.88,.7)
        area.data.energy=1200 if night else 14000;area.data.color=(.38,.56,1) if night else (1,.95,.83)
        for light in lights:light.data.energy=140 if night else 0
        for light in washes:light.data.energy=850 if night else 0
        for mat in bpy.data.materials:
            if mat.name.startswith(('finance_window','finance_lamp')):
                bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(1,.57,.22,1);bs.inputs['Emission Strength'].default_value=(2.4 if mat.name.startswith('finance_lamp') else .9) if night else 0
        for node in root.children_recursive:
            if not node.get('financeHologram'):continue
            for child in node.children_recursive:
                if child.type!='MESH':continue
                for mat in child.data.materials:
                    bs=mat.node_tree.nodes.get('Principled BSDF')
                    bs.inputs['Emission Color'].default_value=bs.inputs['Base Color'].default_value
                    bs.inputs['Emission Strength'].default_value=1.9 if night else 0
                    bs.inputs['Alpha'].default_value=.62 if night else .36
        for view,pos in [('south',(48,-73,65)),('north',(-48,73,65))]:
            points=[o.matrix_world@Vector(c) for o in root.children_recursive if o.type=='MESH' for c in o.bound_box]
            target=Vector((0,0,max(p.z for p in points)/2))
            cam.location=target+Vector(pos);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
            rotation=cam.rotation_euler.to_matrix().transposed()
            projected=[rotation@(p-target) for p in points]
            width=max(p.x for p in projected)-min(p.x for p in projected);height=max(p.y for p in projected)-min(p.y for p in projected)
            cam.data.ortho_scale=max(width,height*1100/820)*1.14
            scene.render.filepath=str(OUT/f'level-{level}-{view}-{"night" if night else "day"}.png');bpy.ops.render.render(write_still=True)
            if not night and view=='south':
                scene.render.resolution_x=240;scene.render.resolution_y=180
                scene.render.filepath=str(OUT/f'level-{level}-thumbnail.png');bpy.ops.render.render(write_still=True)
                scene.render.resolution_x=1100;scene.render.resolution_y=820
    print('FINANCE_STUDY_RENDERED',level,flush=True)
