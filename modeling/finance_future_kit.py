"""Physical original advertising and layered landmark details, in district metres."""
from finance_urban_kit import *


def hologram(root,name,position,radius=2,phase=0):
    # Open spatial logo with orbit rings, a diamond and lettering: no billboard image plane.
    node=empty(name,root,financeHologram=True,phase=phase);node.location=position
    g=Geometry()
    for z,r in [(-1.7,radius),(0,radius*.72),(1.7,radius*.42)]:
        line(g,[(r*math.cos(i*TAU/48),r*math.sin(i*TAU/48),z) for i in range(49)],.035,'glass_finance_mint',6)
    for a in [0,math.pi/2,math.pi,math.pi*1.5]:
        line(g,[(0,0,1.6),(radius*.55*math.cos(a),radius*.55*math.sin(a),0),(0,0,-1.5)],.045,'glass_finance_mint',6)
    text_mesh(g,'CITY / BLOOM',(0,-radius-.1,-2.4),.38,'glass_finance_mint');g.emit(node,name)


def flyer(root,name,route,offset=0):
    node=empty(name,root,financeMotion='fly',route=route,speed=1.4,offset=offset);node.location=route[0]
    g=Geometry();g.box((0,0,.3),(2.8,.75,.5),'cream',bevel=.14)
    for x in [-1.35,1.35]:
        for y in [-.65,.65]:
            g.rod((x*.75,0,.3),(x,y,.45),.045,'finance_bronze',8)
            band(g,x,y,.5,.47,.47,.06,'finance_copper',24)
            g.rod((x-.35,y,.51),(x+.35,y,.51),.024,'steel',6)
            g.rod((x,y-.35,.51),(x,y+.35,.51),.024,'steel',6)
    for x in [-.9,.9]:g.rod((x,0,.1),(x,0,-.45),.045,'finance_bronze',8)
    g.box((0,0,-.85),(2.4,.16,.9),'glass_finance_ink',bevel=.03)
    for side in [-1,1]:
        f=Geometry();text_mesh(f,'BLOOM',(0,-.105,-1.02),.31,'finance_sign');transfer(g,f,rot=0 if side<0 else math.pi)
    for x in [-1.15,1.15]:g.box((x,0,-.85),(.035,.2,.85),'finance_lamp')
    g.emit(node,name);bake_batches(node)


def oval_route(x,y,z,rx,ry):
    return [[x+rx*math.cos(i*TAU/64),y+ry*math.sin(i*TAU/64),z] for i in range(64)]


def faceted_tower(g,w,d,height,label):
    stone_base(g,w,d,6,label)
    # Angular vertical fins and an open two-storey sky court divide the rich facade.
    curtain_block(g,w-.8,d-.8,6,22,'glass_finance_ink')
    for x in [-w/2+1,w/2-1]:
        for y in [-d/2+1,d/2-1]:g.box((x,y,24),(.55,.55,4),'finance_bronze')
    terrace(g,0,-d/2+2,22.3,w-1,3.4,True)
    g.box((0,1,24),(w-5,d-5,4),'glass_finance_teal',bevel=.3)
    curtain_block(g,w-1.8,d-1.8,26,height-5,'glass_finance_teal')
    for x in [-w/2+.6,w/2-.6]:
        for side in [-1,1]:
            line(g,[(x,side*d/2,6),(x*1.1,side*(d/2-.3),21),(x*.85,side*(d/2-1),height-5),(x*.5,side*(d/2-2),height)],.14,'finance_bronze',8)
    # Origami glazed crown with a diagonal ridge, closed facets and metal seams.
    corners=[(-w/2+1,-d/2+1,height-5),(w/2-1,-d/2+1,height-5),(w/2-1,d/2-1,height-5),(-w/2+1,d/2-1,height-5)]
    ridge=[(-w*.18,0,height),(w*.18,1,height-1.2)]
    g.mesh(corners+ridge,[(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)],'glass_finance_mint')
    for i in range(4):g.rod(corners[i],ridge[0 if i in [0,3] else 1],.12,'finance_bronze',8)
    g.rod(*ridge,.12,'finance_bronze',8)
    for side in [-1,1]:
        yy=side*(d/2-.75)
        for x in [-w*.35,0,w*.35]:
            line(g,[(x-w*.12,yy,27),(x+w*.12,yy,(height+21)/2),(x-w*.12,yy,height-5)],.085,'finance_bronze',8)


def luxury_pavilion(g,label):
    stone_base(g,17,7,5,label);curtain_block(g,15.8,6.2,5,8.7,'glass_finance_ink')
    terrace(g,0,0,8.9,17,7,False)
    # Individual folded bronze roof ribbons sit above the roof garden.
    for x in [-7,-5,-3,-1,1,3,5,7]:
        line(g,[(x,-3.4,9),(x,-1,10.7),(x,1.5,11.2),(x,3.4,9.5)],.085,'finance_bronze',8)
    roof_garden(g,0,2.8,9,14,1)
