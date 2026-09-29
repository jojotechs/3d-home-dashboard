"""T12: original future commercial quarter; no external advertising service."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from finance_future_kit import *


def build_nine():
    root=level_root(9,[(-17,-13,4),(17,-13,4),(0,-1,5),(-15,-2,4)])
    root['financeEffects']={'beams':[{'from':[x,y,.9],'to':[x,y+2,z],'radius':1.4,'color':'#adeadd' if i%2 else '#ffe0ad','sweep':[1.2,0,0],'period':18,'phase':i*math.pi/2} for i,(x,y,z) in enumerate([(-23,-2,19),(-8,-2,19),(8,2,20),(21,2,20)])]}
    g=Geometry();civic_ground(g)
    b=Geometry();faceted_tower(b,18,18,57,'SOLSTICE');transfer(g,b,-15,8)
    b=Geometry();faceted_tower(b,17,14,45,'MERIDIAN');transfer(g,b,14,10)
    for x,label in [(-17,'BLOOM / CAFE'),(17,'MAISON / CITY')]:
        b=Geometry();luxury_pavilion(b,label);transfer(g,b,x,-9)
    # Inhabitable bridge between sky courts, with enclosed gallery and planted edge.
    g.box((0,11,23),(16,5,.55),'cream',bevel=.18)
    g.box((0,12,24.65),(16,2.5,2.8),'glass_finance_mint')
    for x in range(-7,8,2):g.box((x,10.68,24.65),(.08,.1,2.8),'finance_bronze')
    roof_garden(g,0,9,23.3,14,.85);rail(g,(-7,8.55),(7,8.55),23.3)
    # Ground plaza is kept navigable; the hologram has a physical projection plinth.
    g.cylinder((0,7,.8),2.6,.56,'finance_copper',48);g.cylinder((0,7,1.12),2.3,.08,'glass_finance_ink',48)
    for j in range(16):
        a=j*TAU/16;g.ball((2.2*math.cos(a),7+2.2*math.sin(a),1.25),(.065,.065,.065),'finance_lamp',1)
    for x in [-6,6]:
        for y in [0,10,18]:flower_box(g,x,y,1.4)
    cafe_tables(g,[(-18,-17),(-23,-17),(4,-10)]);street_bench(g,8,-16);street_bench(g,-3,15)
    for x,y in [(-23,-2),(-8,-2),(8,2),(21,2)]:g.cylinder((x,y,.75),.22,.4,'metal',12)
    g.emit(root,'future_city');bake_batches(root)
    hologram(root,'bloom_projection',(0,7,5),2.1)
    flyer(root,'bloom_air_ad',oval_route(0,-18,19,23,1.5))
    export_level(root,9)

if __name__=='__main__':build_nine()
