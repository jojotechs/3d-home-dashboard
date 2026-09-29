"""T13: elliptical observatories, a sky-garden arch and a complete public quarter."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from finance_future_kit import *
from finance_metropolitan_kit import *


def ellipse(g,rx,ry,z,h,mat,n=64):
    points=[(rx*math.cos(i*TAU/n),ry*math.sin(i*TAU/n),zz) for zz in [z,z+h] for i in range(n)]
    g.mesh(points,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)


def observatory(g,rx,ry,height,label,podium):
    stone_base(g,*podium,7,label)
    body=height-8
    curtain_block(g,podium[0]-.8,podium[1]-.8,7,17,'glass_finance_mint')
    roof_garden(g,0,-podium[1]/2+.7,17.2,podium[0]-1.6,.7)
    ellipse(g,rx,ry,17,body-17,'glass_finance_ink')
    for z in range(19,int(body),3):
        band(g,0,0,z,rx+.12,ry+.12,.11,'cream',64)
        for i in range(32):
            a=i*TAU/32;b=a+TAU/32*.66
            if (i+z)%5 in [0,2] and z+2.2<body:
                g.mesh([((rx+.018)*math.cos(c),(ry+.018)*math.sin(c),zz) for zz in [z+.5,z+2.2] for c in [a,b]],[(0,1,3,2)],'finance_window')
    for i in range(32):
        a=i*TAU/32
        g.rod(((rx+.06)*math.cos(a),(ry+.06)*math.sin(a),6),((rx+.06)*math.cos(a),(ry+.06)*math.sin(a),body),.045,'finance_bronze',8)
    # A genuine wraparound observation deck and a set-back glazed lounge.
    ellipse(g,rx+1.15,ry+1.15,body,.32,'cream');ellipse(g,rx-1.2,ry-1.2,body+.32,3.4,'glass_finance_mint')
    for i in range(48):
        a=i*TAU/48;g.rod(((rx+1)*math.cos(a),(ry+1)*math.sin(a),body+.32),((rx+1)*math.cos(a),(ry+1)*math.sin(a),body+1.3),.024,'finance_bronze',6)
    band(g,0,0,body+1.3,rx+1,ry+1,.045,'finance_bronze',64)
    for i in range(12):
        a=i*TAU/12;x=(rx-1.7)*math.cos(a);y=(ry-1.7)*math.sin(a)
        g.box((x,y,body+3.8),(1.1,.65,.6),'pot',rot=a)
        g.ball((x,y,body+4.25),(.7,.55,.6),'leaf2',2)
    # Twelve bronze-lined crown petals fan upward and inward over the lounge.
    for i in range(12):
        a=i*TAU/12;b=a+TAU/12*.7
        v=[((rx+.3)*math.cos(a),(ry+.3)*math.sin(a),body+3.5),((rx+.3)*math.cos(b),(ry+.3)*math.sin(b),body+3.5),((rx*.55)*math.cos(b),(ry*.55)*math.sin(b),height),((rx*.55)*math.cos(a),(ry*.55)*math.sin(a),height)]
        g.mesh(v,[(0,1,2,3),(3,2,1,0)],'cream')
        for j in [0,1]:g.rod(v[j],v[3-j],.07,'finance_bronze',8)
    roof_services(g,0,0,body+3.8,3,2)
    # Curving structural ribs break the cylinder into a recognisable floral silhouette.
    for i in range(8):
        a=i*TAU/8
        line(g,[((rx+.32)*math.cos(a),(ry+.32)*math.sin(a),6),((rx+1.1)*math.cos(a),(ry+1.1)*math.sin(a),body*.5),((rx+.32)*math.cos(a),(ry+.32)*math.sin(a),body)],.13,'cream',8)


def build_ten():
    root=level_root(10,metropolitan_anchors(10)+[(0,9,28)])
    root['financeEffects']={'beams':[{'from':[x,y,.9],'to':[x,y+2,z],'radius':1.5,'color':'#b2eee4' if i%2 else '#ffe0b3','sweep':[1.5,0,0],'period':20,'phase':i*math.pi/3,'pulse':.3} for i,(x,y,z) in enumerate([(-21,-1,25),(-9,-1,25),(9,1,22),(20,1,22),(-5,12,30),(5,12,30)])]}
    g=Geometry();civic_ground(g)
    b=Geometry();observatory(b,7.2,8.5,58,'CELESTIAL',(20,19));transfer(g,b,-14,8.5)
    b=Geometry();observatory(b,6.8,7.2,47,'PANORAMA',(19,18));transfer(g,b,14,10)
    metropolitan_frontage(g,10)
    # Arch bridge has a walking surface, two load-bearing ribs, guardrails and planted landings.
    for i in range(24):
        x=-14+28*i/24;nx=-14+28*(i+1)/24;z=34+8*math.sin(math.pi*i/24);nz=34+8*math.sin(math.pi*(i+1)/24)
        g.mesh([(x,7,z),(nx,7,nz),(nx,11,nz),(x,11,z),(x,7,z-.4),(nx,7,nz-.4),(nx,11,nz-.4),(x,11,z-.4)],[(0,1,2,3),(7,6,5,4),(0,4,5,1),(3,2,6,7)],'paver3')
        for yy in [7,11]:
            g.rod((x,yy,z-.6),(nx,yy,nz-.6),.22,'finance_bronze',8)
            g.rod((x,yy,z),(x,yy,z+1.05),.035,'finance_bronze',6)
            g.rod((x,yy,z+1.05),(nx,yy,nz+1.05),.045,'finance_bronze',8)
    for x in [-8,-7,-6,6,7,8]:
        heights=[34+8*math.sin(math.pi*(xx+14)/28) for xx in [x-.35,x+.35]]
        top=max(heights)+.06
        base=[(x-.35,9.95,heights[0]),(x+.35,9.95,heights[1]),(x+.35,10.65,heights[1]),(x-.35,10.65,heights[0])]
        g.mesh(base+[(xx,yy,top) for xx,yy,_ in base],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'cream')
        roof_garden(g,x,10.3,top,.7,.7)
    # A substantial central rotunda fills the skyline below the preserved arch bridge.
    b=Geometry();stone_base(b,7,10,6,'CITY SALON')
    ellipse(b,3.5,5,6,24,'glass_finance_teal')
    for z in range(7,30,3):
        band(b,0,0,z,3.6,5.1,.14,'cream',48)
        for j in range(20):
            a=j*TAU/20;next_a=a+.16
            if (j+z)%4!=0:
                b.mesh([((3.515)*math.cos(c),(5.015)*math.sin(c),zz) for zz in [z+.4,z+2] for c in [a,next_a]],[(0,1,3,2)],'finance_window')
    for bottom,top,rx,ry in [(30,31,3.8,5.3),(31,33,3.2,4.7),(33,35,2.6,4.1)]:
        ellipse(b,rx,ry,bottom,top-bottom,'finance_limestone')
        band(b,0,0,top,rx,ry,.18,'finance_bronze',48)
    roof_garden(b,0,2.3,35,4,1.5);transfer(g,b,0,13)
    for x,y,z in [(0,1,.8),(0,13,35.4)]:
        g.cylinder((x,y,z),2.4,.5,'finance_copper',48)
        band(g,x,y,z+.28,2.2,2.2,.075,'finance_lamp',48)
    for x,y in [(-21,-1),(-9,-1),(9,1),(20,1),(-5,12),(5,12)]:g.cylinder((x,y,.75),.23,.4,'metal',12)
    rooftop_projection(g,root,'city_roof_projection',-22.8,-10,32,'metro_coral','CITY / LIVE')
    rooftop_projection(g,root,'crown_roof_projection',7.8,-8.5,39,'metro_jade','CROWN / SKY')
    g.emit(root,'final_city');bake_batches(root)
    metropolitan_accents(root,10)
    hologram(root,'orchid_projection',(0,1,5),2.1)
    hologram(root,'sky_projection',(0,13,38.5),2.5,math.pi)
    flyer(root,'orchid_air_ad',oval_route(0,-19.5,22,24,.25))
    flyer(root,'orchid_sky_ad',oval_route(0,-19.5,49,24,.25),offset=42)
    flyer(root,'orchid_crown_ad',oval_route(0,-19.5,56,24,.25),offset=70)
    # Dedicated facade ribbons provide a coordinated light show without touching warm windows.
    show=empty('crown_light_ribbons',root,financeLightShow=True)
    ribbons=Geometry()
    for cx,cy,rx,ry,top in [(-14,8.5,7.2,8.5,50),(14,10,6.8,7.2,39)]:
        band(ribbons,cx,cy,top+1.31,rx+1,ry+1,.11,'metro_gold',64)
        band(ribbons,cx,cy,top+3.51,rx+.3,ry+.3,.1,'glass_finance_mint',64)
        for j in range(8):
            a=j*TAU/8
            line(ribbons,[(cx+(rx+.47)*math.cos(a),cy+(ry+.47)*math.sin(a),17),(cx+(rx+1.25)*math.cos(a),cy+(ry+1.25)*math.sin(a),top*.5),(cx+(rx+.47)*math.cos(a),cy+(ry+.47)*math.sin(a),top)],.085,'glass_finance_mint',6)
    ribbons.emit(show,'crown_ribbon')
    # Detach the show's materials from both holograms even when their base palette matches.
    for child in show.children:
        for i,mat in enumerate(child.data.materials):child.data.materials[i]=mat.copy()
    export_level(root,10)

if __name__=='__main__':build_ten()
