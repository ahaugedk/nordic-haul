import test from 'node:test';import assert from 'node:assert/strict';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
import { CITIES,tendersFrom,withLoad,cargoPremium } from '../src/data/europe.ts';
import { TRACK,TRACK_LENGTH,TRACK_RX,ROAD_HALF_WIDTH,atDistance,nearestTrack,sceneryClearance } from '../src/game/track.ts';
import { accelerationFor } from '../src/game/drivetrain.ts';
import { DAY_SECONDS,dayCycle } from '../src/game/dayCycle.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
await initPhysics();
const gas={throttle:true,brake:false,left:false,right:false};
test('payload choices increase payment on the same route without changing destination or bonus target',()=>{
  for(const city of CITIES)for(const job of tendersFrom(city.id)){
    const light=withLoad(job,8),medium=withLoad(job,16),heavy=withLoad(job,24);
    assert.ok(heavy.reward>medium.reward&&medium.reward>light.reward);
    assert.equal(heavy.reward-light.reward,cargoPremium(24)-cargoPremium(8));
    assert.equal(light.destination,heavy.destination);assert.equal(light.par,heavy.par);assert.equal(light.distance,heavy.distance);
  }
});
test('power, payload and gravity affect acceleration independently',()=>{
  const high={...DEFAULT_CONFIG,engine:'D17A780' as const};
  const a=(t=DEFAULT_CONFIG,load=24,grade=0,throttle=true)=>accelerationFor(t,load,20,grade,throttle,false);
  assert.ok(a(high)>a());assert.ok(a(DEFAULT_CONFIG,8)>a());
  assert.ok(a(DEFAULT_CONFIG,24,.06)<a());assert.ok(a(DEFAULT_CONFIG,24,-.06)>a());
  assert.ok(a(DEFAULT_CONFIG,24,.06,false)<0);assert.ok(a(DEFAULT_CONFIG,24,-.06,false)>0);
});
test('actual loaded Rapier trucks climb the road and more power compensates for heavy cargo',()=>{
  const run=(tonnes:number,engine=DEFAULT_CONFIG.engine)=>{
    const sim=new Simulation({...DEFAULT_CONFIG,engine},{...TENDERS[0],tonnes});sim.countdown=0;
    const y=sim.snapshot().y;for(let i=0;i<1800;i++)sim.step(gas);
    const result=sim.snapshot();assert.ok(result.y>y+7);assert.ok(result.progress>0);assert.ok(Math.abs(sim.body.translation().y-(result.y+1.9))<.01);
    assert.equal(result.ai.length,2);assert.ok(result.ai.every(a=>Number.isFinite(a.y)&&Number.isFinite(a.pitch)));sim.dispose();return result;
  };
  const light=run(8),heavy=run(24),strong=run(24,'D17A780');
  assert.ok(light.progress>heavy.progress+.025);assert.ok(strong.progress>heavy.progress+.015);
});
test('highway is closed, has long straights and real rolling hills below eight percent',()=>{
  const start=atDistance(0),end=atDistance(TRACK_LENGTH);assert.ok(Math.hypot(start.x-end.x,start.z-end.z)<.001);
  assert.equal(atDistance(600).x,TRACK_RX);assert.equal(atDistance(30).yaw,atDistance(600).yaw);
  const heights=TRACK.map(p=>p.y);assert.ok(Math.max(...heights)-Math.min(...heights)>25);
  assert.ok(Math.max(...TRACK.map(p=>Math.abs(p.grade)))<.08);
  for(const s of [10,700,1150,1850]){const p=atDistance(s,3.5),n=nearestTrack(p.x,p.z);assert.ok(Math.abs(n.lane-3.5)<.03);assert.ok(Math.abs(n.s-s)<.1);}
});
test('guardrails keep a sideways-moving truck inside the road',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0]);sim.countdown=0;
  const p=atDistance(100,6.8);sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.yaw=Math.PI/2;sim.speed=18;
  for(let i=0;i<90;i++)sim.step({...gas,throttle:false});
  assert.ok(nearestTrack(sim.snapshot().x,sim.snapshot().z).distance<ROAD_HALF_WIDTH);sim.dispose();
});
test('scenery envelopes keep houses, roofs and tree crowns outside both carriageways',()=>{
  assert.equal(sceneryClearance(atDistance(80).x,atDistance(80).z,10,13),false);
  const opposite=atDistance(80,23);assert.equal(sceneryClearance(opposite.x,opposite.z,10,13),false);
  for(let i=0;i<26;i++){const p=atDistance(i/26*TRACK_LENGTH,i%2?-70:90);assert.ok(sceneryClearance(p.x,p.z,13+i%4*2,16));}
  for(let i=0;i<240;i++){const p=atDistance(i/240*TRACK_LENGTH,(i%2?-1:1)*(42+(i*37%160))),radius=3.5+i%3;if(sceneryClearance(p.x,p.z,radius*2,radius*2,12)){const n=nearestTrack(p.x,p.z);assert.ok(Math.min(Math.abs(n.lane),Math.abs(n.lane-23))>ROAD_HALF_WIDTH+radius+12);}}
});
test('day clock runs 2.5 days per minute with repeated nights and headlights at dusk',()=>{
  assert.equal(DAY_SECONDS,24);assert.equal(dayCycle(0).hour,8);assert.equal(dayCycle(12).hour,20);assert.equal(dayCycle(12).night,true);
  assert.equal(dayCycle(24).hour,8);assert.equal(dayCycle(24).day,2);assert.equal(dayCycle(60).day,3);assert.equal(dayCycle(60).hour,20);
  assert.equal(dayCycle(0).night,false);assert.equal(dayCycle(36).night,true);
});
