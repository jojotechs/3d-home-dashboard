"""Continuous coastal terrain and a metric street network."""
from refined_shared import *

def build(base,sea,roads):
 g=Geometry();o=Geometry();rng=random.Random(728)
 n=144;outline=[]
 for i in range(n):
  a=i*TAU/n;c=math.cos(a);s=math.sin(a)
  outline.append((126*math.copysign(abs(c)**.32,c)+1.2*math.sin(a*11),101*math.copysign(abs(s)**.32,s)+1.2*math.sin(a*13)))
 # Equal-distance shoreline samples prevent long bare straight coasts.
 original=outline;lengths=[math.dist(a,b) for a,b in zip(original,original[1:]+original[:1])];total=sum(lengths)
 outline=[];n=240;edge=0;elapsed=0
 for i in range(n):
  distance=i*total/n
  while elapsed+lengths[edge]<distance:elapsed+=lengths[edge];edge+=1
  a=original[edge];b=original[(edge+1)%len(original)];t=(distance-elapsed)/lengths[edge]
  x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t
  v=Vector((x,y)).normalized();noise=rng.uniform(-.55,.55);outline.append((x+v.x*noise,y+v.y*noise))
 # A continuous lawn, jagged mineral strata, and submerged rock toes.
 top=[(0,0,.08)]+[(x,y,.08) for x,y in outline]
 g.mesh(top,[(0,i+1,(i+1)%n+1) for i in range(n)],'lawn2')
 for i,((x,y),(xx,yy)) in enumerate(zip(outline,outline[1:]+outline[:1])):
  outward=Vector((x,y,0)).normalized();out2=Vector((xx,yy,0)).normalized()
  mid=(x+outward.x*rng.uniform(.5,2.4),y+outward.y*rng.uniform(.5,2.4),-4.8-rng.random())
  mid2=(xx+out2.x*1.8,yy+out2.y*1.8,-5.2)
  foot=(x+outward.x*4,y+outward.y*4,-10.7);foot2=(xx+out2.x*4,yy+out2.y*4,-10.7)
  g.mesh([(x,y,.07),(xx,yy,.07),mid2,mid],[(0,1,2),(0,2,3)],'cliff2' if i%3 else 'cliff')
  g.mesh([mid,mid2,foot2,foot],[(0,1,2),(0,2,3)],'cliffdark' if i%4 else 'cliff')
  if i%2==0:
   g.ball((mid[0],mid[1],-4.7),(rng.uniform(2,3.7),rng.uniform(2,3.8),rng.uniform(4,5.5)),['cliff','cliff2','cliffdark'][i%3],1,rot=i*.43)
   g.ball((foot[0],foot[1],-9.3),(2.2,2.4,1.5),'cliff',1)
  if i%3==0:
   tx=x-outward.x*2.7;ty=y-outward.y*2.7
   if not (-79<tx<-62 and ty<-90) and not (-14<tx<73 and ty>88):
    if i%2:pine(g,tx,ty,.95)
    else:street_tree(g,tx,ty,1.08,i)
  # Segmented shoreline foam sits at the water plane.
  a=(foot[0]+outward.x*1.2,foot[1]+outward.y*1.2,-10.42);b=(foot2[0]+out2.x*1.2,foot2[1]+out2.y*1.2,-10.42)
  if i%4!=0:g.rod(a,b,.075,'oceanlight',5)
 o.box((0,0,-11),(5000,5000,1),'ocean')
 for i in range(160):
  a=i*2.4;r=145+rng.random()*30;x=math.cos(a)*r;y=math.sin(a)*r*.84
  if abs(x)<130 and abs(y)<106:continue
  g.rod((x,y,-10.46),(x+rng.uniform(1,4),y+.2,-10.46),.026,'oceanlight',5)
 for road in roads:
  for a,b in zip(road['centerline_xy_m'],road['centerline_xy_m'][1:]):
   dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);ang=math.atan2(dy,dx);nx,ny=-dy/length,dx/length
   mid=((a[0]+b[0])/2,(a[1]+b[1])/2);bridge=road.get('kind')=='bridge'
   g.box((*mid,.4),(length+1,8,.6),'paver',rot=ang,bevel=.07)
   g.box((*mid,.755),(length,6,.13),'asphalt',rot=ang)
   for side in [-1,1]:g.box((mid[0]+nx*side*3.25,mid[1]+ny*side*3.25,.86),(length,.18,.24),'cream',rot=ang,bevel=.035)
   for k in range(3,int(length)-2,6):
    x=a[0]+dx*k/length;y=a[1]+dy*k/length
    g.box((x,y,.833),(2.1,.11,.023),'cream',rot=ang)
   if bridge:
    for k in range(8,int(length),12):
     x=a[0]+dx*k/length;y=a[1]+dy*k/length
     g.box((x,y,-5.1),(2.4,7,12),'stone',rot=ang,bevel=.14)
     g.box((x,y,-10.5),(3.4,8,1),'cliff',rot=ang,bevel=.12)
    for side in [-1,1]:
     ax=a[0]+nx*3.6*side;ay=a[1]+ny*3.6*side;bx=b[0]+nx*3.6*side;by=b[1]+ny*3.6*side
     fence_metal(g,(ax,ay),(bx,by),2.3)
    # The road now continues into the airport island, without a dead-end landing.
 intersections=[(-114,-86),(-114,86),(114,-86),(114,86),(-38,-86),(-38,86),(-38,28),(-38,-28),(38,-86),(38,-28),(38,28),(114,28),(114,-28),(-114,28)]
 for x,y in intersections:
  g.box((x,y,.865),(6.1,6.1,.06),'asphalt')
  for sign in [-1,1]:
   for k in [-2,-1,0,1,2]:g.box((x+k,y+sign*4,.84),(.4,1.65,.025),'trim')
 # Street planting lives in the verges, outside every district reservation.
 for x in [-33.8,33.8]:
  for j,y in enumerate(range(-74,26,11)):
   street_tree(g,x,y,.78,j+30)
   if j%2==0:lamp(g,x,y+4)
 for y in [-79,79]:
  for j,x in enumerate(range(-99,107,14)):
   street_tree(g,x,y,.83,j+11,blossom=j%6==0)
   if j%3==0:bench(g,x+4,y,math.pi if y<0 else 0)
 for x in [-109,109]:
  for j,y in enumerate(range(-72,79,13)):pine(g,x,y,.86)
 for x in [-98,-60,-18,21,60,98]:
  lamp(g,x,24);lamp(g,x,-24)
 # Small coastal destination: lighthouse, stone terrace and timber jetty.
 lx,ly=-72,-96
 g.cylinder((lx,ly,.1),5.2,.45,'paver',32)
 g.cylinder((lx,ly,4.6),2.25,8.8,'cream',24,top=1.65)
 for z,r in [(2.4,2.12),(5.3,1.94),(8.0,1.75)]:g.cylinder((lx,ly,z),r,.9,'roofred',24,top=r-.06)
 g.cylinder((lx,ly,9.3),2.35,.38,'cream',24)
 g.cylinder((lx,ly,10.3),1.45,1.65,'glass',16)
 for i in range(8):
  a=i*TAU/8;g.rod((lx+math.cos(a)*1.5,ly+math.sin(a)*1.5,9.5),(lx+math.cos(a)*1.5,ly+math.sin(a)*1.5,11.1),.065,'cream',7)
 g.cylinder((lx,ly,11.5),1.9,.9,'roofred',16,top=.2)
 g.ball((lx,ly,12.05),(.18,.18,.25),'yellow',2)
 for j in range(24):g.box((-85,-103-j*.7,-2.3),(4,.63,.22),'woodlight',bevel=.025)
 for yy in [-104,-110,-116,-119]:
  for xx in [-87.2,-82.8]:g.cylinder((xx,yy,-6.8),.18,9.3,'wood',9)
 # Two small sailboats make the shoreline scale readable.
 for bx,by,ang in [(-116,-129,-.3),(153,56,.65)]:
  b=Geometry();b.mesh([(-1.1,-3,0),(1.1,-3,0),(1.5,1.8,0),(0,4.2,0),(-1.5,1.8,0),(-.7,-2.8,-.9),(.7,-2.8,-.9),(0,3.2,-.9)],[(0,1,2,3,4),(0,5,6,1),(1,6,7,3,2),(3,7,5,0,4)],'cream')
  b.box((0,-.9,.17),(2,3,.22),'woodlight',bevel=.08)
  b.rod((0,0,.1),(0,0,8),.065,'wood',8)
  b.mesh([(0,0,7.8),(0,3.7,.8),(0,.12,.8)],[(0,1,2)],'canvas');b.mesh([(0,-.2,6.8),(0,-3,.8),(0,-.2,.8)],[(0,1,2)],'paperblue')
  transfer(g,b,bx,by,-9.7,rot=ang)
 g.emit(base,'coastal_city');o.emit(sea,'ocean_surface')
