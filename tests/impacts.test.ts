import test from 'node:test';import assert from 'node:assert/strict';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
import { atDistance,nearestTrack } from '../src/game/track.ts';
import { GRID_ORIGIN } from '../src/game/raceField.ts';
import { trailerPose,towRotation } from '../src/game/trailer.ts';
await initPhysics();
const coast={throttle:false,brake:false,left:false,right:false};
function placePlayer(sim:Simulation,s:number,lane:number,yaw:number,speed:number){
  const p=atDistance(s,lane);sim.countdown=0;sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.body.setLinvel({x:0,y:0,z:0},true);sim.yaw=yaw;sim.speed=speed;sim.progress.distance=s-GRID_ORIGIN;sim.progress.last=s;
}
function relocateRivals(sim:Simulation){
  for(let i=0;i<sim.aiBodies.length;i++){
    const s=i===0?400:1000+i*60,lane=sim.grid.rivals[i].lane,p=atDistance(s,lane),t=trailerPose(s,lane);
    sim.aiDistances[i]=s-GRID_ORIGIN;sim.aiSpeeds[i]=0;sim.aiBodies[i].setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.aiBodies[i].setRotation(towRotation(p.yaw,0),true);
    sim.aiTrailerBodies[i].setTranslation(t,true);sim.aiTrailerBodies[i].setRotation(towRotation(t.yaw,t.pitch),true);
  }
}
test('scraping a real guardrail causes extra sustained speed loss and contact-point sparks',()=>{
  const run=(lane:number)=>{
    const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>0);relocateRivals(sim);placePlayer(sim,110,lane,.12,22);
    for(let i=0;i<30;i++)sim.step(coast);
    const s=sim.snapshot();sim.dispose();return s;
  };
  const clear=run(0),rail=run(7.3);
  assert.equal(clear.impacts.length,0);assert.ok(rail.impacts.some(i=>i.kind==='guardrail'));
  assert.ok(rail.speed<clear.speed-2,`Rail ${rail.speed} vs clear ${clear.speed}`);
  assert.ok(rail.impacts.every(i=>Number.isFinite(i.x)&&Number.isFinite(i.y)&&Number.isFinite(i.z)&&i.speedLost>0));
  assert.ok(rail.impacts.length<8,'Do not emit dozens of bursts on adjacent guardrail seams');
});
test('both rival tractor and trailer contacts lose speed; harder impacts lose more',()=>{
  const run=(kind:'truck'|'trailer',speed:number)=>{
    const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>0);relocateRivals(sim);
    placePlayer(sim,kind==='truck'?400:392,sim.grid.rivals[0].lane+2.7,-.12,speed);
    sim.step(coast);const snapshot=sim.snapshot();sim.dispose();return snapshot;
  };
  for(const kind of ['truck','trailer'] as const){
    const gentle=run(kind,5),hard=run(kind,22);
    assert.ok(hard.impacts.some(i=>i.kind===kind),JSON.stringify(hard.impacts));
    assert.ok(hard.speed<20);assert.ok(22-hard.speed>5-gentle.speed);
  }
});
test('a stopped truck does not throw endless sparks, pause freezes impacts and reset clears them',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>0);placePlayer(sim,110,7.3,.12,0);sim.step(coast);assert.equal(sim.snapshot().impacts.length,0);
  placePlayer(sim,110,7.3,.12,22);sim.step(coast);assert.ok(sim.snapshot().impacts.length>0);
  sim.paused=true;const before=sim.snapshot();sim.step(coast);assert.deepEqual(sim.snapshot(),before);
  sim.resetToRoad();assert.equal(sim.snapshot().impacts.length,0);assert.ok(nearestTrack(sim.snapshot().x,sim.snapshot().z).distance<1);sim.dispose();
});
