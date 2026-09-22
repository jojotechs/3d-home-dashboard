"""Independent finance Lv.1–2, in metres; original city/finance assets stay untouched.

Run: bash modeling/run-blender.sh modeling/build_finance_levels.py
Each GLB owns architecture, lamps and independently movable customers. No texture cards.
"""
import sys, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'modeling'))
from refined_finance import *

PALETTE.update({'finance_window':'#558A90','finance_lamp':'#FFE4AA','finance_sign':'#FFEAC4'})
setup_materials()

def framed_window(g,x,y,z,w,h):
    window(g,x,y,z,w,h)
    # The inset pane is a physical lit surface, with the window's original frames retained.
    g.box((x,y-.272,z),(w-.16,.035,h-.14),'finance_window')
    for xx in [x-w/2,x,x+w/2]:g.box((xx,y-.31,z),(.09,.1,h+.1),'cream')
    g.box((x,y-.31,z),(w,.1,.09),'cream')

def flower_box(g,x,y,w=2.4):
    g.box((x,y,.72),(w,.65,.65),'stone',bevel=.07)
    g.box((x,y,1.06),(w-.12,.5,.04),'soil')
    for j in range(round(w/.48)):
        xx=x-w/2+.25+j*.48
        g.ball((xx,y,1.22),(.3,.32,.27),'leaf2',2)
        flowers(g,xx,y,1.18,.27,13+j)

def wall_lamp(g,x,y,z=3.2):
    g.box((x,y,z+.18),(.15,.18,.48),'metal',bevel=.02)
    g.rod((x,y-.1,z+.3),(x,y-.55,z+.3),.045,'metal',6)
    g.cylinder((x,y-.55,z+.24),.27,.18,'finance_copper',10,top=.12)
    g.ball((x,y-.55,z+.07),(.13,.13,.15),'finance_lamp',2)

def canopy(g,w,d,z,material='roofteal'):
    # Structural awning: sloping fabric panels, valance, posts, beams and diagonal braces.
    for x in [-w/2+.12,w/2-.12]:
        g.rod((x,-d,.48),(x,-d,z-.3),.065,'wood',8)
        g.rod((x,-d,z-1),(x,-d+.65,z-.23),.05,'wood',6)
    g.rod((-w/2,-d,z-.3),(w/2,-d,z-.3),.065,'wooddark',8)
    n=max(4,round(w/.5))
    for j in range(n):
        a=-w/2+j*w/n;b=a+w/n-.025;m='canvas' if j%2 else material
        g.mesh([(a,0,z),(b,0,z),(b,-d,z-.3),(a,-d,z-.3)],[(0,1,2,3)],m)
        g.box(((a+b)/2,-d,z-.45),(b-a,.06,.30),m,bevel=.015)

def shop(g,w,d,sign,body='finance_brick',roof='roofteal'):
    g.box((0,0,.63),(w+.5,d+.5,.35),'stone',bevel=.06)
    g.box((0,0,2.9),(w,d,4.3),body,bevel=.06)
    for z in [1.1,1.65,2.2,2.75,3.3,3.85,4.4]:
        for x in [-w/2+.22,w/2-.22]:
            for y in [-d/2-.06,d/2+.06]:g.box((x,y,z),(.5,.18,.36),'cream',bevel=.03)
    # Storefront: generous window displays flank a recessed glazed door.
    for x in [-w*.29,w*.29]:
        framed_window(g,x,-d/2,2.6,w*.30,2.65)
        for j in range(3):
            g.box((x-.6+j*.6,-d/2-.34,1.5),(.32,.22,.32),'pot' if j%2 else 'cream',bevel=.035)
    g.box((0,-d/2-.12,2.05),(1.52,.23,2.7),'wooddark',bevel=.04)
    g.box((0,-d/2-.25,2.48),(1.18,.03,1.6),'finance_window')
    g.rod((.48,-d/2-.34,1.5),(.48,-d/2-.34,1.86),.025,'finance_bronze',8)
    g.box((0,-d/2-.21,4.35),(w-.8,.3,.75),'finance_copper',bevel=.045)
    text_mesh(g,sign,(0,-d/2-.39,4.12),.46,'finance_sign')
    for x in [-w*.42,w*.42]:wall_lamp(g,x,-d/2,3.65)
    for rot,x,y,span in [(math.pi,0,d/2,w),(math.pi/2,w/2,0,d),(-math.pi/2,-w/2,0,d)]:
        f=Geometry()
        for xx in [-span*.25,span*.25]:framed_window(f,xx,0,2.9,1.7,2)
        transfer(g,f,x,y,rot=rot)
    for x in [-w/2-.12,w/2+.12]:
        g.rod((x,d/2,5.15),(x,d/2,.65),.075,'finance_copper',8)
        g.box((x,0,5.04),(.23,d+.4,.23),'cream',bevel=.02)
    cornice(g,w,d,4.95)
    tiled_roof(g,0,0,5.18,w+1,d+1,2.5,roof,81)
    # Chimney cap and metal flashing are full geometry.
    g.box((-w*.22,d*.28,6.85),(.65,.7,2.3),'finance_brick',bevel=.025)
    g.box((-w*.22,d*.28,8.05),(.85,.9,.2),'cream',bevel=.025)
    a=Geometry();canopy(a,w-1.2,1.65,3.92,'roofred' if roof=='roofteal' else 'roofteal');transfer(g,a,0,-d/2-.35)
    for x in [-w*.42,w*.42]:flower_box(g,x,-d/2-2.1,1.5)

def savings(g,w=10,d=9):
    g.box((0,0,.65),(w+.7,d+.7,.4),'stone',bevel=.08)
    g.box((0,0,3.4),(w,d,5.2),'finance_limestone',bevel=.06)
    for rot,x,y,span in [(0,0,-d/2,w),(math.pi,0,d/2,w),(math.pi/2,w/2,0,d),(-math.pi/2,-w/2,0,d)]:
        f=Geometry()
        for xx in [-span*.30,0,span*.30]:
            arch_window(f,xx,1.2,1.7,3.5)
            f.box((xx,-.095,2.6),(1.44,.02,2.65),'finance_window')
            f.box((xx,-.18,2.6),(.075,.13,2.65),'finance_bronze')
        transfer(g,f,x,y,rot=rot)
    for i in range(3):g.box((0,-d/2-.7-i*.38,.55+i*.13),(w*.68,1.7,.2),'cream',bevel=.03)
    for x in [-3.6,3.6]:
        g.cylinder((x,-d/2-.7,3.1),.22,4.7,'cream',12,top=.18)
        wall_lamp(g,x,-d/2,4.7)
    g.box((0,-d/2-.65,5.5),(w-.9,1.6,.32),'cream',bevel=.04)
    g.box((0,-d/2-.14,5.05),(5.8,.27,.67),'finance_copper',bevel=.03)
    text_mesh(g,'SAVINGS',(0,-d/2-.31,4.85),.46,'finance_sign')
    cornice(g,w,d,6.1);hipped_roof(g,w+.8,d+.8,6.35,1.9)
    # Standing seams, raised eaves and two stone flower planters.
    for x in [-w/2+.6,w/2-.6]:flower_box(g,x,-d/2-2,1.55)

def cafe_tables(g,centers,parasols=True):
    for j,(x,y) in enumerate(centers):
        g.cylinder((x,y,.85),.075,.82,'metal',8)
        g.cylinder((x,y,1.3),.68,.10,'woodlight',20)
        for sign in [-1,1]:
            c=Geometry();chair(c,0,0,rot=sign*math.pi/2);transfer(g,c,x+sign*.95,y,z=.48,scale=.40)
        g.cylinder((x+.24,y,1.43),.07,.17,'cream',10)
        if parasols and j%2==0:
            g.rod((x,y,.48),(x,y,3.35),.045,'wood',8)
            g.cylinder((x,y,3.05),1.72,.58,'canvas',12,top=.16)
            for k in range(8):
                a=k*TAU/8;g.rod((x,y,3.37),(x+math.cos(a)*1.64,y+math.sin(a)*1.64,2.79),.025,'woodlight',5)

def stall(g,x,y,seed):
    local=Geometry();canopy(local,4.7,2.4,3.4,'roofteal' if seed%2 else 'roofred')
    for yy in [-.2,-2.2]:
        local.box((0,yy,1),(3.9,.65,1.05),'wood',bevel=.04)
        for xx in [-1.5,-.9,-.3,.3,.9,1.5]:
            local.box((xx,yy,1.55),(.55,.62,.13),'woodlight',bevel=.025)
            for j in range(3):local.ball((xx+(j-1)*.13,yy,1.73),(.13,.16,.14),['orange','leaf2','roofred'][seed%3],2)
    for xx in [-1.5,1.5]:crate(local,xx,-.95,.5,.35,True)
    local.box((0,-2.46,2.61),(2.1,.08,.39),'finance_copper',bevel=.015)
    text_mesh(local,['FRUIT','FLOWERS','BAKERY'][seed%3],(0,-2.52,2.49),.24,'finance_sign')
    transfer(g,local,x,y)

def string_lights(g,a,b,height=4.1):
    for x,y in [a,b]:
        g.rod((x,y,.47),(x,y,height+.18),.07,'wood',8)
        g.box((x,y,.57),(.32,.32,.22),'stone',bevel=.035)
    pts=[]
    for i in range(17):
        t=i/16;x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t;z=height-.65*math.sin(math.pi*t)
        pts.append((x,y,z))
        if i%2:
            g.rod((x,y,z),(x,y,z-.13),.02,'metal',5)
            g.ball((x,y,z-.21),(.095,.095,.12),'finance_lamp',2)
    line(g,pts,.018,'metal',5)

def market(g):
    w,d=27,17;z=6.9
    g.box((0,0,.65),(w+.6,d+.6,.4),'stone',bevel=.08)
    g.box((0,0,3.45),(w,d,5.5),'plaster2',bevel=.05)
    for rot,x,y,span in [(0,0,-d/2,w),(math.pi,0,d/2,w),(math.pi/2,w/2,0,d),(-math.pi/2,-w/2,0,d)]:
        f=Geometry();n=round(span/3.3)
        for j in range(n):
            xx=-span/2+(j+.5)*span/n
            framed_window(f,xx,0,3.1,span/n-.5,3.7)
            f.box((xx-span/n*.46,-.18,3.6),(.22,.3,5.4),'wooddark',bevel=.025)
        f.box((0,-.13,5.55),(span,.28,.28),'woodlight')
        for xx in [-span*.32,span*.32]:wall_lamp(f,xx,0,5.5)
        transfer(g,f,x,y,rot=rot)
    # Two double doors and supported entrance canopy; the broad gable remains visible.
    for side in [-1,1]:
        for x in [-1.05,1.05]:
            g.box((x,side*(d/2+.33),2.5),(1.95,.13,3.6),'finance_window')
            g.box((x,side*(d/2+.44),2.5),(.07,.09,3.7),'finance_bronze')
        aw=Geometry();canopy(aw,9,2.1,4.85,'roofteal');transfer(g,aw,0,side*(d/2+.4),rot=0 if side==-1 else math.pi)
    cornice(g,w,d,6.4);tiled_roof(g,0,0,z,w+1.4,d+1.5,4.3,'roofred',64)
    # A glazed ridge lantern makes the market readable from its rear too.
    g.box((0,0,11.25),(3.1,10.5,.8),'finance_window')
    for y in [-5,-3,-1,1,3,5]:
        for x in [-1.6,1.6]:g.box((x,y,11.25),(.11,.12,.88),'cream')
    tiled_roof(g,0,0,11.7,3.8,11.2,.8,'roofteal',32)
    for side in [-1,1]:
        f=Geometry();f.box((0,-.15,6.3),(8,.33,.95),'finance_copper',bevel=.05)
        text_mesh(f,'NEIGHBOURHOOD MARKET',(0,-.34,6.06),.43,'finance_sign')
        # Gable vent/rose window and radial mullions.
        f.rod((0,0,8.65),(0,-.20,8.65),1.1,'cream',32)
        f.rod((0,-.21,8.65),(0,-.25,8.65),.91,'finance_window',32)
        for k in range(8):
            a=k*TAU/8;f.rod((0,-.3,8.65),(.88*math.cos(a),-.3,8.65+.88*math.sin(a)),.045,'woodlight',6)
        transfer(g,f,0,side*(d/2+.76),rot=0 if side==-1 else math.pi)

def streets(g,level):
    parcel(g,60,44,'lawn2')
    # A connected stone promenade, with narrow landscaped borders at the parcel edges.
    # One tiled surface avoids coplanar overlap at crossing paths.
    paving(g,0,0,56,40,5,z=.46)
    if level==1:
        g.box((0,8,.57),(15,18,.08),'lawn',bevel=.035)
        band(g,0,8,.64,5.1,5.1,1.25,'paver3',48)
        g.cylinder((0,8,.70),2.8,.22,'cream',40)
        g.cylinder((0,8,.83),2.55,.04,'soil',40)
        for j in range(12):
            a=j*TAU/12
            plants=Geometry();bush(plants,1.8*math.cos(a),8+1.8*math.sin(a),.45,j,True);transfer(g,plants,z=.87)
        for x,y,rot in [(-6.3,8,math.pi/2),(6.3,8,-math.pi/2)]:street_bench(g,x,y,rot)
    for x,y in [(-28,18),(28,18),(-28,-16),(28,-16),(-8,17),(24,3)]:
        g.box((x,y,.72),(2,2,.5),'cream',bevel=.08)
        street_tree(g,x,y,.83,abs(int(x+y)))
    for x,y in [(-23,-16),(-14,18),(14,18),(23,-17)]:flower_box(g,x,y,3)
    for x,y in [(-8,-17),(10,-17),(24,0)]:street_bench(g,x,y)
    for x,y in [(-26,-12),(26,-12),(-25,15),(25,15)]:
        g.rod((x,y,.5),(x,y,3.7),.07,'metal',8)
        g.cylinder((x,y,3.72),.43,.27,'finance_copper',12,top=.12)
        g.cylinder((x,y,3.49),.22,.30,'finance_lamp',12)
    # Low curbs demarcate planting without blocking the pedestrian entrances.
    for x,y,w in [(-18,17,13),(18,17,11),(-19,-15,12)]:
        g.box((x,y,.58),(w,.3,.24),'stone',bevel=.03)
    if level==1:
        cafe_tables(g,[(-19,-11),(-14,-11),(13,-10),(19,-10)])
        string_lights(g,(-23,-13),(-11,-13),3.9)
    else:
        for x,seed in [(-10,0),(-2,1),(6,2)]:stall(g,x,-9,seed)
        cafe_tables(g,[(18,-15),(23,-15)])
        string_lights(g,(-14,-13),(10,-13),4.5)
        string_lights(g,(-14,-5),(10,-5),4.5)

def customer(root,name,route,speed,color):
    o=empty(name,root,financeMotion='walk',route=route,speed=speed)
    g=Geometry();person(g,0,0,color,ground=.51);g.emit(o,name)
    o.location=(route[0][0],route[0][1],0)

def bake_batches(root):
    # Five material classes preserve PBR and separate all night emission from base colour.
    categories={}
    for name,rough,metal in [('matte',.76,0),('glass',.34,0),('metal',.46,.5),('window',.32,0),('lamp',.48,0)]:
        m=bpy.data.materials.new('finance_'+name);m.use_nodes=True
        bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
        v=m.node_tree.nodes.new('ShaderNodeVertexColor');v.layer_name='CityColor';m.node_tree.links.new(v.outputs['Color'],bs.inputs['Base Color'])
        if name in ['window','lamp']:
            bs.inputs['Emission Color'].default_value=(1,.57,.22,1);bs.inputs['Emission Strength'].default_value=0
        categories[name]=m
    for parent in [root]+[o for o in root.children if o.get('financeMotion')]:
        meshes=[o for o in parent.children if o.type=='MESH']
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:o.select_set(True)
        bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();ob=meshes[0];ob.name=parent.name+'_geometry'
        me=ob.data;old=list(me.materials);colors=me.color_attributes.new(name='CityColor',type='BYTE_COLOR',domain='CORNER');indices=[];used=[]
        for p in me.polygons:
            mat=old[p.material_index];bs=mat.node_tree.nodes.get('Principled BSDF')
            cat='window' if 'finance_window' in mat.name else 'lamp' if any(v in mat.name for v in ['finance_lamp','finance_sign']) else 'glass' if 'glass' in mat.name else 'metal' if mat.name in ['home_metal','home_steel'] else 'matte'
            if cat not in used:used.append(cat)
            indices.append(used.index(cat))
            for li in p.loop_indices:colors.data[li].color=bs.inputs['Base Color'].default_value
        me.materials.clear()
        for cat in used:me.materials.append(categories[cat])
        for p,idx in zip(me.polygons,indices):p.material_index=idx

def build(level):
    for o in list(bpy.data.objects):bpy.data.objects.remove(o,do_unlink=True)
    lamp_positions=[(-18,-9,3.2),(15,2,3.6),(-19,4,4)] if level==1 else [(-10,-11,3.1),(-2,-11,3.1),(21,-12,3.2)]
    root=empty(f'finance_level_{level}',None,districtId='finance',financeLevel=level,
        lightAnchors=[{'x':x,'y':y,'z':z,'power':32,'range':8} for x,y,z in lamp_positions])
    g=Geometry();streets(g,level)
    if level==1:
        b=Geometry();shop(b,12,8,'CORNER CAFE');transfer(g,b,-18,-3)
        b=Geometry();savings(b,10,8);transfer(g,b,-19,10)
        b=Geometry();shop(b,11,8,'CO-OP GOODS','plaster2','roofred');transfer(g,b,15,8)
        # An open garden court keeps this first stage sparse and human-scaled.
        court=Geometry();planted_court(court,14,-3,15,3,68);transfer(g,court,z=.3)
        for x,y in [(-20,-11),(18,-10),(-14,12)]:person(g,x,y,'roofred',ground=.52)
        customer(root,'corner_customer',[[-5,-15],[6,-15],[6,-7],[-5,-7]],.7,'blue')
        customer(root,'savings_customer',[[-11,3],[-11,15],[-8,15],[-8,3]],.65,'roofred')
    else:
        b=Geometry();market(b);transfer(g,b,2,7)
        b=Geometry();savings(b,10,12);transfer(g,b,-20,6)
        b=Geometry();shop(b,9,7,'COFFEE','finance_brick','roofteal');transfer(g,b,21,-7)
        for j,(x,y) in enumerate([(-10,-10),(-2,-10),(6,-10),(18,-15),(23,-15),(-20,-3)]):person(g,x,y,'roofred' if j%2 else 'blue',ground=.52)
        customer(root,'market_customer_a',[[-12,-16],[9,-16],[9,-14],[-12,-14]],.8,'blue')
        customer(root,'market_customer_b',[[-13,-4],[10,-4],[10,-7],[-13,-7]],.65,'roofred')
        customer(root,'market_customer_c',[[25,-1],[25,14],[23,14],[23,-1]],.7,'finance_copper')
    g.emit(root,'street_corner' if level==1 else 'market_node');bake_batches(root)
    bpy.context.view_layer.update()
    out=ROOT/f'public/models/finance/level-{level}.glb';out.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root]+list(root.children_recursive):o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_animations=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_color_quantization=8)
    print('FINANCE_LEVEL_BUILT',level,out.stat().st_size,flush=True)

for level in [1,2]:build(level)
