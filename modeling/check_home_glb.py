import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'exports/home-art-study.blend'))
home=bpy.data.objects['district_home']
def erase(o):
 for child in list(o.children):erase(child)
 bpy.data.objects.remove(o,do_unlink=True)
erase(home)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'exports/district_home.glb'))
s=bpy.context.scene;s.render.resolution_percentage=65;s.cycles.samples=20;s.render.filepath=str(ROOT/'renders/home-glb-check.png');bpy.ops.render.render(write_still=True)
