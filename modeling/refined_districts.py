"""Six detailed districts; state roots remain compatible with the web app."""
from refined_shared import *

from refined_finance import finance

def chicken(g,x,y,seed):
 a=Geometry();a.ball((0,0,1.05),(.66,.46,.52),'cream',2);a.ball((.48,0,1.53),(.28,.27,.36),'trim',2)
 a.ball((-.42,.03,1.25),(.42,.3,.38),'petal',1,rot=.2)
 a.cylinder((.54,0,1.91),.12,.18,'roofred',7)
 a.rod((.68,0,1.52),(.99,0,1.48),.13,'orange',7,top=0)
 a.ball((.62,-.24,1.63),(.055,.035,.055),'metal',1)
 for side in [-1,1]:
  a.rod((-.07,side*.25,.7),(-.06,side*.25,.35),.05,'orange',6)
  a.rod((-.06,side*.25,.35),(.22,side*.25,.3),.04,'orange',5)
 transfer(g,a,x,y,rot=seed*.7)

def sheep(g,x,y,seed):
 a=Geometry()
 for xx in [-.5,0,.5]:
  for yy in [-.3,.3]:a.ball((xx,yy,1.2),(.53,.5,.53),'cream',2)
 a.ball((.88,0,1.35),(.37,.31,.43),'wooddark',2)
 for side in [-1,1]:
  a.ball((.8,side*.4,1.58),(.26,.18,.12),'wooddark',1)
  for xx in [-.5,.5]:a.rod((xx,side*.31,.85),(xx,side*.31,.35),.09,'wooddark',7)
 a.ball((1,-.28,1.52),(.06,.04,.06),'trim',1)
 transfer(g,a,x,y,rot=seed*.37)

def farm(static,dynamic):
 g=Geometry();parcel(g,60,92);roots=[]
 # Warm red timber barn with a fully tiled slate roof and framed doors.
 bx,by=0,32;g.box((bx,by,.6),(18,14,.6),'stone',bevel=.1);g.box((bx,by,4.25),(17,13,7.3),'roofred',bevel=.06)
 for yy in [25.42,38.58]:
  for i in range(23):g.box((-8.15+i*.74,yy,4.3),(.065,.15,7),'roofred2')
 for xx in [-8.55,8.55]:
  for j in range(17):g.box((xx,26+j*.74,4.3),(.15,.065,7),'roofred2')
 for xx in [-8.5,8.5]:
  for yy in [25.5,38.5]:g.box((xx,yy,4.35),(.35,.35,7.5),'trim')
 tiled_roof(g,0,32,8.05,18.3,14.5,4,'roofblue',22)
 for yy in [24.72,39.27]:
  g.mesh([(-9.15,0,0),(9.15,0,0),(0,0,4)],[(0,1,2)],'roofred',(0,yy,8.05))
 for xx in [-2.15,2.15]:
  g.box((xx,25.2,3.65),(4.2,.3,5.6),'roofred3',bevel=.04)
  for dx in [-2,2]:g.box((xx+dx,24.97,3.65),(.15,.16,5.7),'trim')
  for z in [.85,6.45]:g.box((xx,24.97,z),(4.2,.16,.16),'trim')
  g.rod((xx-1.9,24.87,1),(xx+1.9,24.87,6.3),.085,'trim',6)
  g.rod((xx+1.9,24.87,1),(xx-1.9,24.87,6.3),.085,'trim',6)
  g.box((xx+(.65 if xx<0 else -.65),24.78,3.4),(.13,.15,.65),'metal')
 window(g,0,24.66,9.65,2.2,1.7);text_mesh(g,'LITTLE FARM',(0,24.59,7.02),.74)
 for xx in [-6.3,6.3]:window(g,xx,25.35,4,2.1,2.4)
 # Banded silo with ladder and conical cap.
 g.cylinder((14.6,33,6.4),3.25,12.1,'plaster',24)
 for z in [1,3,5,7,9,11,12.5]:g.cylinder((14.6,33,z),3.33,.15,'steel',24)
 g.cylinder((14.6,33,13.55),3.7,2,'roofblue',24,top=.15)
 for xx in [14.1,15.1]:g.rod((xx,29.65,.7),(xx,29.65,12.8),.065,'metal',8)
 for i in range(23):g.rod((14.1,29.65,1+i*.5),(15.1,29.65,1+i*.5),.055,'metal',6)
 # Greenhouse with arched glazing, structural ribs.
 gx,gy=-20,32
 g.box((gx,gy,.55),(12,15,.65),'stone',bevel=.12)
 for j in range(7):
  yy=gy-6.7+j*2.23
  pts=[(gx+5.6*math.cos(math.pi*k/16),yy,3+5*math.sin(math.pi*k/16)) for k in range(17)]
  line(g,pts,.085,'trim',8)
  for xx in [gx-5.6,gx+5.6]:g.rod((xx,yy,.8),(xx,yy,3.05),.085,'trim',8)
 for side in [-1,1]:g.box((gx+side*5.55,gy,1.9),(.08,13.5,2.2),'glasslight')
 for j in range(12):
  a=j*math.pi/12;b=(j+1)*math.pi/12
  g.mesh([(gx+5.5*math.cos(a),gy-6.7,3+4.95*math.sin(a)),(gx+5.5*math.cos(b),gy-6.7,3+4.95*math.sin(b)),(gx+5.5*math.cos(b),gy+6.7,3+4.95*math.sin(b)),(gx+5.5*math.cos(a),gy+6.7,3+4.95*math.sin(a))],[(0,1,2,3)],'glasslight' if j%3 else 'glass')
 for zz in [1,3]:g.box((gx,gy-6.86,zz),(11.3,.17,.16),'trim')
 for xx in [gx-5.5,gx-2,gx+2,gx+5.5]:g.rod((xx,gy-6.88,.9),(xx,gy-6.88,4.8 if abs(xx-gx)<3 else 3),.085,'trim',8)
 g.box((gx,gy-6.91,2.9),(3.8,.09,4.2),'glass');window(g,gx,gy-7,2.95,3.3,3.7)
 # Timber windmill tower and eight individual blades.
 wx,wy=24,34
 for dx in [-1,1]:
  for dy in [-1,1]:g.rod((wx+dx*2,wy+dy*2,.5),(wx+dx*.7,wy+dy*.7,11.5),.18,'wood',8)
 for z in [3,6,9]:
  for side in [-1,1]:g.rod((wx-1.8,wy+side*1.2,z),(wx+1.8,wy+side*1.2,z+2.6),.10,'woodlight',7)
 g.rod((wx,wy,11.6),(wx,wy-1.6,11.6),.22,'metal',10)
 for i in range(8):
  a=i*TAU/8;cx=wx+math.sin(a)*2.2;zz=11.6+math.cos(a)*2.2
  g.rod((wx,wy-1.7,11.6),(wx+math.sin(a)*4,wy-1.7,11.6+math.cos(a)*4),.075,'cream',7)
  vs=[]
  for r,s in [(1.6,-.13),(4,-.5),(4,.5),(1.6,.13)]:vs.append((wx+math.sin(a)*r+math.cos(a)*s,wy-1.73,11.6+math.cos(a)*r-math.sin(a)*s))
  g.mesh(vs,[(0,1,2,3)],'canvas' if i%2 else 'woodlight')
 g.ball((wx,wy-1.83,11.6),(.35,.25,.35),'metal',2)
 # Six plots with independent twelve-slot growth; visible dirt rows and gates.
 for pi,(x,y) in enumerate([(-14,12),(14,12),(-14,-8),(14,-8),(-14,-29),(14,-29)]):
  g.box((x,y,.4),(22,16,.35),'soil' if pi<4 else 'lawn2',bevel=.2)
  for a,b in [((x-11,y-8),(x-2,y-8)),((x+2,y-8),(x+11,y-8)),((x-11,y-8),(x-11,y+8)),((x+11,y-8),(x+11,y+8)),((x-11,y+8),(x+11,y+8))]:
   # Rustic two-rail fence, lighter than domestic pickets.
   n=max(1,round(math.dist(a,b)/3));
   for j in range(n+1):
    xx=a[0]+(b[0]-a[0])*j/n;yy=a[1]+(b[1]-a[1])*j/n;g.box((xx,yy,1.25),(.25,.25,1.9),'woodlight',bevel=.04)
   for zz in [.9,1.6]:g.rod((*a,zz),(*b,zz),.1,'wood',6)
  for yy in [y-5,y,y+5]:
   if pi<4:g.box((x,yy,.66),(20,1.4,.18),'soil',bevel=.08)
  for k in range(12):
   o=empty(f'plot_{pi}_slot_{k}',dynamic,kind='growth',plot=pi,slot=k,assetVersion='0.3');roots.append(o);t=Geometry();xx=x-7.5+k%4*5;yy=y-5+k//4*5
   if pi<2:
    for dx,dy in [(0,0),(-1.2,.7),(1.2,-.65)]:flowers(t,xx+dx,yy+dy,.65,1.15,pi*20+k,'petal' if pi==0 else 'yellow')
    if pi==1:
     t.rod((xx,yy,.7),(xx,yy,2.8),.085,'leafdark',6)
     for j in range(9):
      a=j*TAU/9;t.ball((xx+math.cos(a)*.35,yy,2.8+math.sin(a)*.35),(.22,.11,.2),'yellow',1)
     t.ball((xx,yy-.11,2.8),(.24,.11,.24),'wooddark',2)
   elif pi==2:
    for j in range(7):
     a=j*2.1;t.ball((xx+math.cos(a)*.5,yy+math.sin(a)*.5,.94),(.72,.6,.42),'leaf2',2,rot=a)
     t.ball((xx+math.cos(a)*.25,yy+math.sin(a)*.25,1.14),(.38,.38,.32),'roofred',2)
    t.rod((xx,yy,.7),(xx,yy,2.45),.065,'wood',6)
   elif pi==3:
    for j in range(6):
     a=j*TAU/6;t.ball((xx+math.cos(a)*.25,yy+math.sin(a)*.25,1.15),(.63,.63,.6),'orange' if j%2 else 'cushion',2)
    t.rod((xx,yy,1.5),(xx+.14,yy,1.98),.1,'leafdark',6);t.ball((xx+.7,yy,1),(.6,.32,.15),'leaf',1)
   elif pi==4:chicken(t,xx,yy,k)
   else:sheep(t,xx,yy,k)
   t.emit(o,o.name)
  g.box((x-5,y-8.1,2.1),(3.5,.25,1.1),'wooddark',bevel=.06)
  text_mesh(g,['FLOWERS','SUNSHINE','TOMATO','PUMPKIN','HENS','SHEEP'][pi],(x-5,y-8.26,1.82),.43)
  if pi>=4:
   g.box((x+6,y+5,.9),(3.2,1.6,.65),'wood',bevel=.08);g.box((x+6,y+5,1.25),(2.8,1.2,.08),'water')
 paving(g,0,-10,3.1,65,8)
 for j,(x,y) in enumerate([(-28,42),(27,43),(-28,-43),(28,-43),(-28,-18),(28,1)]):street_tree(g,x,y,1.25,j)
 for x,y in [(-9,22),(9,22),(-27,-42),(27,-42)]:crate(g,x,y,s=.9,produce=True)
 for x,y in [(-4,-41),(4,-41),(-4,21),(4,21)]:planter(g,x,y,s=1.05,seed=8)
 # Arched entry and a small produce cart.
 for xx in [-2.5,2.5]:g.rod((xx,-44,.4),(xx,-44,4),.13,'trim',8)
 line(g,[(math.cos(math.pi*i/20)*2.5,-44,4+math.sin(math.pi*i/20)*2) for i in range(21)],.13,'trim',8)
 for i in range(27):
  bush(g,-27.8,-42+i*3.2,.85,i,True)
  if i<19:bush(g,27.8,-42+i*3.2,.85,i,True)
 g.emit(static,'farm_detail');return roots

def health(static,dynamic,slots):
 g=Geometry();parcel(g,136,44);roots=[]
 paving(g,0,0,131,2.1,31);paving(g,0,-20,130,2.1,32);paving(g,0,20,130,2.1,33)
 for x in [-19,9,38,63]:paving(g,x,0,2,40,34,z=.435)
 for j,x in enumerate(range(-62,65,8)):
  street_tree(g,x,21.1,1.02+(j%3)*.07,j,blossom=j%5==0)
 for x in [-64,-22,8,39,64]:
  lamp(g,x,-19.8);bench(g,x,-17.7)
 for a,b in [((-66,-20),(-66,20)),((66,-20),(66,20))]:low_hedge(g,a,b,.68)
 # A permanent flowering grove fills the remaining north-east lawn.
 for j,(xx,yy,ss) in enumerate([(43,14,1.3),(51,16,1.45),(60,12,1.3),(44,5,1.05),(61,3,1.1),(-63,-18,1.1),(-23,-18,1.1),(5,-18,1.05),(38,-18,1.1)]):
  street_tree(g,xx,yy,ss,j+56,blossom=j%4==0)
  for dx in [-1.2,1.2]:bush(g,xx+dx,yy,.85,j,True)
 paving(g,52,8,8,5,39,z=.45);bench(g,52,9);planter(g,47.5,8,s=1.3);planter(g,56.5,8,s=1.3)
 for xx in [-58,-33,-18,4,39,63]:
  for yy in [-18.2,18.2]:bush(g,xx,yy,.75,2,True)
 g.emit(static,'health_landscape')
 for slot in slots:
  if slot['district_id']!='health':continue
  sid=slot['slot_id'];x,y=slot['local_center_xy_m'];w,d=slot['footprint_xy_m']
  o=empty(sid,dynamic,kind='level',district='health',minLevel=slot['min_level'],assetVersion='0.3');roots.append(o);t=Geometry()
  if sid=='health_loop':
   band(t,x,y,.5,21.5,16.5,4.8,'paver',96);band(t,x,y,.55,21,16,3.7,'track',96)
   for inset in [.3,1.35,2.4,3.45]:band(t,x,y,.58,21-inset,16-inset,.08,'trim',96)
   # Pond inside the running loop, with a pavilion island and a timber footbridge.
   t.cylinder((x,y,.42),1,.1,'lawn')
   t.mesh([(x+math.cos(i*TAU/72)*14.5,y+math.sin(i*TAU/72)*9.8,.51) for i in range(72)],[tuple(range(72))],'stone')
   t.mesh([(x+math.cos(i*TAU/72)*14,y+math.sin(i*TAU/72)*9.3,.55) for i in range(72)],[tuple(range(72))],'water')
   t.cylinder((x+4,y+2,.65),5.5,.35,'paver',32)
   b=Geometry();gazebo(b,0,0);transfer(t,b,x+4,y+2,scale=.85)
   for j in range(15):t.box((x+4,y-11+j*.72,.85),(2.8,.65,.2),'woodlight',bevel=.02)
   for xx in [x+2.4,x+5.6]:
    for yy in [y-11,y-7,y-3]:t.rod((xx,yy,.7),(xx,yy,2.1),.075,'wood',7)
    t.rod((xx,y-11,1.9),(xx,y-3,1.9),.07,'wood',7)
   # Fountain and ripples in the open half of the pond.
   t.cylinder((x-7,y,.82),1.45,.45,'cream',24);t.cylinder((x-7,y,1.65),.2,1.6,'cream',10)
   for j in range(8):
    a=j*TAU/8;line(t,[(x-7,y,2.1),(x-7+math.cos(a)*.7,y+math.sin(a)*.7,2.9),(x-7+math.cos(a)*2,y+math.sin(a)*2,.62)],.035,'water',6)
   for r in [2.5,3.8]:band(t,x-7,y,.57,r,r,.035,'paperblue',48)
   for xx,yy in [(x-15,y+8),(x-15,y-8),(x+14,y+9),(x+14,y-8)]:
    street_tree(t,xx,yy,1.05,int(xx));bush(t,xx+1,yy,.8,4,True)
   for xx,yy in [(x-5,y+11),(x+3,y+11)]:bench(t,xx,yy)
   for xx,yy in [(x-17,y-1),(x+17,y+3)]:person(t,xx,yy,'roofred')
  elif sid=='health_court':
   t.box((x,y,.44),(21.7,15.6,.3),'cream',bevel=.13);t.box((x,y,.63),(21,15,.1),'court',bevel=.06)
   t.box((x,y+3.1,.70),(6.8,7.2,.035),'court2')
   line(t,[(x-9.6,y-6.8,.74),(x+9.6,y-6.8,.74),(x+9.6,y+6.8,.74),(x-9.6,y+6.8,.74),(x-9.6,y-6.8,.74)],.055)
   line(t,[(x-3.4,y+6.8,.76),(x-3.4,y-.5,.76),(x+3.4,y-.5,.76),(x+3.4,y+6.8,.76)],.05)
   band(t,x,y-.5,.77,3.4,3.4,.09,'trim',48,math.pi,TAU)
   band(t,x,y+5.5,.77,8.5,10.6,.09,'trim',64,math.pi,TAU)
   t.rod((x,y+7,.5),(x,y+7,5.8),.14,'metal',10);t.rod((x,y+7,5.8),(x,y+5.5,5.8),.11,'metal',8)
   t.box((x,y+5.5,5.5),(3.25,.19,2.1),'trim',bevel=.06);t.box((x,y+5.37,5.3),(1.25,.06,.75),'roofred')
   band(t,x,y+4.65,4.96,.68,.68,.10,'orange',24)
   for j in range(8):
    a=j*TAU/8;t.rod((x+math.cos(a)*.6,y+4.65+math.sin(a)*.6,4.92),(x+math.cos(a)*.35,y+4.65+math.sin(a)*.35,4.1),.018,'cream',5)
   fence_metal(t,(x-10.5,y+7.5),(x+10.5,y+7.5),4)
   for xx in [x-9,x+9]:lamp(t,xx,y+6.8)
   t.ball((x-3,y-2,1.02),(.35,.35,.35),'orange',2);person(t,x+4,y-3,'blue',ground=.7)
  elif sid=='health_gym':
   t.box((x,y,.5),(15.6,13.6,.35),'sand',bevel=.2)
   for xx in [-5,0,5]:t.box((x+xx,y,.73),(3.8,10.8,.12),'rubber',bevel=.2)
   # Pull-up bars, a shoulder wheel and an elliptical trainer.
   for xx in [x-6,x-3]:t.rod((xx,y+3,.8),(xx,y+3,5.1),.11,'blue',10)
   t.rod((x-6,y+3,5.1),(x-3,y+3,5.1),.14,'yellow',10)
   for yy in [y-3,y]:
    for xx in [x-5.6,x-3.4]:t.rod((xx,yy,.8),(xx,yy,2.5),.11,'blue',8)
   for xx in [x-5.6,x-3.4]:t.rod((xx,y-3,2.5),(xx,y,2.5),.12,'yellow',10)
   for yy in [y-3,y+3]:
    t.rod((x,yy,.8),(x,yy,3.5),.14,'blue',10)
    for side in [-1,1]:
     t.rod((x,yy,2.5),(x+side*.7,yy,3.3),.10,'yellow',8)
     t.rod((x+side*.7,yy,3.3),(x+side*.7,yy-.6,3.3),.1,'metal',8)
    t.box((x,yy-.75,1.55),(1.1,1.3,.35),'woodlight',bevel=.1)
   for yy in [y-3,y+3]:
    t.rod((x+5,yy,.8),(x+5,yy,3.7),.12,'blue',10)
    for side in [-1,1]:
     t.rod((x+5+side*.6,yy,1.6),(x+5+side*.7,yy-.4,3.6),.085,'yellow',8)
     t.box((x+5+side*.7,yy-1,1.15),(.65,1.4,.18),'metal',bevel=.06)
   bench(t,x,y-6)
  elif sid=='health_play':
   t.box((x,y,.44),(23.5,15.4,.3),'sand',bevel=.2)
   b=Geometry();children(b,0,0);transfer(t,b,x-5,y-1,scale=1.25)
   # A separate two-seat swing and spring rider makes Lv3 recognizably richer.
   sx=x+6;sy=y+2
   for xx in [sx-3,sx+3]:
    for yy in [sy-1.7,sy+1.7]:t.rod((xx,yy,.7),(xx,sy,5.4),.14,'wood',8)
   t.rod((sx-3.4,sy,5.4),(sx+3.4,sy,5.4),.17,'roofred',10)
   for xx in [sx-1.35,sx+1.35]:
    for dx in [-.6,.6]:t.rod((xx+dx,sy,5.3),(xx+dx,sy-.4,1.5),.032,'metal',6)
    t.box((xx,sy-.4,1.45),(1.55,.68,.17),'blue',bevel=.07)
   for i in range(5):t.cylinder((x+7,y-4,.9+i*.17),.26,.075,'yellow',10)
   t.ball((x+7,y-4,2),(.9,.35,.45),'roofred',2);t.ball((x+7.6,y-4,2.4),(.3,.3,.4),'roofred',2)
   bench(t,x+7,y-6.5)
  elif sid=='health_yoga':
   t.box((x,y,.62),(23.6,13.5,.6),'wood',bevel=.12)
   for i in range(30):t.box((x-11.5+i*.79,y,.98),(.73,13.2,.16),'woodlight' if i%4 else 'wood',bevel=.025)
   for xx in [x-10.6,x+10.6]:
    for yy in [y-5.5,y+5.5]:t.rod((xx,yy,1),(xx,yy,6.2),.13,'wood',10)
   t.mesh([(x-10.7,y-5.6,6.2),(x+10.7,y-5.6,5.6),(x+10.7,y+5.6,6.2),(x-10.7,y+5.6,5.6),(x,y,5.8)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],'canvas')
   for xx,yy in [(x-6,y-3),(x,y-3),(x+6,y-3),(x-6,y+2),(x,y+2),(x+6,y+2)]:
    t.box((xx,yy,1.12),(2.7,3.8,.12),'lavender' if xx<x+1 else 'paperblue',bevel=.1)
    t.cylinder((xx,yy+1.4,1.34),.43,.3,'cushion',16)
    t.box((xx+1,yy-1,1.35),(.4,.3,.35),'wood',bevel=.035)
   for xx in [x-10.6,x+10.6]:planter(t,xx,y,s=1.5)
   # Rolled mats and storage baskets at the back.
   for i in range(3):t.cylinder((x-1+i,y+5.2,1.5),.26,.8,'lavender',12)
  elif sid=='health_service':
   hut(t,x,y,8,7,4.5,'roofteal','WELLNESS')
   for xx in [x-2,x+2]:t.box((xx,y-4.5,.47),(3,1,.22),'paver',bevel=.04)
   bench(t,x,y+4.7,math.pi)
   t.box((x-5,y-2,1.5),(1.1,1.1,2.2),'blue',bevel=.12);t.box((x-5,y-2,2.65),(1.2,1.2,.18),'cream')
  t.emit(o,sid+'_detail')
 return roots


def vehicle(g,x,y,color='blue',s=1,rot=0,van=False):
 c=Geometry()
 # Profiled cabin, bevelled body, grille, mirrors, lamps and alloy wheels.
 c.box((0,0,1.55),(4.4,8.2,1.65),color,bevel=.28)
 c.box((0,-2.75,2.35),(4.1,2.25,.4),color,bevel=.15)
 vs=[(-1.95,-1.65,2.2),(1.95,-1.65,2.2),(1.95,2.9,2.2),(-1.95,2.9,2.2),(-1.64,-.65,3.72),(1.64,-.65,3.72),(1.64,2.15,3.72),(-1.64,2.15,3.72)]
 c.mesh(vs,[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],'glassdark')
 c.box((0,.72,3.79),(3.5,2.9,.25),color,bevel=.12)
 for side in [-1,1]:
  c.rod((side*1.95,-1.65,2.25),(side*1.64,-.65,3.77),.095,color,8)
  c.rod((side*1.95,2.9,2.25),(side*1.64,2.15,3.77),.095,color,8)
  c.box((side*1.87,.6,3.02),(.12,.19,1.34),color)
  c.box((side*2.05,.9,2.5),(.12,.55,.1),'steel',bevel=.03)
  c.box((side*2.3,-1.3,2.75),(.5,.64,.35),color,bevel=.08)
  for yy in [-2.55,2.5]:
   c.rod((side*1.92,yy,1.15),(side*2.3,yy,1.15),.92,'metal',16)
   c.rod((side*2.3,yy,1.15),(side*2.34,yy,1.15),.58,'steel',12)
   c.rod((side*2.34,yy,1.15),(side*2.36,yy,1.15),.25,'glassdark',10)
   for j in range(5):
    a=j*TAU/5;c.rod((side*2.38,yy+math.sin(a)*.2,1.15+math.cos(a)*.2),(side*2.38,yy+math.sin(a)*.52,1.15+math.cos(a)*.52),.055,'cream',6)
 c.box((0,-4.1,1.2),(3.8,.22,.37),'steel',bevel=.08);c.box((0,-4.22,1.7),(1.9,.06,.5),'metal',bevel=.06)
 for j in range(5):c.box((-.75+j*.37,-4.26,1.7),(.12,.03,.4),'steel')
 for side in [-1,1]:
  c.box((side*1.55,-4.08,2.14),(.85,.16,.46),'cream',bevel=.10)
  c.box((side*1.6,4.06,2.05),(.75,.13,.46),'roofred',bevel=.08)
 c.box((0,-4.28,1.07),(.95,.04,.27),'trim')
 # World metre scale: body + mirrors ~= 1.85 m wide, 4.44 m long.
 metric=Geometry()
 for mat,(vs,fs,sm) in c.data.items():
  metric.mesh([(a*.38,b*.52,c*.44) for a,b,c in vs],fs,mat)
 transfer(g,metric,x,y,z=.72,scale=s,rot=rot)

def chores(static,dynamic):
 g=Geometry();parcel(g,60,40,'paver');roots=[]
 # A tidy municipal recycling hall, with corrugated cladding and sorting bays.
 g.box((0,11,4.3),(25,12,7.8),'plaster2',bevel=.12)
 g.box((0,4.9,4.3),(24,.23,6.8),'leafdark',bevel=.08)
 for i in range(29):g.box((-11.8+i*.84,4.7,4.1),(.075,.13,6.4),'leaf')
 for x in [-11.5,-5.6,5.6,11.5]:g.box((x,4.55,4.3),(.28,.3,7.1),'cream')
 g.box((0,11,8.43),(26,13,.55),'cream',bevel=.13)
 for y in [4.7,17.3]:g.box((0,y,8.9),(26,.25,.6),'plaster')
 solar(g,-6.5,11,8.85,9,8);solar(g,6.5,11,8.85,9,8)
 # Dimensional recycling emblem on the central sign panel.
 g.box((0,4.4,5.9),(8,.3,3.1),'leaf',bevel=.1)
 for i in range(3):
  a=i*TAU/3;cx=math.sin(a)*.85;cz=6.15+math.cos(a)*.85
  b=Geometry();b.mesh([(-.28,0,0),(.28,0,0),(.28,0,.75),(.6,0,.75),(0,0,1.4),(-.6,0,.75),(-.28,0,.75)],[(0,1,2,3,4,5,6)],'trim')
  # Rotate within the facade plane.
  for mat,(vs,fs,ss) in b.data.items():g.mesh([(cx+u*math.cos(a)-v*math.sin(a),4.2,cz+u*math.sin(a)+v*math.cos(a)) for u,_,v in vs],fs,mat)
 text_mesh(g,'RECYCLE',(0,4.18,4.73),.62)
 for x in [-8.2,8.2]:
  g.box((x,4.35,2.5),(5,.25,3.2),'metal',bevel=.07)
  for z in [1.2,1.7,2.2,2.7,3.2,3.7]:g.box((x,4.16,z),(4.7,.07,.08),'steel')
 for k in range(6):
  x=-17+k%3*17;y=-13+k//3*11
  g.box((x,y,.55),(13,9,.55),'stone',bevel=.12)
  for xx in [x-6.5,x+6.5]:g.box((xx,y,1.4),(.4,9,1.7),'cream',bevel=.06)
  g.box((x,y+4.45,1.4),(13,.4,1.7),'cream',bevel=.06)
  for xx in [x-6.2,x+6.2]:g.box((xx,y+4.5,2.5),(.3,.45,1.3),'yellow',bevel=.04)
  g.box((x,y-4.1,.86),(12.3,.2,.04),'yellow')
  g.box((x,y+4.19,2.12),(3.5,.17,.9),['blue','roofred','wood','leaf','orange','glassdark'][k],bevel=.05)
  text_mesh(g,['PAPER','MIXED','TIMBER','GLASS','METAL','SORT'][k],(x,y+4.08,1.9),.39)
  o=empty(f'chore_group_{k}',dynamic,kind='rubbish',slot=k,assetVersion='0.3');roots.append(o);t=Geometry();rng=random.Random(100+k)
  for j in range(12):
   xx=x+rng.uniform(-4.6,4.6);yy=y+rng.uniform(-2.8,2.8);z=.9+(j//6)*.45
   if k==0:
    t.box((xx,yy,z+.3),(rng.uniform(.8,1.9),1.2,.7),'canvas',rot=rng.random(),bevel=.05)
    for dz in [-.15,.1,.3]:t.box((xx,yy-.62,z+.3+dz),(1,.04,.035),'stone')
   elif k==2:
    t.box((xx,yy,z+.2),(2.5,.5,.3),'woodlight',rot=rng.random()*2,bevel=.03)
    if j%3==0:crate(t,xx,yy,z,s=.75)
   elif k==3:
    t.cylinder((xx,yy,z+.45),.27,.9,'glass',12,top=.2);t.cylinder((xx,yy,z+1),.12,.3,'glass',10)
   elif k==4:
    t.cylinder((xx,yy,z+.4),.52,.8,'steel',12);t.cylinder((xx,yy,z+.82),.4,.04,'metal',12)
   else:
    col=rng.choice(['metal','canvas','paperblue','wood'])
    t.ball((xx,yy,z+.45),(.8,.65,.9),col,2)
    t.rod((xx,yy,z+1.1),(xx+.1,yy,z+1.6),.13,col,6,top=.05)
  t.emit(o,o.name)
 # Independent collection vehicle and staff cabin occupy side strips.
 vehicle(g,-25,-12,'leafdark',1.05)
 g.box((-25,-9.4,2.35),(2.3,3.7,2.3),'leaf',bevel=.18)
 g.box((-25,-7.49,2.2),(1.9,.2,1.5),'metal',bevel=.05)
 for side in [-1,1]:
  g.rod((-25+side*.9,-8.7,1.15),(-25+side*1.22,-8.7,1.15),.49,'metal',14)
  g.rod((-25+side*1.22,-8.7,1.15),(-25+side*1.25,-8.7,1.15),.27,'steel',12)
 hut(g,22,11,9,9,5,'roofteal','CITY CARE')
 for i,col in enumerate(['blue','yellow','leaf','roofred']):
  x=16.9+i*2.5;g.box((x,3.8,1.25),(1.8,1.8,1.8),col,bevel=.13);g.box((x,3.8,2.24),(1.95,1.95,.23),'metal',bevel=.08)
  g.box((x,2.86,1.65),(.7,.05,.7),'cream',bevel=.06)
 for a,b in [((-28.5,-19),(-4,-19)),((4,-19),(28.5,-19)),((-28.5,1),(-28.5,19)),((28.5,-17),(28.5,19))]:fence_metal(g,a,b,2)
 for x,y in [(-26,17),(28,17),(-27,1)]:street_tree(g,x,y,.75,int(x))
 for x,y in [(-28,-17),(28,-17),(13,18)]:lamp(g,x,y)
 g.emit(static,'recycling_detail');return roots


def learning(static,dynamic):
 g=Geometry();parcel(g,60,40);roots=[]
 # Warm brick and stone library: true side/rear windows, tiled roof, clock tower.
 x,y=-4,7;w,d=24,14
 g.box((x,y,.6),(25,15,.7),'stone',bevel=.12);g.box((x,y,5.4),(24,14,9.2),'plaster',bevel=.08)
 for yy in [y-7,y+7]:
  for i in range(24):
   for z in [1.3,5.6,9.6]:g.box((x-11.5+i,yy,z),(.94,.16,.42),'brick',bevel=.025)
 for xx in [x-12,x+12]:
  for yy in [y-7,y+7]:g.box((xx,yy,5.4),(.6,.6,9.2),'brick',bevel=.055)
 tiled_roof(g,x,y,10.05,25.2,15.3,3.8,'roofred',31)
 for xx in [-13,-7,-1,5]:
  for z in [3.3,7.5]:window(g,xx,0,z,2.2,2.65)
  tmp=Geometry()
  for z in [3.3,7.5]:window(tmp,0,0,z,2.2,2.65)
  transfer(g,tmp,xx,14,rot=math.pi)
 for side in [-1,1]:
  t=Geometry()
  for yy in [-3,3]:
   for z in [3.3,7.5]:window(t,yy,0,z,2.2,2.65)
  transfer(g,t,x+side*12,y,rot=side*math.pi/2)
 # A central civic entrance with steps and a clock visible from front and back.
 for i in range(4):g.box((-4,-2.5+i*.38,.45+i*.18),(11-i*.45,3.3-i*.6,.35),'paver3',bevel=.05)
 for xx in [-8,-4,0]:g.box((xx,-1.5,3.75),(.42,.42,6),'cream',bevel=.05)
 g.box((-4,-1.1,6.9),(10.5,3.1,.38),'cream',bevel=.08)
 g.box((-4,-2.75,7.55),(9.6,.22,1),'roofteal',bevel=.06);text_mesh(g,'FAMILY LIBRARY',(-4,-2.9,7.26),.64)
 g.box((-4,6,15.65),(5.5,6,5),'plaster2',bevel=.12)
 for zz in [13.5,18.1]:g.box((-4,6,zz),(6.1,6.6,.4),'cream',bevel=.07)
 tiled_roof(g,-4,6,18.33,6.7,7.2,2.5,'roofred',31)
 for yy,rot in [(2.88,0),(9.12,math.pi)]:
  t=Geometry()
  t.rod((0,0,13.5),(0,-.12,13.5),1.6,'stone',40);t.rod((0,-.13,13.5),(0,-.18,13.5),1.38,'cream',40)
  for j in range(12):
   a=j*TAU/12;t.ball((math.sin(a)*1.1,-.21,13.5+math.cos(a)*1.1),(.07,.035,.07),'metal',1)
  t.rod((0,-.25,13.5),(.1,-.25,14.3),.055,'metal',6);t.rod((0,-.26,13.5),(.65,-.26,13.8),.055,'metal',6)
  transfer(g,t,-4,yy,z=2.5,rot=rot)
 # Permanent entry plaza with a sculptural open book fountain.
 paving(g,0,-6.1,54,3,5);paving(g,0,-12.5,3,10,6,z=.425)
 g.cylinder((1,-13,.65),2.3,.5,'stone',24);g.cylinder((1,-13,1.35),1.4,.9,'cream',12)
 for side in [-1,1]:
  g.mesh([(1,-13,2.5),(1+side*2.3,-13,2.9),(1+side*2.3,-10.7,2.9),(1,-10.7,2.5)],[(0,1,2,3)],'paperblue')
  for j in range(3):g.rod((1+side*.4,-12.7+j*.55,2.62),(1+side*1.95,-12.7+j*.55,2.88),.025,'trim',6)
 for x,y in [(-26,16),(27,17),(-27,-16),(27,-16),(-21,5)]:street_tree(g,x,y,1,int(x),blossom=x<0)
 for x,y in [(-26,-5),(26,-5),(-12,-18),(12,-18)]:lamp(g,x,y)
 for a,b in [((-28,18),(28,18)),((-28,-19),(-3,-19)),((3,-19),(28,-19))]:low_hedge(g,a,b,.72,True)
 g.emit(static,'library_detail')
 for level in [2,3]:
  o=empty(f'learning_level_{level}',dynamic,kind='level',district='learning',minLevel=level,assetVersion='0.3');roots.append(o);t=Geometry()
  if level==2:
   paving(t,-17,-12,15,10,38,z=.44)
   # Reading pavilion with bookcase, chairs and a communal table.
   for xx in [-22,-12]:
    for yy in [-15,-9]:t.rod((xx,yy,.7),(xx,yy,4.8),.15,'wood',10)
   for yy in range(-16,-7):t.box((-17,yy,4.9),(13,.2,.26),'woodlight',bevel=.035)
   for xx in [-22,-12]:t.box((xx,-12,4.64),(.25,9,.25),'wood')
   t.box((-17,-12,1.9),(7,2.8,.27),'woodlight',bevel=.09)
   for xx in [-19.8,-14.2]:t.box((xx,-12,1.22),(.18,2.4,1.25),'wood')
   for xx in [-20,-17,-14]:
    chair(t,xx,-14.5);chair(t,xx,-9.5,math.pi)
   t.box((-24.4,-12,2.35),(1.1,6.8,3.3),'wood',bevel=.07)
   for z in [1.2,2.2,3.2]:
    t.box((-23.77,-12,z),(1,6.4,.1),'woodlight')
    for j in range(12):t.box((-23.7,-15+j*.51,z+.43),(.7,.35,.7),['roofred','blue','canvas','lavender'][j%4],bevel=.025)
   for x in [-22,-12]:planter(t,x,-16.5,s=1.2)
   for i in range(6):bush(t,-22+i*2,-8.5,.65,i)
  else:
   # Discovery wing and rooftop observatory are distinct from the reading garden.
   hut(t,20,7,12,14,6,'roofblue','DISCOVER')
   solar(t,20,8,9.3,6,4)
   paving(t,20,-11,13,10,41,z=.44)
   for xx in [17,23]:bench(t,xx,-13)
   t.cylinder((20,-7.5,1.15),1.7,1.1,'stone',16)
   t.rod((20,-7.5,1.7),(20,-7.5,4.8),.16,'metal',10)
   t.rod((18.8,-7.5,4.9),(21.5,-7.5,5.8),.47,'blue',16)
   t.rod((21.5,-7.5,5.8),(21.7,-7.5,5.86),.55,'cream',16)
   t.rod((21.71,-7.5,5.86),(21.73,-7.5,5.87),.4,'glassdark',16)
   person(t,16,-8,'roofred')
   for xx in [15,25]:planter(t,xx,-16,s=1)
  t.emit(o,o.name)
 return roots


def build(static,dynamic,slots):
 roots=[]
 for rid,fn in [('finance',finance),('habits',farm),('cars',garage_metric),('chores',chores),('learning',learning)]:
  print('REFINING_DISTRICT',rid,flush=True);roots.extend(fn(static[rid],dynamic[rid]))
 roots.extend(health(static['health'],dynamic['health'],slots))
 return roots

def garage_metric(static,dynamic):
 """A pair of normal-sized cars; facilities and road use the same metre scale."""
 g=Geometry();parcel(g,60,40,'paver');roots=[]
 g.box((0,-6,.51),(51,22,.3),'asphalt',bevel=.16)
 # Six-metre internal access lane reaches the two service bays from the street.
 for xx in [-2.9,2.9]:g.box((xx,-14,.69),(.10,10,.025),'cream')
 for yy in [-18,-15,-12]:g.box((0,yy,.69),(.10,1.5,.025),'cream')
 g.box((0,7.2,3.3),(16.5,.6,5.4),'plaster',bevel=.09)
 for xx in [-8,0,8]:g.box((xx,2.6,3.3),(.55,9.7,5.4),'plaster2',bevel=.07)
 g.box((0,2.6,6.13),(17.2,10.7,.45),'cream',bevel=.1)
 g.box((0,2.6,6.4),(16.3,9.8,.1),'stone')
 for yy in [-2.65,7.85]:g.box((0,yy,6.65),(17.2,.22,.65),'plaster',bevel=.04)
 for xx in [-8.45,8.45]:g.box((xx,2.6,6.65),(.22,10.5,.65),'plaster',bevel=.04)
 solar(g,-4,3.4,6.57,5.8,5.8);solar(g,4,3.4,6.57,5.8,5.8)
 g.box((0,-2.72,5.37),(16.2,.34,1.05),'blue',bevel=.07);text_mesh(g,'FAMILY GARAGE',(0,-2.92,5.08),.69)
 for i,x in enumerate([-4,4]):
  for zz in [4.62,4.78,4.94]:g.box((x,-2.64,zz),(7.2,.14,.08),'steel')
  for xx in [x-2.55,x+2.55]:
   g.box((xx,-1.6,.72),(.09,12,.025),'yellow')
   g.box((xx,1.4,2.4),(.35,.42,3.4),'blue',bevel=.045)
   g.box((xx,1.4,.85),(.75,.8,.2),'metal',bevel=.03)
   g.rod((xx,1.4,1.1),(x+(-.9 if xx<x else .9),.7,1.1),.085,'yellow',8)
  g.box((x,5.9,1.6),(5.7,1.15,.2),'woodlight',bevel=.04)
  g.box((x,6.62,3),(5.7,.18,2),'glassdark',bevel=.04)
  for k in range(8):
   xx=x-2.35+k*.66;g.rod((xx,6.48,2.5),(xx,6.48,3.27),.035,'steel',6)
   g.ball((xx,6.47,3.36),(.1,.04,.11),'steel',1)
  for xx in [x-2.5,x+2.5]:g.box((xx,5.9,1.1),(.12,.9,.9),'metal')
  vehicle(g,x,-3.4,'blue' if i==0 else 'roofred')
  cid='car_a' if i==0 else 'car_b';o=empty('work_'+cid,dynamic,kind='carWork',carId=cid,assetVersion='0.3');roots.append(o);t=Geometry()
  tx=x+1.85;ty=-4.8
  t.box((tx,ty,1.15),(1,1.35,.9),'roofred',bevel=.06);t.box((tx,ty,1.67),(1.15,1.5,.14),'metal',bevel=.03)
  for zz in [.9,1.16,1.42]:t.box((tx,ty-.71,zz),(.8,.07,.045),'steel')
  for dx in [-.35,.35]:
   for dy in [-.5,.5]:t.ball((tx+dx,ty+dy,.66),(.11,.11,.11),'metal',1)
  person(t,x-1.8,-3.5,'blue',ground=.67)
  for zz in [.78,1.05,1.32]:
   t.cylinder((x-2,-6.4,zz),.36,.24,'metal',16);t.cylinder((x-2,-6.4,zz+.13),.17,.04,'steel',12)
  t.cylinder((tx,-6.4,1.18),.26,.95,'blue',14)
  line(t,[(tx,-6.4,1.67),(tx+.45,-6.4,1.8),(tx+.65,-6,.9),(tx+.1,-5.7,.75)],.03,'metal')
  t.emit(o,o.name)
  o=empty('packed_'+cid,dynamic,kind='carPacked',carId=cid,assetVersion='0.3');roots.append(o);t=Geometry()
  for yy in [-.4,1.2]:crate(t,x+1.5,yy,.7,.55)
  for yy in [-6.8,-8.4]:
   t.box((x+2.5,yy,.75),(.6,.6,.09),'metal',bevel=.02);t.cylinder((x+2.5,yy,1.1),.22,.65,'orange',10,top=.04)
   t.cylinder((x+2.5,yy,1.15),.14,.11,'trim',10,top=.11)
  t.emit(o,o.name)
 # Office, spare-parts store and covered wash pad give the smaller garage context.
 hut(g,17,8,10,10,5,'roofblue','SERVICE')
 for xx in [-25,-15]:
  for yy in [1,10]:g.rod((xx,yy,.5),(xx,yy,4.8),.13,'metal',10)
 g.box((-20,5.5,4.9),(11.5,10.5,.25),'roofteal',bevel=.08)
 for i in range(8):g.box((-20,1.5+i*1.15,.7),(9,.22,.08),'steel')
 for xx in [-23.5,-16.5]:
  g.box((xx,9,1.6),(1.7,1.1,1.8),'blue',bevel=.08)
  line(g,[(xx,8.4,2.3),(xx+.8,7.5,2.8),(xx+1,6,1),(xx+.6,5,.75)],.035,'metal')
 text_mesh(g,'WASH',(-20,.15,4.36),.67)
 for x in [-20,-15,15,20]:
  for xx in [x-1.3,x+1.3]:g.box((xx,-11,.70),(.10,5.3,.025),'trim')
  g.box((x,-8.4,.72),(2.6,.11,.025),'trim')
 for x,y in [(-27,16),(-27,-16),(27,-16),(27,16),(-12,14),(8,15)]:street_tree(g,x,y,1.1,int(x))
 for a,b in [((-27,-14),(-27,11)),((27,-14),(27,11)),((-25,17),(25,17))]:low_hedge(g,a,b,.85)
 for x in [-25,25]:lamp(g,x,-18)
 for x in [11,24]:planter(g,x,1.5,s=1)
 g.emit(static,'garage_metric_detail');return roots
