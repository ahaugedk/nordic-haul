/** Fictional, compressed Autobahn loop. Metres, clockwise; three racing lanes. */
export const TRACK_RX=160, TRACK_RZ=650;
export const TRACK_SAMPLES=768;
export const TERRAIN_SIZE=1800,TERRAIN_SEGMENTS=120;
export const ROAD_HALF_WIDTH=8.5, ROAD_LANES=[-3.5,0,3.5];
export const TRACK_STRAIGHT=980;
const STRAIGHT=TRACK_STRAIGHT, HALF_STRAIGHT=STRAIGHT/2, ARC=Math.PI*TRACK_RX;
export const TRACK_LENGTH=2*STRAIGHT+2*ARC;
const wrap=(s:number)=>((s%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH;
export function elevationAt(s:number){const t=wrap(s)/TRACK_LENGTH*Math.PI*2;return 70+35*Math.sin(t-.9)+11*Math.sin(2*t-.8);}
export function gradeAt(s:number){const t=wrap(s)/TRACK_LENGTH*Math.PI*2;return (35*Math.cos(t-.9)+22*Math.cos(2*t-.8))*Math.PI*2/TRACK_LENGTH;}
export function atDistance(distance:number,lane=0){
  let s=wrap(distance),x:number,z:number,tx:number,tz:number;
  if(s<STRAIGHT){x=TRACK_RX;z=-HALF_STRAIGHT+s;tx=0;tz=1;}
  else if(s<STRAIGHT+ARC){const a=(s-STRAIGHT)/TRACK_RX;x=TRACK_RX*Math.cos(a);z=HALF_STRAIGHT+TRACK_RX*Math.sin(a);tx=-Math.sin(a);tz=Math.cos(a);}
  else if(s<2*STRAIGHT+ARC){x=-TRACK_RX;z=HALF_STRAIGHT-(s-STRAIGHT-ARC);tx=0;tz=-1;}
  else{const a=(s-2*STRAIGHT-ARC)/TRACK_RX;x=-TRACK_RX*Math.cos(a);z=-HALF_STRAIGHT-TRACK_RX*Math.sin(a);tx=Math.sin(a);tz=-Math.cos(a);}
  const grade=gradeAt(s);
  return {x:x+tz*lane,y:elevationAt(s),z:z-tx*lane,tx,tz,yaw:Math.atan2(tx,tz),grade,pitch:-Math.atan(grade),s};
}
export const TRACK=Array.from({length:TRACK_SAMPLES+1},(_,i)=>atDistance(i/TRACK_SAMPLES*TRACK_LENGTH));
/** Project onto segments, not sample points: stable lanes, grades and checkpoint progress. */
export function nearestTrack(x:number,z:number){
  let best=Infinity,s=0,index=0;
  for(let i=0;i<TRACK_SAMPLES;i++){
    const a=TRACK[i],b=TRACK[i+1],dx=b.x-a.x,dz=b.z-a.z;
    const f=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    const d=(x-a.x-dx*f)**2+(z-a.z-dz*f)**2;
    if(d<best){best=d;index=i;s=(i+f)/TRACK_SAMPLES*TRACK_LENGTH;}
  }
  const p=atDistance(s),lane=(x-p.x)*p.tz-(z-p.z)*p.tx;
  return {index,s:wrap(s),distance:Math.sqrt(best),lane,y:p.y,grade:p.grade,pitch:p.pitch};
}
/** Excludes roadside structures including roofs, awnings and tree canopies from both carriageways. */
export function sceneryClearance(x:number,z:number,width:number,depth:number,margin=14){
  const lane=nearestTrack(x,z).lane;
  const radius=Math.hypot(width,depth)/2;
  return Math.min(Math.abs(lane)-ROAD_HALF_WIDTH,Math.abs(lane-23)-ROAD_HALF_WIDTH)>radius+margin;
}
export function terrainHeight(x:number,z:number){
  const n=nearestTrack(x,z),edge=Math.min(Math.abs(n.lane),Math.abs(n.lane-23));
  const blend=Math.min(1,Math.max(0,(edge-25)/110));
  const countryside=50+16*Math.sin(z*.003)+12*Math.sin(x*.004+z*.001);
  return (n.y-.7)*(1-blend)+countryside*blend;
}
export class RaceProgress {
  distance=0; last=0; nextGate=TRACK_LENGTH/4; gate=1;
  advance(s:number,onRoad:boolean){
    let delta=s-this.last;if(delta<-TRACK_LENGTH/2)delta+=TRACK_LENGTH;if(delta>TRACK_LENGTH/2)delta-=TRACK_LENGTH;this.last=s;
    if(!onRoad||Math.abs(delta)>10)return;
    this.distance=Math.max(0,this.distance+delta);
    if(this.distance>=this.nextGate){this.gate++;this.nextGate+=TRACK_LENGTH/4;}
  }
  get validatedDistance(){return Math.min(this.distance,this.nextGate);}
}
