"""T10: regional centre and terraced business quarter, preserving the old reference."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from finance_urban_kit import *


def level_five(g):
    civic_ground(g)
    # Original v0.4 middle-stage typologies, with the same footprints and massing.
    sites=[(-20,-8,0),(-2.4,-4,1),(20,-7,2),(-21,11,3),(-3,12,4),(19,11,5)]
    for x,y,site in sites:
        b=Geometry();growing_stage(b,site)
        # The old low hedge was authored around z=0; lift its ground foliage onto the paving.
        if site==5:
            for mat in ['leaf','leaf2']:
                vs,fs,sm=b.data[mat];b.data[mat][0]=[(xx,yy,zz+.52 if zz<1.5 else zz) for xx,yy,zz in vs]
        # Warm inserts follow the real front/rear face of every original building tier.
        profiles={
            0:[(0,0,10,[2.8],[-4.48,0,4.48],.10),(0,0,9.2,[8.45],[-4.356,0,4.356],.225)],
            1:[(-1.5,0,10,[2.3,5.3,8.3,11.3],[-3.167,0,3.167],.225)],
            2:[(0,0,11,[2.6,5.05,7.3,10.1],[-3.96,0,3.96],.225)],
            3:[(0,0,11,[2.3,5.3,8.3,11.3,14.3],[-4.5,-1.5,1.5,4.5],.225)],
            4:[(0,0,10,[2.3],[-4.688,-1.563,1.563,4.688],.225),(-.9,1,8,[6.1,9.1,12.1,15.1,18.1,21.1],[-3.6,-1.8,0,1.8,3.6],.025)],
            5:[(0,1.5,9,[2.3,5.3,8.3,11.3,14.3],[-3.938,-1.313,1.313,3.938],.025)],
        }
        for dx,dy,depth,rows,columns,inset in profiles[site]:
            for side in [-1,1]:
                for row,z in enumerate(rows):
                    for col,px in enumerate(columns):
                        if (row+col)%3==1:continue
                        b.box((dx+px,dy+side*(depth/2+inset),z),(1,.014,1.0),'finance_window')
        transfer(g,b,x,y)
    fountain(g,9,-12,2.7)
    bus_shelter(g,-15,-19)
    street_bench(g,10,1,math.pi/2)
    cafe_tables(g,[(17,-16),(22,-16)])
    digital_sign(g,-2.4,-9.45,4.4,7,'SAVINGS  /  GROWTH')
    for x in [-21,-3,19]:flower_box(g,x,18.8,3)


def terraced_office(g,w,d,top,label,tint='glass_finance_teal'):
    stone_base(g,w,d,4.8,label)
    curtain_block(g,w,d,4.8,13,tint)
    # Terraces occupy full-width setbacks, not tiny planters on an unchanged box.
    upper=Geometry();curtain_block(upper,w-3,d-4,13,22,tint);transfer(g,upper,-.7,1.8)
    upper=Geometry();curtain_block(upper,w-6,d-6,22,top,tint);transfer(g,upper,-1,2.5)
    terrace(g,0,-d/2+1.5,13.2,w,2.7,True)
    terrace(g,-.7,-d/2+4,22.2,w-3,2.7)
    roof_services(g,-1,2.5,top+.2,3.5,2.4)
    # Actual shading blades on the west elevation and a clearly separate rear service door.
    for z in [7,10,16,19]:
        g.box((-w/2-.35,0,z),(.8,d-.4,.17),'finance_copper')
    g.box((2,d/2+.1,1.9),(1.6,.2,2.7),'finance_copper',bevel=.03)
    for z in [5,13,22]:
        g.box((0,-d/2-.18,z),(w-.5,.12,.08),'finance_lamp')


def level_six(g):
    civic_ground(g)
    for x,y,w,d,top,label,tint in [(-18,10,17,16,29,'TERRACE HOUSE','glass_finance_teal'),(8,11,20,13,25,'CITY WORKS','glass_finance_sky')]:
        b=Geometry();terraced_office(b,w,d,top,label,tint);transfer(g,b,x,y)
    b=Geometry();stone_base(b,12,7,4.8,'GALLERY');curtain_block(b,10,6,4.8,10);roof_services(b,0,0,10.2);transfer(g,b,-19,-8)
    fountain(g,9,-7,4)
    # Low amphitheatre edge / event platform with an open central approach.
    for i in range(3):g.box((18,-9+i*.7,.65+i*.16),(9,1,.28),'cream',bevel=.045)
    g.box((18,-5,1),(8,4,.6),'woodlight',bevel=.06)
    digital_sign(g,18,-3.05,3.5,6.5,'CITY ARTS / TONIGHT')
    for x in [14.9,21.1]:g.rod((x,-3,.5),(x,-3,3.5),.08,'metal',8)
    cafe_tables(g,[(-18,-15),(-23,-15)])
    street_bench(g,3,-7,math.pi/2);street_bench(g,9,-14)
    bus_shelter(g,18,-19)
    for x in [-4,3,24]:flower_box(g,x,0,2)


if __name__=='__main__':
    for level,builder in [(5,level_five),(6,level_six)]:
        root=level_root(level,[(-20,-13,4),(-3,-10,4),(20,-13,4),(8,0,4)])
        g=Geometry();builder(g);g.emit(root,'regional_centre');bake_batches(root);export_level(root,level)
