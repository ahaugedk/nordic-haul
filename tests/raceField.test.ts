import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG,TENDERS } from '../src/data/catalog.ts';
import { FIELD_SIZE,GRID_ORIGIN,RIVALS,startingGrid } from '../src/game/raceField.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
import { atDistance,nearestTrack,TRACK_LENGTH } from '../src/game/track.ts';
import { buyConfiguration,freshCareer,settleRace } from '../src/game/career.ts';
const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
await initPhysics();

test('random grids cover every starting rank, both lanes and every row without boxing in the player',()=>{
  const ranks=new Set<number>(),rows=new Set<number>(),lanes=new Set<number>();
  for(let seed=1;seed<=120;seed++){
    const grid=startingGrid(seeded(seed)),slots=[grid.player,...grid.rivals];
    ranks.add(grid.place);rows.add(grid.player.row);lanes.add(grid.player.lane);
    assert.equal(slots.length,FIELD_SIZE);assert.equal(new Set(slots.map(s=>`${s.distance}/${s.lane}`)).size,FIELD_SIZE);
    assert.ok(slots.every(s=>Math.abs(s.lane)===3.5&&s.distance>=GRID_ORIGIN));
    for(const a of slots)for(const b of slots)if(a!==b&&a.lane===b.lane)assert.ok(Math.abs(a.distance-b.distance)>=48,'Trailer and launch clearance between rows');
    assert.ok(grid.rivals.every(s=>s.lane!==0),'Middle overtaking lane must stay free');
    assert.equal(grid.place,1+grid.rivals.filter(s=>s.distance>grid.player.distance).length);
  }
  assert.equal(ranks.size,FIELD_SIZE);assert.equal(rows.size,4);assert.equal(lanes.size,2);
});

test('random starts begin at zero route progress, keep a common finish and do not jump on the first physics step',()=>{
  for(let seed=1;seed<=12;seed++){
    const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],seeded(seed)),before=sim.snapshot();
    assert.equal(before.place,sim.grid.place);assert.equal(before.startRow,sim.grid.player.row);assert.equal(before.progress,0);
    assert.equal(before.ai.length,RIVALS.length);assert.equal(sim.world.bodies.len(),1+2*RIVALS.length);
    assert.equal(sim.target,TENDERS[0].distance*TRACK_LENGTH);
    sim.step({throttle:true,brake:false,left:false,right:false});assert.deepEqual({...sim.body.translation()},{x:before.x,y:Math.fround(before.y+1.9),z:before.z});
    sim.countdown=0;sim.step({throttle:true,brake:false,left:false,right:false});
    assert.ok(sim.snapshot().progress<.001);assert.ok(Math.abs(sim.progress.distance-(sim.grid.player.distance-GRID_ORIGIN))<.1);
    sim.dispose();
  }
});

test('all six rivals follow a stopped player without overlapping their trailers',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],()=>0);sim.countdown=0;
  for(let tick=0;tick<7200;tick++){
    sim.step({throttle:false,brake:true,left:false,right:false});
    const player=sim.progress.validatedDistance,lane=nearestTrack(sim.snapshot().x,sim.snapshot().z).lane;
    for(let i=0;i<RIVALS.length;i++){
      if(Math.abs(sim.grid.rivals[i].lane-lane)<1&&sim.aiDistances[i]<player)assert.ok(player-sim.aiDistances[i]>=23.8);
      for(let j=0;j<i;j++)if(sim.grid.rivals[i].lane===sim.grid.rivals[j].lane)assert.ok(Math.abs(sim.aiDistances[i]-sim.aiDistances[j])>=23.8);
    }
  }
  assert.ok(sim.speed<.1);assert.ok(sim.aiSpeeds.every(Number.isFinite));sim.dispose();
});

test('reset puts the truck into the clear middle lane without awarding extra distance',()=>{
  const sim=new Simulation(DEFAULT_CONFIG,TENDERS[0],seeded(42)),distance=sim.progress.validatedDistance;
  const p=atDistance(sim.grid.player.distance,7);sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.resetToRoad();
  const n=nearestTrack(sim.snapshot().x,sim.snapshot().z);assert.ok(Math.abs(n.lane)<.01);
  assert.ok(Math.abs(n.s-(GRID_ORIGIN+distance))<.01);assert.equal(sim.progress.validatedDistance,distance);sim.dispose();
});

test('all seven places earn decreasing rewards while retaining the existing time bonus',()=>{
  const career=buyConfiguration(freshCareer(),DEFAULT_CONFIG)!;
  const payouts=Array.from({length:FIELD_SIZE},(_,i)=>settleRace(career,40000,i+1,false).payout);
  assert.deepEqual(payouts,[40000,32000,26000,22000,18000,14000,10000]);
  assert.equal(settleRace(career,40000,7,true).payout,16000);
});
