import { ROAD_LANES,TRACK_LENGTH } from './track';
import { signedGap,laneIsClear,type TrafficVehicle } from './aiDriving';
export const WORK_WARNING=520,WORK_TAPER=65,WORK_MERGE_STOP=180;
export type Roadwork={id:string;title:string;start:number;length:number;closed:number[];speedLimit:number;active:boolean};
export type TrafficReport={id:string;title:string;message:string;closed:number[];speedLimit:number;phase:'approach'|'zone'};
const templates=[
  {title:'Belægningsarbejde',closed:[3.5],speedLimit:50/3.6},
  {title:'Autoværnsarbejde',closed:[-3.5],speedLimit:60/3.6},
  {title:'Akut vejreparation',closed:[0,3.5],speedLimit:40/3.6},
  {title:'Reparation af midterrabat',closed:[-3.5,0],speedLimit:40/3.6},
];
export function createRoadworks(target:number,random:()=>number=Math.random):Roadwork[]{
  const count=random()<.5?2:3,offset=Math.floor(random()*templates.length),sites:Roadwork[]=[];
  const fractions=count===2?[.3,.69]:[.24,.51,.78];
  for(let i=0;i<count;i++){
    const length=90+Math.floor(random()*31),base=target*fractions[i]+(random()-.5)*100;
    let start=base;
    for(let attempt=0;attempt<100;attempt++){
      const candidate=base+(attempt%2?1:-1)*Math.ceil(attempt/2)*30;
      if(candidate<480||candidate+length>target-250||sites.some(s=>candidate<s.start+s.length+360||Math.abs(signedGap(s.start,candidate))<420))continue;
      start=candidate;break;
    }
    const variant=templates[(offset+i)%templates.length];
    sites.push({id:'work-'+i,...variant,closed:[...variant.closed],start,length,active:false});
  }
  return sites;
}
export function closureMessage(closed:number[]){
  if(closed.length===2)return closed.includes(3.5)?'To spor lukket. Flet til venstre.':'To spor lukket. Flet til højre.';
  return closed[0]>0?'Højre spor lukket. Flet mod venstre.':'Venstre spor lukket. Flet mod højre.';
}
export function trafficReport(sites:Roadwork[],distance:number):TrafficReport|null{
  const site=sites.find(s=>distance>=s.start-WORK_WARNING&&distance<s.start+s.length+22);
  return site?{id:site.id,title:site.title,message:closureMessage(site.closed),closed:site.closed,speedLimit:site.speedLimit,phase:distance<site.start-WORK_TAPER?'approach':'zone'}:null;
}
export function approachingWork(site:Roadwork,distance:number){
  if(!site.active)return null;
  // Existing works remain physical obstacles for a faster truck lapping the field.
  let gap=signedGap(distance,site.start);
  if(gap<-(site.length+30))gap+=TRACK_LENGTH;
  return gap<=WORK_WARNING&&gap>=-site.length-30?gap:null;
}
export function touchesClosure(vehicle:TrafficVehicle,site:Roadwork){return site.closed.some(l=>vehicle.minLane<l+2.65&&vehicle.maxLane>l-2.65);}
export function workMergeLane(ego:TrafficVehicle,lane:number,site:Roadwork,traffic:TrafficVehicle[]):number|null{
  // A slow follower reserving the same destination must not trap its leader.
  // Normal following still enforces the full 24 m tractor/trailer separation.
  const others=traffic.filter(v=>!(touchesClosure(v,site)&&signedGap(ego.distance,v.distance)<=-28&&v.speed<=ego.speed+1));
  const candidates=ROAD_LANES.filter(l=>!site.closed.includes(l)).sort((a,b)=>Math.abs(a-lane)-Math.abs(b-lane));
  for(const target of candidates){
    const crossed=ROAD_LANES.filter(l=>l>=Math.min(lane,target)&&l<=Math.max(lane,target)&&l!==lane);
    if(crossed.every(l=>laneIsClear(ego,l,others)))return target;
  }
  return null;
}
export type WorkObstacle={s:number;lane:number;width:number;height:number;depth:number;kind:'cone'|'barrier'|'roller'|'arrow'};
export function roadworkObstacles(site:Roadwork):WorkObstacle[]{
  const right=site.closed.includes(3.5),edge=right?7.6:-7.6;
  const boundary=right?(site.closed.includes(0)?-1.75:1.75):(site.closed.includes(0)?1.75:-1.75);
  const objects:WorkObstacle[]=[];
  for(let offset=-WORK_TAPER;offset<=site.length;offset+=6){
    const t=Math.max(0,Math.min(1,(offset+WORK_TAPER)/WORK_TAPER));
    objects.push({s:site.start+offset,lane:edge+(boundary-edge)*t,width:.6,height:.9,depth:.6,kind:'cone'});
  }
  objects.push({s:site.start-WORK_TAPER,lane:right?3.5:-3.5,width:2.25,height:2.4,depth:.8,kind:'arrow'});
  for(const lane of site.closed){
    objects.push({s:site.start+12,lane,width:2.8,height:1,depth:1.25,kind:'barrier'});
    objects.push({s:site.start+site.length*.62,lane,width:2.2,height:2.2,depth:4,kind:'roller'});
  }
  return objects;
}
