import test from 'node:test';import assert from 'node:assert/strict';
import { trailerPose,TRAILER_LENGTH } from '../src/game/trailer.ts';
import { atDistance,nearestTrack,TRACK_LENGTH } from '../src/game/track.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
import { RIVALS } from '../src/game/raceField.ts';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
await initPhysics();
test('trailers remain coupled through bends, gradients and loop boundaries',()=>{
  for(let s=0;s<TRACK_LENGTH;s+=19){
    const truck=atDistance(s),trailer=trailerPose(s,0);
    assert.ok(Object.values(trailer).every(Number.isFinite));
    assert.ok(Math.hypot(trailer.x-truck.x,trailer.z-truck.z)>7&&Math.hypot(trailer.x-truck.x,trailer.z-truck.z)<8.2);
    const axleX=trailer.x-Math.sin(trailer.yaw)*4.55*Math.cos(trailer.pitch),axleZ=trailer.z-Math.cos(trailer.yaw)*4.55*Math.cos(trailer.pitch),bottom=trailer.y+4.55*Math.sin(trailer.pitch);
    assert.ok(Math.abs(bottom-nearestTrack(axleX,axleZ).y)<.25,'Trailer wheels must follow terrain rather than float above it');
  }
  const curved=atDistance(1150),trailer=trailerPose(1150,0);assert.ok(Math.abs(curved.yaw-trailer.yaw)>.02);assert.equal(TRAILER_LENGTH,13.6);
});
test('all opponents have full-length colliders which advance and freeze with the race',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>0);sim.countdown=0;
  assert.equal(sim.aiTrailerBodies.length,RIVALS.length);assert.equal(sim.world.bodies.len(),1+2*RIVALS.length);
  const first=sim.aiTrailerBodies[0],shape=first.collider(0).halfExtents()!;assert.equal(shape.z,Math.fround(6.8));
  for(let i=0;i<120;i++)sim.step({throttle:true,brake:false,left:false,right:false});
  const pose=sim.snapshot().ai[0].trailer;assert.ok(Math.abs(first.translation().z-pose.z)<.02);
  sim.paused=true;const before={...first.translation()};sim.step({throttle:true,brake:false,left:false,right:false});assert.deepEqual({...first.translation()},before);sim.dispose();
});
