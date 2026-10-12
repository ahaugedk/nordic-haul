import test from 'node:test';import assert from 'node:assert/strict';
import { createRoadworks,approachingWork,trafficReport,roadworkObstacles,workMergeLane,WORK_WARNING,type Roadwork } from '../src/game/roadworks.ts';
import { signedGap } from '../src/game/aiDriving.ts';
import { TRACK_LENGTH,atDistance,nearestTrack,ROAD_LANES } from '../src/game/track.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
import { GRID_ORIGIN } from '../src/game/raceField.ts';
const seed=(n:number)=>()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/2**32;};
const car=(distance:number,lane:number,speed=20)=>({distance,minLane:lane,maxLane:lane,speed});
const site:Roadwork={id:'test',title:'Test',start:1000,length:100,closed:[0,3.5],speedLimit:12,active:true};
await initPhysics();

test('every race has two or three varied worksites inside its existing route, without overlapping physical closures',()=>{
  const counts=new Set<number>(),types=new Set<string>();
  for(const laps of [1,1.25,1.5,2])for(let s=1;s<=160;s++){
    const target=TRACK_LENGTH*laps,sites=createRoadworks(target,seed(Math.imul(s,0x9e3779b1)>>>0));counts.add(sites.length);
    assert.ok(sites.length>=2&&sites.length<=3);assert.equal(new Set(sites.map(w=>w.title)).size,sites.length);
    for(const [i,w] of sites.entries()){
      types.add(w.title);assert.ok(w.start>=480&&w.start+w.length<=target-250);assert.ok(ROAD_LANES.some(l=>!w.closed.includes(l)));
      for(const prior of sites.slice(0,i)){assert.ok(w.start>prior.start+prior.length+360);assert.ok(Math.abs(signedGap(prior.start,w.start))>=420);}
      for(const o of roadworkObstacles(w))assert.ok(Math.abs(o.lane)+o.width/2<8.5,'Roadworks do not enter the opposite carriageway or scenery');
    }
  }
  assert.deepEqual([...counts].sort(),[2,3]);assert.equal(types.size,4);
});
test('warnings arrive before the taper, survive pause and clear after the trailer exits',()=>{
  assert.equal(trafficReport([site],site.start-WORK_WARNING-1),null);
  const warning=trafficReport([site],site.start-WORK_WARNING)!;assert.equal(warning.phase,'approach');assert.ok(warning.message.includes('venstre'));
  assert.equal(trafficReport([site],site.start)!.phase,'zone');assert.equal(trafficReport([site],site.start+site.length+23),null);
  assert.equal(approachingWork({...site,active:false},800),null);
  assert.equal(approachingWork(site,TRACK_LENGTH+800),200,'Lapped vehicles also respect an active physical closure');
});
test('merging crosses only safe gaps, including the middle lane during a two-lane closure',()=>{
  assert.equal(workMergeLane(car(700,3.5),3.5,site,[]),-3.5);
  assert.equal(workMergeLane(car(700,3.5),3.5,site,[car(705,0)]),null);
  assert.equal(workMergeLane(car(700,0),0,site,[car(695,-3.5,28)]),null);
  assert.equal(workMergeLane(car(700,0),0,site,[car(560,-3.5,20)]),-3.5);
  const opposite={...site,closed:[-3.5,0]};
  assert.equal(workMergeLane(car(550,-3.5,0),-3.5,opposite,[{...car(522,-3.5,0),maxLane:3.5}]),3.5,'A stalled following reservation must not block its leader from merging');
});
test('live obstacles cost speed on collision, freeze on pause, and reset uses an open lane',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],seed(2));sim.countdown=0;
  const w=sim.worksites.find(s=>s.closed.includes(0))??sim.worksites[0],s=w.start+8,p=atDistance(s+GRID_ORIGIN,w.closed[0]);
  sim.progress.distance=s;sim.progress.nextGate=sim.target;sim.progress.last=p.s;sim.yaw=p.yaw;sim.speed=18;
  sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);
  for(let i=0;i<30;i++)sim.step({throttle:false,brake:false,left:false,right:false});
  assert.ok(sim.speed<14);assert.ok(sim.snapshot().impacts.some(h=>h.kind==='roadwork'));
  sim.paused=true;const frozen=sim.snapshot();for(let i=0;i<60;i++)sim.step({throttle:true,brake:false,left:false,right:false});assert.deepEqual(sim.snapshot(),frozen);
  const progress=sim.progress.validatedDistance;sim.resetToRoad();assert.equal(sim.progress.validatedDistance,progress);
  const lane=nearestTrack(sim.snapshot().x,sim.snapshot().z).lane;assert.ok(w.closed.every(l=>Math.abs(lane-l)>2.6));sim.dispose();
});
test('all six rivals pass both single- and double-lane closures with their trailers without changing race distance',()=>{
  const counts=new Set<number>();
  for(const value of [1,2,3]){
    const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],value===3?()=>.9:seed(value)),target=sim.target;sim.countdown=0;counts.add(sim.worksites.length);
    const parked=atDistance(GRID_ORIGIN,35);sim.body.setTranslation({x:parked.x,y:parked.y+1.9,z:parked.z},true);
    for(let tick=0;tick<24000&&!sim.aiDistances.every(s=>s>target);tick++){
      sim.step({throttle:false,brake:true,left:false,right:false});
      for(let i=0;i<6;i++)for(const w of sim.worksites){
        const gap=approachingWork(w,sim.aiDistances[i]);
        if(gap!==null&&gap<0&&gap>-w.length){
          const lane=sim.aiPaths[i].laneAt(sim.aiDistances[i]+GRID_ORIGIN);
          assert.ok(w.closed.every(l=>Math.abs(lane-l)>2.65),`Rival ${i} entered a closed lane at seed ${value}`);
        }
      }
    }
    assert.equal(sim.target,target);assert.ok(sim.aiDistances.every(s=>s>target),`Rivals stalled at seed ${value}: ${JSON.stringify(sim.aiDistances)}`);sim.dispose();
  }
  assert.ok(counts.has(3),'The actual planner must also traverse three worksites');
});
test('a driver can complete the unchanged full route through three varied worksites',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>.9);sim.countdown=0;const target=sim.target,seen=new Set<string>();
  for(let i=0;i<18000&&!sim.done;i++){
    const snap=sim.snapshot(),road=nearestTrack(snap.x,snap.z),report=snap.traffic;
    if(report)seen.add(report.id);
    const lane=report?.closed.includes(0)?ROAD_LANES.find(l=>!report.closed.includes(l))!:0;
    const aim=atDistance(road.s+Math.max(9,snap.speed*.65),lane),desired=Math.atan2(aim.x-snap.x,aim.z-snap.z);
    let error=desired-snap.yaw;while(error>Math.PI)error-=2*Math.PI;while(error<-Math.PI)error+=2*Math.PI;
    sim.step({throttle:snap.speed<22,brake:snap.speed>23,left:error<-.035,right:error>.035});
  }
  assert.ok(sim.done,`Race stalled: ${sim.snapshot().progress}`);assert.equal(sim.target,target);assert.equal(seen.size,3);assert.equal(sim.tender.par,TENDERS[0].par);sim.dispose();
});
