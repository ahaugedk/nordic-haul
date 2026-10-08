import type { Simulation } from './simulation';
import { GRID_ORIGIN } from './raceField';
import { atDistance } from './track';
import { trailerPose,towRotation } from './trailer';
/** Development-only browser fixture using the real Rapier contacts and renderer. */
export function prepareImpactPreview(sim:Simulation,kind:string){
  for(let i=0;i<sim.aiBodies.length;i++){
    const s=i===0?400:1000+i*60,lane=sim.grid.rivals[i].lane,p=atDistance(s,lane),t=trailerPose(s,lane);
    sim.aiDistances[i]=s-GRID_ORIGIN;sim.aiSpeeds[i]=0;
    sim.aiBodies[i].setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.aiBodies[i].setRotation(towRotation(p.yaw,0),true);
    sim.aiTrailerBodies[i].setTranslation(t,true);sim.aiTrailerBodies[i].setRotation(towRotation(t.yaw,t.pitch),true);
  }
  const rail=kind==='guardrail',s=rail?110:kind==='truck'?400:392,lane=rail?7.3:sim.grid.rivals[0].lane+2.7,p=atDistance(s,lane);
  sim.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);sim.body.setLinvel({x:0,y:0,z:0},true);
  sim.countdown=0;sim.elapsed=2;sim.speed=22;sim.yaw=rail?.12:-.12;sim.progress.distance=s-GRID_ORIGIN;sim.progress.last=s;
}
