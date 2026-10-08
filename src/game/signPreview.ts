import type { Simulation } from './simulation';
import { GRID_ORIGIN } from './raceField';
import { atDistance,TRACK_LENGTH } from './track';

/** Local-only camera fixture; the board reading still uses the actual race state. */
export function prepareSignPreview(sim:Simulation,night=false,secondLap=false){
  const s=605+(secondLap&&sim.target>TRACK_LENGTH?TRACK_LENGTH:0),p=atDistance(s);
  sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.body.setLinvel({x:0,y:0,z:0},true);
  sim.progress.distance=s-GRID_ORIGIN;sim.progress.last=p.s;sim.progress.nextGate=Math.ceil(sim.progress.distance/(TRACK_LENGTH/4))*(TRACK_LENGTH/4);
  sim.countdown=0;sim.elapsed=night?20:4;sim.speed=15;sim.yaw=p.yaw;sim.paused=true;
}
