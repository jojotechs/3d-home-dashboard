"""Metre-scale commercial architecture shared by the regional and landmark streets."""
from build_finance_neighbourhood import *


def curtain_block(g,w,d,bottom,top,tint='glass_finance_teal',stone='finance_limestone'):
    glazed_box(g,w,d,bottom,top,tint,'finance_bronze',1.7)
    def facade(f,span):
        count=max(3,round(span/1.7))
        for row,z in enumerate(range(math.ceil(bottom+1.6),math.floor(top-1),3)):
            for col in range(count):
                x=-span/2+(col+.5)*span/count
                if (col+row*3)%5 in [0,2]:
                    f.box((x,-.12,z),(span/count-.22,.035,1.55),'finance_window')
            f.box((0,-.11,z-1.1),(span,.2,.24),stone)
        for x in [-span/2,span/2]:f.box((x,-.15,(bottom+top)/2),(.27,.32,top-bottom),stone)
    faces(g,w,d,facade)
    cornice(g,w,d,top,stone,.55)


def stone_base(g,w,d,top=4.8,label='CITY HOUSE'):
    g.box((0,0,(top+.5)/2),(w,d,top-.5),'finance_limestone',bevel=.06)
    def facade(f,span):
        for z in [1,1.7,2.4,3.1,3.8]:
            f.box((0,-.045,z),(span,.07,.022),'finance_sandstone')
            for x in range(-math.floor(span/2)+1,math.floor(span/2),2):
                f.box((x+(z%1)*.4,-.06,z+.34),(.022,.04,.65),'finance_sandstone')
        shopfront(f,span-.6,label)
    faces(g,w,d,facade);cornice(g,w,d,top)
    # Double entrance with mullions and an actual supported glass rain canopy.
    for x in [-w*.35,w*.35]:g.rod((x,-d/2-1.5,.52),(x,-d/2-1.5,3.9),.075,'finance_bronze',8)
    g.box((0,-d/2-.9,4),(w*.83,2,.16),'glass_finance_mint')
    for x in [-w*.35,0,w*.35]:g.rod((x,-d/2,4.07),(x,-d/2-1.9,4.07),.06,'finance_bronze',8)


def roof_services(g,x,y,z,w=4,d=3):
    g.box((x,y,z+.6),(w,d,1.2),'finance_copper',bevel=.08)
    for xx in [-w*.24,w*.24]:
        g.cylinder((x+xx,y,z+1.23),min(.65,w*.14),.15,'metal',16)
        for j in range(4):g.rod((x+xx-.4,y-.3+j*.2,z+1.33),(x+xx+.4,y-.3+j*.2,z+1.33),.018,'steel',5)
    for i in range(7):g.box((x,y-d/2-.04,z+.2+i*.12),(w-.3,.08,.035),'steel')
    g.rod((x+w/2+.3,y,z),(x+w/2+.3,y,z+1.8),.1,'steel',8)
    g.rod((x+w/2+.3,y,z+1.8),(x+w/2+.8,y,z+1.8),.1,'steel',8)


def terrace(g,x,y,z,w,d,lounge=False):
    g.box((x,y,z),(w,d,.22),'paver3',bevel=.035)
    for yy in [y-d/2+.3,y+d/2-.3]:
        rail(g,(x-w/2,yy),(x+w/2,yy),z+.13)
    roof_garden(g,x,y+d/2-.55,z+.12,w-.5,.7)
    if lounge:
        # Metre-scaled roof chairs, table and pergola outside the upper footprint.
        for xx in [x-1.1,x+1.1]:
            c=Geometry();chair(c,0,0);transfer(g,c,xx,y-.2,z=z,scale=.4)
        g.cylinder((x,y-.1,z+.65),.5,.09,'woodlight',16)
        g.rod((x,y-.1,z),(x,y-.1,z+.62),.055,'metal',8)
        for xx in [x-w/2+.2,x+w/2-.2]:
            for yy in [y-d/2+.2,y+d/2-.2]:g.rod((xx,yy,z),(xx,yy,z+2.7),.065,'finance_bronze',8)
        for i in range(max(4,round(w/.5))):g.box((x-w/2+i*.5,y,z+2.7),(.14,d+.3,.17),'woodlight')


def fountain(g,x,y,r=3):
    g.cylinder((x,y,.72),r,.42,'cream',48)
    g.cylinder((x,y,.95),r-.28,.08,'water',48)
    band(g,x,y,.97,r-.12,r-.12,.1,'finance_bronze',48)
    g.cylinder((x,y,1.15),.44,.42,'finance_copper',16)
    for j in range(10):
        a=j*TAU/10
        line(g,[(x,y,1.38),(x+.7*math.cos(a),y+.7*math.sin(a),2.5),(x+(r-.6)*math.cos(a),y+(r-.6)*math.sin(a),1.0)],.032,'water',6)
    for j in range(8):
        a=j*TAU/8;g.ball((x+(r-.18)*math.cos(a),y+(r-.18)*math.sin(a),1),(.085,.085,.035),'finance_lamp',1)


def bus_shelter(g,x,y):
    b=Geometry()
    for xx in [-2.6,2.6]:
        b.rod((xx,.6,.5),(xx,.6,3.2),.075,'metal',8)
        b.box((xx,0,1.85),(.08,1.6,2.55),'glass_finance_mint')
    b.box((0,.8,1.85),(5.2,.08,2.55),'glass_finance_mint')
    b.box((0,0,3.25),(5.8,2.2,.18),'finance_copper',bevel=.04)
    b.box((0,-.9,3.13),(4.8,.12,.07),'finance_lamp')
    street_bench(b,0,.25);b.box((3.2,0,2.3),(.5,.14,1.5),'cream')
    b.rod((3.2,0,.5),(3.2,0,3.1),.045,'metal',6)
    text_mesh(b,'CITY BUS',(0,-1.12,3.34),.3,'finance_sign');transfer(g,b,x,y)


def digital_sign(g,x,y,z,w=6,label='CITY / CULTURE'):
    # Original decorative information: never a market-data or advertising integration.
    g.box((x,y,z),(w,.36,1.3),'metal',bevel=.08)
    g.box((x,y-.2,z),(w-.18,.04,1.1),'glass_finance_ink')
    text_mesh(g,label,(x,y-.24,z-.14),.28,'finance_sign')
    for i in range(12):
        g.box((x-w/2+.3+i*(w-.6)/12,y-.24,z-.4),(.19,.045,.08),'finance_lamp')


def civic_ground(g):
    parcel(g,60,44,'lawn2');paving(g,0,0,57,41,19,z=.46)
    for x in [-28,28]:
        for y in [-17,2,18]:
            flower_box(g,x,y,1.7);street_tree(g,x,y,.62,abs(x+y))
    for x in [-27,27]:
        for y in [-12,10]:
            g.rod((x,y,.5),(x,y,4.2),.06,'metal',8)
            g.box((x,y,4.2),(.6,.6,.16),'finance_copper',bevel=.04)
            g.box((x,y,4.08),(.4,.4,.12),'finance_lamp')
    for x in [-24,-22,24]:bicycle(g,x,-18)


def export_level(root,level):
    bpy.context.view_layer.update()
    out=ROOT/f'public/models/finance/level-{level}.glb'
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root]+list(root.children_recursive):o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_color_quantization=8)
    print('FINANCE_URBAN_BUILT',level,out.stat().st_size,flush=True)


def level_root(level,anchors):
    for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
    return empty(f'finance_level_{level}',None,districtId='finance',financeLevel=level,
        lightAnchors=[{'x':x,'y':y,'z':z,'power':38,'range':9} for x,y,z in anchors])
