"""Dense, mixed street walls for Lv.8–10; geometry and matching public entrances."""
from finance_urban_kit import *

for key,colour in [('metro_jade','#61d6ca'),('metro_coral','#f69887'),('metro_gold','#efc880')]:
    mat=MATERIALS['glass_finance_mint'].copy();mat.name=key
    rgb=[int(colour[i:i+2],16)/255 for i in (1,3,5)]
    linear=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*linear,1)
    MATERIALS[key]=mat

# Shared layout keeps physical shop doors and activity destinations on the same frontage.
FRONT_X=[-22.8,-15.3,-7.8,7.8,15.3,22.8]
FRONT_LABELS=['BOOKS','ATELIER','CAFE','MAISON','FLORA','CITY TEA']
FRONT_HEIGHTS={8:[18,29,22,25,19,31],9:[25,35,28,32,24,37],10:[32,42,35,39,31,44]}
FRONT_STYLES=[0,1,2,1,2,0]


def setback_profile(w,d):
    """Width, depth and centre offset shared by the upper body and attached signs."""
    return w-1.3,d-3,1.5


def street_block(g,w,d,height,label,style):
    """Three architectural families: masonry piers, terraced glass and copper mansard."""
    stone_base(g,w,d,5,label)
    if style==0:
        curtain_block(g,w-.25,d-.25,5,height-2,'glass_finance_ink','finance_limestone')
        def piers(f,span):
            for x in [-span*.4,0,span*.4]:
                f.box((x,-.28,(height+3)/2),(.32,.4,height-7),'finance_limestone')
                f.box((x,-.4,height-2),(.54,.65,.4),'finance_bronze')
        faces(g,w,d,piers)
        g.box((0,0,height-1),(w-.8,d-.8,2),'cream',bevel=.08)
        roof_garden(g,0,d*.28,height,w-1.2,1.3)
        roof_services(g,0,0,height,2.4,1.7)
    elif style==1:
        curtain_block(g,w,d,5,height-9,'glass_finance_teal')
        upper_w,upper_d,offset=setback_profile(w,d)
        upper=Geometry();curtain_block(upper,upper_w,upper_d,height-9,height,'glass_finance_mint','cream');transfer(g,upper,0,offset)
        terrace(g,0,-d/2+1.2,height-8.85,w,2.1,True)
        for x in [-w/2+.35,w/2-.35]:
            g.box((x,-d/2-.3,(height-4)/2),(.16,.26,height-14),'finance_bronze')
        roof_garden(g,0,d/2-.6,height+.2,w-1.4,.8)
        roof_services(g,0,1,height+.2,2.4,1.7)
    else:
        curtain_block(g,w,d,5,height-3,'glass_finance_ink','finance_bricklight')
        hipped_roof(g,w+.1,d+.1,height-2.8,2.8)
        for x in [-w*.24,w*.24]:
            g.box((x,-d*.38,height-1.75),(1.6,1.8,1.7),'cream')
            framed_window(g,x,-d*.38-.9,height-1.6,1.1,1.2)
            g.box((x,-d*.38,height-.83),(1.8,2,.16),'finance_copper')
        for z in range(8,int(height-3),6):
            g.box((0,-d/2-.35,z),(w,.55,.18),'cream')
            for x in [-w*.27,w*.27]:
                g.box((x,-d/2-.43,z+.28),(1.35,.3,.3),'pot')
                g.ball((x,-d/2-.43,z+.52),(.7,.32,.32),'leaf2',2)
    hanging_sign(g,w*.38,-d/2)
    # Side blade signs have short brackets fixed into the upper wall, including setbacks.
    for side in [-1,1]:
        for z in [height-7.7,height-2.2]:
            g.rod((side*(w/2-1),2,z),(side*(w/2+.18),2,z),.055,'finance_bronze',8)
        g.rod((side*(w/2+.1),2,height-7.7),(side*(w/2+.1),2,height-2.2),.055,'finance_bronze',8)


def metropolitan_frontage(g,level):
    depth=level+2
    for i,(x,label,height) in enumerate(zip(FRONT_X,FRONT_LABELS,FRONT_HEIGHTS[level])):
        b=Geometry();street_block(b,7,depth,height,label,FRONT_STYLES[i]);transfer(g,b,x,-10)
    # Warm street-level activity, kept to the edges of the 6 m central promenade.
    cafe_tables(g,[(-3,-12),(3,-7)],parasols=False)
    for x in [-3.7,3.7]:
        for y in [-17,-7,3]:
            flower_box(g,x,y,1.1)
    for y in [-15,-7]:string_lights(g,(-4.3,y),(4.3,y),5.3)
    # Paving inlays lead from the street into the small court instead of an empty plaza.
    for y in range(-21,5,2):
        g.box((0,y,.507),(1.4,.18,.014),'finance_copper')
    for x in [-26,26]:
        street_bench(g,x,-20.4)


def central_house(g,level):
    """A third skyline mass, with its own entrance facing the central promenade."""
    if level==8:
        b=Geometry();street_block(b,9,10,39,'GARDEN HALL',0);transfer(g,b,0,14)
    elif level==9:
        b=Geometry();street_block(b,9,11,48,'CITY CLUB',1);transfer(g,b,0,14)


def metropolitan_accents(root,level):
    # Keep these materials outside the opaque batched geometry and warm window category.
    g=Geometry();depth=level+2;front=-10-depth/2
    for i,(x,height) in enumerate(zip(FRONT_X,FRONT_HEIGHTS[level])):
        tint=['metro_jade','metro_coral','metro_gold'][i%3] if level>=9 else 'finance_sign'
        # Supported signboard on the facade: thick frame, luminous border and modelled lettering.
        z=8.2+(i%2)*2.5
        g.box((x,front-.32,z),(5.6,.05,.11),tint)
        g.box((x,front-.32,z+2),(5.6,.05,.11),tint)
        for xx in [x-2.8,x+2.8]:g.box((xx,front-.32,z+1),(.11,.05,2),tint)
        text_mesh(g,['READ / LIVE','ATELIER','COFFEE','MAISON','BLOOM','CITY TEA'][i],(x,front-.34,z+.75),.48,tint)
        # Base trim and selected cornice lines remain readable at the full-city camera scale.
        g.box((x,front-.28,4.75),(6.8,.09,.12),tint)
        if level>=9:
            for zband in [14.5,height-4]:
                width,y=7,front
                if FRONT_STYLES[i]==1 and zband>height-9:
                    width,upper_d,offset=setback_profile(7,depth);y=-10+offset-upper_d/2
                g.box((x,y-.3,zband),(width-.2,.09,.12),tint)
            # Vertical blade sign remains visible down the street and from the reverse view.
            for side in [-1,1]:
                for zsign in [height-7,height-5,height-3]:
                    g.box((x+side*3.6,-8,zsign),(.06,1.4,1.3),tint)
        if level==10:
            g.box((x,front-.31,17.2),(5.8,.055,1.1),tint)
            for j in range(5):g.box((x-2.25+j*1.1,front-.4,17.2),(.4,.035,.6),'finance_sign')
    # Central walk lights are small in-ground fixtures, independent of advertising.
    for x in [-2.2,2.2]:
        for y in range(-20,4,3):g.box((x,y,.535),(.14,.65,.035),'finance_sign')
    emit_accents(root,'metropolitan_sign_lighting',g)


def emit_accents(root,name,g):
    node=empty(name,root,financeAccent=True)
    g.emit(node,name)
    for child in node.children:
        for i,mat in enumerate(child.data.materials):child.data.materials[i]=mat.copy()


def metropolitan_anchors(level):
    front=-10-(level+2)/2
    # Five shared pools cover the street; every added real light costs the whole city shader.
    return [(x,front-1,4) for x in [-20,-8,8,20]]+[(0,4,4)]
