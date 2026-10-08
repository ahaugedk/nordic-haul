import RAPIER from '@dimforge/rapier3d-compat';
import { type TruckConfig,type Tender } from '../data/catalog';
import { TRACK_LENGTH,TRACK,ROAD_HALF_WIDTH,atDistance,nearestTrack,RaceProgress } from './track';
import { accelerationFor,MAX_SPEED,transportMass } from './drivetrain';
import { trailerPose,towRotation,type TrailerPose } from './trailer';
import { GRID_ORIGIN,RIVALS,startingGrid } from './raceField';
import { collisionPenalty,type Impact,type ImpactKind } from './impacts';
import { RivalPath,chooseLane,sharesLane,type TrafficVehicle } from './aiDriving';
export type Controls={throttle:boolean;brake:boolean;left:boolean;right:boolean};
export type RaceSnapshot={speed:number;steering:number;elapsed:number;progress:number;place:number;startRow:number;offRoad:boolean;countdown:number;done:boolean;x:number;y:number;z:number;yaw:number;pitch:number;grade:number;impacts:Impact[];ai:{x:number;y:number;z:number;yaw:number;pitch:number;trailer:TrailerPose}[]};
export class Simulation {
  world:RAPIER.World;body:RAPIER.RigidBody;aiBodies:RAPIER.RigidBody[]=[];aiTrailerBodies:RAPIER.RigidBody[]=[];
  elapsed=0;countdown=3;speed=0;yaw=0;steering=0;progress=new RaceProgress();paused=false;done=false;
  aiDistances:number[];aiSpeeds:number[];target:number;readonly grid:ReturnType<typeof startingGrid>;
  private rivals:TruckConfig[];
  readonly aiPaths:RivalPath[];
  private colliderKinds=new Map<number,{key:string;kind:ImpactKind}>();private contactTimes=new Map<string,number>();private sparkTimes=new Map<string,number>();
  private impacts:Impact[]=[];private nextImpactId=1;
  constructor(public truck:TruckConfig,public tender:Tender,random:()=>number=Math.random){
    this.world=new RAPIER.World({x:0,y:0,z:0});this.world.timestep=1/60;this.target=TRACK_LENGTH*tender.distance;
    this.grid=startingGrid(random);this.rivals=RIVALS.map(r=>({...truck,engine:r.engine}));
    this.aiDistances=this.grid.rivals.map(s=>s.distance-GRID_ORIGIN);this.aiSpeeds=RIVALS.map(()=>0);
    this.aiPaths=this.grid.rivals.map((slot,i)=>{const path=new RivalPath(slot.lane);path.nextDecision=5+i*.65;return path;});
    const start=atDistance(this.grid.player.distance,this.grid.player.lane);this.yaw=start.yaw;
    this.progress.distance=this.grid.player.distance-GRID_ORIGIN;this.progress.last=start.s;
    this.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(start.x,start.y+1.9,start.z).lockRotations().enabledTranslations(true,false,true).setCcdEnabled(true));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.22,1.6,3.6).setMass(transportMass(truck,tender.tonnes)).setFriction(.1).setRestitution(.03),this.body);
    for(let i=0;i<RIVALS.length;i++){
      const distance=this.aiDistances[i]+GRID_ORIGIN,lane=this.grid.rivals[i].lane,p=atDistance(distance,lane);
      const b=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y+1.9,p.z));
      const cabCollider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.22,1.6,3.6),b);this.colliderKinds.set(cabCollider.handle,{key:'rival '+i,kind:'truck'});this.aiBodies.push(b);
      const trailer=trailerPose(distance,lane);
      const tb=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(trailer.x,trailer.y,trailer.z).setRotation(towRotation(trailer.yaw,trailer.pitch)));
      const trailerCollider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(1.275,1.3,6.8).setTranslation(0,2.71,0).setFriction(.12),tb);this.colliderKinds.set(trailerCollider.handle,{key:'rival '+i,kind:'trailer'});this.aiTrailerBodies.push(tb);
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
    const distances=[...this.aiDistances],speeds=[...this.aiSpeeds];
    const traffic:TrafficVehicle[]=distances.map((s,i)=>({distance:s,speed:speeds[i],...this.aiPaths[i].envelope(s+GRID_ORIGIN)}));
    if(!offRoad)traffic.push({distance:near.s-GRID_ORIGIN,speed:this.speed,minLane:near.lane,maxLane:near.lane});
    // Reserve both lanes before moving, preventing simultaneous merges and swaps.
    for(let i=0;i<RIVALS.length;i++){
      const path=this.aiPaths[i],s=distances[i]+GRID_ORIGIN;
      if(speeds[i]<4||path.changing(s)||this.elapsed<path.nextDecision)continue;
      path.nextDecision=this.elapsed+1.1+i*.13;
      const target=chooseLane(traffic[i],path.laneAt(s),RIVALS[i].maxSpeed,traffic.filter((_,j)=>j!==i));
      if(target!==null){path.change(s,target,speeds[i],this.elapsed);Object.assign(traffic[i],path.envelope(s));}
    }
    for(let i=0;i<RIVALS.length;i++){
      const path=this.aiPaths[i],road=atDistance(distances[i]+GRID_ORIGIN);
      let leaderDistance=Infinity,leaderSpeed=0;
      // Compare physical gaps around the loop, also when lapping a slower truck.
      for(let j=0;j<traffic.length;j++)if(j!==i&&sharesLane(traffic[i],traffic[j])){
        const gap=((traffic[j].distance-distances[i])%TRACK_LENGTH+TRACK_LENGTH)%TRACK_LENGTH;
        if(distances[i]+gap<leaderDistance){leaderDistance=distances[i]+gap;leaderSpeed=traffic[j].speed;}
      }
      const gap=leaderDistance-distances[i],desiredGap=28+speeds[i]*.9;
      const limit=Math.max(0,Math.min(RIVALS[i].maxSpeed,leaderSpeed+(gap-desiredGap)*.45));
      this.aiSpeeds[i]=Math.max(0,Math.min(RIVALS[i].maxSpeed,speeds[i]+accelerationFor(this.rivals[i],RIVALS[i].tonnes,speeds[i],road.grade,speeds[i]<limit-.2,speeds[i]>limit+.8)*dt));
      // The swept trailer envelope stays behind its leader, including a stopped player.
      const next=Math.max(distances[i],Math.min(distances[i]+this.aiSpeeds[i]*dt,leaderDistance+leaderSpeed*dt-24));
      this.aiSpeeds[i]=(next-distances[i])/dt;this.aiDistances[i]=next;
      const distance=next+GRID_ORIGIN,p=path.pose(distance);
      this.aiBodies[i].setNextKinematicTranslation({x:p.x,y:p.y+1.9,z:p.z});
      this.aiBodies[i].setNextKinematicRotation({x:0,y:Math.sin(p.yaw/2),z:0,w:Math.cos(p.yaw/2)});
      const trailer=trailerPose(distance,path.laneAt(distance),s=>path.pose(s));this.aiTrailerBodies[i].setNextKinematicTranslation(trailer);this.aiTrailerBodies[i].setNextKinematicRotation(towRotation(trailer.yaw,trailer.pitch));
    }
    const speedBefore=this.speed,vx=Math.sin(this.yaw)*speedBefore,vz=Math.cos(this.yaw)*speedBefore;
    this.world.step();
    const actual=this.body.linvel();this.speed=Math.max(0,actual.x*Math.sin(this.yaw)+actual.z*Math.cos(this.yaw));
    this.applyCollisions(speedBefore,vx,vz,dt);
    const n=nearestTrack(this.body.translation().x,this.body.translation().z);
    this.body.setTranslation({x:this.body.translation().x,y:n.y+1.9,z:this.body.translation().z},true);
    this.progress.advance(n.s,n.distance<ROAD_HALF_WIDTH);
    if(this.progress.validatedDistance>=this.target)this.done=true;
  }
  private applyCollisions(speedBefore:number,vx:number,vz:number,dt:number){
    type Contact={key:string;kind:ImpactKind;closing:number;tangent:number;x:number;y:number;z:number;nx:number;nz:number};
    const contacts=new Map<string,Contact>(),player=this.body.collider(0),position=this.body.translation();
    this.world.contactPairsWith(player,other=>{
      const identity=this.colliderKinds.get(other.handle)??{key:'guardrail',kind:'guardrail' as const};
      this.world.contactPair(player,other,manifold=>{
        let point:RAPIER.Vector|null=null,score=-Infinity;
        for(let i=0;i<manifold.numSolverContacts();i++)if(manifold.solverContactDist(i)<=.03){
          const p=manifold.solverContactPoint(i);if(!p)continue;
          const visibleScore=p.y+((p.x-position.x)*Math.sin(this.yaw)+(p.z-position.z)*Math.cos(this.yaw))*.12;
          if(visibleScore>score){point={...p};score=visibleScore;}
        }
        if(!point)return;
        const normal=manifold.normal(),length=Math.hypot(normal.x,normal.z);if(length<.2)return;
        let nx=normal.x/length,nz=normal.z/length;
        const center=other.translation();if(nx*(position.x-center.x)+nz*(position.z-center.z)<0){nx=-nx;nz=-nz;}
        const velocity=other.parent()?.velocityAtPoint(point)??{x:0,y:0,z:0},rx=vx-velocity.x,rz=vz-velocity.z;
        const along=rx*nx+rz*nz,closing=Math.max(0,-along),tangent=Math.sqrt(Math.max(0,rx*rx+rz*rz-along*along));
        if(closing<.4&&tangent<1)return;
        const contact={...identity,closing,tangent,x:point.x,y:point.y,z:point.z,nx,nz};
        const old=contacts.get(identity.key);if(!old||closing+tangent*.1>old.closing+old.tangent*.1)contacts.set(identity.key,contact);
      });
    });
    let loss=0;
    for(const contact of contacts.values()){
      const fresh=this.elapsed-(this.contactTimes.get(contact.key)??-Infinity)>.16;this.contactTimes.set(contact.key,this.elapsed);
      const penalty=collisionPenalty(speedBefore,contact.closing,contact.tangent,fresh,dt);loss=Math.max(loss,penalty);
      if(this.elapsed-(this.sparkTimes.get(contact.key)??-Infinity)>=.12){
        this.sparkTimes.set(contact.key,this.elapsed);
        this.impacts.push({id:this.nextImpactId++,time:this.elapsed,kind:contact.kind,x:contact.x,y:contact.y,z:contact.z,nx:contact.nx,nz:contact.nz,strength:Math.min(1,.15+contact.closing/18+contact.tangent/120),speedLost:Math.max(penalty,speedBefore-this.speed)});
      }
    }
    if(contacts.size){
      this.speed=Math.max(0,Math.min(this.speed,speedBefore-loss));
      this.body.setLinvel({x:Math.sin(this.yaw)*this.speed,y:0,z:Math.cos(this.yaw)*this.speed},true);
    }
    this.impacts=this.impacts.filter(i=>this.elapsed-i.time<1);
  }
  resetToRoad(){
    this.impacts=[];this.contactTimes.clear();this.sparkTimes.clear();
    const p=atDistance(GRID_ORIGIN+Math.max(0,this.progress.validatedDistance),0);
    this.body.setTranslation({x:p.x,y:p.y+1.9,z:p.z},true);this.body.setLinvel({x:0,y:0,z:0},true);this.speed=0;this.yaw=p.yaw;this.steering=0;this.progress.last=nearestTrack(p.x,p.z).s;
  }
  snapshot():RaceSnapshot{
    const p=this.body.translation(),n=nearestTrack(p.x,p.z),frame=atDistance(n.s),alignment=Math.sin(this.yaw)*frame.tx+Math.cos(this.yaw)*frame.tz;
    const initial=this.grid.player.distance-GRID_ORIGIN;
    return {speed:this.speed,steering:this.steering,elapsed:this.elapsed,progress:Math.min(1,Math.max(0,(this.progress.validatedDistance-initial)/(this.target-initial))),place:1+this.aiDistances.filter(x=>x>this.progress.validatedDistance).length,startRow:this.grid.player.row,offRoad:n.distance>7.5,countdown:this.countdown,done:this.done,x:p.x,y:n.y,z:p.z,yaw:this.yaw,pitch:-Math.atan(n.grade*alignment),grade:n.grade*alignment,impacts:this.impacts.map(i=>({...i})),ai:this.aiDistances.map((s,i)=>{const distance=s+GRID_ORIGIN,path=this.aiPaths[i];return {...path.pose(distance),trailer:trailerPose(distance,path.laneAt(distance),s=>path.pose(s))};})};
  }
  dispose(){this.world.free();}
}
export async function initPhysics(){await RAPIER.init();}
