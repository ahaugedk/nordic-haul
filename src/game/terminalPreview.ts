import type { Simulation } from './simulation';
import { GRID_ORIGIN } from './raceField';
import { atDistance } from './track';

/** Local-only final-approach camera using the real race finish and existing cab. */
export function prepareTerminalPreview(sim:Simulation,night=false,finish=false){
  const distance=sim.target-(finish?.25:65),s=distance+GRID_ORIGIN,p=atDistance(s,-3.5);
  sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.body.setLinvel({x:0,y:0,z:0},true);
  sim.progress.distance=distance;sim.progress.nextGate=sim.target;sim.progress.last=p.s;
  sim.countdown=0;sim.elapsed=night?20:2;sim.speed=15;sim.yaw=p.yaw;sim.paused=!finish;
}
