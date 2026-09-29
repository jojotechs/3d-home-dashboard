"""T11: preserve the approved prosperous meshes and build a distinct garden skyline."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from finance_urban_kit import *


def approved_prosperous(root):
    """Copy the delivered original meshes, without rebuilding, scaling or remeshing them."""
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/family-city.glb'))
    approved=[bpy.data.objects[f'finance_tower_{i}_level_3'] for i in range(6)]
    approved.append(bpy.data.objects['static_finance'])
    keep={root}
    for o in approved:
        o.parent=root
        o['preservedSource']='family-city.glb / v0.4 prosperous'
        keep.add(o);keep.update(o.children_recursive)
    for o in list(bpy.data.objects):
        if o not in keep:bpy.data.objects.remove(o,do_unlink=True)


def level_seven_additions(g):
    # Additive shop joinery, dressed-stone courses and lit windows around the old silhouettes.
    for x,y,w,d in [(-20,-10.1,14,10),(-2.4,-6.5,13,12),(20,-9.4,12,11),(-21,10.8,12,12),(-3,11.9,10,12)]:
        for rot,xx,yy,span in [(0,0,-d/2,w),(math.pi,0,d/2,w)]:
            f=Geometry()
            for z in [1.1,1.75,2.4,3.05]:
                f.box((0,-.06,z),(span-.5,.1,.027),'finance_sandstone')
            for px in [-span*.3,span*.3]:
                f.box((px,-.23,2.5),(1.1,.04,1.65),'finance_window')
                for dx in [-.59,.59]:f.box((px+dx,-.28,2.5),(.065,.08,1.85),'finance_bronze')
            transfer(g,f,x+xx,y+yy,rot=rot)
        for dx in [-w*.4,w*.4]:wall_lamp(g,x+dx,y-d/2,4)
    for x,y,w,d,rows in [(-21,10.8,12,12,[7]),(-21,10.8,10.5,10.5,[10,13,16,19,22]),(-3,11.9,10,12,[7,10,13,16,19,22,25,28,31])]:
        columns=[-w/2+(j+.5)*w/round(w/2.1) for j in range(round(w/2.1)) if j%2==0] if x==-21 else [-2.72,0,2.72]
        for xx in columns:
            for z in rows:g.box((x+xx,y-d/2-(.185 if x==-21 else .025),z),(.85,.025,1.35),'finance_window')
        g.box((x,y-d/2-.1,5),(w,.14,.09),'finance_lamp')
    for z,r in [(7,7.2),(13,6.4),(19,6.4)]:
        for j in range(8):
            a=j*TAU/8
            g.box((19+(r+.07)*math.cos(a),10.6+(r+.07)*math.sin(a),z),(.85,.05,1.35),'finance_window',rot=a+math.pi/2)
    # Precious-metal framed vestibule and illuminated portal on the established bank entrance.
    for x in [-22,-18]:g.rod((x,-17.5,.7),(x,-17.5,4),.055,'finance_bronze',8)
    g.box((-20,-16.4,4.05),(5,2.6,.14),'glass_finance_mint')
    digital_sign(g,-2.4,-12.62,5.4,8,'GROWTH / CITY GALLERY')
    for x,y in [(-12,3.4),(11,6),(26,1)]:
        g.cylinder((x,y,1.1),.35,1.1,'finance_copper',12)
        g.ball((x,y,1.75),(.19,.19,.18),'finance_lamp',2)
    for x,y in [(-15,18),(5,18)]:
        street_bench(g,x,y);flower_box(g,x,y+1,2.7)
    bicycle(g,26,-18);bicycle(g,-25,19)


def garden_tower(g,w,d,tiers,label):
    stone_base(g,w,d,5,label)
    bottom=5
    for i,(width,depth,top,dx,dy) in enumerate(tiers):
        b=Geometry();curtain_block(b,width,depth,bottom,top,'glass_finance_mint' if i%2 else 'glass_finance_ink','cream')
        for xx in [-width/2+.4,width/2-.4]:b.box((xx,-depth/2-.2,(bottom+top)/2),(.2,.32,top-bottom),'finance_bronze')
        transfer(g,b,dx,dy)
        next_front=tiers[i+1][4]-tiers[i+1][1]/2 if i+1<len(tiers) else dy+depth/2-2.5
        front=dy-depth/2
        if next_front-front>2:terrace(g,dx,(front+next_front)/2,top+.18,width,next_front-front-.3,True)
        bottom=top
    last=tiers[-1];roof_services(g,last[3],last[4],last[2]+.2,3.5,2.5)


def level_eight(g):
    civic_ground(g)
    b=Geometry();garden_tower(b,19,17,[(19,17,16,0,0),(15,12,30,-1,2.5),(10,8,43,-2,4.5),(6,5,50,-2,5.5)],'AURORA HOUSE');transfer(g,b,-17,7)
    b=Geometry();garden_tower(b,18,16,[(18,16,13,0,0),(13,12,24,1,2),(9,8,35,2,4)],'SKY GARDENS');transfer(g,b,16,9)
    # Boutique pavilion around a generous pedestrian square, with a faceted copper lantern.
    b=Geometry();stone_base(b,13,7,5,'ATELIER');curtain_block(b,11,6,5,9,'glass_finance_teal');hipped_roof(b,12,7,9.2,2.2);transfer(g,b,-17,-10)
    # Broad reflecting pool with individually modeled water steps and offset islands.
    g.box((12,-9,.73),(15,8,.44),'cream',bevel=.22)
    g.box((12,-9,.98),(14.4,7.4,.07),'water',bevel=.2)
    for x,y,r in [(7,-8,1.25),(16,-10,1.65)]:
        g.cylinder((x,y,1.15),r,.3,'finance_copper',24)
        g.cylinder((x,y,1.8),r*.55,1,'cream',24)
        band(g,x,y,2.31,r*.55,r*.55,.12,'finance_lamp',24)
        for j in range(8):
            a=j*TAU/8;line(g,[(x+r*.4*math.cos(a),y+r*.4*math.sin(a),2.3),(x+r*.8*math.cos(a),y+r*.8*math.sin(a),1.8),(x+r*1.2*math.cos(a),y+r*1.2*math.sin(a),1)],.025,'water',5)
    # Transparent canopy marks the open central promenade, with slim structural branching.
    for y in [-3,2,7]:
        for x in [-3,3]:
            g.rod((x,y,.52),(x,y,5.2),.07,'finance_bronze',8)
            g.rod((x,y,3.8),(x*.45,y,5.9),.055,'finance_bronze',8)
        g.box((0,y,5.95),(7,4.7,.12),'glass_finance_mint')
    # The promenade's browsing stop faces an actual original sculpture and caption.
    g.cylinder((0,11,1.05),1.1,1.05,'cream',24)
    g.mesh([(0,11,3.8),(0,11,1.55),(-.9,11,2.7),(.9,11,2.7),(0,10.4,2.7),(0,11.6,2.7)],
        [(0,2,4),(0,4,3),(0,3,5),(0,5,2),(1,4,2),(1,3,4),(1,5,3),(1,2,5)],'finance_bronze')
    text_mesh(g,'CITY ARTS',(0,9.89,1.12),.23,'finance_copper')
    cafe_tables(g,[(-17,-17),(-22,-17)])
    street_bench(g,12,-15);street_bench(g,23,-8,math.pi/2)
    digital_sign(g,16,.8,6,9,'AURORA / EXHIBITIONS')
    for x,y in [(-6,-14),(3,-15),(26,-1)]:flower_box(g,x,y,2)
    # Facade wash fixtures and ornamental light strips; the beam effects join this owned root.
    for x,y in [(-25,-2),(-10,-2),(10,.6),(23,.6)]:
        g.cylinder((x,y,.7),.25,.3,'metal',12)
        g.ball((x,y,.88),(.15,.15,.07),'finance_lamp',2)


def build_landmark(level):
    root=level_root(level,[(-20,-16,4),(-2,-13,4),(20,-16,4),(10,2,4)])
    if level==7:approved_prosperous(root)
    root['financeEffects']={'beams':[
        {'from':[x,y,.88],'to':[x,y+1,z],'radius':1.25,'color':'#ffe0ab'}
        for x,y,z in ([(-25,4,18),(-17,4,18),(17,2.5,22),(21,2.5,22)] if level==7 else [(-25,-2,15),(-10,-2,15),(10,.6,12),(23,.6,12)])]}
    # Bake only new parts, retaining the six imported meshes and their original materials.
    additions=empty('landmark_additions',root)
    g=Geometry();(level_seven_additions if level==7 else level_eight)(g);g.emit(additions,'landmark_details');bake_batches(additions)
    for child in list(additions.children):child.parent=root
    bpy.data.objects.remove(additions,do_unlink=True)
    export_level(root,level)


if __name__=='__main__':
    for level in [7,8]:build_landmark(level)
