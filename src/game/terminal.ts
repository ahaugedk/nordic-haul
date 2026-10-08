import { Color3,Mesh,MeshBuilder,PBRMaterial,Scene,SpotLight,StandardMaterial,TransformNode,Vector3 } from '@babylonjs/core';
import { atDistance,TRACK_LENGTH } from './track';
import { GRID_ORIGIN } from './raceField';

export const TERMINAL_PORTS=12;
export function terminalLayout(raceDistance:number){
  const finish=atDistance(GRID_ORIGIN+TRACK_LENGTH*raceDistance);
  const floor=atDistance(finish.s+38).y-finish.y+.15;
  return {finish,floor,ports:Array.from({length:TERMINAL_PORTS},(_,i)=>({number:i+1,x:-90+i*5.5,z:38}))};
}
function yardHeight(layout:ReturnType<typeof terminalLayout>,z:number){
  const road=atDistance(layout.finish.s+z).y-layout.finish.y+.09,t=Math.max(0,Math.min(1,(z+25)/50));
  return road+(layout.floor-road)*t;
}
export function terminalGroundHeight(layout:ReturnType<typeof terminalLayout>,x:number,z:number,height:number){
  const dx=x-layout.finish.x,dz=z-layout.finish.z,c=Math.cos(layout.finish.yaw),s=Math.sin(layout.finish.yaw);
  const localX=dx*c-dz*s,localZ=dx*s+dz*c;
  if(localX>-20||localX<-113||localZ<-75||localZ>85)return height;
  const blend=Math.min(1,(-20-localX)/3,(localX+113)/5,(localZ+75)/5,(85-localZ)/5);
  return height+(Math.min(height,layout.finish.y+yardHeight(layout,localZ)-.35)-height)*blend;
}
export function terminalSceneryClearance(x:number,z:number,radius:number){
  return [1,1.25,1.5].every(distance=>{
    const {finish}=terminalLayout(distance),dx=x-finish.x,dz=z-finish.z,c=Math.cos(finish.yaw),s=Math.sin(finish.yaw);
    const lx=dx*c-dz*s,lz=dx*s+dz*c;
    return lx+radius<-118||lx-radius>-9||lz+radius<-85||lz-radius>90;
  });
}
type SignFactory=(text:string,width:number,height:number,color:string,bg:string)=>Mesh;
export type LogisticsTerminal={root:TransformNode;floor:number;nightMaterials:{material:PBRMaterial;color:Color3}[];lamps:Vector3[];floodlights:SpotLight[]};

/** Original lightweight terminal scenery; no truck assets are altered. */
export function buildTerminal(scene:Scene,parent:TransformNode,raceDistance:number,destination:string,label:SignFactory):LogisticsTerminal{
  const layout=terminalLayout(raceDistance),{finish,floor,ports}=layout,root=new TransformNode('destination logistics terminal',scene);
  root.parent=parent;
  const meshes:Mesh[]=[],nightMaterials:LogisticsTerminal['nightMaterials']=[],lamps:Vector3[]=[],floodlights:SpotLight[]=[];
  const mat=(name:string,hex:string,rough=.7,metal=0)=>{const m=new PBRMaterial('terminal '+name,scene);m.albedoColor=Color3.FromHexString(hex).toLinearSpace();m.roughness=rough;m.metallic=metal;m.maxSimultaneousLights=8;return m;};
  const wall=mat('insulated facade','#697a86',.55,.3),dark=mat('rubber seals','#182128'),door=mat('roller doors','#becbd0',.4,.5),roof=mat('roof','#25343f'),concrete=mat('concrete apron','#788185',.95),yellow=mat('safety yellow','#e9ce41'),white=mat('road paint','#eaeedb'),glass=mat('office glass','#293e4b',.2,.6),red=mat('dock indicators','#24ad75'),light=mat('yard lamps','#ffe3ac');
  nightMaterials.push({material:light,color:new Color3(1,.79,.46)},{material:glass,color:new Color3(.65,.8,1)},{material:red,color:new Color3(.08,.9,.4)});
  const foundation=mat('foundation retaining concrete','#434e54',.95);
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:PBRMaterial)=>{const mesh=MeshBuilder.CreateBox('terminal '+name,{width:w,height:h,depth:d},scene);mesh.parent=root;mesh.position.set(x,y,z);mesh.material=m;mesh.receiveShadows=true;meshes.push(mesh);return mesh;};
  const sign=(text:string,x:number,y:number,z:number,w:number,h:number,color='#f0f4ed',bg='#14232d')=>{const mesh=label(text,w,h,color,bg);mesh.parent=root;mesh.position.set(x,y,z);if(mesh.material instanceof StandardMaterial)mesh.material.emissiveColor.setAll(.8);meshes.push(mesh);return mesh;};
  // A terraced yard meets the road's grade without tilting the warehouse.
  const rows=[-70,-35,0,20,38,80];
  const apron=MeshBuilder.CreateRibbon('terminal terraced unloading yard',{pathArray:rows.map(z=>{
    const roadY=atDistance(finish.s+z).y-finish.y+.09;
    return [new Vector3(-108,yardHeight(layout,z),z),new Vector3(-22,yardHeight(layout,z),z),new Vector3(-9.2,roadY,z)];
  }),sideOrientation:Mesh.DOUBLESIDE},scene);apron.parent=root;apron.material=concrete;apron.receiveShadows=true;meshes.push(apron);
  box('warehouse',-59.75,floor+6.5,58,73,13,40,wall);
  box('terrace foundation',-59.75,floor-8.5,58,73,17,40,foundation);
  box('flat roof parapet',-59.75,floor+13.2,58,75,.6,42,roof);
  box('upper facade band',-59.75,floor+10.5,37.8,73,3,.3,roof);
  for(let x=-96;x<=-24;x+=2)box('facade vertical joint',x,floor+6.5,37.74,.045,13,.06,dark);
  sign('NORDIC HAUL  /  LOGISTICS',-59.75,floor+11,37.5,52,2.3);
  ports.forEach(({number,x,z})=>{
    box('dock seal '+number,x,floor+4.35,z-.18,4.5,6.9,.65,dark);
    box('loading door '+number,x,floor+4.5,z-.56,3.4,5.8,.08,door);
    for(let y=1.75;y<7.5;y+=.38)box('roller door slat',x,floor+y,z-.63,3.4,.035,.025,wall);
    box('dock ramp',x,floor+.8,z-.6,3.6,1.6,1.6,concrete);
    box('dock leveller',x,floor+1.62,z-1,3.5,.06,1.5,roof);
    for(const dx of [-2,2])box('rubber dock bumper',x+dx,floor+1.05,z-1.48,.4,1.1,.3,dark);
    sign(String(number).padStart(2,'0'),x,floor+8.35,z-.62,2.5,1.5,'#dcff00');
    box('dock light',x+2.4,floor+5.2,z-.5,.18,.45,.2,red);
    for(const dx of [-2.5,2.5]){
      box('parking guide',x+dx,floor+.03,27,.1,.045,19,yellow);
      box('safety bollard',x+dx,floor+.65,z-2.2,.24,1.3,.24,yellow);
      box('bollard stripe',x+dx,floor+.85,z-2.2,.25,.28,.25,dark);
    }
    // A few backed-in freight trailers leave most doors clearly visible.
    if([2,5,9].includes(number)){
      box('parked freight trailer',x,floor+2.6,29.4,2.55,2.8,13.6,number===5?wall:door);
      box('trailer underframe',x,floor+1.12,29.4,2.4,.25,13.6,roof);
      for(const dz of [-3,-1.7,-.4])for(const dx of [-1.1,1.1]){
        const wheel=MeshBuilder.CreateCylinder('terminal parked trailer wheel',{diameter:1.05,height:.32,tessellation:12},scene);wheel.parent=root;wheel.position.set(x+dx,floor+.53,29.4+dz);wheel.rotation.z=Math.PI/2;wheel.material=dark;meshes.push(wheel);
      }
      box('trailer support legs',x,floor+.55,34.4,2,.95,.25,roof);
    }
  });
  for(let x=-46;x<=-28;x+=5)box('dispatch office window',x,floor+10.4,37.55,3.7,1.6,.12,glass);
  // Reception lies outside the road; the arrival gantry has truck-height clearance.
  box('gatehouse',-16,floor+1.9,-26,5,3.8,6,wall);box('gatehouse glazing',-16,floor+2.35,-29.05,4,1.6,.1,glass);
  for(const x of [-10.5,10.5])box('arrival gantry upright',x,5.6,0,.4,11.2,.4,door);
  box('arrival gantry beam',0,11.1,0,22,.4,.5,roof);
  sign(destination.toLocaleUpperCase('da-DK')+' / LOGISTIKTERMINAL',0,9.5,-.35,20,2.4,'#dcff00');
  sign('ANKOMST  /  AFLÆSNING',0,7.85,-.35,17,.8);
  // Actual arrival line shares the physical finish's road height and pitch.
  for(let row=0;row<2;row++)for(let col=0;col<24;col++){
    const x=-8.4+(col+.5)*.7,z=(row-.5)*.7,y=atDistance(finish.s+z).y-finish.y+.1;
    const tile=box('arrival checker',x,y,z,.7,.025,.7,(row+col)%2?roof:white);tile.rotation.x=atDistance(finish.s+z).pitch;
  }
  for(const [x,z] of [[-26,-45],[-65,-40],[-100,-35],[-26,18],[-100,18]]){
    box('yard light mast',x,floor+6.5,z,.18,13,.18,door);
    box('yard floodlight',x,floor+13,z,1.7,.15,.6,light);
    const cos=Math.cos(finish.yaw),sin=Math.sin(finish.yaw);
    lamps.push(new Vector3(finish.x+x*cos+z*sin,finish.y+floor+12.8,finish.z-x*sin+z*cos));
  }
  for(const x of [-85,-38]){
    box('dock floodlight mast',x,floor+6.25,-12,.2,12.5,.2,door);box('dock projector',x,floor+12.5,-12,1.7,.2,.6,light);
    const flood=new SpotLight('terminal dock floodlight',new Vector3(x,floor+12.5,-12),new Vector3(0,-.24,1),1.25,1.2,scene);
    flood.parent=root;flood.diffuse=new Color3(1,.86,.64);flood.range=85;flood.intensity=0;flood.renderPriority=20;floodlights.push(flood);
  }
  // Hundreds of facade details become one draw call per material.
  for(const material of new Set(meshes.map(m=>m.material))){
    const group=meshes.filter(m=>m.material===material);if(group.length<2)continue;
    const merged=Mesh.MergeMeshes(group,true,true);if(merged){merged.parent=root;merged.receiveShadows=true;}
  }
  root.position.set(finish.x,finish.y,finish.z);root.rotation.y=finish.yaw;
  for(const flood of floodlights)flood.includedOnlyMeshes=root.getChildMeshes();
  root.setEnabled(false);return {root,floor,nightMaterials,lamps,floodlights};
}
