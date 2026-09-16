"""A mixed financial quarter: six silhouettes, human-scale streets, distinct eras.

Architecture references and plot/height decisions: finance-design.md.
Every facade, roof and landscape detail is geometry shared by Blender and glTF.
"""
from refined_shared import *

PALETTE.update({
 'finance_limestone':'#E6CFA6', 'finance_sandstone':'#C5AC83',
 'finance_brick':'#AA654D', 'finance_bricklight':'#CB8360',
 'finance_copper':'#4F8276', 'finance_bronze':'#B29559',
 'glass_finance_teal':'#428E91', 'glass_finance_mint':'#86BEC0',
 'glass_finance_ink':'#355064', 'glass_finance_sky':'#70A7CA',
})

def faces(g,w,d,draw):
 """Draw a local -Y facade on all four sides, including the rear."""
 for fw,x,y,rot in [(w,0,-d/2,0),(d,w/2,0,math.pi/2),
                    (w,0,d/2,math.pi),(d,-w/2,0,-math.pi/2)]:
  f=Geometry();draw(f,fw);transfer(g,f,x,y,rot=rot)

def cornice(g,w,d,z,mat='cream',depth=.38):
 g.box((0,0,z),(w+depth,d+depth,.24),mat,bevel=.035)

def arch_window(g,x,z,w,h,mat='finance_limestone'):
 # z is the bottom, with a semicircular head above the straight jambs.
 r=w/2;spring=z+h-r
 v=[(x-r,-.08,z),(x+r,-.08,z)]
 v.extend((x+r*math.cos(a),-.08,spring+r*math.sin(a)) for a in [i*math.pi/16 for i in range(17)])
 g.mesh(v,[tuple(range(len(v)))],'glass_finance_ink')
 for s in [-1,1]:g.box((x+s*(r+.1),-.14,(z+spring)/2),(.19,.2,spring-z),mat)
 line(g,[(x+(r+.1)*math.cos(i*math.pi/16),-.16,spring+(r+.1)*math.sin(i*math.pi/16)) for i in range(17)],.12,mat,6)
 g.box((x,-.18,(z+spring)/2),(.08,.12,spring-z),'finance_bronze')
 g.box((x,-.16,spring),(w,.14,.10),'finance_bronze')
 g.box((x,-.12,z-.1),(w+.5,.4,.2),mat,bevel=.02)

def punched(g,x,z,w=1.3,h=2,frame='finance_limestone'):
 g.box((x,-.065,z),(w+.23,.18,h+.23),frame)
 g.box((x,-.175,z),(w,.08,h),'glass_finance_ink')
 g.box((x+w*.29,-.22,z),(w*.24,.035,h-.1),'glass_finance_sky')
 g.box((x,-.24,z),(.075,.09,h),frame)
 g.box((x,-.25,z-.22),(w,.09,.065),frame)
 g.box((x,-.23,z-h/2-.14),(w+.4,.48,.17),frame,bevel=.025)

def glazed_box(g,w,d,bottom,top,mat='glass_finance_teal',fins='cream',spacing=2.4,horizontal=True):
 h=top-bottom;g.box((0,0,(top+bottom)/2),(w,d,h),mat,bevel=.08)
 def facade(f,fw):
  count=max(3,round(fw/spacing))
  for j in range(count+1):f.box((-fw/2+j*fw/count,-.07,(top+bottom)/2),(.085,.19,h),fins)
  if horizontal:
   for j in range(1,math.ceil(h/3)):
    f.box((0,-.065,bottom+j*3),(fw,.13,.10),fins)
 faces(g,w,d,facade)

def roof_garden(g,x,y,z,w,d):
 g.box((x,y,z+.24),(w,d,.48),'cream',bevel=.07)
 g.box((x,y,z+.49),(w-.22,d-.22,.06),'soil')
 for j in range(max(2,round(w/.65))):
  xx=x-w/2+.35+j*(w-.7)/max(1,round(w/.65)-1)
  g.ball((xx,y,z+.82),(.4,d*.44,.48),'leaf2' if j%3 else 'leaf',2)

def hipped_roof(g,w,d,z,h,mat='finance_copper'):
 # A mansard profile, rather than the gable used by the residential district.
 g.mesh([(-w/2,-d/2,z),(w/2,-d/2,z),(w/2,d/2,z),(-w/2,d/2,z),
         (-w*.34,-d*.32,z+h),(w*.34,-d*.32,z+h),(w*.34,d*.32,z+h),(-w*.34,d*.32,z+h)],
        [(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],mat)
 for side in [-1,1]:
  for j in range(9):
   xx=-w/2+j*w/8
   g.rod((xx,side*d/2,z+.025),(xx*.68,side*d*.32,z+h+.025),.035,'roofteal3',5)

def heritage_bank(g,level):
 w,d=14,10
 if level==1:
  g.box((0,0,.6),(15,11,.5),'stone',bevel=.1)
  g.box((0,0,4),(w,d,6.4),'finance_limestone',bevel=.07)
  def facade(f,fw):
   for x in [-fw*.32,0,fw*.32]:arch_window(f,x,1.25,2.05,4.3)
   for z in [1,1.65,2.3,2.95,3.6,4.25,4.9,5.55,6.2]:
    for x in [-fw/2+.38,fw/2-.38]:f.box((x,-.08,z),(.7,.2,.52),'cream',bevel=.025)
  faces(g,w,d,facade)
  cornice(g,w,d,6.6);cornice(g,w+.35,d+.35,7.1)
  # Four fluted columns and a low triangular pediment at the street entrance.
  for x in [-4.2,-1.45,1.45,4.2]:
   g.box((x,-6,1.05),(.85,.85,.34),'cream',bevel=.04)
   g.cylinder((x,-6,3.7),.31,5,'cream',12,top=.26)
   g.box((x,-6,6.25),(.8,.8,.32),'cream',bevel=.04)
  g.box((0,-5.9,6.6),(10.3,2.4,.48),'finance_limestone',bevel=.06)
  g.mesh([(-5.4,-7.2,6.85),(5.4,-7.2,6.85),(0,-7.2,8.65),(-5.4,-5,6.85),(5.4,-5,6.85),(0,-5,8.65)],
         [(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],'cream')
  text_mesh(g,'FAMILY BANK',(0,-7.25,7.15),.55,'finance_sandstone')
  for k in range(3):g.box((0,-6.7-k*.4,.49+k*.12),(11-k*.3,1.7,.2),'cream',bevel=.04)
 elif level==2:
  g.box((0,0,8.4),(13.2,9.2,2.5),'finance_limestone',bevel=.05)
  faces(g,13.2,9.2,lambda f,fw:[punched(f,x,8.45,1.1,1.25) for x in [-fw*.33,0,fw*.33]])
  cornice(g,14,10,9.7);cornice(g,13.8,9.8,10.0)
  roof_garden(g,-4,1,10.1,3,1);roof_garden(g,4,1,10.1,3,1)
 else:
  g.box((0,1,11.45),(3.8,3.8,2.9),'finance_limestone',bevel=.08)
  for rot in [0,math.pi/2,math.pi,3*math.pi/2]:
   f=Geometry();f.rod((0,0,11.65),(0,-.10,11.65),.82,'cream',24)
   f.rod((0,-.12,11.65),(0,-.16,11.65),.67,'glass_finance_ink',24)
   f.rod((0,-.18,11.65),(.0,-.18,12.08),.038,'finance_bronze',6)
   f.rod((0,-.18,11.65),(.36,-.18,11.47),.038,'finance_bronze',6)
   transfer(g,f,1.94*math.sin(rot),1-1.94*math.cos(rot),rot=rot)
  cornice_clock=Geometry();cornice(cornice_clock,4,4,13);hipped_roof(cornice_clock,4.3,4.3,13.15,1.25)
  transfer(g,cornice_clock,0,1)

def garden_office(g,level):
 # All exposed terraces are outside the footprint of the next tier.
 x,y,w,d,b,t=[(0,0,13,12,.65,7),(-.8,1,10,9,7,15),(-1.7,1.8,6.7,6.5,15,24)][level-1]
 f=Geometry();glazed_box(f,w,d,b,t,'glass_finance_teal','cream',2.2,False)
 for z in [b+.15]+[b+i*3 for i in range(1,math.ceil((t-b)/3))]+[t]:
  cornice(f,w+.55,d+.55,z,depth=.55)
 transfer(g,f,x,y)
 roof_garden(g,x,y-d/2+.45,t+.12,w-.8,.75)
 roof_garden(g,x+w/2-.38,y+1,t+.12,.68,max(1,d-3.3))
 if level==1:
  g.box((0,-6.6,3.25),(8,1.8,.20),'cream',bevel=.05)
  text_mesh(g,'GROWTH',(-.1,-7.55,3.45),.48,'finance_copper')
  for xx in [-2,2]:g.box((xx,-6.1,1.8),(1.8,.15,2.4),'glass_finance_ink')
 if level==3:
  # Roof pergola and plant beds at the final height are fully three-dimensional.
  for xx in [-2.8,.0]:
   for yy in [.8,3.6]:g.box((xx,yy,25),(.13,.13,1.8),'woodlight')
  for j in range(8):g.box((-1.4,.65+j*.45,26),(3.4,.16,.18),'woodlight')
  roof_garden(g,-1.5,4.3,24.2,3,.7)

def brick_loft(g,level):
 w,d=12,11;b,t=[(.7,6),(6,12),(12,18)][level-1]
 g.box((0,0,(b+t)/2),(w,d,t-b),'finance_brick',bevel=.06)
 def facade(f,fw):
  cols=[-fw*.33,0,fw*.33]
  for z in [b+.5+i*.48 for i in range(int((t-b-.5)/.48))]:
   f.box((0,-.035,z),(fw,.075,.028),'finance_bricklight')
  for xx in [-fw/2+.24,fw/2-.24]:f.box((xx,-.12,(b+t)/2),(.46,.22,t-b),'finance_bricklight')
  if level==1:
   for x in cols:arch_window(f,x,1.0,2.5,3.45,'finance_bricklight')
   for x in cols:punched(f,x,5.05,1.5,1.25)
  else:
   for zz in [b+1.3,b+4.1]:
    for x in cols:punched(f,x,zz,1.45,1.95)
 faces(g,w,d,facade);cornice(g,w,d,t-.12,'finance_sandstone');cornice(g,w,d,t+.15)
 if level==1:
  for j in range(15):g.box((-5.6+j*.8,-6.2,3.35),(.78,1.65,.13),'cream' if j%2 else 'roofred')
  text_mesh(g,'CORNER CAFE',(0,-7.04,3.64),.48,'cream')
 elif level==2:
  # Slim iron balcony changes the street edge without using residential-scale furniture.
  g.box((0,-5.95,9.05),(10.7,1.2,.16),'finance_sandstone')
  for j in range(30):g.box((-5.15+j*.355,-6.54,9.63),(.045,.055,1.02),'metal')
  g.box((0,-6.54,10.16),(10.6,.09,.09),'metal')
 else:
  hipped_roof(g,12.7,11.7,18.4,2.5)
  for x in [-3.8,0,3.8]:
   g.box((x,-4.45,19.35),(1.55,1.2,1.35),'finance_limestone')
   f=Geometry();punched(f,0,19.38,1.1,.92);transfer(g,f,x,-5.08)
   g.box((x,-4.55,20.13),(1.95,1.45,.19),'finance_copper')
  for x in [-3.8,3.8]:g.box((x,2.7,20.65),(.85,.9,2.1),'finance_brick')

def deco_tower(g,level):
 sections={1:[(12,12,.7,9)],2:[(10.5,10.5,9,25)],3:[(8.2,8.2,25,34),(6,6,34,40)]}[level]
 for w,d,b,t in sections:
  g.box((0,0,(b+t)/2),(w,d,t-b),'finance_limestone',bevel=.08)
  def facade(f,fw):
   n=max(3,round(fw/2.1))
   for j in range(n):
    xx=-fw/2+(j+.5)*fw/n
    f.box((xx,-.09,(b+t)/2),(fw/n-.54,.16,t-b-.7),'glass_finance_ink')
    f.box((xx-fw/n/2+.08,-.18,(b+t)/2),(.25,.38,t-b+.15),'cream')
    for zz in [b+3*k for k in range(1,math.ceil((t-b)/3))]:f.box((xx,-.19,zz),(fw/n-.5,.10,.24),'finance_bronze')
  faces(g,w,d,facade);cornice(g,w,d,t,'finance_limestone',.75)
 if level==1:
  g.box((0,-6.15,3.5),(3.6,.3,5.3),'finance_bronze')
  g.box((0,-6.34,3.2),(2.7,.12,4.5),'glass_finance_ink')
  text_mesh(g,'TRUST',(0,-6.48,6.55),.65,'finance_bronze')
 if level==3:
  for z,w in [(40.5,5),(41.5,4.1),(42.5,3.3),(43.5,2.4)]:
   g.box((0,0,z),(w,w,1.0),'finance_copper',bevel=.08)
   cornice(g,w,w,z+.48,'finance_bronze',.16)
  g.cylinder((0,0,44.75),1.1,1.6,'finance_bronze',4,top=.35)
  g.rod((0,0,45.4),(0,0,47.0),.075,'finance_bronze',8)

def prism_tower(g,level):
 # Chamfered plan and sloping crown: noticeably thinner than its neighbours.
 w,d=10,12;b,t=[(.7,10),(10,33),(33,54)][level-1]
 outline=[(-w/2+1.6,-d/2),(w/2-1.6,-d/2),(w/2,-d/2+1.6),(w/2,d/2-1.6),
          (w/2-1.6,d/2),(-w/2+1.6,d/2),(-w/2,d/2-1.6),(-w/2,-d/2+1.6)]
 def top_at(x):return t+x*.72 if level==3 else t
 vs=[(x,y,b) for x,y in outline]+[(x,y,top_at(x)) for x,y in outline]
 g.mesh(vs,[(0,7,6,5,4,3,2,1),(8,9,10,11,12,13,14,15)],'glass_finance_ink')
 for j,(x,y) in enumerate(outline):
  xx,yy=outline[(j+1)%8];edge=math.dist((x,y),(xx,yy));nx,ny=(yy-y)/edge,-(xx-x)/edge
  g.mesh([(x,y,b),(xx,yy,b),(xx,yy,top_at(xx)),(x,y,top_at(x))],[(0,1,2,3)],
         'glass_finance_sky' if j in [0,1,7] else 'glass' if j in [2,4] else 'glass_finance_ink')
  n=max(1,round(edge/1.35))
  for k in range(n+1):
   a=k/n;px=x+(xx-x)*a+nx*.025;py=y+(yy-y)*a+ny*.025
   g.rod((px,py,b),(px,py,top_at(px)),.04,'steel',6)
  for zz in [b+3*k for k in range(1,math.ceil((t-b)/3))]:
   if zz<min(top_at(x),top_at(xx))-.2:g.rod((x+nx*.04,y+ny*.04,zz),(xx+nx*.04,yy+ny*.04,zz),.055,'steel',5)
  g.rod((x,y,top_at(x)),(xx,yy,top_at(xx)),.12,'steel',6)
 if level==1:
  g.box((0,-6.65,4.3),(7,2,.19),'glass_finance_mint')
  for x in [-2.9,2.9]:g.rod((x,-7.25,.7),(x,-7.25,4.3),.09,'steel',8)
 if level==3:
  # Broad rising seam highlights the diagonal crown without a second spire.
  g.rod((-3.4,-6.08,34),(3.4,-6.08,top_at(3.4)),.14,'cream',6)

def round_tower(g,level):
 b,t,r0,r1=[(.7,9,7.2,7.2),(9,24,6.4,6.4),(24,38,6.4,4.5)][level-1]
 n=32
 def radius(z):return r0+(r1-r0)*(z-b)/(t-b)
 g.cylinder((0,0,(b+t)/2),r0,t-b,'glass_finance_teal',n,top=r1)
 for z in ([b] if level==1 else [])+[b+k*3 for k in range(1,math.ceil((t-b)/3))]+[t]:
  g.cylinder((0,0,z),radius(z)+.11,.16,'cream' if level==1 else 'steel',n)
 for j in range(n):
  a=j*TAU/n;g.rod((r0*math.cos(a),r0*math.sin(a),b),(r1*math.cos(a),r1*math.sin(a),t),.045,'steel',5)
 if level>1:
  # Structural diamonds follow the tapered circular envelope on all sides.
  for row in range(2):
   z0=b+(t-b)*row/2;z1=b+(t-b)*(row+1)/2
   for j in range(8):
    a=j*TAU/8+(row%2)*TAU/16
    for s in [-1,1]:
     pts=[]
     for k in range(9):
      u=k/8;z=z0+(z1-z0)*u;angle=a+s*TAU/16*u;r=radius(z)+.10
      pts.append((r*math.cos(angle),r*math.sin(angle),z))
     line(g,pts,.085,'finance_bronze',6)
 if level==1:
  g.cylinder((0,0,4),7.65,.24,'cream',32)
  text_mesh(g,'EXCHANGE',(0,-7.30,4.55),.52,'cream')
 if level==3:
  g.cylinder((0,0,38.55),4.55,.95,'finance_copper',32,top=3.5)
  g.cylinder((0,0,39.25),3.52,.5,'glass_finance_mint',32,top=2.7)

def street_bench(g,x,y,rot=0):
 b=Geometry();bench(b,0,0);transfer(g,b,x,y,z=.38,scale=.48,rot=rot)

def planted_court(g,x,y,w,d,seed=0):
 g.box((x,y,.47),(w,d,.22),'lawn',bevel=.15)
 for dx,dy in [(-w/2+.7,-d/2+.7),(w/2-.7,d/2-.7)]:
  street_tree(g,x+dx,y+dy,.58,seed+int(dx*3))
 low_hedge(g,(x-w/2+.5,y+d/2-.35),(x+w/2-.5,y+d/2-.35),.4)

def pitched_shop(g,w=9,d=7,body='finance_brick',roof='roofblue',sign='MARKET'):
 # A complete neighbourhood shop, with its own roof and all four elevations.
 g.box((0,0,.65),(w+.6,d+.6,.4),'stone',bevel=.08)
 g.box((0,0,2.65),(w,d,3.7),body,bevel=.06)
 tiled_roof(g,0,0,4.55,w+1,d+1,2.1,roof,31)
 for yy in [-d/2,d/2]:
  f=Geometry()
  for xx in [-w*.28,w*.28]:punched(f,xx,2.6,1.7,2.2)
  f.box((0,-.16,2.0),(1.5,.13,2.5),'wood')
  transfer(g,f,0,yy,rot=0 if yy<0 else math.pi)
 for xx in [-w/2,w/2]:
  f=Geometry();punched(f,0,2.65,1.6,2);transfer(g,f,xx,0,rot=math.pi/2 if xx>0 else -math.pi/2)
 g.box((0,-d/2-.25,4.06),(w*.76,.25,.64),'roofteal',bevel=.025)
 text_mesh(g,sign,(0,-d/2-.4,3.87),.38,'cream')

def low_street_bank(g):
 # A one-storey savings branch becomes the later heritage bank on the same lot.
 w,d=10,8;g.box((0,1,3),(w,d,4.9),'finance_limestone',bevel=.10)
 f=Geometry()
 for xx in [-3.1,0,3.1]:arch_window(f,xx,1.0,1.85,3.5)
 transfer(g,f,0,-3)
 for rot,x,y,fw in [(math.pi/2,5,1,8),(math.pi,0,5,10),(-math.pi/2,-5,1,8)]:
  f=Geometry()
  for xx in [-fw*.27,fw*.27]:punched(f,xx,3,1.45,2.15)
  transfer(g,f,x,y,rot=rot)
 h=Geometry();cornice(h,w,d,5.55);hipped_roof(h,10.6,8.6,5.8,1.55);transfer(g,h,0,1)
 text_mesh(g,'SAVINGS',(0,-3.18,4.78),.45,'finance_bronze')
 for xx in [-3.3,3.3]:g.cylinder((xx,-3.8,2.9),.19,4.6,'cream',12)
 g.box((0,-3.6,5.35),(8.6,1.5,.3),'cream')
 planted_court(g,-5.9,1,1.6,8,41)
 for j in range(3):street_bench(g,-2.5+j*2.5,-5.5)

def market_hall(g):
 # An open-sided tiled market, stalls and a little forecourt.
 g.box((0,0,.62),(11,8,.40),'paver2',bevel=.08)
 for xx in [-4.6,0,4.6]:
  for yy in [-3,3]:g.box((xx,yy,2.28),(.24,.24,3.4),'wood')
 tiled_roof(g,0,0,4,11,8,2.4,'roofred',40)
 for xx in [-3.4,0,3.4]:
  g.box((xx,-1.4,1.05),(2.1,1.3,1.0),'woodlight',bevel=.04)
  for j in range(5):g.ball((xx-.78+j*.39,-1.4,1.66),(.2,.27,.21),'orange' if j%2 else 'leaf',2)
 text_mesh(g,'LOCAL MARKET',(0,-4.12,4.15),.46,'cream')
 planted_court(g,0,5.25,11,2.4,43)
 for xx in [-4,4]:planter(g,xx,-4.7,z=.4,s=.7,seed=9)

def starter_stage(g,site):
 if site==0:low_street_bank(g)
 elif site==1:
  f=Geometry();pitched_shop(f,9,7,'plaster2','roofred','FAMILY OFFICE');transfer(g,f,-1,1)
  planted_court(g,0,-4.8,12,2.5,44)
 elif site==2:
  f=Geometry();pitched_shop(f,9,7,'finance_brick','roofteal','CORNER CAFE');transfer(g,f,0,1)
  for j in range(9):g.box((-3.6+j*.9,-3.5,3.5),(.86,1.8,.15),'canvas' if j%2 else 'roofred')
  planted_court(g,0,6,10,2.1,46)
 elif site==3:
  f=Geometry();pitched_shop(f,9,7,'plaster','roofblue','CO-OP');transfer(g,f,0,1)
  planted_court(g,0,-4.6,11,2.8,48)
  g.box((4,-3.6,1.1),(.8,.6,1.2),'blue',bevel=.12)
 elif site==4:market_hall(g)
 else:
  # The eventual exchange plot starts as an open neighbourhood garden.
  planted_court(g,0,0,13,13,50)
  g.cylinder((0,0,.6),3.7,.28,'paver2',32)
  for j in range(8):
   a=j*TAU/8;g.cylinder((3*math.cos(a),3*math.sin(a),2.3),.10,3.3,'cream',8)
  g.cylinder((0,0,4.0),3.6,.3,'cream',8)
  g.cylinder((0,0,4.75),3.95,1.25,'roofteal',8,top=.15)
  for xx in [-1.6,1.6]:street_bench(g,xx,0,rot=math.pi/2)
  for xx in [-4.5,4.5]:flowers(g,xx,0,.65,.6,5)

def midrise_masonry(g,w,d,top,mat='finance_brick'):
 b=.7;g.box((0,0,(b+top)/2),(w,d,top-b),mat,bevel=.08)
 def facade(f,fw):
  count=max(3,round(fw/2.9))
  for j in range(count):
   xx=-fw/2+(j+.5)*fw/count
   for z in [2.3+3*k for k in range(round((top-1.5)/3))]:punched(f,xx,z,1.35,1.95)
  for zz in sorted({4,round(top-.4,4)}):f.box((0,-.1,zz),(fw+.18,.3,.18),'cream')
 faces(g,w,d,facade);cornice(g,w,d,top)

def growing_stage(g,site):
 if site==0:
  heritage_bank(g,1);heritage_bank(g,2)
  # The old branch is expanded before the clock-tower renovation of Lv.3.
  h=Geometry();hipped_roof(h,6.5,5.5,10.2,1.5);transfer(g,h,0,1)
 elif site==1:
  # A warm L-shaped office block, rather than a shortened terrace tower.
  h=Geometry();midrise_masonry(h,9.5,10,12,'plaster');hipped_roof(h,10,10.5,12.2,1.3)
  transfer(g,h,-1.5,0)
  wing=Geometry();glazed_box(wing,3,8,.7,6,'glass_finance_mint','cream');cornice(wing,3.2,8.2,6.1)
  transfer(g,wing,4.9,1)
  roof_garden(g,4.9,1,6.25,2.6,2.7)
  for xx in [-4,-1,2]:g.cylinder((xx,-5.6,2.15),.13,3.0,'cream',10)
  g.box((-.9,-5.8,3.7),(9.4,1.6,.22),'cream')
  text_mesh(g,'BUSINESS HOUSE',(-1,-6.66,3.95),.4,'finance_copper')
 elif site==2:
  brick_loft(g,1);brick_loft(g,2)
  hipped_roof(g,12.7,11.7,12.4,2.5)
  for x in [-3,3]:
   g.box((x,-4.45,13.3),(1.6,1.2,1.4),'finance_limestone')
   f=Geometry();punched(f,0,13.35,1.15,1.0);transfer(g,f,x,-5.1)
   g.box((x,-4.5,14.1),(1.9,1.5,.16),'finance_copper')
 elif site==3:
  # Broad masonry commercial block with a courtyard terrace and plant room.
  midrise_masonry(g,12,11,17,'finance_limestone')
  g.box((0,1,18.05),(7,6,1.8),'finance_copper',bevel=.10)
  solar(g,0,1,19.1,5,3)
  roof_garden(g,0,-4.4,17.2,10,1)
  for xx in [-4,4]:g.box((xx,-5.7,2.5),(1.4,.4,3.4),'finance_bronze')
  text_mesh(g,'CIVIC OFFICES',(0,-5.76,5.55),.54,'finance_bronze')
 elif site==4:
  # The market is redeveloped into a midrise office over a retained shop arcade.
  podium=Geometry();midrise_masonry(podium,12.5,10,4.4,'finance_limestone');transfer(g,podium,0,0)
  upper=Geometry();glazed_box(upper,9,8,4.5,22,'glass_finance_sky','steel',1.8)
  for z in [10.5,16.5,22.1]:cornice(upper,9,8,z,'cream',.45)
  transfer(g,upper,-.9,1)
  g.box((-.9,1,22.8),(5.5,4.5,1.2),'cream',bevel=.08)
  for xx in [-2,0]:g.cylinder((xx,1,23.5),.62,.20,'metal',12)
  for xx in [-4.5,-1.5,1.5,4.5]:g.box((xx,-5.6,3.25),(2.6,1.4,.18),'canvas')
  text_mesh(g,'MARKET ARCADE',(0,-6.32,3.52),.45,'finance_copper')
 elif site==5:
  # A rectangular local exchange with a curved entrance and landscaped forecourt.
  f=Geometry();glazed_box(f,10.5,9,.7,15,'glass_finance_teal','cream',2.6)
  cornice(f,11,9.5,15.2);transfer(g,f,0,1.5)
  g.box((0,1.5,15.6),(8.8,7.3,.14),'stone')
  roof_garden(g,0,-1.5,15.75,8.8,1)
  g.box((0,2.5,16.4),(5,3,1.4),'cream',bevel=.10)
  g.cylinder((0,-3.9,3.5),3.1,.18,'cream',24)
  for xx in [-2.4,2.4]:g.rod((xx,-4.6,.7),(xx,-4.6,3.5),.09,'steel',8)
  planted_court(g,0,-5.8,11.8,2.0,58)
  text_mesh(g,'EXCHANGE',(0,-3.10,4.25),.5,'cream')

def finance(static,dynamic):
 g=Geometry();parcel(g,60,44,'paver');roots=[]
 # Through-lane and an asymmetrical plaza, not six identical building plinths.
 paving(g,0,-19.25,57,4.3,24)
 paving(g,0,20.0,57,2.7,25)
 paving(g,8.6,-.2,5.2,36,27,z=.435)
 paving(g,-12,2.2,31,3,28,z=.47)
 sites=[(-20,-10.1,heritage_bank,'limestone_bank'),(-2.4,-6.5,garden_office,'garden_terraces'),
        (20,-9.4,brick_loft,'brick_corner_loft'),(-21,10.8,deco_tower,'art_deco_setbacks'),
        (-3,11.9,prism_tower,'sloping_glass_prism'),(19,10.6,round_tower,'round_diagrid')]
 for i,(x,y,fn,typology) in enumerate(sites):
  for level in [1,2,3]:
   o=empty(f'finance_tower_{i}_level_{level}',dynamic,kind='level',district='finance',
           minLevel=level,maxLevel=level,assetVersion='0.4',architecture=typology,
           developmentStage=['neighbourhood','mixed_commercial','prosperous'][level-1])
   roots.append(o);local=Geometry()
   if level==1:starter_stage(local,i)
   elif level==2:growing_stage(local,i)
   else:
    # Preserve every vertex of the user-approved prosperous architecture.
    for segment in [1,2,3]:fn(local,segment)
   placed=Geometry();transfer(placed,local,x,y);placed.emit(o,o.name)
 # Public-space scale follows the same adult used in the garage verification.
 for j,(x,y,s) in enumerate([(-28,-17,.72),(-28,2,.72),(-28,18,.65),(28,18,.7),(28,1,.7),(28,-17,.72),(10,1,.74),(10,-7,.62),(-11,-13.8,.54)]):
  g.box((x,y,.56),(2,2,.34),'cream',bevel=.10);street_tree(g,x,y,s,30+j)
 for x,y in [(-10,-19.1),(11,19.8),(28,-5),(-28,-5)]:
  l=Geometry();lamp(l,0,0);transfer(g,l,x,y,z=.35,scale=.78)
 # Shallow circular fountain and curved timber seats form a distinct civic centre.
 fx,fy=8.2,-14.2
 g.cylinder((fx,fy,.63),3.45,.44,'cream',48)
 g.cylinder((fx,fy,.88),3.12,.07,'water',48)
 g.cylinder((fx,fy,1.22),.55,.7,'finance_bronze',16)
 for j in range(8):
  a=j*TAU/8
  line(g,[(fx,fy,1.55),(fx+math.cos(a)*.8,fy+math.sin(a)*.8,2.2),
          (fx+math.cos(a)*1.9,fy+math.sin(a)*1.9,1.0)],.038,'water',6)
 for a0,a1 in [(0,.7*math.pi),(math.pi,1.55*math.pi)]:
  band(g,fx,fy,.92,4.5,4.5,.6,'woodlight',32,a0,a1)
  for a in [a0+.1,a1-.1]:g.box((fx+4.2*math.cos(a),fy+4.2*math.sin(a),.65),(.3,.3,.53),'metal')
 for x,y,rot in [(-11,-18.6,0),(27,-12,math.pi/2),(10,4,-math.pi/2),(-28,9,-math.pi/2)]:street_bench(g,x,y,rot)
 for x,y in [(15,-17.6),(19,-17.6),(23,-17.6)]:
  g.cylinder((x,y,.86),.07,.85,'metal',8);g.cylinder((x,y,1.30),.58,.08,'woodlight',20)
  for sign in [-1,1]:
   c=Geometry();chair(c,0,0,rot=math.pi/2*sign);transfer(g,c,x+sign*.85,y,z=.4,scale=.40)
 # A single cafe parasol gives the foreground a warm, legible roof accent.
 g.rod((19,-17.6,.45),(19,-17.6,3.2),.045,'wood',8)
 g.cylinder((19,-17.6,2.95),1.5,.5,'canvas',12,top=.12)
 for j,(x,y) in enumerate([(-13,-19),(1,-17),(11,-19),(13,-5),(-12,2),(22,19)]):person(g,x,y,'blue' if j%2 else 'roofred',rot=j*.7,ground=.48)
 for x,y in [(-10,-16),(11,8),(27,5)]:planter(g,x,y,z=.4,s=.6,seed=3)
 g.emit(static,'finance_detail');return roots
