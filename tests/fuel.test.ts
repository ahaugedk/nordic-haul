import test from 'node:test';import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/data/catalog.ts';
import { CITIES,cityFor,approximateRoadKm,tendersFrom,withLoad } from '../src/data/europe.ts';
import { FuelMeter,fuelDemand,startFuel,virtualRoadKm,economyBonus,projectFuel,rangeKilometres } from '../src/game/fuel.ts';
import { Simulation,initPhysics } from '../src/game/simulation.ts';
import { atDistance,nearestTrack } from '../src/game/track.ts';
import { buyConfiguration,freshCareer,settleRace,failRace } from '../src/game/career.ts';
await initPhysics();
const job=tendersFrom('aarhus')[0],gas={throttle:true,brake:false,left:false,right:false};
test('all 48 jobs have documented road distances and plausible trip diesel, not a tiny racing tank',()=>{
 let count=0;
 for(const c of CITIES)for(const j of tendersFrom(c.id))for(const tonnes of [8,16,24]){
  count++;const t=withLoad(j,tonnes),fuel=startFuel(t);
  assert.equal(virtualRoadKm(t),j.roadKm);assert.ok(fuel>j.roadKm*.36);assert.ok(fuel<j.roadKm*.48+15);assert.equal(fuel%5,0);
  assert.ok(fuel>=120&&fuel<=850);
 }
 assert.equal(count,144);
 assert.equal(approximateRoadKm(cityFor('aarhus'),cityFor('copenhagen')),310);
 assert.equal(approximateRoadKm(cityFor('stockholm'),cityFor('warsaw')),1990);
 assert.equal(approximateRoadKm(cityFor('copenhagen'),cityFor('aarhus')),310);
});
test('fuel responds to payload, climbs, excess speed, wasted downhill gas and coasting',()=>{
 const f=(tonnes=8,speed=80/3.6,grade=0,throttle=true,brake=false)=>fuelDemand(DEFAULT_CONFIG,tonnes,speed,grade,throttle,brake);
 assert.ok(f(24).per100>f().per100);assert.ok(f(24,20,.08).per100>f(24,20,0).per100);
 assert.ok(f(8,120/3.6).per100>f().per100);assert.ok(f(8,20,-.06).per100>0);
 assert.equal(f(24,25,-.08,false).per100,0);assert.equal(f(8,0,0,false).hourly,2);
 assert.ok(f(8,0,0,true).hourly>f(8,0,0,false).hourly);
 assert.ok(f(8,20,0,true,true).per100>f(8,20).per100);
});
test('litres and L/100 km account for the very same full virtual road distance',()=>{
 const meter=new FuelMeter(DEFAULT_CONFIG,job,3000),demand=fuelDemand(DEFAULT_CONFIG,8,20,0,true,false);
 for(let i=0;i<300;i++)meter.step(.1,10,20,0,true,false);
 const s=meter.snapshot();assert.ok(Math.abs(meter.distanceKm-job.roadKm)<1e-8);
 assert.ok(Math.abs(s.used-job.roadKm*demand.per100/100)<1e-8);assert.ok(Math.abs(s.average-demand.per100)<1e-8);
 const before=s.remaining;meter.step(1,20,25,-.06,false,false);assert.equal(meter.remaining,before);
});
test('countdown and pause freeze fuel, R does not refill, and running out stops the race',()=>{
 const sim=new Simulation(DEFAULT_CONFIG,job,()=>0,{roadworks:false});const start=sim.fuel.remaining;
 sim.step(gas);assert.equal(sim.fuel.remaining,start);sim.countdown=0;sim.paused=true;sim.step(gas);assert.equal(sim.fuel.remaining,start);
 sim.paused=false;for(let i=0;i<180;i++)sim.step(gas);assert.ok(sim.fuel.remaining<start);
 const fuel=sim.fuel.remaining;sim.resetToRoad();assert.equal(sim.fuel.remaining,fuel);
 sim.fuel.remaining=.000001;sim.step(gas);assert.equal(sim.done,true);assert.equal(sim.snapshot().fuel.empty,true);assert.equal(sim.speed,0);
 assert.ok(sim.snapshot().progress<1);const elapsed=sim.elapsed;sim.step(gas);assert.equal(sim.elapsed,elapsed);sim.dispose();
});
test('trip-scale idle burns diesel, stays finite and cannot recover after running dry',()=>{
 const meter=new FuelMeter(DEFAULT_CONFIG,job,3000);
 meter.step(60,0,0,0,false,false);assert.ok(Math.abs(meter.snapshot().used-2*meter.scale/60)<1e-8);assert.equal(meter.snapshot().instant,null);
 meter.step(1e8,0,0,0,true,false);assert.equal(meter.remaining,0);assert.equal(meter.empty,true);
 meter.step(1,20,20,0,false,false);assert.equal(meter.remaining,0);assert.ok(Number.isFinite(meter.snapshot().average));
});
test('fuel bonus pays only on delivery; an empty tank leaves balance, earnings and city intact',()=>{
 const career=buyConfiguration(freshCareer(),DEFAULT_CONFIG)!;
 const failed=failRace(career);assert.equal(failed.funds,career.funds);assert.equal(failed.earned,career.earned);assert.equal(failed.currentCity,'aarhus');assert.equal(failed.wins,career.wins);assert.equal(failed.races,career.races+1);
 const normal=settleRace(career,job.reward,2,true,'hamburg'),eco=settleRace(career,job.reward,2,true,'hamburg',23.5);
 assert.equal(eco.ecoBonus,1175);assert.equal(eco.payout-normal.payout,1175);assert.equal(eco.career.funds-career.funds,eco.payout);assert.equal(career.currentCity,'aarhus');assert.equal(eco.career.currentCity,'hamburg');
 for(const bad of [NaN,Infinity,-1])assert.equal(economyBonus(bad),0);
});
test('real Rapier light and heavy trips finish economically with credible average litres; waste can strand both',()=>{
 const run=(tonnes:number,eco:boolean)=>{
  const sim=new Simulation(DEFAULT_CONFIG,withLoad(job,tonnes),()=>0,{roadworks:false});sim.countdown=0;
  for(let i=0;i<24000&&!sim.done;i++){
   const s=sim.snapshot(),aim=atDistance(nearestTrack(s.x,s.z).s+Math.max(9,s.speed*.65),0);
   let e=Math.atan2(aim.x-s.x,aim.z-s.z)-s.yaw;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;
   sim.step({throttle:eco?s.grade>=-.015&&s.speed<22:true,brake:eco&&s.speed>26,left:e<-.035,right:e>.035});
  }
  const result=sim.snapshot();sim.dispose();return result;
 };
 const light=run(8,true),heavy=run(24,true);
 for(const s of [light,heavy]){assert.equal(s.progress,1);assert.equal(s.fuel.empty,false);assert.ok(s.fuel.remaining>10);assert.ok(s.elapsed<job.par);}
 assert.ok(light.fuel.average>=20&&light.fuel.average<=28);assert.ok(heavy.fuel.average>=29&&heavy.fuel.average<=40);assert.ok(heavy.fuel.used>light.fuel.used);
 for(const tonnes of [8,24]){const waste=run(tonnes,false);assert.equal(waste.done,true);assert.equal(waste.fuel.empty,true);assert.ok(waste.progress<1);}
});


test('range compares estimated kilometres with the destination, not tank percentage',()=>{
 const safe=projectFuel(140,0,0,38,340);assert.equal(safe.rangeStatus,'sufficient');assert.ok(Math.abs(safe.rangeKm-140/38*100)<1e-9);
 const short=projectFuel(90,50,100,38,260);assert.equal(short.rangeStatus,'short');assert.ok(short.marginKm<0);assert.ok(short.rangeKm<short.toGoalKm);
 const tight=projectFuel(120,0,0,40,298);assert.equal(tight.rangeStatus,'tight');assert.equal(tight.rangeKm,300);
 assert.equal(projectFuel(0,100,100,38,10).rangeStatus,'short');assert.equal(projectFuel(0,100,100,38,0).rangeStatus,'sufficient');
});
test('range uses a stable distance-weighted mean and never infinite instantaneous coasting range',()=>{
 const meter=new FuelMeter(DEFAULT_CONFIG,job,3000);
 for(let i=0;i<30;i++)meter.step(.1,10,20,.02,true,false);
 const before=meter.snapshot();for(let i=0;i<60;i++)meter.step(1/60,.3,25,-.05,false,false);
 const after=meter.snapshot();assert.equal(after.remaining,before.remaining);assert.ok(Number.isFinite(after.rangeKm));assert.ok(after.rangeKm/before.rangeKm<1.04);
 const overrun=projectFuel(100,0,500,38,100);assert.equal(overrun.forecastConsumption,18);assert.ok(overrun.rangeKm<560);
});
test('cockpit remaining kilometres match contract progression across random rows and different lap counts',()=>{
 for(const random of [()=>0,()=>.5,()=>.99])for(const tender of tendersFrom('aarhus')){
  const sim=new Simulation(DEFAULT_CONFIG,tender,random,{roadworks:false}),initial=sim.grid.player.distance-80;
  assert.ok(Math.abs(sim.snapshot().fuel.toGoalKm-tender.roadKm)<1e-9);
  sim.progress.distance=initial+(sim.target-initial)*.4;sim.progress.nextGate=sim.target;
  assert.ok(Math.abs(sim.snapshot().fuel.toGoalKm-tender.roadKm*.6)<1e-9);
  sim.progress.distance=sim.target;assert.equal(sim.snapshot().fuel.toGoalKm,0);sim.dispose();
 }
});
test('range formatting does not overstate range or understate the final approach',()=>{
 assert.equal(rangeKilometres(249.9),'249');assert.equal(rangeKilometres(250.1,true),'251');
 assert.equal(rangeKilometres(.59),'0,5');assert.equal(rangeKilometres(.51,true),'0,6');assert.equal(rangeKilometres(0,true),'0,0');
});

test('forecast recovers after economical driving without refilling diesel',()=>{
 const before=projectFuel(90,50,100,38,260),after=projectFuel(85,55,180,38,180);
 assert.equal(before.rangeStatus,'short');assert.equal(after.rangeStatus,'sufficient');assert.ok(after.rangeKm>before.rangeKm);
});
