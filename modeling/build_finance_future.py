"""T12: original future commercial quarter; no external advertising service."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from finance_future_kit import *
from finance_metropolitan_kit import *


def build_nine():
    root=level_root(9,metropolitan_anchors(9))
    root['financeEffects']={'beams':[{'from':[x,y,.9],'to':[x,y+2,z],'radius':1.4,'color':'#adeadd' if i%2 else '#ffe0ad','sweep':[1.2,0,0],'period':18,'phase':i*math.pi/2} for i,(x,y,z) in enumerate([(-23,-2,19),(-8,-.8,19),(8,2,20),(21,2,20)])]}
    g=Geometry();civic_ground(g)
    skyline_lights=Geometry()
    for x,y,w,d,height,label,tint in [(-15,8,18,18,57,'SOLSTICE','metro_jade'),(14,10,17,14,45,'MERIDIAN','metro_gold')]:
        b=Geometry();lights=Geometry();faceted_tower(b,lights,w,d,height,label,tint);transfer(g,b,x,y);transfer(skyline_lights,lights,x,y)
    metropolitan_frontage(g,9);central_house(g,9)
    # Inhabitable bridge between sky courts, with enclosed gallery and planted edge.
    g.box((0,3.7,23),(16,5,.55),'cream',bevel=.18)
    g.box((0,4.7,24.65),(16,2.5,2.8),'glass_finance_mint')
    for x in range(-7,8,2):g.box((x,3.38,24.65),(.08,.1,2.8),'finance_bronze')
    roof_garden(g,0,1.7,23.3,14,.85);rail(g,(-7,1.25),(7,1.25),23.3)
    # Ground plaza is kept navigable; the hologram has a physical projection plinth.
    g.cylinder((0,4,.8),2.6,.56,'finance_copper',48);g.cylinder((0,4,1.12),2.3,.08,'glass_finance_ink',48)
    for j in range(16):
        a=j*TAU/16;g.ball((2.2*math.cos(a),4+2.2*math.sin(a),1.25),(.065,.065,.065),'finance_lamp',1)
    for x,y in [(-23,-2),(-8,-.8),(8,2),(21,2)]:g.cylinder((x,y,.75),.22,.4,'metal',12)
    rooftop_projection(g,root,'maison_roof_projection',7.8,-8.5,32,'metro_jade','MAISON / SKY')
    g.emit(root,'future_city');bake_batches(root)
    metropolitan_accents(root,9)
    emit_accents(root,'folded_crown_lighting',skyline_lights)
    hologram(root,'bloom_projection',(0,4,5),2.1)
    flyer(root,'bloom_air_ad',oval_route(0,-19.5,22,24,.25))
    flyer(root,'bloom_sky_ad',oval_route(0,-19.5,48,24,.25),offset=42)
    export_level(root,9)

if __name__=='__main__':build_nine()
