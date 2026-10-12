import type { Simulation } from './simulation';
import { atDistance,TRACK_LENGTH } from './track';
import { GRID_ORIGIN } from './raceField';
import { prepareTerminalPreview } from './terminalPreview';
import { virtualRoadKm,plannedConsumption } from './fuel';
/** Local QA states exercise the same meter, exhaustion and settlement as play. */
export function prepareFuelPreview(sim:Simulation,mode:string){
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
