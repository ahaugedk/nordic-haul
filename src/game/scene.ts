import { ArcRotateCamera,Color3,Color4,DirectionalLight,DynamicTexture,Engine,FreeCamera,HDRCubeTexture,HemisphericLight,Matrix,Mesh,MeshBuilder,PBRMaterial,Quaternion,RawCubeTexture,RenderTargetTexture,Scene,SceneLoader,ShadowGenerator,ShaderMaterial,SpotLight,PointLight,StandardMaterial,Texture,TransformNode,Vector3,VertexBuffer,VertexData,WebGPUEngine } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { cabFor,FINISHES,type TruckConfig } from '../data/catalog';
import { TRACK,TRACK_LENGTH,atDistance,terrainHeight,sceneryClearance } from './track';
import { dayCycle } from './dayCycle';
import { buildTrailer } from './trailerModel';
import { mirrorSurfaceUV,orientMirrorFeed } from './mirrorSurface';
import type { RaceSnapshot } from './simulation';

export class TruckScene {
  engine:Engine|WebGPUEngine;scene:Scene;garage:TransformNode;motorway:TransformNode;
  orbit:ArcRotateCamera;cockpit:FreeCamera;truck!:TransformNode;opponents:TransformNode[]=[];opponentTrailers:TransformNode[]=[];
  mode:'garage'|'race'='garage';backend:string;shadow:ShadowGenerator;quality='balanced';
  private elapsed=0;private slowFrames=0;private paint?:PBRMaterial;
  private originals=new Map<Mesh,Float32Array>();private currentCab=0;private chassisDrop=0;
  private studio!:HDRCubeTexture;private outdoor!:HDRCubeTexture;private skybox?:Mesh;
  private instruments?:DynamicTexture;private navigation?:DynamicTexture;private displayTick=0;private cms=false;
  private opticalMirrors:{mesh:Mesh;original:Mesh['material'];feed:StandardMaterial}[]=[];
  private mirrors:{camera:FreeCamera;texture:RenderTargetTexture;side:number}[]=[];
  private destination='Hamburg';private origin='Aarhus';private interiorMode=false;
  private compactLayout=false;
  private skyMaterial?:ShaderMaterial;private headlights:SpotLight[]=[];private streetLights:PointLight[]=[];
  private lampPositions:Vector3[]=[];private nightMaterials:{material:PBRMaterial;color:Color3}[]=[];
  private constructor(engine:Engine|WebGPUEngine,public canvas:HTMLCanvasElement,backend:string){
    this.engine=engine;this.backend=backend;this.scene=new Scene(engine);this.scene.clearColor=new Color4(.035,.045,.06,1);
    this.scene.fogMode=Scene.FOGMODE_EXP2;this.scene.fogColor=new Color3(.68,.73,.74);this.scene.fogDensity=.0011;
    this.scene.imageProcessingConfiguration.exposure=1;this.scene.imageProcessingConfiguration.toneMappingEnabled=true;
    const hemi=new HemisphericLight('soft ambient',new Vector3(0,1,0),this.scene);hemi.intensity=.58;hemi.groundColor=new Color3(.19,.2,.22);
    const sun=new DirectionalLight('northern light',new Vector3(-.45,-1,-.4),this.scene);sun.position=new Vector3(40,80,40);sun.intensity=2.3;
    sun.autoUpdateExtends=true;sun.shadowMinZ=1;sun.shadowMaxZ=150;
    this.shadow=new ShadowGenerator(1024,sun);this.shadow.usePercentageCloserFiltering=true;this.shadow.bias=.003;this.shadow.normalBias=.03;
    this.createEnvironment();
    this.orbit=new ArcRotateCamera('garage camera',.89,1.34,11,new Vector3(0,1.95,0),this.scene);
    this.orbit.lowerRadiusLimit=9;this.orbit.upperRadiusLimit=19;this.orbit.lowerBetaLimit=.55;this.orbit.upperBetaLimit=1.4;this.orbit.wheelDeltaPercentage=.01;this.orbit.panningSensibility=0;
    this.orbit.attachControl(canvas,true);
    this.cockpit=new FreeCamera('driver eye',Vector3.Zero(),this.scene);this.cockpit.minZ=.04;this.cockpit.maxZ=4000;this.cockpit.fov=1.12;
    this.garage=new TransformNode('garage',this.scene);this.motorway=new TransformNode('motorway',this.scene);this.buildGarage();this.buildMotorway();this.motorway.setEnabled(false);
    this.scene.activeCamera=this.orbit;
    this.engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.4));
    const resize=()=>{this.engine.resize();this.layoutCamera();};
    window.addEventListener('resize',resize);
    window.visualViewport?.addEventListener('resize',resize);
    new ResizeObserver(resize).observe(canvas);
    resize();
  }
  static async create(canvas:HTMLCanvasElement){
    let engine:Engine|WebGPUEngine;let backend='WebGL 2';
    try{if(await WebGPUEngine.IsSupportedAsync){const gpu=new WebGPUEngine(canvas,{antialias:true});try{await gpu.initAsync();engine=gpu;backend='WebGPU';}catch{gpu.dispose();engine=new Engine(canvas,true);}}else engine=new Engine(canvas,true);}catch{engine=new Engine(canvas,true);}
    const view=new TruckScene(engine,canvas,backend);await view.loadTruck();view.setMode('garage');return view;
  }
  private createEnvironment(){
    const size=32;const faces=[];
    for(let f=0;f<6;f++){const data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;const light=f===2?.92:f===3?.28:.36+.42*(1-y/size);data[i]=Math.round(light*230);data[i+1]=Math.round(light*242);data[i+2]=Math.round(light*255);data[i+3]=255;}faces.push(data);}
    this.scene.environmentTexture=new RawCubeTexture(this.scene,faces,size,Engine.TEXTUREFORMAT_RGBA,Engine.TEXTURETYPE_UNSIGNED_BYTE,true,false,Texture.TRILINEAR_SAMPLINGMODE);
    this.studio=new HDRCubeTexture('/environment/studio.hdr',this.scene,256,false,true,false,true,()=>{if(this.mode==='garage')this.scene.environmentTexture=this.studio;});
    this.outdoor=new HDRCubeTexture('/environment/sky.hdr',this.scene,256,false,true,false,true,()=>{if(this.mode==='race')this.scene.environmentTexture=this.outdoor;});
  }
  private mat(name:string,hex:string,rough=.7,metal=0){const m=new PBRMaterial(name,this.scene);m.albedoColor=Color3.FromHexString(hex);m.roughness=rough;m.metallic=metal;return m;}
  private box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:PBRMaterial|StandardMaterial,parent:TransformNode){const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);m.position.set(x,y,z);m.material=material;m.parent=parent;m.receiveShadows=true;return m;}
  private noiseMaterial(name:string,color:string){
    const m=this.mat(name,color,.87);const tex=new DynamicTexture(name+' texture',256,this.scene,false);const ctx=tex.getContext();ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
    let seed=42;for(let i=0;i<18000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%256;seed=(seed*1664525+1013904223)>>>0;ctx.fillStyle=i%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.035)';ctx.fillRect(x,seed%256,2,2);}tex.update();tex.uScale=35;tex.vScale=35;m.albedoTexture=tex;return m;
  }
  private label(content:string,width:number,height:number,color:string,bg:string){const t=new DynamicTexture('sign '+content,{width:1024,height:256},this.scene,false);const c=t.getContext() as CanvasRenderingContext2D;c.fillStyle=bg;c.fillRect(0,0,1024,256);c.fillStyle=color;c.font='500 85px Arial';c.textAlign='center';c.fillText(content,512,158);t.update();const mat=new StandardMaterial('sign',this.scene);mat.diffuseTexture=t;mat.emissiveColor=new Color3(.28,.28,.28);mat.specularColor=Color3.Black();const p=MeshBuilder.CreatePlane(content,{width,height},this.scene);p.material=mat;return p;}
  private buildGarage(){
    const concrete=this.noiseMaterial('concrete','#434b53'),wall=this.mat('wall','#11181e'),steel=this.mat('steel','#414d59',.4,.6),dark=this.mat('seams','#10151a'),yellow=this.mat('safety yellow','#dcff00');
    this.box('studio floor',0,-.1,0,65,.2,65,concrete,this.garage);
    this.box('back wall',0,5,-12,45,10,.2,wall,this.garage);
    for(let x=-20;x<=20;x+=3){this.box('wall joints',x,5,-11.85,.04,10,.03,dark,this.garage);this.box('roof beam',x,18.5,-5,.18,.3,14,steel,this.garage);}
    const light=this.mat('ceiling light','#dde9ea');light.emissiveColor=new Color3(1,1,1);
    for(const x of [-7,0,7])this.box('softbox',x,17.9,0,.25,.08,11,light,this.garage);
    this.box('service door',9,3,-11.66,5.3,6,.1,steel,this.garage);
    for(let y=.3;y<6;y+=.45)this.box('door slat',9,y,-11.56,5.3,.025,.03,dark,this.garage);
    const sign=this.label('N O R D I C   H A U L   /   P I T   0 1',15,3,'#687584','#11181e');sign.parent=this.garage;sign.position.set(-3,5.2,-11.72);
    for(let x=-24;x<25;x+=6)this.box('floor joint',x,.005,0,.018,.01,60,dark,this.garage);
    for(let z=-24;z<25;z+=6)this.box('floor joint',0,.005,z,60,.01,.018,dark,this.garage);
    for(let x of [-2.3,2.3])this.box('service bay line',x,.018,0,.06,.02,11,yellow,this.garage);
    this.box('service bay line',0,.018,5.5,4.66,.02,.07,yellow,this.garage);
    for(let x of [6.3,11.7]){this.box('bollard',x,.65,-8.8,.18,1.3,.18,yellow,this.garage);for(let y of [.4,.9])this.box('bollard stripe',x,y,-8.8,.19,.16,.19,dark,this.garage);}
  }
  private buildMotorway(){
    const road=this.noiseMaterial('Autobahn asphalt','#44494b'),ground=this.noiseMaterial('rolling countryside','#51633d'),white=this.mat('reflective lane paint','#e8e8d5'),steel=this.mat('galvanized barriers','#8d979d',.42,.72),median=this.noiseMaterial('median grass','#596947');
    road.maxSimultaneousLights=8;ground.maxSimultaneousLights=8;white.maxSimultaneousLights=8;steel.maxSimultaneousLights=8;
    const positions:number[]=[],indices:number[]=[],normals:number[]=[],uvs:number[]=[],n=92,size=1800;
    for(let z=0;z<=n;z++)for(let x=0;x<=n;x++){const px=-size/2+x/n*size,pz=-size/2+z/n*size;positions.push(px,terrainHeight(px,pz),pz);uvs.push(x/n,z/n);}
    for(let z=0;z<n;z++)for(let x=0;x<n;x++){const a=z*(n+1)+x;indices.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
    VertexData.ComputeNormals(positions,indices,normals);const vd=new VertexData();vd.positions=positions;vd.indices=indices;vd.normals=normals;vd.uvs=uvs;
    const terrain=new Mesh('rolling Autobahn terrain',this.scene);vd.applyToMesh(terrain);terrain.material=ground;terrain.parent=this.motorway;terrain.receiveShadows=true;
    const ribbon=(name:string,lanes:number[],material:PBRMaterial,lift=.04)=>{const mesh=MeshBuilder.CreateRibbon(name,{pathArray:lanes.map(l=>TRACK.map(p=>{const q=atDistance(p.s,l);return new Vector3(q.x,q.y+lift,q.z);})),sideOrientation:Mesh.DOUBLESIDE},this.scene);mesh.material=material;mesh.parent=this.motorway;mesh.receiveShadows=true;return mesh;};
    ribbon('three racing lanes',[-8.5,8.5],road);ribbon('opposite carriageway',[14.5,31.5],road);ribbon('planted central reservation',[8.5,14.5],median,.035);
    const details:Mesh[]=[];
    const segment=(name:string,s:number,lane:number,w:number,h:number,d:number,material:PBRMaterial,lift=0)=>{const p=atDistance(s,lane),m=this.box(name,p.x,p.y+lift,p.z,w,h,d,material,this.motorway);m.rotation.set(p.pitch,p.yaw,0);details.push(m);return m;};
    for(let s=0;s<TRACK_LENGTH;s+=15)for(const lane of [-1.75,1.75,21.25,24.75])segment('lane dash',s,lane,.14,.02,6,white,.07);
    for(const lane of [-7.65,7.65,15.35,30.65])ribbon('continuous shoulder line',[lane-.075,lane+.075],white,.073);
    for(let s=0;s<TRACK_LENGTH;s+=8){
      for(const lane of [-8.8,8.8,14.2,31.8]){segment('crash barrier rail',s,lane,.18,.36,8.15,steel,.82);segment('crash barrier support',s,lane,.12,.92,.12,steel,.46);}
      if(s%32===0)for(const lane of [-9.6,32.6])segment('reflector post',s,lane,.14,.95,.14,white,.48);
    }
    for(const material of new Set(details.map(m=>m.material))){const merged=Mesh.MergeMeshes(details.filter(m=>m.material===material),true,true);if(merged)merged.parent=this.motorway;}
    const wall=this.mat('roadside houses','#cbbf9f'),roof=this.mat('red tile roofs','#7d4535'),window=this.mat('night windows','#596b78'),wood=this.mat('tree bark','#534539'),leaf=this.mat('forest canopy','#2d4832');
    this.nightMaterials.push({material:window,color:new Color3(1,.65,.25)});
    const scenery:Mesh[]=[];
    for(let i=0;i<26;i++){
      const p=atDistance(i/26*TRACK_LENGTH,i%2?-70:90),w=10+i%4*2,d=13;
      if(!sceneryClearance(p.x,p.z,w+3,d+3))continue;
      const y=terrainHeight(p.x,p.z);
      scenery.push(this.box('roadside house',p.x,y+3.7,p.z,w,7.4,d,wall,this.motorway));
      const top=MeshBuilder.CreateCylinder('pitched roof',{diameter:1,height:w+2,tessellation:3},this.scene);top.scaling.set(d+2,1,5);top.rotation.z=Math.PI/2;top.position.set(p.x,y+8.8,p.z);top.material=roof;top.parent=this.motorway;scenery.push(top);
      for(const dx of [-2.5,2.5])for(const dy of [2.4,5.6])scenery.push(this.box('house window',p.x+dx,y+dy,p.z-d/2-.03,1.3,1.5,.08,window,this.motorway));
    }
    for(let i=0;i<240;i++){
      const p=atDistance(i/240*TRACK_LENGTH,(i%2?-1:1)*(42+(i*37%160))),radius=3.5+i%3;
      if(!sceneryClearance(p.x,p.z,radius*2,radius*2,12))continue;
      const y=terrainHeight(p.x,p.z),height=9+i%6;
      scenery.push(this.box('forest trunk',p.x,y+height*.3,p.z,.6,height*.6,.6,wood,this.motorway));
      const crown=MeshBuilder.CreateCylinder('conifer canopy',{diameterTop:0,diameterBottom:radius*2,height:height,tessellation:9},this.scene);crown.position.set(p.x,y+height*.65,p.z);crown.material=leaf;crown.parent=this.motorway;scenery.push(crown);
    }
    for(const material of new Set(scenery.map(m=>m.material))){const merged=Mesh.MergeMeshes(scenery.filter(m=>m.material===material),true,true);if(merged)merged.parent=this.motorway;}
    const bulb=this.mat('motorway lamp glow','#fff1c3');this.nightMaterials.push({material:bulb,color:new Color3(1,.78,.4)});
    for(let s=0;s<TRACK_LENGTH;s+=105){
      const p=atDistance(s,-11);this.lampPositions.push(new Vector3(p.x,p.y+10,p.z));
      this.box('motorway light pole',p.x,p.y+5,p.z,.16,10,.16,steel,this.motorway);
      this.box('motorway lamp arm',p.x+p.tz*1.5,p.y+10,p.z-p.tx*1.5,3,.12,.15,steel,this.motorway).rotation.y=p.yaw;
      const lamp=this.box('motorway lamp',p.x+p.tz*2.8,p.y+9.85,p.z-p.tx*2.8,.9,.16,.4,bulb,this.motorway);lamp.rotation.y=p.yaw;
    }
    for(let i=0;i<2;i++){const light=new PointLight('nearby street lamp '+i,Vector3.Zero(),this.scene);light.diffuse=new Color3(1,.79,.5);light.range=38;light.intensity=0;this.streetLights.push(light);}
    // Portal columns stand outside the shoulder; the sign clears all trucks vertically.
    const p=atDistance(115),sign=this.label('AUTOBAHN   /   NORDIC HAUL',18,3.3,'#ffffff','#175595');
    sign.position.set(p.x,p.y+9,p.z);sign.rotation.y=p.yaw+Math.PI;sign.parent=this.motorway;
    for(const lane of [-11,11]){const q=atDistance(115,lane);this.box('sign portal pillar',q.x,q.y+5.7,q.z,.35,11.4,.35,steel,this.motorway);}
    this.box('sign portal beam',p.x,p.y+11.3,p.z,23,.35,.35,steel,this.motorway).rotation.y=p.yaw;
    for(let i=0;i<4;i++){const q=atDistance(360+i*18,-10.5),sign=this.label('‹',2,2,'#121820','#fff3bc');sign.position.set(q.x,q.y+2,q.z);sign.rotation.y=q.yaw+Math.PI;sign.parent=this.motorway;}
    this.createDaySky();
  }
  private createDaySky(){
    this.skyMaterial=new ShaderMaterial('moving day sky',this.scene,{vertexSource:`precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;varying vec3 direction;void main(){direction=position;gl_Position=worldViewProjection*vec4(position,1.0);}`,fragmentSource:`precision highp float;varying vec3 direction;uniform float daylight;uniform float twilight;uniform vec3 sunDirection;void main(){vec3 d=normalize(direction);float h=max(d.y,0.0);vec3 night=mix(vec3(.028,.043,.09),vec3(.008,.015,.042),pow(h,.45));vec3 day=mix(vec3(.63,.76,.82),vec3(.16,.39,.69),pow(h,.55));vec3 sky=mix(night,day,daylight);sky+=twilight*vec3(.5,.15,.045)*pow(1.0-h,5.0);float sunDot=dot(d,sunDirection);sky+=vec3(1.0,.82,.5)*smoothstep(.9988,.9996,sunDot)*daylight;sky+=vec3(.17,.15,.08)*pow(max(sunDot,0.0),32.0)*daylight;float star=fract(sin(dot(floor(d.xz*440.0/(.25+abs(d.y))),vec2(12.9898,78.233)))*43758.5453);sky+=vec3(.7,.8,1.0)*smoothstep(.9975,1.0,star)*(1.0-daylight)*smoothstep(.02,.3,h);gl_FragColor=vec4(sky,1.0);}`},{attributes:['position'],uniforms:['worldViewProjection','daylight','twilight','sunDirection']});
    this.skyMaterial.backFaceCulling=false;this.skyMaterial.disableDepthWrite=true;
    this.skybox=MeshBuilder.CreateSphere('accelerated day and night',{diameter:5000,segments:16},this.scene);this.skybox.material=this.skyMaterial;this.skybox.infiniteDistance=true;this.skybox.isPickable=false;this.skybox.setEnabled(false);
  }
  private updateDaylight(elapsed:number,x:number,z:number){
    const c=dayCycle(elapsed),sun=this.scene.getLightByName('northern light') as DirectionalLight,ambient=this.scene.getLightByName('soft ambient') as HemisphericLight;
    const angle=(c.hour-6)/24*Math.PI*2,sunDirection=new Vector3(Math.cos(angle)*.8,Math.sin(angle),.35).normalize();
    sun.direction=sunDirection.negate();sun.intensity=c.daylight*2.15+.015;sun.diffuse=Color3.Lerp(new Color3(1,.54,.28),new Color3(1,.97,.87),c.daylight);
    ambient.intensity=.13+c.daylight*.48;ambient.groundColor=Color3.Lerp(new Color3(.02,.035,.07),new Color3(.22,.24,.2),c.daylight);
    this.scene.environmentIntensity=.06+c.daylight*.78;this.scene.fogColor=Color3.Lerp(new Color3(.025,.04,.08),new Color3(.65,.75,.81),c.daylight);this.scene.clearColor=new Color4(this.scene.fogColor.r,this.scene.fogColor.g,this.scene.fogColor.b,1);
    this.skyMaterial?.setFloat('daylight',c.daylight);this.skyMaterial?.setFloat('twilight',c.twilight);this.skyMaterial?.setVector3('sunDirection',sunDirection);
    for(const light of this.headlights)light.intensity=c.night?1800:0;
    for(const {material,color} of this.nightMaterials)material.emissiveColor=color.scale(c.night?.9:.03);
    const nearest=this.lampPositions.map(p=>({p,d:(p.x-x)**2+(p.z-z)**2})).sort((a,b)=>a.d-b.d);
    for(let i=0;i<this.streetLights.length;i++){const l=this.streetLights[i];l.position.copyFrom(nearest[i].p);l.intensity=c.night?160:0;}
    this.canvas.dataset.daytime=c.label;this.canvas.dataset.night=String(c.night);
  }
  private async loadTruck(){
    const result=await SceneLoader.ImportMeshAsync(null,'/models/','fh16-aero.glb',this.scene);
    this.truck=new TransformNode('player truck',this.scene);
    // Consolidate static geometry by material for laptop draw-call budgets. Keep configurable modules separate.
    const parts=result.meshes.filter((m):m is Mesh=>m instanceof Mesh&&m.getTotalVertices()>0);
    // Custom lathed/polyhedral parts and Blender primitives have different UV attributes.
    // Normalize only unused attributes, preserving the mapped cockpit/cloth UVs.
    for(const mesh of parts){
      if(!mesh.isVerticesDataPresent(VertexBuffer.UVKind))mesh.setVerticesData(VertexBuffer.UVKind,new Float32Array(mesh.getTotalVertices()*2));
      for(const kind of [VertexBuffer.UV2Kind,VertexBuffer.TangentKind,VertexBuffer.ColorKind])if(mesh.isVerticesDataPresent(kind))mesh.removeVerticesData(kind);
    }
    const rear=parts.filter(m=>m.name.startsWith('rear_axle_module'));
    for(const material of new Set(rear.map(m=>m.material))){const merged=Mesh.MergeMeshes(rear.filter(m=>m.material===material),true,true);if(merged){merged.name='rear_axle_module_'+material?.name;parts.push(merged);}}
    const remaining=parts.filter(m=>!m.isDisposed());
    const keep=remaining.filter(m=>/cab_roof|headliner_ceiling|overhead_|roof_extension|airflow_|mirror_|cms_|rear_axle_module|instrument_screen|navigation_screen|cockpit_temperature_lcd|steering_assembly/.test(m.name));
    const staticParts=remaining.filter(m=>!keep.includes(m));
    const mats=new Set(staticParts.map(m=>m.material));
    for(const mat of mats){const group=staticParts.filter(m=>m.material===mat);const merged=Mesh.MergeMeshes(group,true,true);if(merged){merged.name='truck '+mat?.name;merged.bakeTransformIntoVertices(Matrix.RotationY(Math.PI));merged.parent=this.truck;this.shadow.addShadowCaster(merged);}}
    for(const m of keep){m.makeGeometryUnique();m.bakeTransformIntoVertices(m.computeWorldMatrix(true).multiply(Matrix.RotationY(Math.PI)));m.parent=this.truck;m.position.setAll(0);m.rotation.setAll(0);m.rotationQuaternion=null;m.scaling.setAll(1);this.shadow.addShadowCaster(m);}
    result.meshes[0].dispose(false,false);
    for(const m of this.truck.getChildMeshes())if(m instanceof Mesh){m.receiveShadows=true;const positions=m.getVerticesData(VertexBuffer.PositionKind);if(positions)this.originals.set(m,new Float32Array(positions));}
    for(const m of this.truck.getChildMeshes())if(m.name.startsWith('steering_assembly'))m.setPivotPoint(new Vector3(-.66,2.52,1.68));
    this.paint=this.scene.getMaterialByName('body_paint') as PBRMaterial;
    const glazing=this.scene.getMaterialByName('glass') as PBRMaterial;if(glazing)glazing.albedoColor=new Color3(.022,.035,.048);
    const liner=this.scene.getMaterialByName('headliner') as PBRMaterial;if(liner)liner.albedoColor=new Color3(.22,.23,.22);
    for(let i=0;i<2;i++){
      const clone=this.truck.clone('opponent '+i,null,false)!;
      const clonePaint=this.paint.clone('opponent paint '+i)!;clonePaint.albedoColor=Color3.FromHexString(i?'#be8e47':'#a9b5af');
      for(const m of clone.getChildMeshes())if(m.material===this.paint)m.material=clonePaint;
      clone.setEnabled(false);this.opponents.push(clone);const trailer=buildTrailer(this.scene,i);this.opponentTrailers.push(trailer.root);this.nightMaterials.push(...trailer.nightMaterials);
    }
    for(const [i,vehicle] of [this.truck,...this.opponents].entries()){
      for(const side of (i===0?[-.92,.92]:[0])){const light=new SpotLight('automatic headlights '+i+' '+side,new Vector3(side,1.05,3.15),new Vector3(0,-.085,1),.82,2,this.scene);light.parent=vehicle;light.diffuse=new Color3(.88,.94,1);light.range=115;light.intensity=0;this.headlights.push(light);}
    }
    for(const [name,color] of [['headlamp_optic',new Color3(.75,.87,1)],['running_light',new Color3(.9,.96,1)],['lamp_lens',new Color3(.7,.85,1)],['tail_red',new Color3(1,.015,.005)]] as const){const material=this.scene.getMaterialByName(name) as PBRMaterial;if(material)this.nightMaterials.push({material,color});}
    this.createDisplays();
  }
  private screenMaterial(name:string,texture:Texture){const mat=new StandardMaterial(name,this.scene);mat.diffuseTexture=texture;mat.emissiveColor=Color3.White();mat.disableLighting=true;mat.specularColor=Color3.Black();return mat;}
  private createDisplays(){
    this.instruments=new DynamicTexture('12 inch driver display',{width:1024,height:400},this.scene,false);this.navigation=new DynamicTexture('9 inch route display',{width:1024,height:640},this.scene,false);
    const instruments=this.screenMaterial('digital instruments',this.instruments),navigation=this.screenMaterial('navigation display',this.navigation);
    const climateTexture=new DynamicTexture('climate temperature',{width:256,height:80},this.scene,false);
    const climateContext=climateTexture.getContext() as CanvasRenderingContext2D;
    climateContext.fillStyle='#151b15';climateContext.fillRect(0,0,256,80);
    climateContext.fillStyle='#b9bf78';climateContext.font='42px monospace';climateContext.textAlign='center';climateContext.fillText('19.0°',128,55);climateTexture.update(false);
    const climate=this.screenMaterial('climate LCD',climateTexture);
    for(const m of this.truck.getChildMeshes()){
      if(m.name.startsWith('instrument_screen'))m.material=instruments;
      if(m.name.startsWith('navigation_screen'))m.material=navigation;
      if(m instanceof Mesh&&m.name.startsWith('cockpit_temperature_lcd')){
        const positions=m.getVerticesData(VertexBuffer.PositionKind)!;const uv=new Float32Array(positions.length/3*2);
        for(let i=0;i<positions.length;i+=3){uv[i/3*2]=(positions[i]+.051)/.141;uv[i/3*2+1]=1-(positions[i+1]-2.121)/.042;}
        m.setVerticesData(VertexBuffer.UVKind,uv);m.material=climate;
      }
    }
    const surfaces=this.truck.getChildMeshes().filter((m):m is Mesh=>m instanceof Mesh&&/^(cms_screen|mirror_glass)/.test(m.name));
    for(const side of [-1,1]){
      const camera=new FreeCamera('rear view '+side,Vector3.Zero(),this.scene);camera.minZ=.1;camera.maxZ=800;camera.fov=.86;
      const texture=new RenderTargetTexture('mirror feed '+side,{width:256,height:512},this.scene,false);texture.activeCamera=camera;texture.refreshRate=4;
      // Sky and terrain must both be in the feed, including during the accelerated night cycle.
      texture.renderList=[...(this.skybox?[this.skybox]:[]),...this.motorway.getChildMeshes(),...[...this.opponents,...this.opponentTrailers].flatMap(o=>o.getChildMeshes())];
      orientMirrorFeed(texture);
      const material=this.screenMaterial('rear view surface '+side,texture);
      for(const surface of surfaces){
        const positions=surface.getVerticesData(VertexBuffer.PositionKind)!;
        const centreX=surface.getBoundingInfo().boundingBox.center.x;
        if((centreX<0?-1:1)!==side)continue;
        if(surface.name.startsWith('mirror_glass')){surface.setVerticesData(VertexBuffer.UVKind,mirrorSurfaceUV(positions));this.opticalMirrors.push({mesh:surface,original:surface.material,feed:material});}
        surface.material=material;
      }
      this.scene.customRenderTargets.push(texture);this.mirrors.push({camera,texture,side});
    }
    this.drawDisplays(0,0,0);
  }
  setRoute(origin:string,destination:string){this.origin=origin;this.destination=destination;this.drawDisplays(0,0,0);}
  previewInterior(enabled:boolean){
    if(this.mode!=='garage')return;this.interiorMode=enabled;document.body.dataset.view=enabled?'interior':'exterior';
    const glass=this.scene.getMaterialByName('glass') as PBRMaterial;if(glass)glass.alpha=enabled?.06:.70;
    this.scene.imageProcessingConfiguration.contrast=enabled?1.12:1;
    if(enabled){this.orbit.detachControl();this.cockpit.position.set(.02,3.08+Math.min(0,this.currentCab)*.7+this.chassisDrop,.43);this.cockpit.fov=this.inspectionFov();this.cockpit.rotation.set(.38,.01,0);this.scene.activeCamera=this.cockpit;this.cockpit.attachControl(this.canvas,true);this.cockpit.inputs.removeByType('FreeCameraKeyboardMoveInput');}
    else{this.cockpit.detachControl();this.scene.activeCamera=this.orbit;this.orbit.attachControl(this.canvas,true);}
  }
  private drawDisplays(speed:number,elapsed:number,progress:number){
    if(!this.instruments||!this.navigation)return;
    const ctx=this.instruments.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle='#090f15';ctx.fillRect(0,0,1024,400);ctx.textAlign='center';ctx.fillStyle='#c7d6da';ctx.font='18px Arial';ctx.fillText('VOLVO FH16',140,35);ctx.fillText('I-SHIFT',885,35);
    const gauge=(x:number,label:string,value:string,units:string,color:string)=>{ctx.strokeStyle='#263741';ctx.lineWidth=8;ctx.beginPath();ctx.arc(x,200,123,Math.PI*.73,Math.PI*2.27);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,200,123,Math.PI*.73,Math.PI*(1+Math.min(1,speed/33)));ctx.stroke();ctx.fillStyle='#e2eaeb';ctx.font=x===512?'bold 90px Arial':'bold 48px Arial';ctx.fillText(value,x,220);ctx.fillStyle='#91a7b1';ctx.font='19px Arial';ctx.fillText(units,x,255);ctx.font='14px Arial';ctx.fillText(label,x,295);};
    gauge(185,'MOTOR',(800+Math.round(speed%6*135)).toString(),'r/min','#b9dce4');gauge(512,'HASTIGHED',Math.round(speed*3.6).toString(),'km/h','#bed8d9');gauge(840,'I-SHIFT',Math.min(12,Math.max(1,Math.ceil(speed/3))).toString(),'D','#cfc48b');
    ctx.strokeStyle='#29363c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(35,345);ctx.lineTo(989,345);ctx.stroke();ctx.fillStyle='#a6bcc4';ctx.font='17px Arial';ctx.fillText(this.destination,190,377);ctx.fillText('DIESEL  ▰▰▰▰▱',512,377);ctx.fillText(`${Math.floor(elapsed/60)}:${Math.floor(elapsed%60).toString().padStart(2,'0')}`,840,377);this.instruments.update(false);
    const nav=this.navigation.getContext() as CanvasRenderingContext2D;nav.fillStyle='#10191e';nav.fillRect(0,0,1024,640);nav.fillStyle='#d7e1e5';nav.textAlign='left';nav.font='34px Arial';nav.fillText(`${this.origin} → ${this.destination}`,55,70);nav.fillStyle='#6e8791';nav.font='21px Arial';nav.fillText('NORDIC HAUL / TRANSPORT',55,109);
    nav.strokeStyle='#26363b';nav.lineWidth=28;nav.beginPath();nav.moveTo(120,480);nav.bezierCurveTo(600,430,350,200,830,220);nav.stroke();nav.strokeStyle='#a5c9d2';nav.lineWidth=9;nav.stroke();nav.fillStyle='#cbb77b';nav.beginPath();nav.arc(120+progress*710,480-progress*260,14,0,Math.PI*2);nav.fill();nav.fillStyle='#d8e4e6';nav.font='bold 45px Arial';nav.fillText(`${Math.round(progress*100)} %`,675,515);nav.strokeStyle='#3b4c52';nav.lineWidth=1;nav.beginPath();nav.moveTo(40,564);nav.lineTo(984,564);nav.stroke();nav.font='22px Arial';nav.fillStyle='#7f959e';for(let i=0;i<4;i++)nav.fillText(['NAV','MEDIA','TRUCK','SETTINGS'][i],60+i*240,608);this.navigation.update(false);
  }
  configure(c:TruckConfig){
    if(this.paint){this.paint.albedoColor=Color3.FromHexString(FINISHES.find(x=>x.id===c.color)!.hex).toLinearSpace();this.paint.environmentIntensity=.8;this.paint.metallic=.55;this.paint.roughness=.26;}
    const roof=cabFor(c).roof;this.currentCab=roof;this.cms=c.cms;this.chassisDrop=c.axle==='4x2'?-.1:0;
    for(const mesh of this.truck.getChildMeshes()){
      if(mesh instanceof Mesh&&!mesh.name.startsWith('roof_extension')){
        const original=this.originals.get(mesh);if(original){const vertices=new Float32Array(original);for(let i=0;i<vertices.length;i+=3){if(mesh.name.startsWith('cab_roof_'))vertices[i+1]=3.48+Math.min(0,roof)*(3.48-2.35)/(3.7-2.35)+(vertices[i+1]-3.48)*Math.max(.10,(.28+roof)/.787);else if(/headliner_ceiling|overhead_/.test(mesh.name))vertices[i+1]+=roof<0?roof*1.85:roof;else if(roof<0&&vertices[i+1]>2.35)vertices[i+1]+=(vertices[i+1]-2.35)/(3.7-2.35)*roof;if(c.cab==='FH16AXHE'&&vertices[i+2]<.8&&vertices[i+1]>1.65)vertices[i+2]-=.25;if(c.axle==='4x2'){if(vertices[i+2]<-2.5)vertices[i+2]=-2.5+(vertices[i+2]+2.5)*.30;if(vertices[i+1]>1.3)vertices[i+1]-=.1;}}mesh.setVerticesData(VertexBuffer.PositionKind,vertices,true);mesh.refreshBoundingInfo();}
      }
      if(mesh.name.startsWith('airflow_'))mesh.setEnabled(false);
      if(mesh.name.startsWith('mirror_'))mesh.setEnabled(!c.cms);
      if(mesh.name.startsWith('cms_'))mesh.setEnabled(c.cms);
      if(mesh.name.startsWith('rear_axle_module'))mesh.setEnabled(c.axle==='6x4');
      if(mesh.name.startsWith('roof_extension')){mesh.setEnabled(cabFor(c).roof>0);mesh.scaling.y=Math.max(.01,cabFor(c).roof/.58);mesh.position.y=3.70*(1-mesh.scaling.y)+this.chassisDrop;}
    }
    const cloth=this.scene.getMaterialByName('cloth') as PBRMaterial;if(cloth)cloth.albedoColor=Color3.FromHexString(c.blackEdition?'#181c20':'#655b4b').toLinearSpace();
    const trim=this.scene.getMaterialByName('trim') as PBRMaterial;if(trim)trim.albedoColor=Color3.FromHexString(c.blackEdition?'#131820':'#293036').toLinearSpace();
  }
  setMode(mode:'garage'|'race'){
    for(const mirror of this.opticalMirrors)mirror.mesh.material=mode==='race'?mirror.feed:mirror.original;
    this.mode=mode;this.garage.setEnabled(mode==='garage');this.motorway.setEnabled(mode==='race');[...this.opponents,...this.opponentTrailers].forEach(x=>x.setEnabled(mode==='race'));
    this.scene.imageProcessingConfiguration.contrast=1;
    this.scene.clearColor=mode==='garage'?new Color4(.035,.045,.06,1):new Color4(.68,.73,.74,1);
    this.scene.fogColor=mode==='garage'?new Color3(.07,.085,.105):new Color3(.68,.73,.74);
    const ambient=this.scene.getLightByName('soft ambient');if(ambient)ambient.intensity=mode==='garage'?.38:.58;
    this.shadow.getShadowMap()!.renderList=mode==='garage'?this.truck.getChildMeshes():[];
    this.interiorMode=false;document.body.dataset.view='exterior';this.cockpit.detachControl();this.skybox?.setEnabled(mode==='race');this.scene.environmentTexture=mode==='garage'?this.studio:this.outdoor;
    const glass=this.scene.getMaterialByName('glass') as PBRMaterial;if(glass){glass.alpha=mode==='garage'?.70:.06;glass.roughness=.04;glass.environmentIntensity=mode==='garage'?1:.25;}
    this.scene.customRenderTargets=mode==='race'?this.mirrors.map(m=>m.texture):[];
    if(mode==='garage'){this.scene.environmentIntensity=1;const sun=this.scene.getLightByName('northern light') as DirectionalLight;sun.direction.set(-.45,-1,-.4);sun.intensity=2.3;sun.diffuse=Color3.White();for(const l of [...this.headlights,...this.streetLights])l.intensity=0;for(const {material} of this.nightMaterials)material.emissiveColor.setAll(0);this.truck.position.setAll(0);this.truck.rotation.setAll(0);this.scene.activeCamera=this.orbit;this.orbit.attachControl(this.canvas,true);this.scene.fogDensity=.0006;}
    else{this.orbit.detachControl();this.scene.activeCamera=this.cockpit;this.scene.fogDensity=.0007;}
    this.layoutCamera();
  }
  updateRace(s:RaceSnapshot){
    this.truck.position.set(s.x,s.y,s.z);this.truck.rotation.set(s.pitch,s.yaw,0);this.updateDaylight(s.elapsed,s.x,s.z);
    for(let i=0;i<2;i++){this.opponents[i].position.set(s.ai[i].x,s.ai[i].y,s.ai[i].z);this.opponents[i].rotation.set(s.ai[i].pitch,s.ai[i].yaw,0);const t=s.ai[i].trailer;this.opponentTrailers[i].position.set(t.x,t.y,t.z);this.opponentTrailers[i].rotation.set(t.pitch,t.yaw,0);}
    const local=new Vector3(-.65,3.07+Math.min(0,this.currentCab)*.7+this.chassisDrop,.82),cos=Math.cos(s.yaw),sin=Math.sin(s.yaw);
    const pitchCos=Math.cos(s.pitch),pitchSin=Math.sin(s.pitch),forward=local.y*pitchSin+local.z*pitchCos;
    this.cockpit.position.set(s.x+local.x*cos+forward*sin,s.y+local.y*pitchCos-local.z*pitchSin,s.z-local.x*sin+forward*cos);
    const bob=Math.sin(s.elapsed*9)*Math.min(s.speed/1000,.018);
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.cockpit.position.y+=reducedMotion?0:bob;this.cockpit.rotation.set(.12+s.pitch,s.yaw,0);
    this.cockpit.fov=1.12+(reducedMotion?0:Math.min(s.speed/33.3,1)*.14);
    for(const m of this.truck.getChildMeshes())if(m.name.startsWith('steering_assembly'))m.rotationQuaternion=Quaternion.RotationAxis(new Vector3(0,-.60,.80),-s.steering*.75);
    for(const mirror of this.mirrors){const side=mirror.side;mirror.camera.position.set(s.x+side*1.44*cos+2.5*sin,s.y+3.3,s.z-side*1.44*sin+2.5*cos);mirror.camera.rotation.set(.08-s.pitch,s.yaw+Math.PI-side*.14,0);}
    this.displayTick+=1;if(this.displayTick%6===0)this.drawDisplays(s.speed,s.elapsed,s.progress);
  }
  start(callback:(dt:number)=>void){this.engine.runRenderLoop(()=>{const dt=Math.min(this.engine.getDeltaTime()/1000,.1);this.elapsed+=dt;callback(dt);this.scene.render();this.canvas.dataset.fps=Math.round(this.engine.getFps()).toString();if(this.elapsed>5&&!document.hidden)this.slowFrames=dt>.04?this.slowFrames+1:Math.max(0,this.slowFrames-2);if(this.slowFrames>180&&this.quality==='balanced'){this.quality='performance';this.engine.setHardwareScalingLevel(Math.max(1.2,window.devicePixelRatio/1.2));this.shadow.getShadowMap()!.resize(512);}});}
  private inspectionFov(){return Math.max(1.02,Math.min(1.5,2*Math.atan(Math.tan(.80)/(innerWidth/innerHeight))));}
  private layoutCamera(){
    if(!this.orbit)return;
    if(this.interiorMode)this.cockpit.fov=this.inspectionFov();
    this.orbit.viewport.x=0;this.orbit.viewport.width=innerWidth>=800&&this.mode==='garage'?.77:1;
    if(innerWidth<800){this.compactLayout=true;this.orbit.target.set(0,1.6,0);this.orbit.radius=15;this.orbit.viewport.y=this.mode==='garage'?.34:0;this.orbit.viewport.height=this.mode==='garage'?.66:1;}
    else{this.orbit.radius=Math.max(11,11/(innerWidth/innerHeight*.77));this.orbit.upperRadiusLimit=Math.max(19,this.orbit.radius+5);this.compactLayout=false;this.orbit.target.set(0,1.95,0);this.orbit.viewport.y=0;this.orbit.viewport.height=1;}
  }
}
