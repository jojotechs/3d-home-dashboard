"""Measure generated vertices, not hand-entered dimensions, against street scale."""
import sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'modeling'))
from refined_districts import vehicle
from refined_shared import Geometry,person

def bounds(geo):
 pts=[p for vs,_,_ in geo.data.values() for p in vs]
 mn=[min(v[i] for v in pts) for i in range(3)];mx=[max(v[i] for v in pts) for i in range(3)]
 return {'min':mn,'max':mx,'size':[mx[i]-mn[i] for i in range(3)]}
car=Geometry();vehicle(car,0,0);cb=bounds(car)
adult=Geometry();person(adult,0,0);pb=bounds(adult)
assert 1.7<=cb['size'][0]<=2.0,cb
assert 4.2<=cb['size'][1]<=4.7,cb
assert 1.45<=cb['size'][2]<=1.85,cb
assert 1.65<=pb['size'][2]<=1.85,pb
assert cb['size'][0]<3, 'car must fit a single 3 m lane'
report={'status':'passed','units':'metres','car_measured_vertices':cb,'adult_measured_vertices':pb,'two_way_road_width':6,'single_lane_width':3,'checks':['car fits in a 3 m lane','adult is within 1.65–1.85 m','vehicle dimensions are measured directly from the geometry builder']}
(ROOT/'exports/scale-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
