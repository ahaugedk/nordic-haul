import { atDistance,ROAD_LANES,TRACK_LENGTH } from './track';

type LaneChange={start:number;end:number;from:number;to:number};
export type TrafficVehicle={distance:number;speed:number;minLane:number;maxLane:number};
export const signedGap=(a:number,b:number)=>((b-a+TRACK_LENGTH/2)%TRACK_LENGTH+TRACK_LENGTH)%TRACK_LENGTH-TRACK_LENGTH/2;
export function sharesLane(a:TrafficVehicle,b:TrafficVehicle){return a.minLane<b.maxLane+2.65&&a.maxLane>b.minLane-2.65;}

/** Distance-based paths keep the trailer behind its tractor, even during braking. */
export class RivalPath {
  private changes:LaneChange[]=[];
  private initial:number;
  nextDecision=0;
  constructor(lane:number){this.initial=lane;}
  laneAt(s:number){
    let lane=this.initial;
    for(const change of this.changes){
      if(s<change.start)break;
      if(s>=change.end){lane=change.to;continue;}
      const t=(s-change.start)/(change.end-change.start);
      return change.from+(change.to-change.from)*t*t*(3-2*t);
    }
    return lane;
  }
  pose(s:number){
    const p=atDistance(s,this.laneAt(s)),before=atDistance(s-.1,this.laneAt(s-.1)),after=atDistance(s+.1,this.laneAt(s+.1));
    return {...p,yaw:Math.atan2(after.x-before.x,after.z-before.z)};
  }
  changing(s:number){const last=this.changes.at(-1);return !!last&&s<last.end+22;}
  envelope(s:number):Pick<TrafficVehicle,'minLane'|'maxLane'>{
    const lanes=[this.laneAt(s),this.laneAt(s-22)];
    const last=this.changes.at(-1);if(last&&s<last.end+22)lanes.push(last.from,last.to);
    return {minLane:Math.min(...lanes),maxLane:Math.max(...lanes)};
  }
  change(s:number,to:number,speed:number,time:number){
    this.changes.push({start:s,end:s+Math.max(48,speed*4.5),from:this.laneAt(s),to});
    this.nextDecision=time+11;
    // Retain the last path segment behind the entire trailer across lap boundaries.
    while(this.changes.length>1&&this.changes[0].end<s-50)this.initial=this.changes.shift()!.to;
  }
}

export function laneIsClear(ego:TrafficVehicle,lane:number,traffic:TrafficVehicle[]){
  const target={...ego,minLane:lane,maxLane:lane};
  return traffic.every(other=>{
    if(!sharesLane(target,other))return true;
    const gap=signedGap(ego.distance,other.distance);
    // A passing trailer must clear vehicles behind as well as slower traffic ahead.
    return gap>=0?gap>32+ego.speed*.45+Math.max(0,ego.speed-other.speed)*4: -gap>32+other.speed*.45+Math.max(0,other.speed-ego.speed)*4;
  });
}

export function chooseLane(ego:TrafficVehicle,lane:number,maxSpeed:number,traffic:TrafficVehicle[]):number|null{
  const leader=traffic.filter(other=>sharesLane(ego,other)&&signedGap(ego.distance,other.distance)>0)
    .sort((a,b)=>signedGap(ego.distance,a.distance)-signedGap(ego.distance,b.distance))[0];
  const blocked=leader&&signedGap(ego.distance,leader.distance)<85+ego.speed&&leader.speed<maxSpeed-1.2;
  const index=ROAD_LANES.indexOf(lane);
  if(blocked){
    for(const target of [ROAD_LANES[index-1],ROAD_LANES[index+1]])
      if(target!==undefined&&laneIsClear(ego,target,traffic))return target;
  }else{
    const right=ROAD_LANES[index+1];
    if(right!==undefined&&laneIsClear(ego,right,traffic))return right;
  }
  return null;
}
