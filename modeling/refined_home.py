"""Detailed, texture-free neighborhood assets. All detail survives glTF export.

Geometry is batched by material per permanent / unlock group. No render-only
displacement, image planes or external assets are needed by the web renderer.
"""
import bpy, math, random
from collections import defaultdict
from mathutils import Vector

TAU = math.tau
PALETTE = {
 'plaster':'#F5E5C2','plaster2':'#FFF1D5','cream':'#FFF5DC',
 'trim':'#FFFDF2','stone':'#C4BAA3','paver':'#E7DDC7','paver2':'#D9CDB8',
 'paver3':'#F2E8D5','grout':'#B9B39D','lawn':'#8FBA59','lawn2':'#9BC366',
 'soil':'#786447','wood':'#AA6B34','woodlight':'#C6914D','wooddark':'#765134',
 'roofred':'#D96745','roofred2':'#DC704C','roofred3':'#CF6143',
 'roofblue':'#526F9F','roofblue2':'#5B77A6','roofblue3':'#4B6898',
 'roofteal':'#447F8A','roofteal2':'#55939A','roofteal3':'#376B79',
 'glass':'#448BB5','glasslight':'#79B2CC','glassdark':'#315B77',
 'leaf':'#588D38','leaf2':'#7CA744','leaf3':'#9BB94D','leafdark':'#386C35',
 'pink':'#E390A1','rose':'#D66C83','yellow':'#F1C945','orange':'#ED9C45',
 'petal':'#FFF4DA','lavender':'#A090C3','pot':'#C77D53','metal':'#334E53',
 'blue':'#368CD0','cushion':'#F0BC65','canvas':'#FAF0D5','sand':'#E2C891',
 'water':'#63BEC6','steel':'#BCCAD0','screen':'#FAF9E8','paperblue':'#93BFD2',
}
MATERIALS = {}
def setup_materials():
 for name, h in PALETTE.items():
  rgb=[int(h[i:i+2],16)/255 for i in (1,3,5)]
  linear=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
  m=bpy.data.materials.new('home_'+name);m.use_nodes=True;m.diffuse_color=(*linear,1)
  p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear,1)
  p.inputs['Roughness'].default_value=.36 if name.startswith('glass') else .74
  if name in ('steel','metal'):p.inputs['Metallic'].default_value=.45
  MATERIALS[name]=m

SPHERES={}
def sphere_template(detail):
 if detail not in SPHERES:
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=detail,radius=1)
  o=bpy.context.object;SPHERES[detail]=([tuple(v.co) for v in o.data.vertices],[tuple(f.vertices) for f in o.data.polygons])
  bpy.data.objects.remove(o,do_unlink=True)
 return SPHERES[detail]

class Geometry:
 def __init__(self):self.data=defaultdict(lambda:[[],[],[]])
 def mesh(self,verts,faces,mat,loc=(0,0,0),rot=0,smooth=False):
  v,f,s=self.data[mat];n=len(v);co,si=math.cos(rot),math.sin(rot)
  v.extend((loc[0]+x*co-y*si,loc[1]+x*si+y*co,loc[2]+z) for x,y,z in verts)
  f.extend(tuple(i+n for i in face) for face in faces);s.extend([smooth]*len(faces))
 def box(self,loc,size,mat='trim',rot=0,bevel=0):
  x,y,z=[a/2 for a in size]
  if not bevel:
   v=[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
   f=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
  else:
   # A clipped cuboid: six broad faces, twelve chamfers and eight corners.
   b=min(bevel,x*.45,y*.45,z*.45);dims=[x,y,z];v=[];lookup={}
   for sx in [-1,1]:
    for sy in [-1,1]:
     for sz in [-1,1]:
      for axis in range(3):
       sig=(sx,sy,sz);lookup[(sig,axis)]=len(v)
       v.append(tuple(sig[i]*(dims[i] if axis==i else dims[i]-b) for i in range(3)))
   f=[]
   def add(ids):
    pts=[Vector(v[i]) for i in ids];center=sum(pts,Vector())/len(pts)
    if (pts[1]-pts[0]).cross(pts[2]-pts[0]).dot(center)<0:ids=list(reversed(ids))
    f.append(tuple(ids))
   for axis in range(3):
    others=[i for i in range(3) if i!=axis]
    for sign in [-1,1]:
     ids=[]
     for a,b2 in [(-1,-1),(-1,1),(1,1),(1,-1)]:
      sig=[0,0,0];sig[axis]=sign;sig[others[0]]=a;sig[others[1]]=b2
      ids.append(lookup[(tuple(sig),axis)])
     add(ids)
   for axis1,axis2 in [(0,1),(1,2),(0,2)]:
    other=3-axis1-axis2
    for a in [-1,1]:
     for b2 in [-1,1]:
      signs=[]
      for k in [-1,1]:
       sig=[0,0,0];sig[axis1]=a;sig[axis2]=b2;sig[other]=k;signs.append(tuple(sig))
      add([lookup[(signs[0],axis1)],lookup[(signs[1],axis1)],lookup[(signs[1],axis2)],lookup[(signs[0],axis2)]])
   for sig in [(a,b,c) for a in [-1,1] for b in [-1,1] for c in [-1,1]]:
    add([lookup[(sig,axis)] for axis in range(3)])
  self.mesh(v,f,mat,loc,rot)
 def ball(self,loc,size,mat,detail=1,rot=0):
  v,f=sphere_template(detail);self.mesh([(x*size[0],y*size[1],z*size[2]) for x,y,z in v],f,mat,loc,rot,smooth=detail>1)
 def cylinder(self,loc,r,h,mat='wood',n=12,top=None):
  top=r if top is None else top
  v=[(math.cos(i*TAU/n)*radius,math.sin(i*TAU/n)*radius,z) for z,radius in [(-h/2,r),(h/2,top)] for i in range(n)]
  f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  self.mesh(v,f,mat,loc)
 def rod(self,a,b,r,mat='wood',n=8,top=None):
  v=Vector(b)-Vector(a);q=v.to_track_quat('Z','Y');top=r if top is None else top
  verts=[tuple(q@Vector((math.cos(i*TAU/n)*rad,math.sin(i*TAU/n)*rad,z))) for z,rad in [(0,r),(v.length,top)] for i in range(n)]
  faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
  self.mesh(verts,faces,mat,a)
 def emit(self,parent,name):
  for mat,(verts,faces,smooth) in self.data.items():
   if not verts:continue
   me=bpy.data.meshes.new(name+'_'+mat);me.from_pydata(verts,[],faces);me.materials.append(MATERIALS[mat]);me.update()
   for p,s in zip(me.polygons,smooth):p.use_smooth=s
   ob=bpy.data.objects.new(name+'_'+mat,me);bpy.context.collection.objects.link(ob);ob.parent=parent
  return self

def empty(name,parent,**data):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent
 for k,v in data.items():o[k]=v
 return o

def flowers(g,x,y,z=0,s=1,seed=0,color=None):
 rng=random.Random(seed)
 for i in range(5):
  a=i*2.4;xx=x+math.cos(a)*.42*s;yy=y+math.sin(a)*.42*s;h=rng.uniform(.5,1)*s
  g.rod((xx,yy,z),(xx,yy,z+h),.045*s,'leafdark',5)
  g.ball((xx+.15*s,yy,z+h*.5),(.3*s,.11*s,.1*s),'leaf',1,rot=a)
  c=color or rng.choice(['petal','pink','rose','yellow'])
  for j in range(5):
   b=j*TAU/5;g.ball((xx+math.cos(b)*.16*s,yy+math.sin(b)*.16*s,z+h),(.16*s,.16*s,.1*s),c)
  g.ball((xx,yy,z+h+.06*s),(.1*s,.1*s,.09*s),'yellow')

def bush(g,x,y,s=1,seed=0,flowers_on=False):
 rng=random.Random(seed)
 for j in range(4):
  a=j*2.4;g.ball((x+math.cos(a)*s*.35,y+math.sin(a)*s*.35,.65*s),(s*.72,s*.68,s*.72),rng.choice(['leaf','leaf2','leaf3']),2)
 if flowers_on:flowers(g,x,y,.85*s,s*.65,seed)

def tree(g,x,y,s=1,seed=0):
 rng=random.Random(seed)
 g.cylinder((x,y,2*s),.24*s,4*s,'wooddark',9,top=.13*s)
 for a in [0,2.1,4.2]:g.rod((x,y,2*s),(x+math.cos(a)*s,y+math.sin(a)*s,3.6*s),.12*s,'wooddark',7,top=.06*s)
 for j in range(9):
  a=j*2.4;r=.85 if j<6 else .35;h=(3.4+j*.27)*s
  g.ball((x+math.cos(a)*r*s,y+math.sin(a)*r*s,h),(1.12*s,1.05*s,1.25*s),rng.choice(['leaf','leaf','leaf2','leaf3']),2)

def pickets(g,a,b,height=1.45):
 delta=Vector((b[0]-a[0],b[1]-a[1],0));length=delta.length;rot=math.atan2(delta.y,delta.x);count=max(1,round(length/.65))
 for k in range(count+1):
  x=a[0]+delta.x*k/count;y=a[1]+delta.y*k/count
  g.box((x,y,.35+height/2),(.29,.17,height),'trim',rot,bevel=.025)
  g.mesh([(-.145,-.085,0),(.145,-.085,0),(0,-.085,.23),(-.145,.085,0),(.145,.085,0),(0,.085,.23)],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'trim',(x,y,.35+height),rot)
 for z in [.67,1.36]:g.box(((a[0]+b[0])/2,(a[1]+b[1])/2,z),(length,.16,.13),'trim',rot)
 for x,y in [a,b]:
  g.box((x,y,1.08),(.36,.36,1.6),'trim',bevel=.04);g.box((x,y,1.94),(.49,.49,.15),'cream',bevel=.03)

def paving(g,x,y,w,d,seed=0,z=.4):
 rng=random.Random(seed);g.box((x,y,z-.07),(w+.15,d+.15,.15),'grout')
 nx=max(1,round(w/1.2));ny=max(1,round(d/1.25))
 for i in range(nx):
  for j in range(ny):g.box((x-w/2+(i+.5)*w/nx,y-d/2+(j+.5)*d/ny,z),(w/nx-.055,d/ny-.055,.12),rng.choice(['paver','paver','paver2','paver3']),bevel=.025)

def planter(g,x,y,z=0,s=1,seed=0):
 g.cylinder((x,y,z+.36*s),.36*s,.72*s,'pot',12,top=.48*s)
 g.cylinder((x,y,z+.76*s),.52*s,.15*s,'pot',12);g.cylinder((x,y,z+.85*s),.44*s,.03*s,'soil',12)
 flowers(g,x,y,z+.8*s,.8*s,seed)

def window(g,x,y,z,w=1.75,h=2.05,shutters=False):
 # Window faces toward -Y; nested geometry gives true depth and shadow.
 g.box((x,y+.04,z),(w+.32,.23,h+.32),'stone',bevel=.035)
 g.box((x,y-.08,z),(w+.18,.18,h+.18),'trim',bevel=.035)
 g.box((x,y-.19,z),(w-.15,.08,h-.14),'glassdark')
 g.box((x-.11,y-.245,z+.15),(w-.43,.045,h-.44),'glass')
 g.box((x+w*.22,y-.28,z),(w*.18,.018,h-.18),'glasslight')
 for xx in [x-w/2,x,x+w/2]:g.box((xx,y-.29,z),(.09,.1,h+.1),'trim')
 for zz in [z-h/2,z,z+h/2]:g.box((x,y-.29,zz),(w+.12,.1,.09),'trim')
 g.box((x,y-.28,z-h/2-.19),(w+.5,.6,.16),'cream',bevel=.03)
 if shutters:
  for sign in [-1,1]:
   sx=x+sign*(w/2+.4);g.box((sx,y-.08,z),(.47,.15,h),'roofblue',bevel=.025)
   for k in range(9):g.box((sx,y-.18,z-h/2+.12+k*(h-.24)/8),(.4,.08,.055),'roofblue2')

def tiled_roof(g,x,y,z,w,d,h,mat,seed=0):
 rng=random.Random(seed)
 g.mesh([(-w/2,-d/2,0),(w/2,-d/2,0),(w/2,d/2,0),(-w/2,d/2,0),(0,-d/2,h),(0,d/2,h)],[(0,1,4),(3,5,2),(0,4,5,3),(1,2,5,4),(0,3,2,1)],mat,(x,y,z))
 # Tiles form both slopes. Rows overlap and alternate joints.
 rows=12;cols=max(8,round(d/.5));dw=w/2/rows;dd=d/cols
 for side in [-1,1]:
  for i in range(rows):
   u=i*dw;v=(i+1)*dw+.035
   for j in range(cols):
    y0=-d/2+j*dd+.014;y1=y0+dd-.025
    u0=u+.02;u1=min(v,w/2+.03);z0=h*(1-u0/(w/2))+.07;z1=h*(1-u1/(w/2))+.10
    verts=[(side*u0,y0,z0),(side*u1,y0,z1),(side*u1,y1,z1),(side*u0,y1,z0)]
    verts+= [(a,b,c-.075) for a,b,c in verts]
    g.mesh(verts,[(0,1,2,3),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],rng.choice([mat,mat,mat+'2',mat+'3']),(x,y,z))
 for yy in [-d/2-.045,d/2+.045]:
  g.rod((x-w/2,y+yy,z-.02),(x,y+yy,z+h+.1),.095,'trim',8)
  g.rod((x,y+yy,z+h+.1),(x+w/2,y+yy,z-.02),.095,'trim',8)
 for xx in [-w/2,w/2]:g.box((x+xx,y,z-.08),(.17,d+.25,.26),'cream')
 for j in range(cols):g.rod((x,y-d/2+j*dd,z+h+.07),(x,y-d/2+(j+1)*dd,z+h+.07),.14,mat+'2',8)

def house(g,x,y,variant):
 w,d=8.8,8.4;h=8.8;z0=.75;front=y-d/2
 mat=['roofred','roofblue','roofblue'][variant]
 g.box((x,y,.45),(w+.7,d+.7,.55),'stone',bevel=.12)
 g.box((x,y,z0+h/2),(w,d,h),'plaster2' if variant==1 else 'plaster',bevel=.055)
 # Foundation blocks, corner quoins and floor cornice.
 for yy in [front-.1,y+d/2+.1]:
  for k in range(9):g.box((x-w/2+(k+.5)*w/9,yy,1.03),(w/9-.06,.16,.5),'cream',bevel=.025)
 for xx in [x-w/2-.06,x+w/2+.06]:
  for yy in [front-.05,y+d/2+.05]:
   for k in range(10):g.box((xx,yy,1.45+k*.76),(.36,.36,.52),'cream',bevel=.03)
 for z in [1.35,5.1,9.45]:g.box((x,y,z),(w+.22,d+.22,.19),'cream',bevel=.035)
 tiled_roof(g,x,y,9.55,w+1.05,d+1.15,3.4,mat,variant+14)
 # Gable infill and attic window.
 for yy in [front-.586,y+d/2+.586]:
  g.mesh([(-(w+1.05)/2,0,0),((w+1.05)/2,0,0),(0,0,3.4)],[(0,1,2)],'plaster2',(x,yy,9.55))
 window(g,x,front-.60,10.65,1.25,1.35)
 for xx in [x-2.35,x+2.35]:
  window(g,xx,front,7.15,1.85,2.2,variant==1)
  window(g,xx,front,3.45,1.85,2.3)
  g.box((xx,front-.58,2.04),(2.1,.63,.49),'woodlight',bevel=.05)
  for j in [-1,0,1]:flowers(g,xx+j*.65,front-.64,2.27,.54,variant*30+j+3)
 # Rear and side windows are full geometry, not blank facades.
 for side in [-1,1]:
  sidegeom=Geometry()
  for yy in [-2.15,2.15]:
   for zz in [3.4,7.1]:window(sidegeom,yy,0,zz,1.6,2)
  for material,(vs,fs,ss) in sidegeom.data.items():
   # local front maps to the outward +/- X side
   g.mesh([(side*(-b),a,c) for a,b,c in vs],fs,material,(x+side*w/2,y,0),smooth=False)
 for xx in [x-2.3,x+2.3]:
  temp=Geometry()
  for zz in [3.5,7.1]:window(temp,0,0,zz,1.65,2)
  for material,(vs,fs,ss) in temp.data.items():g.mesh([(-a,-b,c) for a,b,c in vs],fs,material,(xx,y+d/2,0))
 # Entry, three broad steps, porch columns, canopy and small lanterns.
 g.box((x,front-.16,2.56),(1.65,.3,3.25),'trim',bevel=.06)
 g.box((x,front-.36,2.5),(1.36,.14,2.95),'roofblue' if variant!=2 else 'wood',bevel=.04)
 g.box((x,front-.46,3.2),(.9,.09,.85),'glasslight',bevel=.03)
 for zz in [1.65,2.35]:g.box((x,front-.46,zz),(.92,.07,.44),'glassdark',bevel=.025)
 g.ball((x+.47,front-.56,2.35),(.075,.08,.075),'yellow',2)
 for k in range(3):g.box((x,front-1.35+k*.36,.44+k*.17),(3.1-k*.12,2.1-k*.5,.28),'paver3',bevel=.055)
 for xx in [x-1.42,x+1.42]:
  g.box((xx,front-1.5,2.25),(.22,.22,3.7),'trim',bevel=.025)
  g.box((xx,front-1.5,.67),(.38,.38,.35),'stone',bevel=.035)
 g.box((x,front-.85,4.27),(3.5,2.35,.25),'cream',bevel=.07)
 g.mesh([(-1.85,-1.2,0),(1.85,-1.2,0),(1.85,1.2,.65),(-1.85,1.2,.65)],[(0,1,2,3)],mat,(x,front-.8,4.4))
 for xx in [x-1.2,x+1.2]:
  g.box((xx,front-.35,3.05),(.23,.3,.55),'metal',bevel=.03)
  g.box((xx,front-.53,3.08),(.16,.14,.33),'canvas')
 # Brick chimney, cap and downpipes.
 cx=x+2.6;cy=y+1.4
 g.box((cx,cy,11.5),(.82,.95,3.3),'plaster',bevel=.045)
 for k in range(6):g.box((cx,cy,10.2+k*.43),(.87,1,.07),'cream')
 g.box((cx,cy,13.2),(1.12,1.2,.24),'stone',bevel=.05)
 g.box((cx,cy,13.35),(.6,.7,.07),'metal')
 for xx in [x-w/2-.23,x+w/2+.23]:g.rod((xx,front+.2,1),(xx,front+.2,9.4),.065,'stone',8)
 # A small side terrace makes the three silhouettes feel inhabited.
 if variant==1:
  g.box((x+3.1,front-.7,5.33),(2.45,1.35,.22),'cream')
  for xx in [x+2.05,x+2.58,x+3.12,x+3.66,x+4.18]:g.box((xx,front-1.28,5.88),(.075,.08,1),'trim')
  g.box((x+3.12,front-1.28,6.42),(2.3,.12,.1),'trim')
 planter(g,x-2.6,front-1.12,.25,.83,variant+20)
 planter(g,x+2.6,front-1.12,.25,.83,variant+30)

def chair(g,x,y,rot=0,color='woodlight'):
 temp=Geometry();temp.box((0,0,1.28),(1.1,1.15,.18),color,bevel=.045)
 for xx in [-.43,.43]:
  for yy in [-.43,.43]:temp.box((xx,yy,.68),(.13,.13,1.22),'wood')
 for xx in [-.45,.45]:temp.box((xx,.46,1.93),(.13,.13,1.6),'wood')
 for z in [1.78,2.18,2.58]:temp.box((0,.46,z),(.96,.14,.24),color,bevel=.02)
 for mat,(v,f,s) in temp.data.items():g.mesh(v,f,mat,(x,y,0),rot)

def pergola(g,x,y):
 paving(g,x,y,17.4,9.5,3)
 for xx in [x-7.9,x+7.9]:
  for yy in [y-3.7,y+3.7]:
   g.box((xx,yy,3.18),(.42,.42,5.5),'wood',bevel=.06)
   g.box((xx,yy,.67),(.65,.65,.45),'stone',bevel=.04)
   g.box((xx,yy,5.86),(.64,.65,.2),'woodlight',bevel=.035)
 for yy in [y-3.7,y+3.7]:g.box((x,yy,5.88),(17.5,.35,.5),'wood',bevel=.06)
 for k in range(13):g.box((x-8.1+k*1.35,y,6.2),(.23,9.4,.31),'woodlight',bevel=.035)
 # Diagonal knee braces and climbing vines.
 for xx in [x-7.9,x+7.9]:
  for yy in [y-3.7,y+3.7]:
   sign=1 if xx<x else -1
   g.rod((xx,yy,4.65),(xx+1.1*sign,yy,5.85),.14,'wood',6)
   for k in range(7):g.ball((xx+math.sin(k)*.22,yy,1+k*.65),(.35,.24,.3),'leaf2',1)
 for j in range(26):
  xx=x-7.5+(j%13)*1.25;yy=y+(-2 if j<13 else 2)
  g.rod((xx-.65,yy,6.34),(xx+.65,yy,6.34),.035,'leafdark',6)
  for k in range(5):g.ball((xx-.55+k*.27,yy+(.22 if k%2 else -.22),6.42),(.30,.17,.085),'leaf' if j%3 else 'leaf3',2,rot=.7 if k%2 else -.7)
 g.box((x,y,2.14),(10.4,2.7,.26),'woodlight',bevel=.08)
 for xx in [x-4,x+4]:
  for yy in [y-.85,y+.85]:g.box((xx,yy,1.25),(.26,.26,1.8),'wood')
 for xx in [x-3.4,x,x+3.4]:
  chair(g,xx,y-2.35,math.pi);chair(g,xx,y+2.35)
  for yy in [y-.79,y+.79]:
   g.cylinder((xx,yy,2.32),.43,.055,'trim',20)
   g.cylinder((xx+.67,yy,2.5),.14,.4,'glasslight',10)
 for yy in [y-.6,y+.6]:g.box((x,yy,2.31),(2.25,.46,.03),'canvas')
 g.cylinder((x,y,2.55),.23,.48,'pot',12);flowers(g,x,y,2.8,.65,61)
 # Visible festoon cable and bulbs.
 for k in range(16):
  u=k/15;xx=x-7.9+u*15.8;zz=5.8-math.sin(u*math.pi)*.65
  if k:
   u0=(k-1)/15;g.rod((x-7.9+u0*15.8,y-3.8,5.8-math.sin(u0*math.pi)*.65),(xx,y-3.8,zz),.027,'metal',5)
  if k%2:g.ball((xx,y-3.8,zz-.16),(.105,.105,.14),'canvas',2)
 for xx in [x-7.2,x+7.2]:planter(g,xx,y-3.6,.4,1.15,23)

def grill(g,x,y):
 paving(g,x,y,3.8,3.8,7)
 g.box((x,y,1.12),(2.8,1.65,1.35),'metal',bevel=.12)
 for xx in [x-.95,x+.95]:g.cylinder((xx,y,0.49),.17,.25,'metal',10)
 g.box((x,y,1.89),(3.2,1.94,.2),'steel',bevel=.07)
 for k in range(11):g.rod((x-1.24+k*.248,y-.68,2.05),(x-1.24+k*.248,y+.68,2.05),.035,'metal',6)
 # Open lid and control fascia.
 g.box((x,y+.88,2.53),(2.9,.24,1.35),'metal',bevel=.11)
 g.box((x,y+.70,2.5),(2.5,.07,1.0),'steel',bevel=.06)
 g.rod((x-.6,y+.48,3.0),(x+.6,y+.48,3.0),.065,'wood',8)
 for xx in [x-.85,x,x+.85]:g.ball((xx,y-.88,1.55),(.13,.075,.13),'steel',2)
 for xx in [x-1.77,x+1.77]:g.box((xx,y,1.98),(.42,1.4,.12),'woodlight',bevel=.045)

def gazebo(g,x,y):
 for radius,z in [(4.7,.35),(4.3,.56),(4,.76)]:g.cylinder((x,y,z),radius,.24,'paver3',8)
 for j in range(8):
  a=j*TAU/8;xx=x+math.cos(a)*3.4;yy=y+math.sin(a)*3.4
  g.cylinder((xx,yy,3.05),.16,4.7,'trim',10)
  g.cylinder((xx,yy,.92),.26,.25,'cream',8)
  if j<4:
   b=(j+1)*TAU/8;x2=x+math.cos(b)*3.4;y2=y+math.sin(b)*3.4
   g.rod((xx,yy,1.8),(x2,y2,1.8),.08,'trim',8)
   for k in range(1,5):g.rod((xx+(x2-xx)*k/5,yy+(y2-yy)*k/5,.9),(xx+(x2-xx)*k/5,yy+(y2-yy)*k/5,1.8),.045,'trim',6)
 g.cylinder((x,y,5.46),4.75,.21,'trim',8)
 for j in range(8):
  a=j*TAU/8;b=(j+1)*TAU/8
  g.mesh([(math.cos(a)*4.9,math.sin(a)*4.9,0),(math.cos(b)*4.9,math.sin(b)*4.9,0),(0,0,2.8)],[(0,1,2)],'roofblue2' if j%2 else 'roofblue',(x,y,5.6))
  g.rod((x+math.cos(a)*4.9,y+math.sin(a)*4.9,5.6),(x,y,8.4),.055,'trim',7)
 g.ball((x,y,8.55),(.19,.19,.23),'yellow',2)
 g.cylinder((x,y,2),1.2,.17,'woodlight',20);g.cylinder((x,y,1.35),.16,1.2,'wood',10)
 chair(g,x-1.9,y,.8);chair(g,x+1.9,y,-.8)

def activity(g,x,y):
 # A supported screen, two deckchairs, beanbags and projector console.
 sy=y+5.5
 for xx in [x-4.8,x+4.8]:
  g.rod((xx,sy,.45),(xx,sy,6.25),.1,'metal',10)
  g.rod((xx-1,sy-.6,.5),(xx+1,sy+.6,.5),.1,'metal',8)
 g.box((x,sy,3.65),(9.75,.25,5.15),'metal',bevel=.08)
 g.box((x,sy-.16,3.65),(9.2,.075,4.62),'screen')
 for xx,yy,c in [(x-3,y-3,'canvas'),(x+3,y-3,'blue'),(x-3,y+1,'cushion')]:
  g.ball((xx,yy,.92),(1.08,1.03,.8),c,2);g.ball((xx,yy+.35,1.37),(.78,.6,.8),c,2)
  g.rod((xx-.4,yy-.65,1.28),(xx+.4,yy-.65,1.28),.025,'cream',6)
 g.box((x,y-4.8,1.05),(1.85,1.25,.2),'woodlight',bevel=.05)
 for xx in [x-.65,x+.65]:g.box((xx,y-4.8,.65),(.13,.65,.65),'wood')
 g.box((x,y-4.8,1.35),(1.3,.85,.4),'cream',bevel=.08)
 g.ball((x,y-4.36,1.39),(.19,.07,.19),'glassdark',2)

def children(g,x,y):
 # Entire playground stays within its reserved 10 x 8 footprint.
 g.box((x,y,.36),(9.6,7.6,.2),'sand',bevel=.16)
 tx=x-1.85;ty=y+1.25
 for xx in [tx-1,tx+1]:
  for yy in [ty-1,ty+1]:g.box((xx,yy,1.75),(.18,.18,2.9),'wood')
 g.box((tx,ty,2.85),(2.5,2.5,.22),'woodlight',bevel=.06)
 for xx in [tx-1,tx+1]:g.box((xx,ty,3.8),(.17,.17,2),'wood')
 g.mesh([(-1.5,-1.5,0),(1.5,-1.5,0),(1.5,1.5,0),(-1.5,1.5,0),(0,-1.5,1.15),(0,1.5,1.15)],[(0,1,4),(3,5,2),(0,4,5,3),(1,2,5,4)],'roofred',(tx,ty,4.5))
 for k in range(5):
  z=.8+k*.48;yy=ty+1.6
  g.box((tx,yy,z),(1.1,.23,.13),'woodlight',bevel=.03)
 for xx in [tx-.57,tx+.57]:g.rod((xx,ty+1.6,.55),(xx,ty+1.6,3),.07,'wood',8)
 # Curved slide with side rails.
 points=[(ty-1.2,2.95),(ty-1.65,2.65),(ty-2.05,1.75),(ty-2.5,1.0),(ty-3.35,.62)]
 for (a,z),(b,z2) in zip(points,points[1:]):
  g.mesh([(-.65,a,z),(.65,a,z),(.65,b,z2),(-.65,b,z2)],[(0,1,2,3)],'yellow',(tx,0,0))
  for xx in [tx-.68,tx+.68]:g.rod((xx,a,z+.18),(xx,b,z2+.18),.095,'orange',8)
 # Sandbox with timber lip and small toys.
 sx=x+2.2;sy=y-1.7
 g.box((sx,sy,.65),(3.45,3.2,.55),'wood',bevel=.08);g.box((sx,sy,.96),(3,2.75,.08),'sand')
 for xx,yy,c in [(sx-.6,sy,'blue'),(sx+.5,sy-.5,'orange')]:
  g.cylinder((xx,yy,1.16),.23,.38,c,10,top=.31)
  g.rod((xx-.28,yy,1.4),(xx+.28,yy,1.4),.025,'cream',6)
 for k in range(3):g.cylinder((sx-.5+k*.4,sy+.7,1.1),.18,.25,'sand',10)

def lamp(g,x,y):
 g.cylinder((x,y,.52),.29,.32,'metal',10);g.cylinder((x,y,2.2),.09,3.5,'metal',10)
 g.box((x,y,4.1),(.45,.45,.6),'canvas',bevel=.035)
 for xx in [-.25,.25]:
  for yy in [-.25,.25]:g.rod((x+xx,y+yy,3.78),(x+xx,y+yy,4.46),.035,'metal',6)
 g.cylinder((x,y,4.54),.44,.25,'metal',4,top=.05)
 g.ball((x,y,4.74),(.09,.09,.12),'metal',2)

def build(static_parent,dynamic_parent,slots):
 setup_materials();g=Geometry()
 # Keep the same 60 x 40 parcel and three immutable house anchors.
 g.box((0,0,.18),(59.8,39.8,.24),'lawn',bevel=.12)
 for x in [-20,0,20]:paving(g,x,4.15,4,5.1,abs(x)+3)
 paving(g,0,-7.7,3.25,22.7,8);paving(g,0,2.55,55.6,2.4,10,z=.425)
 paving(g,-15,-16.8,25,2.25,13);paving(g,22,-7.5,10.5,1.8,15)
 # Lawn strips and perimeter borders.
 for yy in [-19.6,19.6]:g.box((0,yy,.34),(60,.27,.28),'cream',bevel=.05)
 for xx in [-29.6,29.6]:g.box((xx,0,.34),(.27,40,.28),'cream',bevel=.05)
 for a,b in [((-28.8,19),(28.8,19)),((-28.8,-18.8),(-3,-18.8)),((3,-18.8),(16,-18.8)),((-28.8,-18.8),(-28.8,19)),((28.8,-18.8),(28.8,19))]:pickets(g,a,b)
 for i,x in enumerate([-20,0,20]):
  house(g,x,12,i)
  # Gated garden edge, planted strips and side lawns.
  for a,b in [((x-7.5,4.5),(x-2.5,4.5)),((x+2.5,4.5),(x+7.5,4.5))]:pickets(g,a,b,1.2)
  for xx in [x-6.4,x+6.4]:
   g.box((xx,10.5,.34),(2.4,10.7,.12),'soil',bevel=.2)
   for j in range(6):bush(g,xx,5.8+j*1.75,.87,i*19+j,True)
  for xx in [x-5.1,x+5.1]:
   bush(g,xx,5.65,1.02,i+2,True)
  tree(g,x-7.3,16.4,1.55,i*3+1)
  tree(g,x+7.1,17.1,1.4,i*3+2)
 # Rich permanent planting outside every future facility reservation.
 for k,(x,y,s) in enumerate([(-27,10,1),(-27,-11,1),(-17,-12,.8),(-10,17,1.2),(10,17,1.15),(27,9,1),(15,-17,1),(-9,-16.8,1),(-26,1.8,.85)]):
  tree(g,x,y,s,k+41)
 for k in range(32):
  x=-27.5+k*1.73
  # Leave central entrance open, reserve the playground at the right front.
  if -2.2<x<2.2 or x>17:continue
  bush(g,x,-18,.9,k+45,True)
 for side in [-1,1]:
  for j in range(16):
   y=-17+j*2.18;bush(g,side*28,y,.75,j+81,True)
 for x,y in [(-27,-17.5),(27,-18),(-28,1),(28,4),(9,3)]:lamp(g,x,y)
 # Bulletin board at its immutable, separate slot.
 x,y=-25,-15
 for xx in [x-1.55,x+1.55]:g.box((xx,y,1.98),(.22,.28,3.3),'wood',bevel=.035)
 g.box((x,y,3.02),(3.65,.32,2.35),'wood',bevel=.08)
 g.box((x,y-.19,3.02),(3.15,.05,1.88),'wooddark')
 for i,c in enumerate(['paperblue','canvas','paperblue']):
  xx=x-1.02+i*1.02;g.box((xx,y-.23,3.02),(.87,.05,1.5),c,bevel=.025)
  for k in range(3):g.box((xx,y-.27,3.13-k*.27),(.56,.015,.065),'trim')
 g.box((x,y,4.3),(4.1,.7,.22),'woodlight',bevel=.06)
 g.emit(static_parent,'home_garden_v2')
 created=[]
 functions={'home_dining':pergola,'home_grill':grill,'home_gazebo':gazebo,'home_activity':activity,'home_children':children}
 for slot in slots:
  if slot['slot_id'] not in functions:continue
  name=slot['slot_id'];root=empty(name,dynamic_parent,kind='level',district='home',minLevel=slot['min_level'],assetVersion='0.2')
  geo=Geometry();functions[name](geo,*slot['local_center_xy_m']);geo.emit(root,name+'_detail');created.append(root)
 return created
