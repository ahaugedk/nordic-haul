import type { Simulation } from './simulation';
import { GRID_ORIGIN } from './raceField';
import { atDistance,nearestTrack } from './track';
import { RivalPath } from './aiDriving';
import { trailerPose,towRotation } from './trailer';

/** Local browser QA: a loaded rival overtakes a slower truck using the real AI. */
export function prepareLanePreview(sim:Simulation){
  for(let i=0;i<sim.aiBodies.length;i++){
    const s=i===0?320:i===1?382:1100+i*75,lane=i<2?3.5:sim.grid.rivals[i].lane;
    const p=atDistance(s,lane),t=trailerPose(s,lane);
    sim.aiDistances[i]=s-GRID_ORIGIN;sim.aiSpeeds[i]=i===0?22:i===1?11:20;
    sim.aiPaths[i]=new RivalPath(lane);sim.aiPaths[i].nextDecision=i===0?0:20;
    sim.aiBodies[i].setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.aiBodies[i].setRotation(towRotation(p.yaw,0),true);
    sim.aiTrailerBodies[i].setTranslation(t,true);sim.aiTrailerBodies[i].setRotation(towRotation(t.yaw,t.pitch),true);
  }
  const s=278,p=atDistance(s,-3.5);
  sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.body.setLinvel({x:0,y:0,z:0},true);
  sim.countdown=0;sim.elapsed=6;sim.speed=22;sim.yaw=p.yaw;sim.progress.distance=s-GRID_ORIGIN;sim.progress.last=s;
}
export function driveLanePreview(sim:Simulation){
  const p=sim.body.translation(),road=nearestTrack(p.x,p.z),target=atDistance(road.s+25,-3.5);
  sim.yaw=Math.atan2(target.x-p.x,target.z-p.z);
}
