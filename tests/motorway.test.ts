import test from 'node:test';import assert from 'node:assert/strict';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
import { CITIES,tendersFrom,withLoad,cargoPremium } from '../src/data/europe.ts';
import { TRACK,TRACK_LENGTH,TRACK_RX,ROAD_HALF_WIDTH,TERRAIN_SIZE,TERRAIN_SEGMENTS,terrainHeight,atDistance,nearestTrack,sceneryClearance } from '../src/game/track.ts';
import { accelerationFor } from '../src/game/drivetrain.ts';
import { DAY_SECONDS,dayCycle } from '../src/game/dayCycle.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
import { RIVALS } from '../src/game/raceField.ts';
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
    const sim=new Simulation({...DEFAULT_CONFIG,engine},{...TENDERS[0],tonnes},()=>0);sim.countdown=0;
    const y=sim.snapshot().y;for(let i=0;i<1800;i++)sim.step(gas);
    const result=sim.snapshot();assert.ok(result.y>y+7);assert.ok(result.progress>0);assert.ok(Math.abs(sim.body.translation().y-(result.y+1.9))<.01);
    assert.equal(result.ai.length,RIVALS.length);assert.ok(result.ai.every(a=>Number.isFinite(a.y)&&Number.isFinite(a.pitch)));sim.dispose();return result;
  };
  const light=run(8),heavy=run(24),strong=run(24,'D17A780');
  assert.ok(light.progress>heavy.progress+.025);assert.ok(strong.progress>heavy.progress+.015);
});
test('highway is closed with long climbs, over seventy metres of elevation and eleven-percent grades',()=>{
  const start=atDistance(0),end=atDistance(TRACK_LENGTH);assert.ok(Math.hypot(start.x-end.x,start.z-end.z)<.001);
  assert.equal(atDistance(600).x,TRACK_RX);assert.equal(atDistance(30).yaw,atDistance(600).yaw);
  const heights=TRACK.map(p=>p.y);assert.ok(Math.max(...heights)-Math.min(...heights)>70);
  assert.ok(Math.max(...TRACK.map(p=>p.grade))>.11);assert.ok(Math.max(...TRACK.map(p=>Math.abs(p.grade)))<.12);
  for(const s of [10,700,1150,1850]){const p=atDistance(s,3.5),n=nearestTrack(p.x,p.z);assert.ok(Math.abs(n.lane-3.5)<.03);assert.ok(Math.abs(n.s-s)<.1);}
});
test('guardrails keep a sideways-moving truck inside the road',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>0);sim.countdown=0;
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
test('slower sky runs 1.5 days per minute with repeated nights and headlights at dusk',()=>{
  assert.equal(DAY_SECONDS,40);assert.equal(dayCycle(0).hour,8);assert.equal(dayCycle(20).hour,20);assert.equal(dayCycle(20).night,true);
  assert.equal(dayCycle(40).hour,8);assert.equal(dayCycle(40).day,2);assert.equal(dayCycle(60).day,2);assert.equal(dayCycle(60).hour,20);
  assert.equal(dayCycle(0).night,false);assert.equal(dayCycle(100).night,true);
});

test('a long eleven-percent climb visibly loses speed under full throttle, and payload/power change the outcome',()=>{
  const peak=TRACK.reduce((a,b)=>a.grade>b.grade?a:b);
  const run=(tonnes:number,engine=DEFAULT_CONFIG.engine,s=peak.s,throttle=true)=>{
    const sim=new Simulation({...DEFAULT_CONFIG,engine},{...TENDERS[0],tonnes},()=>0);const p=atDistance(s,3.5);sim.countdown=0;
    sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.yaw=p.yaw;sim.speed=20;sim.progress.distance=s;sim.progress.last=s;
    for(let i=0;i<900;i++)sim.step({throttle,brake:false,left:false,right:false});
    const result=sim.snapshot();assert.equal(result.offRoad,false);sim.dispose();return result;
  };
  const light=run(8),heavy=run(24),strong=run(24,'D17A780'),downhill=run(24,'D17A600',2050,false);
  assert.ok(heavy.speed<15,'Heavy 600 hp must drop below 54 km/h from 72 km/h even at full throttle');
  assert.ok(light.speed>heavy.speed+3,'Light cargo must retain at least 11 km/h more speed');
  assert.ok(strong.speed>heavy.speed+1.5,'780 hp must retain at least 5 km/h more with the same payload');
  assert.ok(downhill.speed>25,'Gravity must accelerate a coasting truck past 90 km/h downhill');
});
test('the rendered countryside remains below both carriageways despite the larger hills',()=>{
  const cell=TERRAIN_SIZE/TERRAIN_SEGMENTS;
  const meshHeight=(x:number,z:number)=>{
    const gx=(x+TERRAIN_SIZE/2)/cell,gz=(z+TERRAIN_SIZE/2)/cell,ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz;
    const px=ix*cell-TERRAIN_SIZE/2,pz=iz*cell-TERRAIN_SIZE/2;
    const h00=terrainHeight(px,pz),h10=terrainHeight(px+cell,pz),h01=terrainHeight(px,pz+cell),h11=terrainHeight(px+cell,pz+cell);
    return fx+fz<=1?h00+(h10-h00)*fx+(h01-h00)*fz:h11+(h01-h11)*(1-fx)+(h10-h11)*(1-fz);
  };
  for(let i=0;i<300;i++)for(const lane of [-8,0,8,15,23,31]){const p=atDistance(i/300*TRACK_LENGTH,lane);assert.ok(meshHeight(p.x,p.z)<p.y+.03,`Terrain intersects the road at ${i}, lane ${lane}`);}
});
