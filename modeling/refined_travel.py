"""Airport island and coastal high-speed station, in the shared metre scale."""
from refined_shared import *
PALETTE.update({'terminal_glass':'#609EAF','runway':'#526872','airport_blue':'#4386A3','rail_blue':'#427B9B','cabin_glass':'#637F91','airport_teal':'#559F94','airport_coral':'#CB877A'})

def road(g,points,z=.75,width=6,mark=True):
 # One joined ribbon per surface prevents overlapping coplanar road boxes.
 closed=points[0]==points[-1];pts=points[:-1] if closed else points;n=len(pts)
 def ribbon(w,top,bottom,mat):
  pairs=[]
  for i,p in enumerate(pts):
   before=Vector(pts[(i-1)%n]);after=Vector(pts[(i+1)%n]);v=Vector(p)
   d0=(v-before).normalized() if closed or i>0 else (after-v).normalized()
   d1=(after-v).normalized() if closed or i<n-1 else d0
   n0=Vector((-d0.y,d0.x));n1=Vector((-d1.y,d1.x));m=(n0+n1).normalized()
   offset=m*(w/2/max(.35,m.dot(n1)))
   pairs.append((v+offset,v-offset))
  for i in range(n if closed else n-1):
   j=(i+1)%n;a,b=pairs[i];c,d=pairs[j]
   g.mesh([(a.x,a.y,top),(b.x,b.y,top),(d.x,d.y,top),(c.x,c.y,top)],[(0,1,2,3)],mat)
   for u,v in [(a,c),(d,b)]:g.mesh([(u.x,u.y,bottom),(v.x,v.y,bottom),(v.x,v.y,top),(u.x,u.y,top)],[(0,1,2,3)],mat)
  if not closed:
   for a,b in [pairs[0],pairs[-1]]:g.mesh([(a.x,a.y,bottom),(b.x,b.y,bottom),(b.x,b.y,top),(a.x,a.y,top)],[(0,1,2,3)],mat)
 ribbon(width+1.5,z,z-.5,'paver');ribbon(width,z+.06,z,'asphalt')
 if mark:
  for a,b in zip(points,points[1:]):
   dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);angle=math.atan2(dy,dx)
   for k in range(4,int(length)-3,5):g.box((a[0]+dx*k/length,a[1]+dy*k/length,z+.078),(1.9,.10,.018),'cream',rot=angle)

def airport_island(g):
 rng=random.Random(512);n=96;edge=[]
 for i in range(n):
  a=i*TAU/n;c,s=math.cos(a),math.sin(a)
  edge.append((76*math.copysign(abs(c)**.48,c),-18+70*math.copysign(abs(s)**.48,s)))
 g.mesh([(0,0,.08)]+[(x,y,.08) for x,y in edge],[(0,i+1,(i+1)%n+1) for i in range(n)],'lawn2')
 for i,((x,y),(xx,yy)) in enumerate(zip(edge,edge[1:]+edge[:1])):
  v=Vector((x,y,0)).normalized();vv=Vector((xx,yy,0)).normalized()
  g.mesh([(x,y,.06),(xx,yy,.06),(xx+vv.x*2,yy+vv.y*2,-5.2),(x+v.x*2,y+v.y*2,-5.2)],[(0,1,2),(0,2,3)],'cliff2')
  g.mesh([(x+v.x*2,y+v.y*2,-5.2),(xx+vv.x*2,yy+vv.y*2,-5.2),(xx+vv.x*4,yy+vv.y*4,-10.7),(x+v.x*4,y+v.y*4,-10.7)],[(0,1,2,3)],'cliff')
  if i%2==0:g.ball((x+v.x*2,y+v.y*2,-5.3),(2.3,2.4,5.4),'cliff2' if i%4 else 'cliff',1,rot=i)
  if i%4==0 and not (x<-55 and y>15):
   if y>40 or abs(x)>65:pine(g,x-v.x*4,y-v.y*4,.65+rng.random()*.17)
  if i%3:g.rod((x+v.x*5,y+v.y*5,-10.43),(xx+vv.x*5,yy+vv.y*5,-10.43),.05,'oceanlight',5)

def wing(g,verts,mat='cream',thickness=.14):
 n=len(verts);normal=(Vector(verts[1])-Vector(verts[0])).cross(Vector(verts[2])-Vector(verts[0])).normalized()
 g.mesh(verts+[tuple(Vector(v)-normal*thickness) for v in verts],
  [tuple(range(n)),tuple(range(n,2*n))[::-1]]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat)

def airliner(g,x,y,scale=1,rot=0,accent='airport_blue'):
 # Regional jet: 26 m length, 25.8 m wingspan. Ground vehicles stay car-sized.
 a=Geometry()
 a.rod((0,-8.5,2.5),(0,8.5,2.5),1.22,'cream',24)
 a.rod((0,-8.5,2.5),(0,-12.2,2.25),1.22,'cream',24,top=.09)
 a.rod((0,8.5,2.5),(0,13.5,2.95),1.22,'cream',24,top=.18)
 for s in [-1,1]:
  wing(a,[(s*.8,-1.9,2.4),(s*12.9,3.3,2.65),(s*12.7,5.1,2.7),(s*1,3.0,2.4)])
  wing(a,[(s*.3,9,3.1),(s*4.9,11,3.3),(s*4.8,12.5,3.3),(s*.3,11.6,3.1)],accent)
  a.rod((s*4.6,-.65,1.4),(s*4.6,2.8,1.4),.68,'cream',20,top=.48)
  a.rod((s*4.6,-.72,1.4),(s*4.6,-.76,1.4),.52,'metal',20)
  for j in range(11):a.box((s*1.213,-6.3+j*1.21,2.84),(.055,.48,.42),'cabin_glass',bevel=.10)
  for yy in [-7.3,7.7]:a.box((s*1.19,yy,2.48),(.055,.72,1.5),'stone',bevel=.06)
  a.box((s*.55,-9.9,2.9),(.8,1.35,.3),'glassdark',rot=s*.35,bevel=.12)
  a.rod((s*1.35,2,.65),(s*1.1,2,1.65),.10,'steel',8)
  a.rod((s*1.05,2,.5),(s*1.65,2,.5),.37,'metal',12)
  a.ball((s*12.8,4,2.78),(.09,.12,.10),'roofred' if s<0 else 'leaf',1)
 wing(a,[(0,8.3,3.4),(0,10.1,7.6),(0,12.4,7.6),(0,12.6,3.4)],accent,.20)
 a.rod((0,-8.6,.55),(0,-8.6,1.7),.09,'steel',8)
 a.rod((-.25,-8.6,.45),(.25,-8.6,.45),.29,'metal',12)
 transfer(g,a,x,y,z=.43,scale=scale,rot=rot)

def arched_canopy(g,x,y,w,d,z,h,mat='cream',count=9):
 # Barrel roof: metal ribs and a shallow curve, with roof glazing strips.
 n=20
 for j in range(n):
  a=j*math.pi/n;b=(j+1)*math.pi/n
  g.mesh([(x-w/2,y+d/2*math.cos(a),z+h*math.sin(a)),(x+w/2,y+d/2*math.cos(a),z+h*math.sin(a)),
          (x+w/2,y+d/2*math.cos(b),z+h*math.sin(b)),(x-w/2,y+d/2*math.cos(b),z+h*math.sin(b))],[(0,1,2,3)],'glasslight' if 7<=j<=10 else mat)
 for j in range(count):
  xx=x-w/2+j*w/(count-1)
  line(g,[(xx,y+d/2*math.cos(k*math.pi/n),z+h*math.sin(k*math.pi/n)) for k in range(n+1)],.075,'steel',6)
 for yy in [y-d/2,y+d/2]:g.rod((x-w/2,yy,z),(x+w/2,yy,z),.10,'cream',8)

def airport(static):
 g=Geometry();airport_island(g)
 # Loop road reaches the exact end of the user's southeast bridge.
 road(g,[(-58,29),(-52,35),(52,35),(58,29),(52,23),(-52,23),(-58,29)])
 road(g,[(-64,30.75),(-58,29)])
 g.cylinder((-58,29,.817),3.95,.016,'asphalt',32)
 # Glass terminal, roof seams, departures canopy and small landscaped forecourt.
 tx,ty=5,8;g.box((tx,ty,.5),(45,19,.55),'paver',bevel=.14)
 g.box((tx,ty,4.15),(42,16,7.2),'terminal_glass',bevel=.12)
 for yy in [ty-8.07,ty+8.07]:
  for j in range(15):g.box((tx-21+j*3,yy,4.25),(.16,.25,7.4),'cream')
  for z in [.9,4.3,7.85]:g.box((tx,yy,z),(42.4,.24,.17),'cream')
 for xx in [tx-21.1,tx+21.1]:
  for j in range(6):g.box((xx,ty-7.5+j*3,4.2),(.24,.14,7.3),'cream')
 arched_canopy(g,tx,ty,46,19,7.85,2.3,'cream',15)
 g.box((tx,18.9,4.4),(35,5,.23),'cream',bevel=.10)
 for xx in [-10,0,10,20]:g.rod((xx,20.6,.7),(xx,20.6,4.35),.10,'steel',8)
 # The north-facing sign rotates with the entrance.
 s=Geometry();text_mesh(s,'FAMILY ISLAND AIRPORT',(0,0,5.65),.77,'cream');transfer(g,s,tx,16.20,rot=math.pi)
 for xx in [-8,0,8,16]:g.box((xx,16.17,2.3),(2.1,.18,3.2),'glassdark')
 for j in range(3):solar(g,tx-12+j*12,ty,10.05,8,4)
 for xx in [-20,32]:
  g.box((xx,18.8,.78),(4.5,3,.6),'cream',bevel=.10);bush(g,xx,18.8,.95,int(xx));street_tree(g,xx,19,.8,int(xx))
 paving(g,5,19.5,58,4.5,61,z=.72)
 # Control tower, wraparound cab and railings.
 cx,cy=-37,10
 g.box((cx,cy,.7),(8,8,.65),'paver',bevel=.12)
 g.box((cx,cy,8.2),(3.8,4,15),'cream',bevel=.16)
 for zz in [2,5,8,11]:g.box((cx,cy-2.05,zz),(1.1,.15,1.35),'glassdark')
 g.cylinder((cx,cy,15.2),4.2,.48,'cream',8)
 g.cylinder((cx,cy,17.1),3.6,3.4,'glassdark',8,top=4)
 for j in range(8):
  a=j*TAU/8;g.rod((cx+3.6*math.cos(a),cy+3.6*math.sin(a),15.4),(cx+4*math.cos(a),cy+4*math.sin(a),18.8),.09,'cream',8)
 g.cylinder((cx,cy,19.05),4.45,.4,'cream',8)
 g.rod((cx,cy,19.3),(cx,cy,22),.07,'steel',8)
 g.box((cx,cy,21.5),(3.8,.38,.42),'airport_blue',bevel=.06)
 # Three full-sized aircraft stands, clear of an independent south taxi lane.
 g.box((0,-23,.26),(136,47,.24),'paver2',bevel=.2)
 for i,xx in enumerate([-36,0,36]):
  g.box((xx,-14,.405),(.12,25,.022),'yellow')
  g.box((xx,-1.5,.41),(20,.13,.026),'yellow')
  text_mesh(g,f'0{i+1}',(xx+5,-4,.42),1.2,'yellow')
  actor=empty('transport_aircraft'+('' if i==0 else f'_{i+1}'),static,transportActor='air',fleetSlot=i,forwardAxis='+X')
  actor.location=(xx,-14,0);actor.rotation_euler.z=math.pi/2
  aircraft=Geometry();airliner(aircraft,0,0,rot=math.pi/2,accent=['airport_blue','airport_teal','airport_coral'][i]);aircraft.emit(actor,f'aircraft_{i}_detail')
  for side in [-1,1]:
   taxi=[]
   for k in range(21):
    t=k/20;u=1-t
    taxi.append((xx+side*(3*u*t*t*6+t*t*t*12),u*u*u*-28+3*u*u*t*-38+3*u*t*t*-46+t*t*t*-46,.42))
   line(g,taxi,.055,'yellow',6)
 g.box((0,-46,.405),(113,.12,.025),'yellow')
 # The two turning loops connect the taxi lane to opposite runway thresholds.
 for side in [-1,1]:
  points=[(side*(48+10*math.sin(k*math.pi/32)),-56+10*math.cos(k*math.pi/32)) for k in range(33)]
  road(g,points,.39,7,False)
  line(g,[(x,y,.47) for x,y in points],.055,'yellow',6)
 g.box((0,-66,.28),(123,18,.3),'paver2',bevel=.15)
 g.box((0,-66,.47),(117,12,.13),'runway',bevel=.05)
 for y in [-71.3,-60.7]:g.box((0,y,.55),(115,.10,.026),'cream')
 for x in range(-51,53,8):g.box((x,-66,.554),(3,.19,.025),'cream')
 for side in [-1,1]:
  for j in range(5):g.box((side*52,-70+j*2,.56),(4,.65,.026),'cream')
 for x in range(-58,61,8):
  for y in [-72.7,-59.3]:g.cylinder((x,y,.76),.11,.37,'steel',8);g.ball((x,y,.99),(.14,.14,.1),'yellow',1)
 # Hangar, small service equipment, wind sock and airport fencing.
 hut(g,51,8,19,16,7,'roofblue','HANGAR')
 g.box((51,-.16,3.5),(14,.2,5.6),'metal')
 for j in range(15):g.box((44+j,.0,3.5),(.09,.3,5.3),'steel')
 for xx in [-59,59]:
  for yy in [-81,43]:pine(g,xx,yy,.75)
 for x in range(-47,48,14):street_tree(g,x,44,.76,20+x)
 g.rod((-67,5,.5),(-67,5,5),.09,'steel',8)
 g.rod((-67,5,5),(-64.8,5,4.7),.40,'roofred',12,top=.16)
 for x,y in [(-23,2),(-21,2),(-19,2)]:g.box((x,y,.95),(1.5,1.1,.95),'steel',bevel=.10)
 for a,b in [((-69,-82),(69,-82)),((-69,-82),(-69,13)),((69,-82),(69,14))]:fence_metal(g,a,b,1.7)
 for x,y in [(-9,19),(5,20),(19,20),(-31,20)]:person(g,x,y,'blue',ground=.8)
 g.emit(static,'airport_island_detail')

def high_speed_car(g,x,y,nose=False,accent='rail_blue'):
 a=Geometry();a.box((0,0,2.2),(14.8,2.75,2.75),'cream',bevel=.44)
 a.box((0,0,3.61),(13.9,2.50,.18),'cream',bevel=.08)
 for side in [-1,1]:
  a.box((0,side*1.384,2.8),(13.7,.07,.84),accent,bevel=.08)
  for j in range(9):a.box((-5.6+j*1.38,side*1.43,2.94),(.99,.04,.49),'cabin_glass',bevel=.08)
  for xx in [-5.8,5.8]:a.box((xx,side*1.42,1.98),(.62,.05,1.8),'stone',bevel=.03)
  for xx in [-4.5,4.5]:a.box((xx,side*1.1,.68),(2.4,.45,.6),'metal',bevel=.13)
 if nose:
  a.mesh([(7.25,-1.36,.82),(7.25,1.36,.82),(10.8,.50,1.05),(10.8,-.50,1.05),(7.25,-1.15,3.5),(7.25,1.15,3.5),(9.4,.6,2.35),(9.4,-.6,2.35)],
   [(0,1,2,3),(4,7,6,5),(0,3,7,4),(1,5,6,2),(3,2,6,7)],'cream')
  a.mesh([(7.8,-1.05,3.25),(7.8,1.05,3.25),(9.15,.62,2.48),(9.15,-.62,2.48)],[(0,1,2,3)],'glassdark')
 transfer(g,a,x,y,z=.85)

def rail_station(static):
 g=Geometry()
 # A coastal pier joins the existing northern sidewalk; tracks occupy the sea side.
 g.box((0,0,-.12),(78,28,1.05),'stone',bevel=.16)
 g.box((0,0,.45),(77.4,27.4,.14),'paver',bevel=.08)
 for xx in range(-32,34,13):
  for yy in [5,12]:g.box((xx,yy,-5.4),(1.8,2.3,11),'stone',bevel=.12)
 g.box((0,-6,3.7),(48,9,6.3),'terminal_glass',bevel=.10)
 for j in range(17):g.box((-24+j*3,-10.55,3.8),(.15,.25,6.5),'cream')
 for z in [.8,3.8,6.85]:g.box((0,-10.6,z),(48.4,.23,.17),'cream')
 for xx in [-24,24]:
  for j in range(4):g.box((xx,-10.4+j*2.8,3.8),(.22,.16,6.3),'cream')
 arched_canopy(g,0,-6,53,12,6.9,2.3,'cream',15)
 text_mesh(g,'FAMILY COAST STATION',(0,-10.79,5.9),.8,'cream')
 for x in [-12,-4,4,12]:g.box((x,-10.73,2.3),(2.6,.15,3.3),'glassdark')
 g.box((0,-12.4,3.5),(37,3.1,.24),'cream',bevel=.06)
 for xx in [-16,-8,8,16]:g.rod((xx,-13.2,.6),(xx,-13.2,3.4),.09,'steel',8)
 # Platform sits between the two coastal tracks.
 g.box((0,8,.93),(69,3.4,.86),'cream',bevel=.09)
 for y in [6.58,9.42]:g.box((0,y,1.38),(68,.22,.03),'yellow')
 for xx in range(-28,30,8):g.rod((xx,8,1.35),(xx,8,5.8),.12,'steel',8)
 arched_canopy(g,0,8,71,5.2,5.8,1.0,'cream',18)
 for xx in [-23,-7,9,25]:
  b=Geometry();bench(b,0,0);transfer(g,b,xx,8,z=1.36,scale=.48)
  person(g,xx+2,8,'blue',ground=1.36)
 # The pedestrian access tunnel crosses under the tracks; entrances are readable.
 for xx in [-30,30]:
  g.box((xx,0,1.6),(4.8,4,2.6),'cream',bevel=.10)
  g.box((xx,-2.05,1.7),(3.3,.18,2.7),'glassdark')
  g.box((xx,0,3.1),(5.4,4.6,.25),'rail_blue',bevel=.05)
 for xx in [-34,34]:
  g.box((xx,-8,.75),(4.5,4.5,.5),'cream',bevel=.08);street_tree(g,xx,-8,.8,int(xx))
  person(g,xx-1,-11,'roofred',ground=.55)
 # Two separate tracks, both trains have driving cabs at each end.
 for i,yy in enumerate([11.2,4.8]):
  actor=empty('transport_train'+('' if i==0 else '_2'),static,transportActor='rail',fleetSlot=i,forwardAxis='+X')
  actor.location=(0,yy,0)
  train=Geometry();rear=Geometry();accent=['rail_blue','airport_teal'][i]
  high_speed_car(rear,0,0,True,accent);transfer(train,rear,-15.5,0,rot=math.pi)
  high_speed_car(train,0,0,False,accent);high_speed_car(train,15.5,0,True,accent);train.emit(actor,f'train_{i}_detail')
 g.emit(static,'coastal_station_detail')

def tunnel_mountain(g,endpoint,inward,seed):
 """Planted coastal mountain, open stone portal and a dark 16 m tunnel."""
 rng=random.Random(seed);front=endpoint+inward*5.5;cy=111;n=20
 # The mountain grows from a solid rocky shoreline, down to the sea floor.
 center=front-inward*13;edge=[]
 for i in range(48):
  a=i*TAU/48;r=1+rng.uniform(-.035,.035)
  edge.append((center+23*math.cos(a)*r,cy+20*math.sin(a)*r))
 for i,(a,b) in enumerate(zip(edge,edge[1:]+edge[:1])):
  g.mesh([(center,cy,.32),(*a,.32),(*b,.32)],[(0,1,2)],'lawn2')
  g.mesh([(*a,.32),(*b,.32),(b[0]*1.0,b[1],-10.8),(a[0],a[1],-10.8)],[(0,1,2),(0,2,3)],'cliff2' if i%3 else 'cliff')
  if i%4==0 and not ((a[0]-front)*inward>-5 and abs(a[1]-cy)<9):g.ball((a[0],a[1],-4),(2.5,2.4,6.7),'cliff',1)
 inner=[];rock=[];ridge=[];rear=[]
 for i in range(n+1):
  a=i*math.pi/n;sn=math.sin(a);co=math.cos(a)
  inner.append((front,cy+6.1*co,1+6*sn))
  rock.append((front-inward*(1+rng.random()*2.2),cy+(8.4+rng.random()*1.7)*co,.33+(9+rng.random()*2.5)*sn))
  ridge.append((front-inward*(9+rng.random()*5),cy+(17+rng.random()*2)*co,.34+(21+rng.random()*3.7)*sn))
  rear.append((front-inward*30,cy+12*co,.33+7.8*sn))
 for i in range(n):
  # Irregular intermediate rings break up the radial wall into broad grass slopes.
  for aa,bb,mat in [(inner,rock,'cliff2' if i%3 else 'cliff'),(rock,ridge,'lawn' if 2<i<18 else 'cliff'),(ridge,rear,'lawn2' if i%3 else 'lawn')]:
   g.mesh([aa[i],aa[i+1],bb[i+1],bb[i]],[(0,1,2),(0,2,3)],mat)
  g.mesh([rear[i],rear[i+1],(front-inward*35,cy,.32)],[(0,1,2)],'lawn2')
  a=i*math.pi/n;b=(i+1)*math.pi/n
  ring=[(front+inward*.16,cy+r*math.cos(t),1+z*math.sin(t)) for r,z,t in [(6.15,6.05,a),(6.15,6.05,b),(6.85,6.75,b),(6.85,6.75,a)]]
  g.mesh(ring,[(0,1,2,3)],'stone' if i%2 else 'paver2')
  p0,p1=inner[i],inner[i+1]
  g.mesh([p0,p1,(p1[0]-inward*16,p1[1],p1[2]),(p0[0]-inward*16,p0[1],p0[2])],[(0,1,2,3)],'cliffdark')
 # Triangulated back wall faces both ways, keeping the mouth dark from any angle.
 for i in range(n):
  vs=[(front-inward*16,cy,.4),(front-inward*16,inner[i][1],inner[i][2]),(front-inward*16,inner[i+1][1],inner[i+1][2])]
  g.mesh(vs,[(0,1,2),(2,1,0)],'metal')
 g.box((front-inward*8,cy,.6),(16,12,.36),'paver2')
 for side in [-1,1]:
  g.box((front+inward*.15,cy+side*6.5,1.2),(.45,.7,2.4),'stone',bevel=.05)
  g.ball((front-inward*4,cy+side*11,3.2),(3.9,3.3,4.1),'cliff2',1)
 # Place trees on sampled grassy faces; every trunk meets the terrain.
 for i in [3,5,7,10,13,15,17]:
  j=(i+1)%(n+1);t=.62 if i%2 else .80
  pos=(Vector(rock[i])+Vector(rock[j]))*.5*(1-t)+(Vector(ridge[i])+Vector(ridge[j]))*.5*t
  tree=Geometry();pine(tree,0,0,.50+rng.random()*.3);transfer(g,tree,pos.x,pos.y,z=pos.z-.18)
 for i in [4,8,12,16]:
  pos=(Vector(ridge[i])+Vector(rear[i]))*.5;tree=Geometry();pine(tree,0,0,.72);transfer(g,tree,pos.x,pos.y,z=pos.z-.15)
 for yy in [cy-3.2,cy+3.2]:
  for side in [-1,1]:g.box((front-inward*8,yy+side*.717,1.03),(16,.105,.16),'steel')
  for j in range(9):g.box((front-inward*j*1.8,yy,.85),(.24,2.55,.22),'wooddark')

def coastal_rail(base):
 g=Geometry();y=111.0
 g.box((8,y,.25),(282,12,.65),'stone',bevel=.1)
 g.box((8,y,.62),(280,11.4,.12),'paver2')
 for xx in range(-124,147,15):g.box((xx,y,-5.4),(2.1,8,11.2),'stone',bevel=.12)
 for yy in [y-3.2,y+3.2]:
  for xx in range(-130,147,2):g.box((xx,yy,.85),(.24,2.55,.22),'wooddark')
  for s in [-1,1]:g.box((8,yy+s*.717,1.03),(280,.105,.16),'steel')
 for yy in [y-5.6,y+5.6]:fence_metal(g,(-132,yy),(148,yy),1.55)
 # User-requested mountains and tunnels at both ends of the railway.
 tunnel_mountain(g,-131,1,74);tunnel_mountain(g,147,-1,95)
 g.emit(base,'coastal_rail_link')

def build(static,base):
 airport(static['airport']);rail_station(static['rail']);coastal_rail(base)
