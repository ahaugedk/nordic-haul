import test from 'node:test';
import assert from 'node:assert/strict';
import { MeshBuilder,NullEngine,Scene,StandardMaterial,TransformNode,Vector3 } from '@babylonjs/core';
import { buildTerminal,terminalLayout,terminalGroundHeight,terminalSceneryClearance,TERMINAL_PORTS } from '../src/game/terminal.ts';
import { GRID_ORIGIN } from '../src/game/raceField.ts';
import { atDistance,nearestTrack,terrainHeight,TRACK_LENGTH,ROAD_HALF_WIDTH } from '../src/game/track.ts';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';

test('each route puts the terminal at the actual shared finish, including the grid origin',()=>{
  for(const distance of [1,1.25,1.5,2]){
    const layout=terminalLayout(distance),expected=atDistance(GRID_ORIGIN+TRACK_LENGTH*distance);
    assert.deepEqual(layout.finish,expected);assert.equal(layout.ports.length,12);
    assert.equal(new Set(layout.ports.map(p=>p.number)).size,TERMINAL_PORTS);
    assert.ok(layout.ports.every(p=>p.x<-ROAD_HALF_WIDTH-15));
  }
});
test('a level unloading terrace clears the hills while leaving both carriageways untouched',()=>{
  for(const distance of [1,1.25,1.5]){
    const layout=terminalLayout(distance);
    for(const offset of [-65,0,40,75])for(const lane of [-8,0,8,15,23,31]){
      const p=atDistance(layout.finish.s+offset,lane),height=terrainHeight(p.x,p.z);
      assert.equal(terminalGroundHeight(layout,p.x,p.z,height),height);
    }
    for(const x of [-90,-50,-25])for(const z of [40,60,78]){
      const c=Math.cos(layout.finish.yaw),s=Math.sin(layout.finish.yaw),wx=layout.finish.x+x*c+z*s,wz=layout.finish.z-x*s+z*c;
      assert.ok(terminalGroundHeight(layout,wx,wz,terrainHeight(wx,wz))<layout.finish.y+layout.floor,'Terrain must not enter the warehouse or obscure docks');
    }
  }
});
test('terminal grounds exclude houses, roof overhangs and tree crowns on every route',()=>{
  for(const distance of [1,1.25,1.5]){
    const {finish}=terminalLayout(distance),p=atDistance(finish.s+30,-70);
    assert.equal(terminalSceneryClearance(p.x,p.z,10),false);
    const edge=atDistance(finish.s,-124);
    assert.equal(terminalSceneryClearance(edge.x,edge.z,10),false);
    const far=atDistance(finish.s,-145);assert.equal(terminalSceneryClearance(far.x,far.z,5),true);
  }
});

test('rendered terminals have twelve doors, correct world placement and no warehouse overhang onto either carriageway',()=>{
  const engine=new NullEngine();
  for(const distance of [1,1.25,1.5]){
    const scene=new Scene(engine),motorway=new TransformNode('motorway',scene),labels:string[]=[];
    const terminal=buildTerminal(scene,motorway,distance,'København',(text,w,h)=>{
      labels.push(text);const m=MeshBuilder.CreatePlane(text,{width:w,height:h},scene);m.material=new StandardMaterial(text,scene);return m;
    });
    assert.equal(terminal.root.isEnabled(),false);terminal.root.setEnabled(true);
    assert.ok(labels.includes('KØBENHAVN / LOGISTIKTERMINAL'));
    for(let i=1;i<=12;i++)assert.ok(labels.includes(String(i).padStart(2,'0')));
    const warehouse=terminal.root.getChildMeshes().find(m=>m.name.startsWith('terminal warehouse'))!;
    warehouse.computeWorldMatrix(true);
    for(const point of warehouse.getBoundingInfo().boundingBox.vectorsWorld){
      const lane=nearestTrack(point.x,point.z).lane;
      // The facade batch also contains the small gatehouse, nearer than the warehouse.
      assert.ok(Math.min(Math.abs(lane),Math.abs(lane-23))>ROAD_HALF_WIDTH+2,'All buildings clear both carriageways');
    }
    const line=terminal.root.getChildMeshes().find(m=>m.name.startsWith('terminal arrival checker'))!;
    line.computeWorldMatrix(true);
    const finish=terminalLayout(distance).finish,center=line.getBoundingInfo().boundingBox.centerWorld;
    assert.ok(Vector3.Distance(new Vector3(center.x,finish.y,center.z),new Vector3(finish.x,finish.y,finish.z))<1,'Finish tiles are not transformed twice');
    assert.equal(terminal.lamps.length,5);assert.equal(terminal.nightMaterials.length,3);assert.equal(terminal.floodlights.length,2);
    assert.ok(terminal.root.getChildMeshes().length<35,'Facade details are batched for laptop/mobile rendering');
    terminal.root.dispose(false,true);assert.equal(motorway.getChildMeshes().length,0);assert.equal(scene.lights.length,0);scene.dispose();
  }
  engine.dispose();
});

await initPhysics();
test('remaining distance exposes the final approach without moving the finish or changing race duration',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>0);
  assert.equal(sim.snapshot().remaining,sim.target-sim.progress.validatedDistance);
  sim.progress.distance=sim.target-100;sim.progress.nextGate=sim.target;
  assert.equal(sim.snapshot().remaining,100);assert.equal(sim.done,false);
  sim.progress.distance=sim.target+1;assert.equal(sim.snapshot().remaining,0);
  sim.dispose();
});
