import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine,PBRMaterial,Scene,TransformNode,Vector3,VertexBuffer } from '@babylonjs/core';
import { buildGantry,distanceLabel,gantryClearOfTerminal,GANTRY_POSITIONS,signDistance,virtualSignDistance,SIGN_BOTTOM } from '../src/game/routeSigns.ts';
import { TRACK_LENGTH,atDistance,ROAD_HALF_WIDTH } from '../src/game/track.ts';
import { GRID_ORIGIN } from '../src/game/raceField.ts';
import { CITIES,tendersFrom } from '../src/data/europe.ts';

test('overhead distances point to the actual route finish, accounting for start offset and extra laps',()=>{
  for(const laps of [1,1.25,1.5,2]){
    const target=TRACK_LENGTH*laps;
    for(const s of GANTRY_POSITIONS){
      assert.equal(signDistance(s,target,0),target+GRID_ORIGIN-s);
      assert.equal(signDistance(s,target,s+64-GRID_ORIGIN),target+GRID_ORIGIN-s,'No board change while passing beneath it');
      const next=target+GRID_ORIGIN-s-TRACK_LENGTH;
      assert.equal(signDistance(s,target,s+66-GRID_ORIGIN),next<0?null:next);
    }
  }
  const secondLap=signDistance(650,1.5*TRACK_LENGTH,TRACK_LENGTH+575-GRID_ORIGIN)!;
  assert.ok(secondLap>900&&secondLap<950);
  assert.equal(signDistance(2750,TRACK_LENGTH,2000),TRACK_LENGTH+80-2750);
});
test('readings use Danish kilometres and metres close to the terminal',()=>{
  assert.equal(distanceLabel(379700),'380 km');assert.equal(distanceLabel(1200000),'1.200 km');
  assert.equal(distanceLabel(2395),'2,4 km');assert.equal(distanceLabel(1500),'1,5 km');
  assert.equal(distanceLabel(1000),'1,0 km');assert.equal(distanceLabel(913),'910 m');
  assert.equal(distanceLabel(295),'300 m');assert.equal(distanceLabel(0),'0 m');
});
test('virtual distances match contract kilometres at the start, along the route and at delivery for every start row',()=>{
  for(const city of CITIES)for(const job of tendersFrom(city.id))for(const start of [0,8,48,56,96,104,144,152]){
    const target=job.distance*TRACK_LENGTH;
    assert.equal(virtualSignDistance(GRID_ORIGIN+start,target,start,job.roadKm,start),job.roadKm*1000);
    for(const fraction of [.25,.5,.75,1]){
      const s=GRID_ORIGIN+start+(target-start)*fraction,physical=s%TRACK_LENGTH;
      const displayed=virtualSignDistance(physical,target,s-GRID_ORIGIN-20,job.roadKm,start);
      assert.notEqual(displayed,null,'The virtual route reaches zero at the finish');
      assert.ok(Math.abs(displayed!-job.roadKm*1000*(1-fraction))<.00001,'Sign uses the same geographic progression as the chosen contract');
    }
  }
});
test('a repeated gantry shows hundreds of virtual kilometres instead of the few physical race kilometres',()=>{
  const target=TRACK_LENGTH*1.5;
  const first=virtualSignDistance(650,target,500,860)!;
  const second=virtualSignDistance(650,target,TRACK_LENGTH+500,860)!;
  assert.ok(first>700000&&first<800000);assert.ok(second>150000&&second<200000);
  assert.equal(distanceLabel(second),'176 km');
  assert.equal(virtualSignDistance(650,TRACK_LENGTH,TRACK_LENGTH,360),null);
});
test('gantries stay out of the terminal arrival gate and still provide several signs per route',()=>{
  for(const laps of [1,1.25,1.5,2]){
    const visible=GANTRY_POSITIONS.filter(s=>gantryClearOfTerminal(s,laps*TRACK_LENGTH));
    assert.ok(visible.length>=5);
    const finish=atDistance(GRID_ORIGIN+TRACK_LENGTH*laps);
    for(const s of visible){const d=Math.abs(s-finish.s);assert.ok(Math.min(d,TRACK_LENGTH-d)>110);}
  }
});
test('actual overhead geometry faces approaching drivers and clears all lanes and truck roofs on straights and bends',()=>{
  const engine=new NullEngine(),scene=new Scene(engine),motorway=new TransformNode('motorway',scene),steel=new PBRMaterial('steel',scene);
  for(const s of GANTRY_POSITIONS){
    const g=buildGantry(scene,motorway,s,steel),p=atDistance(s);
    g.board.computeWorldMatrix(true);
    assert.ok(Math.abs(g.board.getBoundingInfo().boundingBox.minimumWorld.y-p.y-SIGN_BOTTOM)<.001);
    const normal=Vector3.TransformNormal(new Vector3(0,0,-1),g.board.getWorldMatrix()).normalize();
    assert.ok(Vector3.Dot(normal,new Vector3(-p.tx,0,-p.tz))>.999);
    const frame=g.root.getChildMeshes().find(m=>m!==g.board)!;
    const positions=frame.getVerticesData(VertexBuffer.PositionKind)!;
    for(let i=0;i<positions.length;i+=3)if(positions[i+1]<6)assert.ok(Math.abs(positions[i])>ROAD_HALF_WIDTH+1.5,'Posts and foundations must remain outside the shoulder');
    assert.equal(g.root.getChildMeshes().length,2,'Hardware is batched to one draw call');
  }
  scene.dispose();engine.dispose();
});
