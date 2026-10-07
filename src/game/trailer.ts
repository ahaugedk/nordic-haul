import { atDistance } from './track';
export const TRAILER_LENGTH=13.6,TRAILER_WIDTH=2.55,TRAILER_HEIGHT=4;
export type TrailerPose={x:number;y:number;z:number;yaw:number;pitch:number};
export function trailerPose(s:number,lane:number):TrailerPose{
  const tractor=atDistance(s,lane),c=Math.cos(tractor.pitch),sn=Math.sin(tractor.pitch);
  const forward=-2.25*c+1.34*sn;
  const hitch={x:tractor.x+Math.sin(tractor.yaw)*forward,y:tractor.y+1.34*c+2.25*sn,z:tractor.z+Math.cos(tractor.yaw)*forward};
  const axle=atDistance(s-11.8,lane),dx=hitch.x-axle.x,dz=hitch.z-axle.z;
  const yaw=Math.atan2(dx,dz),pitch=-Math.atan2(hitch.y-(axle.y+1.34),Math.hypot(dx,dz));
  const localForward=1.34*Math.sin(pitch)+5.5*Math.cos(pitch);
  return {x:hitch.x-Math.sin(yaw)*localForward,y:hitch.y-1.34*Math.cos(pitch)+5.5*Math.sin(pitch),z:hitch.z-Math.cos(yaw)*localForward,yaw,pitch};
}
export function towRotation(yaw:number,pitch:number){return {x:Math.cos(yaw/2)*Math.sin(pitch/2),y:Math.sin(yaw/2)*Math.cos(pitch/2),z:-Math.sin(yaw/2)*Math.sin(pitch/2),w:Math.cos(yaw/2)*Math.cos(pitch/2)};}
