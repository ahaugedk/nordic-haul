import type { Simulation,Controls } from './simulation';
import { atDistance,nearestTrack,TRACK_LENGTH } from './track';
import { GRID_ORIGIN } from './raceField';
import { prepareTerminalPreview } from './terminalPreview';
import { virtualRoadKm,plannedConsumption } from './fuel';
/** Local QA states exercise the same meter, exhaustion and settlement as play. */
export function prepareFuelPreview(sim:Simulation,mode:string){
 if(mode==='roll'){
  const p=atDistance(970,0);sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);
  sim.progress.distance=970-GRID_ORIGIN;sim.progress.last=p.s;sim.progress.nextGate=TRACK_LENGTH/2;
  // Seed a powered approach, so range uses a genuine driving history.
  sim.fuel.step(.1,Math.max(0,sim.progress.distance-(sim.grid.player.distance-GRID_ORIGIN)),20,0,true,false);
  sim.countdown=0;sim.elapsed=0;sim.speed=25;sim.yaw=p.yaw;sim.paused=false;return;
 }
 if(mode==='finish'){prepareTerminalPreview(sim,false,true);sim.fuel.remaining=25;sim.fuel.distanceKm=virtualRoadKm(sim.tender);return;}
 const distance=mode==='climb'?220:sim.target*(mode==='empty'?.75:.55),p=atDistance(distance+GRID_ORIGIN,0);
 sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.progress.distance=distance;sim.progress.last=p.s;sim.progress.nextGate=Math.ceil(distance/(TRACK_LENGTH/4))*(TRACK_LENGTH/4);
 sim.countdown=0;sim.elapsed=mode==='climb'?4:24;sim.yaw=p.yaw;sim.speed=mode==='climb'?18:25;
 // Advance the actual fuel meter before freezing the cockpit for inspection.
 for(let i=0;i<120;i++)sim.fuel.step(.1,sim.target*.35/120,20,.02,true,false);
 for(let i=0;i<180;i++)sim.fuel.step(1/60,0,sim.speed,p.grade,mode==='climb',false);
 if(mode==='reserve')sim.fuel.remaining=sim.fuel.start*.1;
 if(mode==='range-short')sim.fuel.remaining=sim.fuel.start*.5;
 if(mode==='range-tight'){const goal=sim.fuel.snapshot(sim.target-distance).toGoalKm+2;sim.fuel.remaining=goal*(sim.fuel.start+plannedConsumption(sim.tender)*.2)/(sim.fuel.distanceKm+20+goal);}
 if(mode==='empty')sim.fuel.remaining=.000001;
 sim.paused=mode!=='empty';
}

/** Keep the unpowered player in lane so browser QA observes actual coast dynamics. */
export function driveFuelRollPreview(sim:Simulation):Controls{
 if(sim.elapsed>=10)sim.paused=true;
 const s=sim.snapshot(),aim=atDistance(nearestTrack(s.x,s.z).s+Math.max(9,s.speed*.65),0);
 let e=Math.atan2(aim.x-s.x,aim.z-s.z)-s.yaw;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;
 return {throttle:false,brake:false,left:e<-.035,right:e>.035};
}
