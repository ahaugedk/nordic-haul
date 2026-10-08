import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseLane,laneIsClear,RivalPath,signedGap,type TrafficVehicle } from '../src/game/aiDriving.ts';
import { TRACK_LENGTH,atDistance,nearestTrack } from '../src/game/track.ts';
import { trailerPose } from '../src/game/trailer.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
import { GRID_ORIGIN } from '../src/game/raceField.ts';
const vehicle=(distance:number,lane:number,speed=20):TrafficVehicle=>({distance,speed,minLane:lane,maxLane:lane});
await initPhysics();

test('rivals pass slower leaders in an adjacent free lane and return right on open road',()=>{
  const ego=vehicle(100,3.5);
  assert.equal(chooseLane(ego,3.5,28,[vehicle(155,3.5,10)]),0);
  assert.equal(chooseLane(vehicle(100,-3.5),-3.5,28,[]),0);
  assert.equal(chooseLane(ego,3.5,28,[]),null);
  assert.equal(chooseLane(vehicle(100,0),0,28,[vehicle(155,0,10),vehicle(105,-3.5),vehicle(110,3.5)]),null);
});
test('merges protect the player, approaching vehicles and already reserved lanes across a lap boundary',()=>{
  const ego=vehicle(TRACK_LENGTH-15,3.5,20);
  assert.equal(signedGap(ego.distance,15),30);
  assert.equal(laneIsClear(ego,0,[vehicle(15,0,0)]),false);
  assert.equal(laneIsClear(ego,0,[vehicle(TRACK_LENGTH-70,0,29)]),false);
  assert.equal(laneIsClear(ego,0,[{...vehicle(ego.distance+5,-3.5),maxLane:0}]),false);
  assert.equal(laneIsClear(ego,0,[vehicle(ego.distance+120,0,20)]),true);
});
test('lane changes steer gradually and trailers follow the past path with an intact coupling',()=>{
  const path=new RivalPath(3.5);path.change(100,0,20,5);
  assert.equal(path.laneAt(100),3.5);assert.equal(path.laneAt(190),0);
  assert.ok(Math.abs(path.pose(145).yaw-atDistance(145).yaw)>.01);
  let last=path.pose(100);
  for(let s=100.5;s<=212;s+=.5){
    const p=path.pose(s),t=trailerPose(s,path.laneAt(s),d=>path.pose(d));
    assert.ok(Math.hypot(p.x-last.x,p.z-last.z)<.6,'No lateral teleport');last=p;
    assert.ok(path.laneAt(s-11.8)>=path.laneAt(s),'Trailer axle changes lanes after the tractor');
    const hitchForward=-2.25*Math.cos(p.pitch)+1.34*Math.sin(p.pitch),trailerForward=1.34*Math.sin(t.pitch)+5.5*Math.cos(t.pitch);
    assert.ok(Math.hypot(p.x+Math.sin(p.yaw)*hitchForward-(t.x+Math.sin(t.yaw)*trailerForward),p.z+Math.cos(p.yaw)*hitchForward-(t.z+Math.cos(t.yaw)*trailerForward))<1e-8);
  }
  assert.deepEqual(path.envelope(150),{minLane:0,maxLane:3.5});
  assert.equal(path.changing(211),true);assert.equal(path.changing(213),false);
  path.change(TRACK_LENGTH+100,3.5,20,100);
  assert.equal(path.laneAt(TRACK_LENGTH+99),0);assert.ok(path.laneAt(TRACK_LENGTH+145)>0);
});
test('actual rivals change lanes while towing, keep renderer and collision bodies together, and freeze when paused',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>0);sim.countdown=0;
  let changed=false,articulated=false;
  for(let tick=0;tick<3600;tick++){
    sim.step({throttle:false,brake:true,left:false,right:false});
    const snap=sim.snapshot();
    snap.ai.forEach((p,i)=>{
      const s=sim.aiDistances[i]+GRID_ORIGIN,path=sim.aiPaths[i];
      changed ||= Math.abs(path.laneAt(s)-sim.grid.rivals[i].lane)>.5;
      articulated ||= Math.abs(path.laneAt(s)-path.laneAt(s-11.8))>.15;
      const cab=sim.aiBodies[i].translation(),trailer=sim.aiTrailerBodies[i].translation();
      assert.ok(Math.hypot(cab.x-p.x,cab.z-p.z)<.002);
      assert.ok(Math.hypot(trailer.x-p.trailer.x,trailer.z-p.trailer.z)<.002);
      assert.ok(Math.abs(nearestTrack(p.x,p.z).lane)<=3.51);
    });
  }
  assert.ok(changed,'Rivals must actually change lanes');assert.ok(articulated,'The trailer must follow the lane change');
  sim.paused=true;const before=sim.snapshot();for(let i=0;i<100;i++)sim.step({throttle:true,brake:false,left:false,right:false});assert.deepEqual(sim.snapshot(),before);
  sim.dispose();
});
