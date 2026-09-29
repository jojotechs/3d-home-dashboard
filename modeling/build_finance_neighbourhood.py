"""T09: two independent neighbourhood streets, in metres. Reuse the approved detail kit.
Run: bash modeling/run-blender.sh modeling/build_finance_neighbourhood.py
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from build_finance_levels import *


def rail(g,a,b,z,height=.9):
    length=math.dist(a,b);count=max(1,round(length/.38))
    for i in range(count+1):
        t=i/count;x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t
        g.rod((x,y,z),(x,y,z+height),.027,'finance_bronze',6)
    for zz in [z+.16,z+height]:g.rod((*a,zz),(*b,zz),.043,'finance_bronze',8)


def shopfront(g,w,sign,variant=0):
    # Full-height retail joinery and recessed entrance, all facing local -Y.
    g.box((0,.1,2.3),(w,.2,3.6),'wooddark')
    door=-w*.28 if variant%2 else 0
    for x in [-w*.31,0,w*.31]:
        framed_window(g,x,0,2.25,w*.28,2.9)
        for j in [-1,0,1]:
            g.box((x+j*.42,-.35,1.1),(.28,.14,.38),['pot','cream','roofred'][(variant+j)%3],bevel=.02)
    g.box((door,-.34,2),(1.25,.12,2.9),'finance_window')
    for x in [door-.68,door+.68]:g.box((x,-.43,2),(.075,.1,3),'finance_bronze')
    g.rod((door+.42,-.47,1.5),(door+.42,-.47,1.83),.025,'finance_bronze',8)
    g.box((0,-.14,4.22),(w,.26,.68),'finance_copper' if variant%2 else 'wooddark',bevel=.04)
    text_mesh(g,sign,(0,-.3,4.02),.40,'finance_sign')
    for x in [-w*.4,w*.4]:wall_lamp(g,x,0,3.9)
    return door


def hanging_sign(g,x,y):
    g.rod((x,y,4.8),(x,y-1.6,4.8),.055,'metal',8)
    g.rod((x,y,5.35),(x,y-1.5,4.8),.04,'metal',6)
    for yy in [y-.5,y-1.25]:g.rod((x,yy,4.8),(x,yy,4.4),.025,'finance_bronze',6)
    g.box((x,y-.85,4.04),(.18,1.3,.72),'finance_copper',bevel=.06)
    # Small badge, readable as a projecting sign from opposing directions.
    for xx in [x-.105,x+.105]:g.ball((xx,y-.85,4.04),(.025,.22,.22),'finance_sign',2)


def terrace_house(g,w,d,floors,sign,variant):
    top=4.9+(floors-1)*3.1
    body=['plaster2','finance_brick','finance_limestone','plaster','finance_bricklight'][variant%5]
    # Recessed shops below an upper floor supported by a real open colonnade.
    g.box((0,.8,2.6),(w,d-1.6,4.2),body,bevel=.04)
    g.box((0,0,(5+top)/2),(w,d,top-5),body,bevel=.04)
    g.box((0,0,4.88),(w+.2,d+.3,.28),'cream',bevel=.03)
    f=Geometry();shopfront(f,w-.65,sign,variant);transfer(g,f,0,-d/2+1.6)
    rear=Geometry()
    for x in [-w*.29,w*.29]:framed_window(rear,x,0,2.8,2,2.5)
    rear.box((0,-.12,1.9),(1.3,.2,2.7),'wooddark',bevel=.035)
    rear.box((0,-.24,2.4),(.95,.04,1.35),'finance_window')
    wall_lamp(rear,w*.42,0,3.8);transfer(g,rear,0,d/2,rot=math.pi)
    for x in [-w/2+.22,w/2-.22]:
        g.box((x,-d/2-.45,2.6),(.38,.45,4.2),'cream',bevel=.025)
        g.box((x,-d/2-.45,.72),(.59,.66,.36),'stone',bevel=.03)
        g.box((x,-d/2-.45,4.53),(.59,.66,.24),'cream',bevel=.03)
    hanging_sign(g,w*.38,-d/2)
    for storey in range(floors-1):
        z=6.6+storey*3.1
        for rot,x,y,span in [(0,0,-d/2,w),(math.pi,0,d/2,w),(math.pi/2,w/2,0,d),(-math.pi/2,-w/2,0,d)]:
            f=Geometry()
            for xx in [-span*.28,span*.28]:
                framed_window(f,xx,0,z,1.65,2.1)
                f.box((xx,0,z+1.18),(2,.35,.16),'cream',bevel=.02)
            transfer(g,f,x,y,rot=rot)
        if storey==0:
            g.box((0,-d/2-.82,z-1.22),(w-.8,1.6,.22),'cream',bevel=.035)
            rail(g,(-w/2+.5,-d/2-1.55),(w/2-.5,-d/2-1.55),z-1.1)
            for side in [-1,1]:rail(g,(side*(w/2-.5),-d/2-1.55),(side*(w/2-.5),-d/2),z-1.1)
            for xx in [-w*.25,w*.25]:
                g.box((xx,-d/2-1.42,z-.45),(1.4,.32,.32),'pot',bevel=.025)
                for j in [-1,0,1]:g.ball((xx+j*.4,-d/2-1.42,z-.2),(.3,.24,.22),'leaf2',2)
    cornice(g,w,d,top+.15)
    if variant%3==0:
        tiled_roof(g,0,0,top+.32,w+.5,d+.6,2.2,'roofteal',variant+50)
    elif variant%3==1:
        hipped_roof(g,w+.6,d+.6,top+.32,2.4,'roofred')
        for x in [-w*.25,w*.25]:
            g.box((x,-d*.42,top+1),(1.9,1.7,1.6),'cream')
            framed_window(g,x,-d*.42-.87,top+1,1.3,1.05)
            tiled_roof(g,x,-d*.42,top+1.84,2.2,2,.5,'roofteal',1)
    else:
        hipped_roof(g,w+.5,d+.5,top+.32,1.4)
        # Stepped Dutch gable, with a finial, differs from neighbouring ridges.
        for span,h in [(w*.85,.6),(w*.61,1.2),(w*.38,1.8),(w*.16,2.35)]:
            g.box((0,-d/2,top+h/2),(span,.38,h),'finance_brick',bevel=.025)
            g.box((0,-d/2,top+h),(span+.16,.5,.14),'cream')
    g.box((w*.27,d*.24,top+1.35),(.65,.7,2.2),'finance_brick')
    g.box((w*.27,d*.24,top+2.48),(.88,.9,.18),'cream')
    for x in [-w/2+.1,w/2-.1]:g.rod((x,d/2+.13,.6),(x,d/2+.13,top),.055,'finance_copper',6)


def bicycle(g,x,y,rot=0,cargo=False):
    b=Geometry();r=.34;z=.87
    for yy in [-.61,.61]:
        pts=[(0,yy+r*math.cos(i*TAU/24),z+r*math.sin(i*TAU/24)) for i in range(25)]
        line(b,pts,.04,'rubber',8)
        for k in range(12):
            a=k*TAU/12;b.rod((0,yy,z),(0,yy+r*math.cos(a),z+r*math.sin(a)),.009,'steel',5)
    for a,c in [((0,-.61,z),(0,-.22,1.5)),((0,-.61,z),(0,.1,z)),((0,.1,z),(0,-.22,1.5)),((0,-.22,1.5),(0,.45,1.47)),((0,.45,1.47),(0,.1,z)),((0,.45,1.47),(0,.61,z))]:b.rod(a,c,.035,'finance_copper',8)
    b.box((0,-.24,1.57),(.23,.31,.07),'wooddark',bevel=.025)
    b.rod((0,.45,1.47),(0,.41,1.67),.025,'steel',8);b.rod((-.28,.41,1.67),(.28,.41,1.67),.025,'steel',8)
    b.rod((0,.1,z),(.23,.04,.6),.022,'steel',6)
    if cargo:
        b.box((0,-.68,1.23),(.62,.65,.09),'metal')
        b.box((0,-.68,1.49),(.59,.62,.45),'woodlight',bevel=.025)
        b.box((0,-.68,1.72),(.08,.64,.025),'cream')
    transfer(g,b,x,y,rot=rot)


def flags(g,a,b,z):
    for x,y in [a,b]:
        g.rod((x,y,.51),(x,y,z+.18),.07,'metal',8)
        g.box((x,y,.63),(.3,.3,.24),'stone',bevel=.03)
    line(g,[(*a,z),((a[0]+b[0])/2,(a[1]+b[1])/2,z-.5),(*b,z)],.02,'metal',5)
    for i in range(1,12):
        t=i/12;x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t;h=z-math.sin(t*math.pi)*.5
        cloth=[(x-.33,y,h),(x+.33,y,h),(x,y-.07,h-.78)]
        g.mesh(cloth+[(xx,yy+.025,zz) for xx,yy,zz in cloth],[(0,1,2),(5,4,3),(0,3,4,1),(1,4,5,2),(2,5,3,0)],['roofred','finance_copper','canvas'][i%3])


def street(g):
    parcel(g,60,44,'lawn2');paving(g,0,0,57,41,8,z=.46)
    for x in [-27,27]:
        for y in [-16,17]:
            flower_box(g,x,y,2)
            street_tree(g,x,y,.75,abs(x+y))
    for x,y in [(-11,-16),(11,-16)]:
        street_bench(g,x,y);flower_box(g,x,y+1.3,3)
    for x,y in [(-26,-7),(26,-7),(-26,5),(26,5)]:
        g.rod((x,y,.5),(x,y,4.1),.075,'metal',8)
        g.cylinder((x,y,4.02),.28,.38,'finance_lamp',12)
        g.cylinder((x,y,4.26),.45,.14,'finance_copper',12,top=.2)
    # Patterned inset runs along the central pedestrian approach.
    for y in range(-20,1,2):g.box((0,y,.506),(1.8,.2,.013),'finance_copper')
    for x,y in [(-24,-15),(-22,-15),(23,-15)]:bicycle(g,x,y,cargo=x==23)


def level_three(g):
    street(g)
    for i,(x,floors,label) in enumerate([(-20,2,'BAKERY'),(-10,3,'BOOKS'),(0,2,'SAVINGS'),(10,3,'ATELIER'),(20,2,'TEA HOUSE')]):
        b=Geometry();terrace_house(b,9.6,10,floors,label,i);transfer(g,b,x,10)
    for x,label,roof in [(-19,'COFFEE','roofred'),(19,'DAILY GOODS','roofteal')]:
        b=Geometry();shop(b,9,6,label,'finance_bricklight',roof);transfer(g,b,x,-7)
    cafe_tables(g,[(-17,-14),(17,-14)])
    flags(g,(-24,-2),(24,-2),5.5)
    # Delivery locker sits beside the parked cargo bicycle, below the shop awning.
    g.box((25,-11,1.25),(1.1,.75,1.5),'finance_copper',bevel=.04)
    for z in [.9,1.5]:
        g.box((25,-11.4,z),(.94,.04,.48),'woodlight')
        g.box((25.25,-11.45,z),(.12,.035,.045),'finance_bronze')


def arch_rib(g,x,y,r,spring,depth=.5):
    # Voussoirs are extruded wedges: true openings, not arch decals on a solid wall.
    for i in range(18):
        a=i*math.pi/18+.008;b=(i+1)*math.pi/18-.008
        vs=[(x+rr*math.cos(t),yy,spring+rr*math.sin(t)) for yy in [y-depth/2,y+depth/2] for rr,t in [(r,a),(r,b),(r+.32,b),(r+.32,a)]]
        g.mesh(vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'cream')


def corner_house(g):
    w,d=12,13;top=15.2
    g.box((0,0,7.8),(w,d,14.6),'finance_brick',bevel=.10)
    for z in [.8,4.8,8.3,11.6,15.1]:cornice(g,w,d,z,depth=.5)
    def facade(f,span):
        shopfront(f,span-.9,'CORNER EMPORIUM',1)
        for z in [6.5,10,13.3]:
            for x in [-span*.3,0,span*.3]:
                arch_window(f,x,z-1,1.9,2.45)
                f.box((x,-.13,z),(1.62,.035,1.75),'finance_window')
                for xx in [-.52,0,.52]:f.box((x+xx,-.24,z),(.045,.08,1.76),'finance_bronze')
        # Masonry corner quoins and horizontal brick courses.
        for z in [1.1+i*.55 for i in range(25)]:
            for x in [-span/2+.22,span/2-.22]:f.box((x,-.12,z),(.52,.24,.26),'finance_bricklight')
        for z in [5.05+i*.45 for i in range(22)]:f.box((0,-.055,z),(span,.08,.028),'finance_bricklight')
    faces(g,w,d,facade)
    hipped_roof(g,w+.8,d+.8,top+.2,2.5,'roofblue')
    for rot,x,y in [(0,0,-d*.425),(math.pi,0,d*.43)]:
        b=Geometry();b.box((0,0,16),(3.4,2,1.6),'finance_brick');framed_window(b,0,-1,16,2.4,1.1)
        tiled_roof(b,0,0,16.85,3.8,2.6,.7,'roofteal',7);transfer(g,b,x,y,rot=rot)
    # Rounded copper corner turret is an architectural silhouette, below 20 m.
    g.cylinder((-5,-5,16),1.65,3.1,'finance_bricklight',12)
    for z in [14.5,17.45]:g.cylinder((-5,-5,z),1.82,.2,'cream',16)
    g.cylinder((-5,-5,18.25),2,1.5,'finance_copper',16,top=.15)
    g.rod((-5,-5,19),(-5,-5,19.65),.055,'finance_bronze',8)


def arcade(g):
    # Long glass barrel roof above an open, walkable shopping promenade.
    xmin,xmax=-13,25;yc=7;spring=7;r=5
    for x in [-13,-7,-1,5,11,17,23,25]:
        pts=[(x,yc+r*math.cos(i*math.pi/24),spring+r*math.sin(i*math.pi/24)) for i in range(25)]
        line(g,pts,.13,'finance_copper',8)
    for i in range(16):
        a=i*math.pi/16;b=(i+1)*math.pi/16
        for x in range(-13,25,6):
            g.mesh([(x,yc+r*math.cos(a),spring+r*math.sin(a)),(min(x+6,25),yc+r*math.cos(a),spring+r*math.sin(a)),(min(x+6,25),yc+r*math.cos(b),spring+r*math.sin(b)),(x,yc+r*math.cos(b),spring+r*math.sin(b))],[(0,1,2,3)],'glass_finance_mint')
    for yy in [2,12]:
        g.box((6,yy,6.7),(38,.5,.45),'finance_copper',bevel=.04)
        for x in [-13,-7,-1,5,11,17,23]:
            g.box((x,yy,2.65),(.56,.62,4.3),'finance_brick',bevel=.025)
            g.box((x,yy,.73),(.85,.9,.43),'cream',bevel=.04)
            g.box((x,yy,4.68),(.83,.9,.24),'cream',bevel=.025)
        for x in [-10,-4,2,8,14,20]:arch_rib(g,x,yy,2.7,4.5,.64)
    # North shop backs are independent solids; the passage in front is genuinely empty.
    for i,(x,sign) in enumerate([(-9,'FLORIST'),(-1.5,'BOOK GALLERY'),(6,'PATISSERIE'),(13.5,'JEWELLER'),(21,'TEA SALON')]):
        g.box((x,15,3.4),(7.3,5,5.8),'finance_limestone',bevel=.03)
        f=Geometry();shopfront(f,6.8,sign,i);transfer(g,f,x,12.5)
        for xx in [-2.3,2.3]:framed_window(g,x+xx,12.5,5.55,1.4,.8)
        b=Geometry();hipped_roof(b,7.6,5.5,6.4,1.1);transfer(g,b,x,15)
        # Opposite view retains framed windows, service doors and rear wall lights.
        back=Geometry();framed_window(back,0,0,3.1,3.6,2.7);wall_lamp(back,2.7,0,4.6);transfer(g,back,x,17.5,rot=math.pi)
    for x in [-10,-4,2,8,14,20]:
        g.rod((x,7,9.9),(x,7,6),.03,'finance_bronze',6)
        g.cylinder((x,7,5.9),.55,.22,'finance_copper',12,top=.22)
        g.ball((x,7,5.66),(.25,.25,.22),'finance_lamp',2)
    # End parapet and raised border railing accompany the vaulted frontage.
    for x in [-10,-4,8,14,20]:rail(g,(x-2,1.95),(x+2,1.95),7.15,.8)
    sign=Geometry();sign.box((0,-.12,5.45),(5.1,.35,.7),'finance_copper',bevel=.03)
    text_mesh(sign,'ARCADE',(0,-.33,5.24),.44,'finance_sign');transfer(g,sign,2,1.8)


def level_four(g):
    street(g)
    b=Geometry();corner_house(b);transfer(g,b,-20,8.5)
    arcade(g)
    b=Geometry();shop(b,10,7,'ARCADE CAFE','finance_limestone','roofred');transfer(g,b,20,-8)
    cafe_tables(g,[(-18,-10),(-13,-10),(18,-15),(23,-15)])
    for x in [-6,7]:
        flower_box(g,x,-7,3)
        # Window display island under a canopy, with open circulation on every side.
        g.box((x,-4,1.05),(2.5,1.25,1.1),'finance_copper',bevel=.055)
        for j in [-1,0,1]:g.ball((x+j*.65,-4,1.85),(.22,.28,.35),'pot' if j else 'finance_bronze',2)
        for side in [-1,1]:g.rod((x+side*1.4,-4,.51),(x+side*1.4,-4,3.5),.065,'finance_bronze',8)
        g.box((x,-4,3.55),(3.5,2,.2),'canvas',bevel=.07)
    flags(g,(-12,-2),(24,-2),5.5)
    g.box((26,-11,1.2),(1.2,.7,1.4),'finance_copper',bevel=.045)
    text_mesh(g,'COLLECT',(26,-11.4,1.45),.16,'finance_sign')


def build_neighbourhood(level):
    for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
    anchors=[(-20,2,3.4),(0,2,3.4),(20,2,3.4),(-19,-12,3.4)] if level==3 else [(2,7,5.5),(14,7,5.5),(-20,-.2,4.3),(20,-12,3.5)]
    root=empty(f'finance_level_{level}',None,districtId='finance',financeLevel=level,lightAnchors=[{'x':x,'y':y,'z':z,'power':32,'range':8} for x,y,z in anchors])
    g=Geometry();(level_three if level==3 else level_four)(g)
    g.emit(root,'neighbourhood_street' if level==3 else 'vaulted_arcade');bake_batches(root)
    for m in bpy.data.materials:
        if m.name.startswith('finance_glass'):
            bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Alpha'].default_value=.42;m.surface_render_method='DITHERED';m.use_transparency_overlap=False
    bpy.context.view_layer.update()
    out=ROOT/f'public/models/finance/level-{level}.glb'
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root]+list(root.children_recursive):o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_color_quantization=8)
    print('FINANCE_NEIGHBOURHOOD_BUILT',level,out.stat().st_size,flush=True)


if __name__=='__main__':
    for level in [3,4]:build_neighbourhood(level)
