import RAPIER from '@dimforge/rapier3d-compat';
import { type TruckConfig,type Tender } from '../data/catalog';
import { TRACK_LENGTH,TRACK,ROAD_HALF_WIDTH,atDistance,nearestTrack,RaceProgress } from './track';
import { accelerationFor,MAX_SPEED,transportMass } from './drivetrain';
import { trailerPose,towRotation,type TrailerPose } from './trailer';
export type Controls={throttle:boolean;brake:boolean;left:boolean;right:boolean};
export type RaceSnapshot={speed:number;steering:number;elapsed:number;progress:number;place:number;offRoad:boolean;countdown:number;done:boolean;x:number;y:number;z:number;yaw:number;pitch:number;grade:number;ai:{x:number;y:number;z:number;yaw:number;pitch:number;trailer:TrailerPose}[]};
export class Simulation {
  world:RAPIER.World;body:RAPIER.RigidBody;aiBodies:RAPIER.RigidBody[]=[];aiTrailerBodies:RAPIER.RigidBody[]=[];
  elapsed=0;countdown=3;speed=0;yaw=0;steering=0;progress=new RaceProgress();paused=false;done=false;
  aiDistances=[15,31];aiSpeeds=[0,0];target:number;
  private rivals:TruckConfig[];private rivalLoads=[12,16];
  constructor(public truck:TruckConfig,public tender:Tender){
    this.world=new RAPIER.World({x:0,y:0,z:0});this.world.timestep=1/60;this.target=TRACK_LENGTH*tender.distance;
    this.rivals=[{...truck,engine:'D17A600'},{...truck,engine:'D17A700'}];
    const start=atDistance(0,3.5);this.yaw=start.yaw;
    this.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(start.x,start.y+1.9,start.z).lockRotations().enabledTranslations(true,false,true).setCcdEnabled(true));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.22,1.6,3.6).setMass(transportMass(truck,tender.tonnes)).setFriction(.1).setRestitution(.03),this.body);
    for(let i=0;i<2;i++){
      const p=atDistance(this.aiDistances[i],i===0?0:3.5);
      const b=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y+1.9,p.z));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.22,1.6,3.6),b);this.aiBodies.push(b);
      const trailer=trailerPose(this.aiDistances[i],i===0?0:3.5);
      const tb=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(trailer.x,trailer.y,trailer.z).setRotation(towRotation(trailer.yaw,trailer.pitch)));
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.275,1.3,6.8).setTranslation(0,2.71,0).setFriction(.12),tb);this.aiTrailerBodies.push(tb);
    }
    // Fixed guardrails prevent cutting across the median or into buildings.
    for(let i=0;i<TRACK.length-1;i+=3){
      const p=TRACK[i],q=TRACK[Math.min(i+3,TRACK.length-1)],s=(p.s+q.s)/2;
      for(const lane of [-ROAD_HALF_WIDTH-.25,ROAD_HALF_WIDTH+.25]){
        const c=atDistance(s,lane),length=Math.hypot(q.x-p.x,q.z-p.z)+.7;
        this.world.createCollider(RAPIER.ColliderDesc.cuboid(.18,1.25,length/2).setTranslation(c.x,c.y+1.05,c.z).setRotation({x:0,y:Math.sin(c.yaw/2),z:0,w:Math.cos(c.yaw/2)}).setFriction(.08));
      }
    }
  }
  step(input:Controls,dt=1/60){
    if(this.paused||this.done)return;
    if(this.countdown>0){this.countdown=Math.max(0,this.countdown-dt);return;}
    this.elapsed+=dt;
    const pos=this.body.translation(),near=nearestTrack(pos.x,pos.z),offRoad=near.distance>7.5;
    // Grade in the actual travel direction also handles driving back down a hill.
    const frame=atDistance(near.s),alignment=Math.sin(this.yaw)*frame.tx+Math.cos(this.yaw)*frame.tz;
    this.speed=Math.max(0,Math.min(MAX_SPEED,this.speed+(accelerationFor(this.truck,this.tender.tonnes,this.speed,near.grade*alignment,input.throttle,input.brake)-(offRoad?1.4:0))*dt));
    const desired=(input.right?1:0)-(input.left?1:0);
    this.steering+=(desired-this.steering)*Math.min(1,dt*7);
    this.yaw+=this.steering*.49*Math.min(1,this.speed/6)*dt;
    this.body.setTranslation({x:pos.x,y:near.y+1.9,z:pos.z},true);
    this.body.setRotation({x:0,y:Math.sin(this.yaw/2),z:0,w:Math.cos(this.yaw/2)},true);
    this.body.setLinvel({x:Math.sin(this.yaw)*this.speed,y:0,z:Math.cos(this.yaw)*this.speed},true);
    for(let i=0;i<2;i++){
      const road=atDistance(this.aiDistances[i]);
      const limit=25+i*.8;
      this.aiSpeeds[i]=Math.max(0,Math.min(limit,this.aiSpeeds[i]+accelerationFor(this.rivals[i],this.rivalLoads[i],this.aiSpeeds[i],road.grade,this.aiSpeeds[i]<limit,false)*dt));
      this.aiDistances[i]+=this.aiSpeeds[i]*dt;
      const p=atDistance(this.aiDistances[i],i===0?0:3.5);
      this.aiBodies[i].setNextKinematicTranslation({x:p.x,y:p.y+1.9,z:p.z});
      this.aiBodies[i].setNextKinematicRotation({x:0,y:Math.sin(p.yaw/2),z:0,w:Math.cos(p.yaw/2)});
      const trailer=trailerPose(this.aiDistances[i],i===0?0:3.5);this.aiTrailerBodies[i].setNextKinematicTranslation(trailer);this.aiTrailerBodies[i].setNextKinematicRotation(towRotation(trailer.yaw,trailer.pitch));
    }
    this.world.step();
    const actual=this.body.linvel();this.speed=Math.max(0,actual.x*Math.sin(this.yaw)+actual.z*Math.cos(this.yaw));
    const n=nearestTrack(this.body.translation().x,this.body.translation().z);
    this.body.setTranslation({x:this.body.translation().x,y:n.y+1.9,z:this.body.translation().z},true);
    this.progress.advance(n.s,n.distance<ROAD_HALF_WIDTH);
    if(this.progress.validatedDistance>=this.target)this.done=true;
  }
  resetToRoad(){
    const p=atDistance(Math.max(0,this.progress.validatedDistance),3.5);
    this.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);this.body.setLinvel({x:0,y:0,z:0},true);this.speed=0;this.yaw=p.yaw;this.steering=0;this.progress.last=nearestTrack(p.x,p.z).s;
  }
  snapshot():RaceSnapshot{
    const p=this.body.translation(),n=nearestTrack(p.x,p.z),frame=atDistance(n.s),alignment=Math.sin(this.yaw)*frame.tx+Math.cos(this.yaw)*frame.tz;
    return {speed:this.speed,steering:this.steering,elapsed:this.elapsed,progress:Math.min(1,this.progress.validatedDistance/this.target),place:1+this.aiDistances.filter(x=>x>this.progress.validatedDistance).length,offRoad:n.distance>7.5,countdown:this.countdown,done:this.done,x:p.x,y:n.y,z:p.z,yaw:this.yaw,pitch:-Math.atan(n.grade*alignment),grade:n.grade*alignment,ai:this.aiDistances.map((s,i)=>({...atDistance(s,i===0?0:3.5),trailer:trailerPose(s,i===0?0:3.5)}))};
  }
  dispose(){this.world.free();}
}
export async function initPhysics(){await RAPIER.init();}
