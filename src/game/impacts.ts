export type ImpactKind='guardrail'|'truck'|'trailer';
export type Impact={id:number;time:number;kind:ImpactKind;x:number;y:number;z:number;nx:number;nz:number;strength:number;speedLost:number};
export function collisionPenalty(speed:number,closing:number,tangent:number,fresh:boolean,dt:number){
  const strike=fresh?Math.min(speed*.58,.7+closing*.45+Math.max(0,speed-4)*.06):0;
  const scrape=(1.6+tangent*.17)*dt;
  return Math.min(speed,strike+scrape);
}
