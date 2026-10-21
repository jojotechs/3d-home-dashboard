"""Authored, metre-scale daisy stages, independent ready basket and neutral plot signs.

Run: bash modeling/run-blender.sh modeling/build_habit_farm.py
The approved city's static farm is retained. This additive asset replaces only
the meaning of the old species signs; CityScene hides dynamic_habits permanently.
"""
import sys, json, math, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'modeling'))
from refined_shared import Geometry, empty, setup_materials, PALETTE, MATERIALS, line, text_mesh
import bpy

PLOTS=[(-14,12),(14,12),(-14,-8),(14,-8),(-14,-29),(14,-29)]
PALETTE.update({'habit_petal':'#FFFCED','habit_petal_shade':'#F0E9CE','habit_pollen':'#EEC44B',
 'habit_leaf':'#74A740','habit_leaf_light':'#9BCB5B','habit_stem':'#3E793D',
 'habit_soil':'#6D563B','habit_soil_light':'#9A7952','habit_ribbon':'#E59A81',
 'habit_sign':'#4C766A','habit_basket':'#C89150','habit_basket_dark':'#9B683D'})

def leaf(g,x,y,z,angle,size=.24):
    # A folded lanceolate leaf has real thickness and a contrasting central vein.
    c,s=math.cos(angle),math.sin(angle)
    def p(u,v,h):return (x+u*c-v*s,y+u*s+v*c,z+h)
    verts=[p(0,0,0),p(size*.55,size*.28,.04),p(size,0,.12),p(size*.55,-size*.28,.04),p(size*.5,0,.08),p(size*.5,0,.025)]
    g.mesh(verts,[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(0,5,1),(1,5,2),(2,5,3),(3,5,0)],'habit_leaf')
    g.rod(p(0,0,.01),p(size*.91,0,.105),.009,'habit_leaf_light',5)

def bloom(g,x,y,z,r=.24,open_amount=1,phase=0):
    # Ten individual cupped petals, yellow raised disk and visible pollen details.
    for j in range(10):
        a=phase+j*math.tau/10;c,s=math.cos(a),math.sin(a)
        rr=r*open_amount
        verts=[]
        for u,v,h in [(0,-.025,0),(.55,-.22,.04),(1,-.12,.03),(1.06,0,0),(1,.12,.03),(.55,.22,.04),(0,.025,0),(.5,0,.095)]:
            verts.append((x+c*(.045+u*rr)-s*v*r,y+s*(.045+u*rr)+c*v*r,z+h*r+(1-open_amount)*u*r))
        g.mesh(verts,[(7,0,1),(7,1,2),(7,2,3),(7,3,4),(7,4,5),(7,5,6),(7,6,0)],'habit_petal' if j%3 else 'habit_petal_shade')
    g.ball((x,y,z+.035),(.10,.10,.065),'habit_pollen',1)
    for j in range(3):
        a=j*2.4;rr=.022+j*.007
        g.ball((x+math.cos(a)*rr,y+math.sin(a)*rr,z+.09),(.017,.017,.014),'yellow',1)

def plant(g,x,y,stage,seed):
    ground=.79
    if stage==0:
        g.ball((x,y,.78),(.18,.17,.075),'habit_soil_light',1)
        g.rod((x,y,ground),(x,y,ground+.12),.018,'habit_stem',5)
        for j in range(2):leaf(g,x,y,ground+.07,j*math.pi+seed,.17)
        return
    for j in range(3):
        a=seed+j*2.4;xx=x+math.cos(a)*.17;yy=y+math.sin(a)*.17
        h=(.38+j*.11) if stage==1 else (.73+j*.15)
        tx=xx+math.cos(a)*.12;ty=yy+math.sin(a)*.12
        line(g,[(xx,yy,ground),(xx,yy,ground+h*.48),(tx,ty,ground+h)],.022,'habit_stem',6)
        for k in range(2 if stage==1 else 3):leaf(g,xx,yy,ground+.15+k*.15,a+k*2.2,.27 if stage==1 else .32)
        if stage==2:
            if j%2==0:bloom(g,tx,ty,ground+h,.20,.62,a)
            else:g.ball((tx,ty,ground+h),(.085,.085,.13),'habit_petal',1)

def stage_geometry(stage):
    g=Geometry()
    # Three narrow planted ribbons on each side leave a 1.8 m central approach.
    for x in [-6.4,-3.2,3.2,6.4]:
        g.box((x,0,.75),(1.8,11,.16),'habit_soil',bevel=.06)
        for y in [-4.8,-3.2,-1.6,0,1.6,3.2,4.8]:
            if x>5 and y<-3:continue  # Keep the basket forecourt clear.
            for offset in [-.38,.38]:plant(g,x+offset,y,stage,int((x+9)*7+y*2+offset*10))
    # Flat stones connect the existing four-metre gate to the planting area.
    for j in range(8):g.box((0,-6.7+j*1.75,.69),(1.35,1.24,.14),'paver2' if j%2 else 'paver',bevel=.065)
    # The active plaque covers the neutral numeric plate, never stores habit text.
    g.box((-5,-8.57,2.1),(3.88,.14,1.32),'habit_sign',bevel=.055)
    text_mesh(g,f'DAISY  {stage}/3',(-5,-8.66,1.94),.37,'cream')
    for i in range(3):g.cylinder((-6.0+i*.42,-8.47,2.92),.12,.07,'habit_pollen' if i<stage else 'wooddark',12)
    return g

def basket_geometry():
    g=Geometry();x,y=7.2,-5.5
    # One bounded wicker basket represents all ready bunches; quantity stays in UI.
    g.box((x,y,.76),(2.8,2.05,.22),'wooddark',bevel=.10)
    for j in range(7):
        z=.91+j*.13
        for yy in [-1,1]:g.box((x,y+yy*.93,z),(2.75,.09,.075),'habit_basket' if j%2 else 'habit_basket_dark',bevel=.015)
        for xx in [-1,1]:g.box((x+xx*1.34,y,z),(.09,1.93,.075),'habit_basket' if j%2 else 'habit_basket_dark',bevel=.015)
    for side in [-1,1]:
        for i in range(10):g.rod((x-1.2+i*.267,y+side*.94,.85),(x-1.2+i*.267,y+side*.94,1.78),.024,'habit_basket_dark',5)
    for side in [-1,1]:
        pts=[(x+side*1.3,y+math.cos(j*math.pi/16)*.9,1.75+math.sin(j*math.pi/16)*.70) for j in range(17)]
        line(g,pts,.055,'habit_basket_dark',7)
    for i in range(16):
        a=i*2.4;rr=.20+math.sqrt(i/16)*.82;xx=x+math.cos(a)*rr;yy=y+math.sin(a)*rr*.68;z=1.95+(i%4)*.13
        g.rod((x,y,1.0),(xx,yy,z),.025,'habit_stem',6)
        leaf(g,xx,yy,z-.34,a,.32);bloom(g,xx,yy,z,.30,1,a)
    g.box((x,y-1.03,1.25),(1.04,.10,.65),'habit_sign',bevel=.045)
    text_mesh(g,'READY',(x,y-1.10,1.13),.24,'cream')
    for side in [-1,1]:g.ball((x+side*.2,y-1.1,1.72),(.22,.07,.10),'habit_ribbon',2,rot=side*.4)
    return g

def build():
    bpy.ops.wm.read_factory_settings(use_empty=True);setup_materials()
    for key,mat in MATERIALS.items():
        mat.name='habit_'+key.removeprefix('habit_')
        mat.use_backface_culling=False
    root=empty('habit_farm_asset',None,districtId='habits',assetVersion=1,units='metres')
    neutral=empty('habit_neutral_signs',root,habitRole='neutral')
    g=Geometry()
    for i,(x,y) in enumerate(PLOTS):
        g.box((x-5,y-8.38,2.1),(3.88,.24,1.32),'wooddark',bevel=.055)
        g.box((x-5,y-8.515,2.1),(3.57,.035,1.04),'habit_sign',bevel=.04)
        text_mesh(g,f'{i+1:02}',(x-5,y-8.55,1.92),.49,'cream')
    g.emit(neutral,'neutral_plot_sign')
    plot=empty('habit_selected_plot',root,habitRole='plot',plotIndex=0)
    plot.location=(-14,12,0)
    for stage in range(3):
        node=empty(f'habit_daisy_stage_{stage}',plot,habitRole='current',speciesId='daisy',growth=stage)
        stage_geometry(stage).emit(node,f'daisy_stage_{stage}')
    ready=empty('habit_daisy_ready',plot,habitRole='ready',speciesId='daisy',boundedRepresentation=True)
    basket_geometry().emit(ready,'daisy_ready')
    bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
    path=ROOT/'public/models/habits/daisy.glb';path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,export_extras=True,
        export_materials='EXPORT',export_cameras=False,export_lights=False)
    print('HABIT_FARM_BUILT',path.stat().st_size,hashlib.sha256(path.read_bytes()).hexdigest(),flush=True)

if __name__=='__main__':build()
