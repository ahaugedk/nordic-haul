import { Color3,DynamicTexture,Mesh,MeshBuilder,PBRMaterial,Scene,StandardMaterial,TransformNode } from '@babylonjs/core';
import { atDistance,TRACK_LENGTH } from './track';
import { GRID_ORIGIN } from './raceField';

export const GANTRY_POSITIONS=[115,650,1150,1700,2250,2750];
export const SIGN_BOTTOM=6.3;
export function signDistance(s:number,target:number,travelled:number):number|null{
  // Keep the just-passed reading until the board is safely behind the cab.
  const pass=s+Math.ceil((travelled+GRID_ORIGIN-s-65)/TRACK_LENGTH)*TRACK_LENGTH;
  const remaining=GRID_ORIGIN+target-pass;
  return remaining>=0?remaining:null;
}
export function distanceLabel(metres:number){
  if(metres<1000)return `${Math.max(0,Math.round(metres/10)*10)} m`;
  return `${(Math.round(metres/100)/10).toFixed(1).replace('.',',')} km`;
}
export function gantryClearOfTerminal(s:number,target:number){
  const delta=((s-GRID_ORIGIN-target)%TRACK_LENGTH+TRACK_LENGTH)%TRACK_LENGTH;
  return Math.min(delta,TRACK_LENGTH-delta)>110;
}

export function buildGantry(scene:Scene,parent:TransformNode,s:number,steel:PBRMaterial){
  const root=new TransformNode('route distance gantry '+s,scene),parts:Mesh[]=[];
  const box=(name:string,x:number,y:number,w:number,h:number,d:number)=>{
    const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,0);mesh.material=steel;parts.push(mesh);return mesh;
  };
  for(const x of [-10.7,10.7]){
    box('gantry footing',x,.3,.95,.6,1.3);
    box('gantry upright',x,5,.32,10,.32);
  }
  box('gantry crossbeam',0,9.8,22,.35,.5);
  for(const x of [-7,0,7])box('sign support',x,8.1,.16,3.1,.25);
  const frame=Mesh.MergeMeshes(parts,true,true)!;frame.parent=root;frame.receiveShadows=true;
  const board=MeshBuilder.CreatePlane('overhead destination and distance',{width:18,height:3.2},scene);board.parent=root;board.position.set(0,SIGN_BOTTOM+1.6,-.3);
  const p=atDistance(s);root.parent=parent;root.position.set(p.x,p.y,p.z);root.rotation.y=p.yaw;
  return {root,board,s};
}

export class RouteSigns {
  private gantries:ReturnType<typeof buildGantry>[]=[];
  private boards:{texture:DynamicTexture;material:StandardMaterial;last:string}[]=[];
  private destination='';private target=TRACK_LENGTH;
  constructor(scene:Scene,parent:TransformNode){
    const steel=new PBRMaterial('distance gantry galvanized steel',scene);steel.albedoColor=Color3.FromHexString('#8e9a9f').toLinearSpace();steel.metallic=.75;steel.roughness=.38;
    this.gantries=GANTRY_POSITIONS.map(s=>buildGantry(scene,parent,s,steel));
    this.boards=this.gantries.map(({board},i)=>{
      const texture=new DynamicTexture('distance sign '+i,{width:1024,height:256},scene,false),material=new StandardMaterial('reflective distance sign '+i,scene);
      // Initialize even inactive boards before the garage waits for texture readiness.
      const context=texture.getContext();context.fillStyle='#155ba1';context.fillRect(0,0,1024,256);texture.update();
      material.diffuseTexture=texture;material.emissiveTexture=texture;material.emissiveColor.setAll(.5);material.specularColor=Color3.Black();board.material=material;
      return {texture,material,last:''};
    });
  }
  configure(destination:string,distance:number){
    this.destination=destination.toLocaleUpperCase('da-DK');this.target=TRACK_LENGTH*distance;
    this.gantries.forEach(g=>g.root.setEnabled(gantryClearOfTerminal(g.s,this.target)));
    this.boards.forEach(b=>b.last='');this.update(0,false);
  }
  update(travelled:number,night:boolean){
    this.gantries.forEach((g,i)=>{
      if(!g.root.isEnabled())return;
      const remaining=signDistance(g.s,this.target,travelled),board=this.boards[i];
      board.material.emissiveColor.setAll(night?.7:.22);
      if(remaining===null)return;
      const reading=distanceLabel(remaining);if(reading===board.last)return;board.last=reading;
      const c=board.texture.getContext() as CanvasRenderingContext2D;
      c.fillStyle='#155ba1';c.fillRect(0,0,1024,256);c.strokeStyle='#e7f0ed';c.lineWidth=5;c.strokeRect(9,9,1006,238);
      c.fillStyle='#f5f7ed';c.textAlign='left';c.font='600 61px Arial';
      const font=Math.min(61,61*785/c.measureText(this.destination).width);c.font=`600 ${font}px Arial`;c.fillText(this.destination,40,82);
      c.font='600 100px Arial';c.fillText(reading,40,197);
      c.font='500 29px Arial';c.fillText('LOGISTIKTERMINAL',430,192);
      c.lineWidth=12;c.lineCap='square';c.beginPath();c.moveTo(920,203);c.lineTo(920,66);c.moveTo(890,101);c.lineTo(920,66);c.lineTo(950,101);c.stroke();
      board.texture.update();
    });
  }
}
