"""Shared geometric kit for the approved miniature-city art direction."""
import bpy,math,random
from mathutils import Vector
from refined_home import *
PALETTE.update({'asphalt':'#73868C','brick':'#D78662','track':'#D8786D','court':'#5EABB5','court2':'#E0B88B','rubber':'#42606A','ocean':'#64BFCB','oceanlight':'#A0DADD','cliff':'#B9BAAC','cliff2':'#DBCEB2','cliffdark':'#939D92'})

def transfer(dst,src,x=0,y=0,z=0,scale=1,rot=0):
 for mat,(vs,fs,sm) in src.data.items():
  # Preserve smooth polygons when transforming composite assets.
  before=len(dst.data[mat][2]);dst.mesh([(a*scale,b*scale,c*scale) for a,b,c in vs],fs,mat,(x,y,z),rot)
  dst.data[mat][2][before:]=sm

def band(g,x,y,z,rx,ry,width,mat='trim',n=80,start=0,end=TAU):
 vs=[]
 for i in range(n+1):
  a=start+(end-start)*i/n
  vs.extend([(x+math.cos(a)*rx,y+math.sin(a)*ry,z),(x+math.cos(a)*(rx-width),y+math.sin(a)*(ry-width),z)])
 g.mesh(vs,[(i*2,i*2+2,i*2+3,i*2+1) for i in range(n)],mat)

def line(g,pts,r=.055,mat='trim',n=6):
 for a,b in zip(pts,pts[1:]):g.rod(a,b,r,mat,n)

def text_mesh(g,body,loc,size=1,mat='trim',rot=0):
 # Small dimensional signs, exported as actual geometry.
 cu=bpy.data.curves.new('sign_lettering','FONT');cu.body=body;cu.align_x='CENTER';cu.size=size;cu.extrude=.012;cu.bevel_depth=.006;cu.bevel_resolution=0;cu.resolution_u=3
 ob=bpy.data.objects.new('sign_lettering',cu);bpy.context.collection.objects.link(ob)
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
 g.mesh([(v.co.x,-v.co.z,v.co.y) for v in ob.data.vertices],[tuple(p.vertices) for p in ob.data.polygons],mat,loc,rot)
 bpy.data.objects.remove(ob,do_unlink=True)

def bench(g,x,y,rot=0):
 b=Geometry()
 for xx in [-1.5,1.5]:
  for yy in [-.45,.45]:b.box((xx,yy,.75),(.14,.16,1),'metal',bevel=.02)
  b.rod((xx,.48,.6),(xx,.48,2.25),.09,'metal',8)
 for yy in [-.52,-.18,.18,.52]:b.box((0,yy,1.22),(3.6,.27,.16),'woodlight',bevel=.03)
 for zz in [1.65,2,2.3]:b.box((0,.56,zz),(3.6,.15,.23),'woodlight',bevel=.03)
 for xx in [-1.7,1.7]:b.box((xx,0,1.65),(.12,1.15,.12),'metal',bevel=.02)
 transfer(g,b,x,y,rot=rot)

def pine(g,x,y,s=1):
 g.cylinder((x,y,1.8*s),.22*s,3.6*s,'wooddark',8)
 for i,(z,r,h) in enumerate([(3,1.7,3.2),(4.2,1.45,2.9),(5.35,1.05,2.5)]):g.cylinder((x,y,z*s),r*s,h*s,'leafdark' if i%2==0 else 'leaf',9,top=.06*s)

def street_tree(g,x,y,s=1,seed=0,blossom=False):
 # 1k triangles; the finely lobed home trees are retained unchanged.
 rng=random.Random(seed);g.cylinder((x,y,2*s),.23*s,4*s,'wooddark',8,top=.11*s)
 for i in range(6):
  a=i*2.4;rr=.75 if i<4 else .28;z=3.7+i*.3
  g.ball((x+math.cos(a)*rr*s,y+math.sin(a)*rr*s,z*s),(1.17*s,1.05*s,1.25*s),rng.choice(['pink','pink','rose'] if blossom else ['leaf','leaf2','leaf3']),2)

def low_hedge(g,a,b,s=.8,flowers_on=False):
 length=math.dist(a,b);n=max(1,round(length/(s*1.7)))
 for i in range(n+1):
  x=a[0]+(b[0]-a[0])*i/n;y=a[1]+(b[1]-a[1])*i/n
  g.ball((x,y,.65*s),(s,.75*s,.85*s),'leaf' if i%3 else 'leaf2',2)
  if flowers_on and i%3==0:flowers(g,x,y,.8*s,.5*s,i)

def parcel(g,w,d,material='lawn'):
 g.box((0,0,.17),(w-.2,d-.2,.24),material,bevel=.10)
 for y in [-d/2+.25,d/2-.25]:g.box((0,y,.35),(w,.32,.32),'cream',bevel=.045)
 for x in [-w/2+.25,w/2-.25]:g.box((x,0,.35),(.32,d,.32),'cream',bevel=.045)

def crate(g,x,y,z=0,s=1,produce=False):
 for yy in [-.7,.7]:
  for zz in [.35,.7,1.05]:g.box((x,y+yy*s,z+zz*s),(1.8*s,.14*s,.24*s),'woodlight',bevel=.02*s)
 for xx in [-.84,.84]:
  for zz in [.35,.7,1.05]:g.box((x+xx*s,y,z+zz*s),(.14*s,1.5*s,.24*s),'wood',bevel=.02*s)
 for xx in [-.75,.75]:
  for yy in [-.62,.62]:g.box((x+xx*s,y+yy*s,z+.65*s),(.16*s,.16*s,1.2*s),'wood')
 if produce:
  for i in range(6):g.ball((x+(i%3-1)*.45*s,y+(i//3-.5)*.6*s,z+.9*s),(.3*s,.3*s,.3*s),'orange' if i%2 else 'roofred',2)

def person(g,x,y,c='blue',rot=0,ground=.4):
 b=Geometry();b.ball((0,0,2.75),(.34,.32,.4),'sand',2);b.ball((0,.06,2.96),(.36,.33,.25),'wooddark',1)
 b.box((0,0,1.9),(.72,.44,1.1),c,bevel=.13)
 for side in [-1,1]:
  b.rod((side*.21,0,1.45),(side*.26,-.12,.55),.14,'roofblue',8)
  b.box((side*.26,-.27,.49),(.34,.58,.23),'cream',bevel=.06)
  b.rod((side*.42,0,2.2),(side*.56,-.12,1.5),.12,'sand',8)
 transfer(g,b,x,y,z=ground-.375*.60,scale=.60,rot=rot)

def solar(g,x,y,z,w=8,d=4):
 g.box((x,y,z),(w+.25,d+.25,.19),'steel',bevel=.035)
 g.box((x,y,z+.13),(w,d,.08),'glassdark')
 for i in range(1,6):g.box((x-w/2+i*w/6,y,z+.18),(.045,d,.025),'glasslight')
 for j in range(1,4):g.box((x,y-d/2+j*d/4,z+.18),(w,.045,.025),'glasslight')

def fence_metal(g,a,b,h=2.4):
 n=max(1,round(math.dist(a,b)/.55))
 for i in range(n+1):
  x=a[0]+(b[0]-a[0])*i/n;y=a[1]+(b[1]-a[1])*i/n
  g.rod((x,y,.35),(x,y,h),.045,'metal',6)
 for z in [.6,h-.2]:g.rod((*a,z),(*b,z),.065,'metal',8)

def hut(g,x,y,w=8,d=7,h=5,roofmat='roofteal',sign=None):
 g.box((x,y,.6),(w+.6,d+.6,.6),'stone',bevel=.09)
 g.box((x,y,.8+h/2),(w,d,h),'plaster2',bevel=.06)
 for yy in [y-d/2,y+d/2]:
  for z in [1.1,2,2.9,3.8,4.7]:
   if z<h:g.box((x,yy,z),(w+.07,.12,.05),'cream')
 tiled_roof(g,x,y,h+.85,w+1,d+1,2.3,roofmat,11)
 window(g,x-2,y-d/2,3,1.8,2.2)
 g.box((x+1.7,y-d/2-.12,2.3),(1.7,.21,3.4),'wood',bevel=.04)
 g.box((x+1.7,y-d/2-.25,3),(1.2,.07,1.35),'glasslight')
 g.ball((x+2.2,y-d/2-.32,2),(.08,.07,.08),'yellow',1)
 if sign:
  g.box((x,y-d/2-.15,h+.15),(w*.8,.22,.9),'roofteal',bevel=.04);text_mesh(g,sign,(x,y-d/2-.29,h-.13),.57)
 for xx in [x-w/2-.6,x+w/2+.6]:planter(g,xx,y-d/2-.5,s=.9,seed=5)
