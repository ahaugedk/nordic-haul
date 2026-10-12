import { Color3,DynamicTexture,Mesh,MeshBuilder,PBRMaterial,Scene,StandardMaterial,TransformNode } from '@babylonjs/core';
import { atDistance } from './track';
import { GRID_ORIGIN } from './raceField';
import { roadworkObstacles,type Roadwork } from './roadworks';

export class RoadworkScene {
  private root?:TransformNode;
  private groups:{site:Roadwork;root:TransformNode}[]=[];
  private arrows:StandardMaterial[]=[];private lamps?:PBRMaterial;
  constructor(private scene:Scene,private motorway:TransformNode){}
  configure(sites:Roadwork[]){
    this.root?.dispose(false,true);this.groups=[];this.arrows=[];
    this.root=new TransformNode('roadwork events',this.scene);this.root.parent=this.motorway;
    const mat=(name:string,color:string,metal=0)=>{const m=new PBRMaterial('roadwork '+name,this.scene);m.albedoColor=Color3.FromHexString(color).toLinearSpace();m.roughness=.65;m.metallic=metal;return m;};
    const orange=mat('safety orange','#f17324'),white=mat('reflective white','#f4eee2'),dark=mat('rubber and steel','#252f34'),yellow=mat('roller yellow','#d9b63c'),steel=mat('equipment metal','#8a989f',.6);
    this.lamps=mat('amber warning lamps','#ffc343');
    sites.forEach(site=>{
      const root=new TransformNode('worksite '+site.id,this.scene);root.parent=this.root!;const parts:Mesh[]=[];
      const box=(name:string,s:number,lane:number,y:number,w:number,h:number,d:number,m:PBRMaterial)=>{
        const p=atDistance(s+GRID_ORIGIN,lane),mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);mesh.position.set(p.x,p.y+y,p.z);mesh.rotation.y=p.yaw;mesh.material=m;parts.push(mesh);return mesh;
      };
      for(const o of roadworkObstacles(site)){
        const p=atDistance(o.s+GRID_ORIGIN,o.lane);
        if(o.kind==='cone'){
          box('roadwork cone base',o.s,o.lane,.045,.6,.09,.6,dark);
          const cone=MeshBuilder.CreateCylinder('orange traffic cone',{diameterBottom:.52,diameterTop:.05,height:.83,tessellation:10},this.scene);cone.position.set(p.x,p.y+.5,p.z);cone.material=orange;parts.push(cone);
          const band=MeshBuilder.CreateCylinder('reflective cone band',{diameterBottom:.3,diameterTop:.21,height:.16,tessellation:10},this.scene);band.position.set(p.x,p.y+.59,p.z);band.material=white;parts.push(band);
        }else if(o.kind==='barrier'){
          box('lane closure barrier',o.s,o.lane,.5,o.width,1,o.depth,orange);
          box('barrier reflective strip',o.s-.64,o.lane,.67,o.width,.21,.025,white);
          for(const dx of [-.9,.9])box('barrier amber beacon',o.s,o.lane+dx,1.15,.18,.26,.18,this.lamps!);
        }else if(o.kind==='roller'){
          box('road roller chassis',o.s,o.lane,.95,1.9,.7,3.3,yellow);
          box('road roller cab',o.s-.45,o.lane,1.65,1.25,1.1,1.3,steel);
          box('road roller glazing',o.s-.45,o.lane,1.77,1.27,.7,1.32,dark);
          box('road roller roof',o.s-.45,o.lane,2.3,1.5,.15,1.55,yellow);
          for(const dz of [-1.35,1.35]){
            const q=atDistance(o.s+dz+GRID_ORIGIN,o.lane),drum=MeshBuilder.CreateCylinder('road roller drum',{diameter:1,height:2.2,tessellation:12},this.scene);drum.position.set(q.x,q.y+.5,q.z);drum.rotation.set(0,q.yaw,Math.PI/2);drum.material=dark;parts.push(drum);
          }
        }else{
          box('portable arrow board base',o.s,o.lane,.2,2.25,.4,.8,orange);
          box('portable arrow board post',o.s,o.lane,1.1,.18,1.8,.18,steel);
          box('portable arrow board enclosure',o.s,o.lane,1.8,2.25,1.13,.14,dark);
          const t=new DynamicTexture('merge arrow '+site.id,{width:384,height:192},this.scene,false),c=t.getContext() as CanvasRenderingContext2D;
          c.fillStyle='#111719';c.fillRect(0,0,384,192);c.strokeStyle='#ffc343';c.lineWidth=18;c.lineCap='round';
          const left=site.closed.includes(3.5),tip=left?75:309,tail=left?300:84;
          c.beginPath();c.moveTo(tail,96);c.lineTo(tip,96);c.moveTo(tip+(left?60:-60),44);c.lineTo(tip,96);c.lineTo(tip+(left?60:-60),148);c.stroke();t.update();
          const m=new StandardMaterial('flashing merge arrow '+site.id,this.scene);m.diffuseTexture=t;m.emissiveTexture=t;m.emissiveColor.setAll(.7);m.specularColor=Color3.Black();this.arrows.push(m);
          const board=MeshBuilder.CreatePlane('portable merge direction',{width:2.25,height:1.13},this.scene);board.parent=root;board.position.set(p.x,p.y+1.8,p.z-.08*Math.cos(p.yaw));board.position.x-=.08*Math.sin(p.yaw);board.rotation.y=p.yaw;board.material=m;
        }
      }
      for(const material of new Set(parts.map(m=>m.material))){
        const group=parts.filter(m=>m.material===material),merged=Mesh.MergeMeshes(group,true,true);if(merged){merged.parent=root;merged.receiveShadows=true;}
      }
      root.setEnabled(false);this.groups.push({site,root});
    });
  }
  update(elapsed:number,night:boolean,reducedMotion:boolean){
    this.groups.forEach(g=>g.root.setEnabled(g.site.active));
    const blink=reducedMotion?1:Math.sin(elapsed*Math.PI*4)>.1?1:.25;
    this.arrows.forEach(m=>m.emissiveColor.setAll(blink*(night?.9:.6)));
    this.lamps?.emissiveColor.set(1*blink,.55*blink,.08*blink);
  }
}
