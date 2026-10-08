/** Coherent cockpit assembly, metres: X across, Y forward, Z up.
 * Starts from the archived final exterior to preserve the Blender body refinements. */
import fs from 'node:fs';
import {Matrix,Quaternion,Vector3} from '@babylonjs/core/Maths/math.vector.js';
const file=fs.readFileSync('blender/archive/fh16-aero-before-cockpit-alignment.glb');
const jl=file.readUInt32LE(12),doc=JSON.parse(file.subarray(20,20+jl)),binary=file.subarray(28+jl);
const chunks=[binary];let byteLength=binary.length;
const M=Object.fromEntries(doc.materials.map((m,i)=>[m.name,i]));
const V=(a,b)=>a.map((x,i)=>x-b[i]), add=(a,b)=>a.map((x,i)=>x+b[i]), mul=(a,s)=>a.map(x=>x*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0), unit=a=>mul(a,1/(Math.hypot(...a)||1));
const lerp=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t), axis=p=>[p[0],p[2],-p[1]];
const groups=new Map();
function geo(name,mat,verts,faces,smooth=true){
 const key=name+'|'+mat;let g=groups.get(key);if(!g){g={name,mat,p:[],n:[],uv:[],idx:[]};groups.set(key,g);}
 if(!smooth){const vv=[],ff=[];for(const f of faces){ff.push(f.map(i=>{vv.push(verts[i]);return vv.length-1}));}verts=vv;faces=ff;}
 const ns=verts.map(()=>[0,0,0]);const tris=[];
 for(const f of faces)for(let j=1;j<f.length-1;j++){const t=[f[0],f[j],f[j+1]],n=cross(V(verts[t[1]],verts[t[0]]),V(verts[t[2]],verts[t[0]]));for(const i of t)ns[i]=add(ns[i],n);tris.push(t);}
 const off=g.p.length/3;verts.forEach((p,i)=>{g.p.push(...axis(p));g.n.push(...axis(unit(ns[i])));g.uv.push(p[0]*2,p[2]*2);});for(const t of tris)g.idx.push(...t.map(i=>i+off));
}
function patch(name,mat,nu,nv,fn,reverse=false){const p=[],f=[];for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++)p.push(fn(u/nu,v/nv));for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){const i=v*(nu+1)+u,q=[i,i+1,i+nu+2,i+nu+1];f.push(reverse?q.reverse():q);}geo(name,mat,p,f);}
function roundedOutline(poly,r=.08,steps=5){const out=[];for(let i=0;i<poly.length;i++){const a=poly[(i+poly.length-1)%poly.length],b=poly[i],c=poly[(i+1)%poly.length],q=lerp(b,a,Math.min(.4,r/Math.hypot(...V(a,b)))),s=lerp(b,c,Math.min(.4,r/Math.hypot(...V(c,b))));for(let k=0;k<=steps;k++){const t=k/steps;out.push(add(add(mul(q,(1-t)**2),mul(b,2*t*(1-t))),mul(s,t*t)));}}return out;}
function triangulate(poly){const ids=poly.map((_,i)=>i),out=[];let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];area+=a[0]*b[1]-b[0]*a[1];}if(area<0)ids.reverse();const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let guard=0;while(ids.length>3&&guard++<poly.length**2){let found=false;for(let j=0;j<ids.length;j++){const a=ids[(j+ids.length-1)%ids.length],b=ids[j],c=ids[(j+1)%ids.length];if(orient(poly[a],poly[b],poly[c])<1e-10)continue;if(ids.some(k=>k!==a&&k!==b&&k!==c&&orient(poly[a],poly[b],poly[k])>1e-8&&orient(poly[b],poly[c],poly[k])>1e-8&&orient(poly[c],poly[a],poly[k])>1e-8))continue;out.push([a,b,c]);ids.splice(j,1);found=true;break;}if(!found)break;}if(ids.length===3)out.push([...ids]);return out;}
function panel(name,mat,outline,map,depth=.025,round=.02){const p=round?roundedOutline(outline,round):outline;const front=p.map(q=>map(q,0)),back=p.map(q=>map(q,-depth));const ft=triangulate(p);geo(name,mat,front,ft,false);geo(name,mat,back,ft.map(f=>f.toReversed()),false);const sides=[];for(let i=0;i<p.length;i++)sides.push([i,(i+1)%p.length,(i+1)%p.length+p.length,i+p.length]);geo(name,mat,[...front,...back],sides);}
function line(name,mat,path,r=.01,n=10){const p=[],f=[];for(let i=0;i<path.length;i++){const tangent=unit(V(path[Math.min(i+1,path.length-1)],path[Math.max(0,i-1)]));const a=unit(cross(tangent,Math.abs(tangent[2])>.95?[0,1,0]:[0,0,1])),b=cross(tangent,a);for(let j=0;j<n;j++){const t=j/n*Math.PI*2;p.push(add(path[i],add(mul(a,Math.cos(t)*r),mul(b,Math.sin(t)*r))));}}for(let i=0;i<path.length-1;i++)for(let j=0;j<n;j++)f.push([i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j]);f.push([...Array(n).keys()].reverse(),[...Array(n).keys()].map(j=>(path.length-1)*n+j));geo(name,mat,p,f);}
function cylinder(name,mat,c,r,length,ax='Z',n=32){const d=ax==='X'?[1,0,0]:ax==='Y'?[0,1,0]:[0,0,1];line(name,mat,[add(c,mul(d,-length/2)),add(c,mul(d,length/2))],r,n);}
function box(name,mat,c,size,r=.01){const [x,y,z]=size.map(s=>s/2),rr=Math.min(r,x*.8,y*.8,z*.8),p=roundedOutline([[-x,-y],[x,-y],[x,y],[-x,y]],rr,4);panel(name,mat,p,(q,d)=>[c[0]+q[0],c[1]+q[1],c[2]+z+d],2*z,0);}
function ring(name,mat,c,r,t,ax='Z',segments=64){const path=Array.from({length:segments+1},(_,i)=>{const a=i/segments*Math.PI*2;return ax==='X'?[c[0],c[1]+r*Math.cos(a),c[2]+r*Math.sin(a)]:ax==='Y'?[c[0]+r*Math.cos(a),c[1],c[2]+r*Math.sin(a)]:[c[0]+r*Math.cos(a),c[1]+r*Math.sin(a),c[2]];});line(name,mat,path,t,8);}function accessor(array,type,componentType){let data=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const pad=(4-byteLength%4)%4;if(pad){chunks.push(Buffer.alloc(pad));byteLength+=pad;}const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:data.length});chunks.push(data);byteLength+=data.length;const n=type==='VEC3'?3:type==='VEC2'?2:1,a={bufferView:view,componentType,count:array.length/n,type};if(type==='VEC3'){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++){const k=i%3;a.min[k]=Math.min(a.min[k],array[i]);a.max[k]=Math.max(a.max[k],array[i]);}}doc.accessors.push(a);return doc.accessors.length-1;}

const dp='dashboard_plastic',sw='switch_plastic',rubber='rubber',metal='brushed_aluminium',legend='button_legend';
// Flat plates have explicit face normals; mouldings have physically rounded edge profiles.
function roundedBox(name,mat,center,size,r=.02){
 const half=size.map(v=>v/2),rr=Math.min(r,...half.map(v=>v*.8));
 for(let axisIndex=0;axisIndex<3;axisIndex++)for(const sign of [-1,1]){
  const a=(axisIndex+1)%3,b=(axisIndex+2)%3;
  const divisions=8;
  patch(name,mat,divisions,divisions,(u,v)=>{const p=[0,0,0];p[axisIndex]=sign*half[axisIndex];p[a]=(u*2-1)*half[a];p[b]=(v*2-1)*half[b];const core=p.map((x,k)=>Math.max(-half[k]+rr,Math.min(half[k]-rr,x)));return add(center,add(core,mul(unit(V(p,core)),rr)));},sign<0);
 }
}
function readAttribute(index){const a=doc.accessors[index],v=doc.bufferViews[a.bufferView],dim={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],width={5126:4,5125:4,5123:2,5121:1}[a.componentType],arr=[];for(let i=0;i<a.count;i++)for(let k=0;k<dim;k++){const off=(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||dim*width)+k*width;arr.push(a.componentType===5126?binary.readFloatLE(off):width===4?binary.readUInt32LE(off):width===2?binary.readUInt16LE(off):binary.readUInt8(off));}return arr;}
// Rebuild transformed meshes in world space so each assembly has one coherent datum.
function transformNode(node,transform){
 const m=Matrix.Compose(Vector3.FromArray(node.scale??[1,1,1]),Quaternion.FromArray(node.rotation??[0,0,0,1]),Vector3.FromArray(node.translation??[0,0,0]));
 const mesh=structuredClone(doc.meshes[node.mesh]);
 for(const primitive of mesh.primitives){
  const pos=readAttribute(primitive.attributes.POSITION),out=[];
  for(let i=0;i<pos.length;i+=3){const p=Vector3.TransformCoordinates(Vector3.FromArray(pos,i),m);out.push(...axis(transform([p.x,-p.z,p.y])));}
  const idx=readAttribute(primitive.indices),normals=out.map(()=>0);
  for(let i=0;i<idx.length;i+=3){const a=idx[i]*3,b=idx[i+1]*3,c=idx[i+2]*3,n=cross(V(out.slice(b,b+3),out.slice(a,a+3)),V(out.slice(c,c+3),out.slice(a,a+3)));for(const j of [a,b,c])for(let k=0;k<3;k++)normals[j+k]+=n[k];}
  for(let i=0;i<normals.length;i+=3){const n=unit(normals.slice(i,i+3));normals.splice(i,3,...n);}
  primitive.attributes.POSITION=accessor(new Float32Array(out),'VEC3',5126);primitive.attributes.NORMAL=accessor(new Float32Array(normals),'VEC3',5126);
 }
 node.mesh=doc.meshes.length;doc.meshes.push(mesh);delete node.translation;delete node.rotation;delete node.scale;delete node.matrix;
}
const discarded=/^(continuous_dash_top|sculpted_center_stack|instrument_(binnacle|bezel|screen|eyebrow)|navigation_(bezel|screen)|console_control|stereo_|radio_|climate_|passenger_(vent|tray|cupholder)|vent_thumb|vehicle_switch|switch_(icon|telltale)|lower_stack|storage_lower|cupholder_|dashboard_copper|driver_switch|steering_column|column_|door_(inner|armrest|pull|speaker)|a_pillar_liner|start_|engine_start_|stalk_handle|speaker_slit|pillar_grab_handle|cab_interior_floor|ignition|dash_)/;
const removed=[];
for(let i=0;i<doc.nodes.length;i++){
 const n=doc.nodes[i],name=n.name||'';
 if(discarded.test(name)||name==='steering_assembly_wordmark'){removed.push(i);continue;}
 if(name.startsWith('steering_assembly'))transformNode(n,p=>{
  const q=V(p,[-.66,1.44,2.57]);let u=q[0],v=q[1]*.454+q[2]*.891,d=-q[1]*.891+q[2]*.454;
  if(name==='steering_assembly_airbag')v=.012+(v-.012)*.79;
  return[-.66+u*.94,1.68+v*.60*.94-d*.80*.94,2.52+v*.80*.94+d*.60*.94];
 });
 if(/^cms_(monitor|screen)/.test(name))transformNode(n,p=>{const s=p[0]<0?-1:1;return[s*1.095+(p[0]-s*.99)*.86,2.29+(p[1]-2.10)*.86,3.02+(p[2]-3.01)*.86];});
}
for(const scene of doc.scenes)scene.nodes=scene.nodes.filter(n=>!removed.includes(n));
// More restrained, dark soft-touch materials. Preserve texture maps on the dashboard and seats.
for(const [name,rgb,rough]of [[dp,[.026,.030,.035],.70],[sw,[.014,.018,.021],.63],['airbag_soft_touch',[.095,.105,.11],.73],['headliner',[.27,.28,.27],.9],['steering_leather',[.013,.016,.019],.72],['dashboard_fabric',[.075,.083,.090],.87]]){
 const m=doc.materials[M[name]];m.pbrMetallicRoughness.baseColorFactor=[...rgb,1];m.pbrMetallicRoughness.roughnessFactor=rough;
}
// One continuous upper dashboard, softly bowed around the driver and centre stack.
const edgeStations=[[-1.16,1.91],[-.96,1.91],[-.67,1.96],[-.36,1.99],[-.17,1.84],[.09,1.78],[.37,1.81],[.69,1.91],[1.02,2.03],[1.16,2.10]];
function edgeY(x){let j=0;while(j<edgeStations.length-2&&x>edgeStations[j+1][0])j++;const a=edgeStations[j],b=edgeStations[j+1],t=Math.max(0,Math.min(1,(x-a[0])/(b[0]-a[0])));return a[1]+(b[1]-a[1])*(t*t*(3-2*t));}
patch('cockpit_dash_upper','dashboard_fabric',96,22,(u,v)=>{const x=-1.16+u*2.32,y=edgeY(x)+(2.79-.10*(Math.abs(x)/1.16)**4-edgeY(x))*v;return[x,y,2.40+.027*Math.sin(v*Math.PI)+.012*Math.cos(x*2)]});
patch('cockpit_dash_rolled_edge',dp,96,12,(u,v)=>{const x=-1.16+u*2.32,a=v*Math.PI/2;return[x,edgeY(x)-.025*Math.sin(a),2.402-.056*(1-Math.cos(a))]},true);
line('cockpit_dash_satin_seam',metal,Array.from({length:97},(_,i)=>{const x=-1.155+i*2.31/96;return[x,edgeY(x)-.025,2.343]}),.0038,8);
// Windshield base and demister grille join the dashboard to the actual curved glazing.
line('cockpit_demister_base',dp,Array.from({length:65},(_,i)=>{const x=-1.14+i*2.28/64;return[x,2.78-.11*(Math.abs(x)/1.14)**4,2.415]}),.027,10);
for(let i=-30;i<=30;i++){const x=i*.033;line('cockpit_demister_slot',rubber,[[x,2.692,2.433],[x,2.745,2.432]],.0025,6);}
// Instruments use a shallow recessed frame: the hood never crosses the display plane.
const cluster=(x,z,d=0)=>[x,2.006+(z-2.53)*.20+d,z];
const clusterPoly=[[-.99,2.40],[-.96,2.67],[-.36,2.67],[-.33,2.40]];
panel('cockpit_cluster_shell',dp,clusterPoly,([x,z],d)=>cluster(x,z,-d),.23,.035);
panel('cockpit_cluster_recess',rubber,[[-.952,2.418],[-.926,2.645],[-.395,2.645],[-.367,2.418]],([x,z],d)=>cluster(x,z,-.009-d),.015,.016);
line('cockpit_cluster_satin_border',metal,[[-.96,2.645],[-.946,2.422],[-.375,2.422],[-.36,2.645]].map(([x,z])=>cluster(x,z,-.018)),.004,8);
function display(name,c,w,h,yaw=0,tilt=.14){
 const map=(u,v)=>[c[0]+u*Math.cos(yaw),c[1]+u*Math.sin(yaw)+v*tilt,c[2]+v];
 const v=[map(-w/2,-h/2),map(w/2,-h/2),map(w/2,h/2),map(-w/2,h/2)];
 geo(name,'screen',v,[[0,1,2,3]],false);const g=groups.get(name+'|screen');g.uv=[0,1,1,1,1,0,0,0];
}
display('instrument_screen',[-.66,1.985,2.534],.544,.202,0,.20);
patch('cockpit_instrument_hood',dp,44,18,(u,v)=>{const x=-1.014+u*.708;return[x,1.986+v*.39,2.665+.031*Math.sin(u*Math.PI)-v*.165]});
line('cockpit_hood_front_edge',dp,Array.from({length:49},(_,i)=>[-1.014+i*.708/48,1.986,2.665+.031*Math.sin(i/48*Math.PI)]),.012,12);
// Central fascia curves toward the driver; every insert shares this surface function.
const faceY=(x,z)=>1.64+(z-1.90)*.34+.16*Math.max(0,x-.12);
function fascia(name,mat,poly,depth=.026,r=.016,offset=0){panel(name,mat,poly,([x,z],d)=>[x,faceY(x,z)+offset-d,z],depth,r);}
fascia('cockpit_center_shell',dp,[[-.23,2.386],[.28,2.397],[.89,2.36],[1.07,2.29],[1.04,1.89],[.86,1.80],[.0,1.80],[-.21,1.93]],.26,.065);
fascia('cockpit_center_insert',sw,[[-.185,2.324],[.22,2.336],[.89,2.299],[.96,2.257],[.929,1.95],[.12,1.918],[-.169,2.015]],.014,.027,-.019);
// Navigation monitor is mounted to the same centre stack, with a modest driver-facing yaw.
const navCenter=[.025,1.841,2.573],navYaw=.16;
const navMap=([u,v],d)=>[navCenter[0]+u*Math.cos(navYaw),navCenter[1]+u*Math.sin(navYaw)+v*.22-d,navCenter[2]+v];
panel('cockpit_navigation_housing',sw,[[-.197,-.145],[.197,-.145],[.197,.145],[-.197,.145]],navMap,.048,.018);
display('navigation_screen',[.025,1.833,2.581],.355,.238,navYaw,.22);
line('cockpit_navigation_sunshade',dp,[navMap([-.195,.151],.012),navMap([.195,.151],.012)],.012,10);
roundedBox('cockpit_navigation_mount',dp,[.025,1.934,2.405],[.12,.18,.07],.015);
// Stereo, climate module and useful small controls are aligned, with consistent gaps.
fascia('cockpit_radio_face',sw,[[-.167,2.299],[.211,2.299],[.211,2.227],[-.167,2.227]],.012,.008,-.042);
for(let i=0;i<5;i++){const x=-.068+i*.052,z=2.26;fascia('cockpit_radio_key',dp,[[x-.020,z-.014],[x+.020,z-.014],[x+.020,z+.014],[x-.020,z+.014]],.006,.004,-.060);line('cockpit_radio_legend',legend,[[x-.006,faceY(x,z)-.070,z],[x+.006,faceY(x,z)-.070,z]],.0012,4);}
cylinder('cockpit_radio_knob',metal,[-.127,faceY(-.127,2.264)-.074,2.264],.017,.020,'Y',40);
fascia('cockpit_climate_face',sw,[[-.16,2.201],[.21,2.201],[.21,1.965],[-.16,1.965]],.012,.018,-.040);
for(const x of [-.083,.13]){const z=2.036,y=faceY(x,z)-.07;cylinder('cockpit_climate_dial',dp,[x,y,z],.041,.027,'Y',64);ring('cockpit_climate_dial_ring',metal,[x,y-.015,z],.037,.0028,'Y',64);cylinder('cockpit_climate_dial_face',sw,[x,y-.018,z],.031,.009,'Y',64);line('cockpit_climate_pointer',legend,[[x,y-.024,z+.020],[x,y-.024,z+.027]],.0015,5);}
fascia('cockpit_temperature_lcd','screen',[[-.051,2.121],[.09,2.121],[.09,2.163],[-.051,2.163]],.005,.004,-.066);
for(const x of [-.124,.167])for(const z of [2.122,2.167])fascia('cockpit_climate_key',dp,[[x-.020,z-.014],[x+.020,z-.014],[x+.020,z+.014],[x-.020,z+.014]],.006,.003,-.062);
// Passenger vent and vehicle switch bank share the fascia slope rather than floating above it.
fascia('cockpit_center_vent_frame',metal,[[.282,2.293],[.881,2.27],[.881,2.363],[.282,2.383]],.012,.012,-.025);
fascia('cockpit_center_vent_well',rubber,[[.295,2.303],[.868,2.283],[.868,2.350],[.295,2.370]],.012,.006,-.04);
for(let i=0;i<4;i++){const z=2.309+i*.016;line('cockpit_center_vent_blade',dp,[[.303,faceY(.303,z)-.054,z+.019],[.858,faceY(.858,z)-.054,z]],.004,8);}
for(const x of [.43,.73])roundedBox('cockpit_vent_tab',metal,[x,faceY(x,2.329)-.062,2.329],[.02,.012,.021],.003);
for(let row=0;row<3;row++)for(let col=0;col<6;col++){
 const x=.322+col*.100,z=2.228-row*.096-.027*(x-.32),y=faceY(x,z)-.066;
 fascia('cockpit_switch',sw,[[x-.033,z-.036],[x+.033,z-.036],[x+.033,z+.036],[x-.033,z+.036]],.009,.006,-.048);
 const icon=row===0?[[x-.009,z],[x,z+.009],[x+.009,z],[x,z-.009],[x-.009,z]]:[[x-.008,z-.006],[x+.008,z-.006],[x+.008,z+.006],[x-.008,z+.006],[x-.008,z-.006]];
 line('cockpit_switch_icon',legend,icon.map(([x,z])=>[x,y,z]),.0012,4);
 if(col%2===0)line('cockpit_switch_indicator',legend,[[x-.005,y,z+.024],[x+.005,y,z+.024]],.001,4);
}
// An integrated storage/cupholder module; lips surround real recessed wells.
roundedBox('cockpit_passenger_storage_shell',dp,[.91,1.707,2.026],[.47,.35,.38],.06);
for(const z of [1.907,2.065]){fascia('cockpit_storage_recess',rubber,[[.714,z-.047],[1.066,z-.047],[1.07,z+.039],[.712,z+.039]],.016,.026,-.185);line('cockpit_storage_lip',dp,[[.735,1.50,z-.045],[1.043,1.54,z-.045]],.016,10);}
const cupOutline=roundedOutline([[.686,1.48],[1.108,1.54],[1.112,1.86],[.704,1.83]],.08,10);
panel('cockpit_cupholder_deck',dp,cupOutline,([x,y],d)=>[x,y,2.223+d],.06,0);
line('cockpit_cupholder_lip',dp,[...cupOutline,cupOutline[0]].map(([x,y])=>[x,y,2.246]),.012,12);
for(const x of [.793,1.007]){cylinder('cockpit_cup_well',rubber,[x,1.676,2.229],.079,.008,'Z',64);ring('cockpit_cup_rim',sw,[x,1.676,2.237],.078,.004,'Z');for(const y of [1.618,1.734])roundedBox('cockpit_cup_grip',dp,[x,y,2.246],[.040,.038,.037],.012);}
const tray=roundedOutline([[.34,2.05],[.99,2.12],[1.03,2.54],[.37,2.55]],.12,12);
panel('cockpit_passenger_tray',dp,tray,([x,y],d)=>[x,y,2.451+d],.015,0);
line('cockpit_tray_rim',dp,[...tray,tray[0]].map(([x,y])=>[x,y,2.464]),.012,12);
// Copper follows the joined lower fascia; it no longer passes through the steering column.
line('cockpit_copper_trim','copper_inlay',[[-1.10,1.935,2.206],[-.95,1.943,2.206],[-.39,1.973,2.206],[-.265,1.875,2.196],[-.20,1.668,1.914],[.20,1.597,1.87],[.61,1.653,1.889],[.684,1.665,1.928]],.012,12);
// Lower knee bolsters and floor close the open strips beside the old dashboard.
roundedBox('cockpit_driver_knee_panel',dp,[-.69,2.027,2.191],[.77,.15,.29],.052);
roundedBox('cockpit_floor',dp,[0,1.45,1.745],[2.30,2.63,.06],.02);
line('cockpit_column_core',dp,[[-.66,1.935,2.03],[-.66,1.733,2.446],[-.66,1.695,2.502]],.065,24);
roundedBox('cockpit_column_boot',rubber,[-.66,1.925,2.02],[.19,.23,.17],.048);
for(const s of [-1,1])line('cockpit_column_stalk',sw,[[-.66+s*.045,1.733,2.486],[-.66+s*.193,1.740,2.484]],.014,12);
cylinder('cockpit_start_ring',metal,[-.267,1.898,2.31],.029,.012,'Y',48);
cylinder('cockpit_start_button',sw,[-.267,1.889,2.31],.023,.008,'Y',48);
// Side liners align with the front glass perimeter and connect to the door cards.
for(const s of [-1,1]){
 line('cockpit_a_pillar_liner','headliner',[[s*1.133,2.716,2.385],[s*1.112,2.662,2.85],[s*1.071,2.553,3.477]],.038,16);
 line('cockpit_a_pillar_seal',rubber,[[s*1.092,2.73,2.392],[s*1.076,2.675,2.85],[s*1.038,2.56,3.461]],.007,8);
 const shape=[[.60,1.77],[2.63,1.77],[2.64,2.382],[1.38,2.564],[.60,2.59]];
 panel('cockpit_door_card',dp,shape,([y,z],d)=>[s*(1.166+d),y,z],.035,.035);
 line('cockpit_door_belt',sw,[[s*1.143,.68,2.58],[s*1.143,1.38,2.56],[s*1.143,2.61,2.376]],.020,12);
 roundedBox('cockpit_door_armrest',dp,[s*1.109,1.49,2.291],[.185,.79,.09],.035);
 roundedBox('cockpit_door_pull',metal,[s*1.086,1.24,2.323],[.065,.135,.020],.007);
 roundedBox('cockpit_door_switch_plate',sw,[s*1.087,1.73,2.343],[.092,.224,.018],.008);
 for(let j=0;j<4;j++)roundedBox('cockpit_door_switch',dp,[s*1.087,1.65+j*.052,2.356],[.069,.034,.012],.004);
 line('cms_monitor_support',dp,[[s*1.11,2.35,2.80],[s*1.12,2.39,3.25]],.014,10);
}
line('cockpit_windscreen_header','headliner',Array.from({length:49},(_,i)=>{const x=-1.067+i*2.134/48;return[x,2.55+.085*(1-(x/1.067)**2),3.476]}),.040,14);

let triangles=0;
for(const g of groups.values()){
 const attributes={POSITION:accessor(new Float32Array(g.p),'VEC3',5126),NORMAL:accessor(new Float32Array(g.n),'VEC3',5126),TEXCOORD_0:accessor(new Float32Array(g.uv),'VEC2',5126)},indices=accessor(new Uint32Array(g.idx),'SCALAR',5125);
 const mesh=doc.meshes.length;doc.meshes.push({name:g.name,primitives:[{attributes,indices,material:M[g.mat]}]});doc.nodes.push({name:g.name,mesh});doc.scenes[0].nodes.push(doc.nodes.length-1);triangles+=g.idx.length/3;
}
// Prune inactive nodes and unused meshes. Original exterior binary/image payloads are retained verbatim.
const active=new Set(doc.scenes.flatMap(s=>s.nodes));const map=new Map();const nodes=[];doc.nodes.forEach((n,i)=>{if(active.has(i)){map.set(i,nodes.length);nodes.push(n)}});doc.nodes=nodes;for(const s of doc.scenes)s.nodes=s.nodes.map(i=>map.get(i));
const usedMeshes=new Set(nodes.map(n=>n.mesh).filter(n=>n!==undefined));const meshMap=new Map(),meshes=[];doc.meshes.forEach((m,i)=>{if(usedMeshes.has(i)){meshMap.set(i,meshes.length);meshes.push(m)}});doc.meshes=meshes;for(const n of nodes)if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);
doc.buffers=[{byteLength}];doc.asset.generator='Nordic Haul coherent cockpit refinement, Blender editable';
const json=Buffer.from(JSON.stringify(doc)),jp=Buffer.alloc((4-json.length%4)%4,32),bin=Buffer.concat(chunks),bp=Buffer.alloc((4-bin.length%4)%4),head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+json.length+jp.length+8+bin.length+bp.length,8);jh.writeUInt32LE(json.length+jp.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length+bp.length);bh.writeUInt32LE(0x004e4942,4);
fs.writeFileSync('public/models/fh16-aero.glb',Buffer.concat([head,jh,json,jp,bh,bin,bp]));
console.log({replaced:removed.length,newGroups:groups.size,newTriangles:triangles,bytes:head.readUInt32LE(8)});
