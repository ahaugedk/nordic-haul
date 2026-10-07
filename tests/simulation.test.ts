import test from 'node:test';import assert from 'node:assert/strict';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
import { atDistance,nearestTrack,RaceProgress,TRACK_LENGTH } from '../src/game/track.ts';
await initPhysics();
test('throttle, brakes, pause and reset use actual Rapier bodies',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0]);sim.countdown=0;
  const gas={throttle:true,brake:false,left:false,right:false};
  for(let i=0;i<180;i++)sim.step(gas);
  assert.ok(sim.speed>3);const before=sim.body.translation().x;sim.paused=true;sim.step(gas);assert.equal(sim.body.translation().x,before);
  sim.paused=false;for(let i=0;i<120;i++)sim.step({...gas,throttle:false,brake:true});assert.ok(sim.speed<.1);
  sim.resetToRoad();assert.ok(nearestTrack(sim.body.translation().x,sim.body.translation().z).distance<5);sim.dispose();
});
test('a controlled truck completes a full route against two collidable opponents',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0]);sim.countdown=0;
  for(let i=0;i<18000&&!sim.done;i++){
    const snap=sim.snapshot(),s=nearestTrack(snap.x,snap.z).s,target=atDistance(s+Math.max(9,snap.speed*.65),-3);
    const desired=Math.atan2(target.x-snap.x,target.z-snap.z);
    let error=desired-snap.yaw;while(error>Math.PI)error-=2*Math.PI;while(error<-Math.PI)error+=2*Math.PI;
    sim.step({throttle:snap.speed<22,brake:snap.speed>23,left:error<-.035,right:error>.035});
  }
  assert.ok(sim.done,`Route did not finish: ${JSON.stringify(sim.snapshot())}`);
  assert.ok(sim.snapshot().elapsed>40);assert.equal(sim.world.bodies.len(),5);sim.dispose();
});
test('crossing the infield does not award a completed route',()=>{
  const progress=new RaceProgress();progress.advance(TRACK_LENGTH*.6,false);assert.equal(progress.validatedDistance,0);
  progress.advance(TRACK_LENGTH*.99,true);assert.equal(progress.validatedDistance,0);
});
