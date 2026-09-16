"""Review the new island, its bridge, station and both mountain tunnels."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'exports/family-city.blend'))
scene=bpy.context.scene;cam=scene.camera
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1680;scene.render.resolution_y=1120;scene.render.resolution_percentage=100
def visible(o,on):
 o.hide_render=not on
 for c in o.children:visible(c,on)
for o in bpy.data.objects:
 if o.get('kind')=='level':visible(o,o.get('minLevel',1)<=3<=o.get('maxLevel',99))
 elif o.get('kind')=='growth':visible(o,o['slot']<8)
 elif o.get('kind')=='rubbish':visible(o,o['slot']<3)
 elif o.get('kind')=='carPacked':visible(o,False)
views={
 'city':((278,-430,400),(78,-10,2),580),
 'airport':((337,-248,143),(237,-103,3),211),
 'rail':((90,-72,145),(14,107,2),354),
 'tunnel-west':((-72,167,44),(-132,111,4),77),
 'tunnel-east':((86,167,44),(149,111,4),77),
}
selected=sys.argv[sys.argv.index('--view')+1] if '--view' in sys.argv else None
for name,(pos,target,scale) in views.items():
 if selected and name!=selected:continue
 cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale
 scene.render.filepath=str(ROOT/f'renders/v5-{name}.png');bpy.ops.render.render(write_still=True);print('TRAVEL_STUDY_DONE',name,flush=True)
print('TRAVEL_STUDIES_COMPLETE',flush=True)
