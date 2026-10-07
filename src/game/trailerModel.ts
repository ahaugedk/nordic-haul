import { Color3,DynamicTexture,Mesh,MeshBuilder,PBRMaterial,Scene,TransformNode } from '@babylonjs/core';
import { TRAILER_LENGTH,TRAILER_WIDTH } from './trailer';
/** Generic dry-freight semi-trailer; original runtime geometry, not an OEM-branded product. */
export function buildTrailer(scene:Scene,index:number){
  const root=new TransformNode('rival semi-trailer '+index,scene),parts:Mesh[]=[];
  const material=(name:string,color:string,roughness=.7,metallic=0)=>{const m=new PBRMaterial('trailer '+index+' '+name,scene);m.albedoColor=Color3.FromHexString(color);m.roughness=roughness;m.metallic=metallic;return m;};
  const body=material('box',index?'#c09048':'#d7ddd9',.43),frame=material('chassis','#26313a',.65,.55),aluminium=material('rails and rims','#b7c0c5',.35,.75),rubber=material('rubber','#171d20',.92),door=material('rear doors',index?'#dac7a3':'#d1d9da',.45),red=material('tail lights','#c02519',.3),amber=material('side markers','#f3a530',.3),black=material('door seals','#20272b'),reflector=material('reflective safety tape','#ffd576',.36);
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:PBRMaterial)=>{const mesh=MeshBuilder.CreateBox('trailer '+name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=m;mesh.parent=root;mesh.receiveShadows=true;parts.push(mesh);return mesh;};
  box('freight box',0,2.71,0,TRAILER_WIDTH,2.58,TRAILER_LENGTH,body);
  box('roof cap',0,4.015,0,2.59,.06,13.64,aluminium);
  for(const x of [-1.29,1.29]){
    box('bottom side rail',x,1.42,0,.07,.13,13.62,aluminium);box('roof rail',x,3.98,0,.07,.06,13.62,aluminium);
    for(let z=-6.5;z<6.6;z+=1.65){box('panel joint',x,2.72,z,.009,2.42,.012,aluminium);box('side amber marker',x,1.55,z,.025,.06,.18,amber);}
    box('side underrun guard',x*.91,.78,-.6,.10,.13,4.8,aluminium);
    for(const z of [-2.4,1.2])box('underrun support',x*.91,1.08,z,.065,.6,.09,frame);
  }
  for(const x of [-.78,.78])box('longitudinal frame',x,1.2,0,.16,.28,13.1,frame);
  for(let z=-6.3;z<6.4;z+=1.2)box('crossmember',0,1.2,z,2.35,.12,.12,frame);
  box('kingpin',0,1.31,5.5,.13,.18,.13,frame);
  for(const x of [-.8,.8]){box('landing gear',x,.87,2.7,.13,.65,.15,frame);box('raised landing foot',x,.54,2.7,.42,.07,.36,aluminium);}
  for(const z of [-3.25,-4.55,-5.85]){
    box('axle',0,.51,z,2.20,.16,.16,frame);
    for(const side of [-1,1]){
      const tyre=MeshBuilder.CreateCylinder('trailer tyre',{diameter:1.04,height:.34,tessellation:24},scene);tyre.rotation.z=Math.PI/2;tyre.position.set(side*1.1,.52,z);tyre.material=rubber;tyre.parent=root;parts.push(tyre);
      const rim=MeshBuilder.CreateCylinder('trailer alloy rim',{diameter:.57,height:.35,tessellation:20},scene);rim.rotation.z=Math.PI/2;rim.position.copyFrom(tyre.position);rim.material=aluminium;rim.parent=root;parts.push(rim);
      const hub=MeshBuilder.CreateCylinder('trailer hub',{diameter:.22,height:.37,tessellation:16},scene);hub.rotation.z=Math.PI/2;hub.position.copyFrom(tyre.position);hub.material=frame;hub.parent=root;parts.push(hub);
      box('wheel mudguard',side*1.08,1.1,z,.4,.12,1.2,rubber);
    }
  }
  for(const x of [-1.06,1.06])box('rear mudflap',x,.39,-6.48,.38,.55,.035,rubber);
  box('rear door seals',0,2.69,-6.82,2.5,2.5,.05,black);
  for(const side of [-1,1]){
    box('rear door',side*.61,2.7,-6.86,1.18,2.44,.04,door);
    for(const x of [side*.28,side*.94]){box('locking bar',x,2.66,-6.905,.027,2.29,.03,aluminium);box('locking handle',x,1.91,-6.94,.18,.045,.04,aluminium);}
    for(const y of [1.65,2.7,3.7])box('door hinge',side*1.22,y,-6.91,.09,.13,.04,aluminium);
    box('tail lamp housing',side*.93,1.12,-6.91,.53,.19,.12,frame);box('red tail light',side*1.06,1.12,-6.985,.22,.11,.025,red);box('amber rear lamp',side*.79,1.12,-6.985,.13,.11,.025,amber);
  }
  box('rear underrun bumper',0,.48,-6.91,2.39,.15,.14,aluminium);
  for(const x of [-1.15,1.15])box('vertical reflective tape',x,2.68,-6.94,.035,2.38,.008,reflector);
  box('lower reflective tape',0,1.52,-6.94,2.35,.035,.008,reflector);
  const branding=new DynamicTexture('rival freight branding '+index,{width:1024,height:256},scene,false),ctx=branding.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle=index?'#c09048':'#d7ddd9';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#202c36';ctx.font='italic bold 105px Arial';ctx.fillText(index?'STORM FREIGHT':'NORDIC FREIGHT',44,132);ctx.font='26px Arial';ctx.fillText('HEAVY HAUL / EUROPEAN LOGISTICS',49,194);branding.update();
  const decal=material('side identity',index?'#c09048':'#d7ddd9',.6);decal.albedoTexture=branding;
  for(const side of [-1,1]){const panel=MeshBuilder.CreatePlane('trailer side brand',{width:7.4,height:1.85},scene);panel.position.set(side*1.281,2.84,.3);panel.rotation.y=side*Math.PI/2;panel.material=decal;panel.parent=root;}
  // Merge static components by material; retain only a few draw calls per articulated trailer.
  for(const m of new Set(parts.map(p=>p.material))){const merged=Mesh.MergeMeshes(parts.filter(p=>p.material===m),true,true);if(merged){merged.parent=root;merged.receiveShadows=true;}}
  root.setEnabled(false);
  return {root,nightMaterials:[{material:red,color:new Color3(1,.025,.006)},{material:amber,color:new Color3(1,.48,.025)}]};
}
