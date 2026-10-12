import type { Simulation } from './simulation';
import { GRID_ORIGIN } from './raceField';
import { atDistance,TRACK_LENGTH } from './track';
import { RivalPath } from './aiDriving';
import { trailerPose,towRotation } from './trailer';

/** Local-only scenes use the actual event geometry, contacts and merging planner. */
export function prepareRoadworkPreview(sim:Simulation,mode:string){
  const site=sim.worksites[0],moving=mode==='merge',s=site.start+(moving?-280:-100),lane=moving?-3.5:0;
  for(let i=0;i<6;i++){
    const distance=site.start+(moving?(i===0?-230:i===1?-215:500+i*55):300+i*55),l=moving&&i===0?3.5:i===1?0:-3.5;
    const p=atDistance(distance+GRID_ORIGIN,l),t=trailerPose(distance+GRID_ORIGIN,l);
    sim.aiPaths[i]=new RivalPath(l);sim.aiPaths[i].nextDecision=10;sim.aiDistances[i]=distance;sim.aiSpeeds[i]=moving?i===0?15:20:0;
    sim.aiBodies[i].setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.aiBodies[i].setRotation(towRotation(p.yaw,0),true);
    sim.aiTrailerBodies[i].setTranslation(t,true);sim.aiTrailerBodies[i].setRotation(towRotation(t.yaw,t.pitch),true);
  }
  const p=atDistance(s+GRID_ORIGIN,lane);sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.body.setLinvel({x:0,y:0,z:0},true);
  sim.progress.distance=s;sim.progress.last=p.s;sim.progress.nextGate=Math.ceil(s/(TRACK_LENGTH/4))*(TRACK_LENGTH/4);
  sim.countdown=0;sim.elapsed=mode.startsWith('night')?20:4;sim.speed=0;sim.yaw=p.yaw;sim.paused=!moving;sim.syncRoadworks();
}
