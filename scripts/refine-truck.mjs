/** Reference-led FH16 Aero mesh refinement. Metres; authoring axes: X across, Y forward, Z up.
 * Retains seats, mapped displays and tyres. Generates editable mesh surfaces for Blender refinement.
 * Source references: docs/reference/volvo-{front,side,rear-chassis,cockpit}.png.
 */
import fs from 'node:fs';
const input='blender/archive/fh16-aero-before-fidelity.glb';
const file=fs.readFileSync(input), jl=file.readUInt32LE(12), doc=JSON.parse(file.subarray(20,20+jl));
const binStart=20+jl+8, chunks=[file.subarray(binStart,binStart+file.readUInt32LE(20+jl))];
let byteLength=chunks[0].length;
const M=Object.fromEntries(doc.materials.map((m,i)=>[m.name,i]));
function material(name,color,metal=.0,rough=.5,extra={}){M[name]=doc.materials.length;doc.materials.push({name,doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[...color,1],metallicFactor:metal,roughnessFactor:rough},...extra});return name;}
material('chassis_powdercoat',[.024,.029,.033],.55,.43);
material('polished_alloy',[.64,.69,.73],.92,.21);
material('grille_satin',[.47,.51,.54],.83,.3);
material('window_frit',[.007,.011,.016],.15,.23);
material('copper_inlay',[.22,.064,.031],.28,.37);
material('tail_red',[.29,.008,.008],.15,.23,{emissiveFactor:[.18,.002,.001]});
material('marker_amber',[.85,.24,.025],.12,.25,{emissiveFactor:[.6,.14,.005]});
material('headlamp_optic',[.15,.20,.24],.75,.14);
doc.materials[M.body_paint].pbrMetallicRoughness.roughnessFactor=.24;
doc.materials[M.running_light].extensions.KHR_materials_emissive_strength.emissiveStrength=1.5;
const discard=/^(chassis_rail|crossmember|fuel_tank|tank_strap|airflow_|fifth_wheel|cab_floor$|cab_back|cab_lower_side|cab_rear_pillar|cab_a_pillar|side_window|window_frame|window_rubber|door_handle|door_recess_handle|door_latch|door_seam|cab_side_badge|cab_step|cab_front_lower|front_fascia|bumper|windshield|cab_roof|roof_extension|sun_visor|wiper|numberplate|upper_grille|lower_grille|volvo_diagonal|volvo_iron_mark|volvo_mark_back|iron_mark_arrow|headlight_|projector_|led_signature|indicator_lens|roof_antenna|rear_reflector|rear_tail_light|registration_plate|access_step|step_perforation|plate_characters)/;
const interiorDiscard=/^(dash_passenger_fascia|dash_glovebox|glovebox_|dash_lower_passenger|instrument_eyebrow|instrument_edge|console_switch|console_legend|switch_indicator|climate_|knob_pointer|vent_|dash_tray|tray_|cupholder_|cup_recess|centre_storage_|continuous_dash_top|sculpted_center_stack|steering_assembly$)/;
const wheelDiscard=/^(rear_axle_module_)?(rim_|hub_cap)/;
const removed=[]; for(let i=0;i<doc.nodes.length;i++)if([discard,interiorDiscard,wheelDiscard].some(p=>p.test(doc.nodes[i].name||'')))removed.push(i);
for(const scene of doc.scenes)scene.nodes=scene.nodes.filter(n=>!removed.includes(n));
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
function ring(name,mat,c,r,t,ax='Z',segments=64){const path=Array.from({length:segments+1},(_,i)=>{const a=i/segments*Math.PI*2;return ax==='X'?[c[0],c[1]+r*Math.cos(a),c[2]+r*Math.sin(a)]:ax==='Y'?[c[0]+r*Math.cos(a),c[1],c[2]+r*Math.sin(a)]:[c[0]+r*Math.cos(a),c[1]+r*Math.sin(a),c[2]];});line(name,mat,path,t,8);}
const front=(x,z)=>3.13-.235*(Math.abs(x)/1.25)**5-.040*(z-1.9)**2;
function frontPanel(name,mat,poly,d=.03,r=.025,offset=0){panel(name,mat,poly,([x,z],t)=>[x,front(x,z)+offset+t,z],d,r);}
const paint='body_paint',trim='trim',rubber='rubber',alloy='polished_alloy',steel='chassis_powdercoat';
// Continuous aerodynamic front, with real openings rather than intersecting box facades.
for(const [z0,z1] of [[1.45,1.60],[1.89,2.34]])patch('aero_front_skin',paint,64,10,(u,v)=>{const x=(u-.5)*2.49,z=z0+(z1-z0)*v;return[x,front(x,z),z]},true);
for(const side of [-1,1])patch('aero_front_skin',paint,12,12,(u,v)=>{const x=side*(.88+u*.365),z=1.59+.31*v;return[x,front(x,z),z]},side>0);
frontPanel('upper_grille_surround',trim,[[-.9,1.91],[.9,1.91],[.845,1.59],[-.845,1.59]],.05,.035,.012);
frontPanel('upper_grille_perforated_back', 'grille_satin',[[-.855,1.875],[.855,1.875],[.808,1.625],[.34,1.625],[.29,1.66],[-.29,1.66],[-.34,1.625],[-.808,1.625]],.018,.022,.045);
// Individual recessed perforations with dark throats and metallic lips.
for(let row=0;row<8;row++)for(let col=0;col<49;col++){const x=(col-24)*.033+(row%2)*.0165,z=1.656+row*.027;if(Math.abs(x)>.804||(z<1.69&&Math.abs(x)<.32))continue;cylinder('upper_grille_holes',rubber,[x,front(x,z)+.049,z],.0082,.005,'Y',8);}
frontPanel('intake_grip',rubber,[[-.32,1.65],[-.28,1.685],[.28,1.685],[.32,1.65]],.025,.02,.059);
frontPanel('volvo_header_plinth','grille_satin',[[-.91,2.24],[-.74,2.31],[.74,2.31],[.91,2.24]],.014,.012,.014);
// Lower central grille, stepped chrome rim, separate radiator core and slats.
frontPanel('lower_grille_outer',trim,[[-.91,1.465],[.91,1.465],[.69,.64],[-.69,.64]],.08,.065,.024);
frontPanel('lower_grille_metal_frame','grille_satin',[[-.86,1.44],[.86,1.44],[.66,.685],[-.66,.685]],.026,.045,.055);
frontPanel('lower_grille_radiator',rubber,[[-.72,1.37],[.72,1.37],[.55,.85],[-.55,.85]],.03,.019,.076);
for(let col=-18;col<=18;col++){const x=col*.037;line('radiator_vertical_fins','grille_satin',[[x,front(x,1.36)+.09,1.36],[x*.82,front(x*.82,.87)+.09,.87]],.0065,6);}
for(let row=0;row<9;row++){const z=.875+row*.058,w=.56+(z-.875)*.30;line('radiator_horizontal_fins','grille_satin',[[-w,front(-w,z)+.098,z],[0,front(0,z)+.098,z],[w,front(w,z)+.098,z]],.008,8);}
frontPanel('bumper_lower_intake',rubber,[[-.61,.82],[.61,.82],[.52,.69],[-.52,.69]],.022,.035,.09);
for(let i=-12;i<=12;i++)box('lower_intake_vanes',steel,[i*.041,front(i*.041,.76)+.105,.755],[.012,.02,.092],.004);
line('volvo_diagonal',alloy,[[-.66,front(-.66,.89)+.13,.89],[.66,front(.66,1.36)+.13,1.36]],.024,10);
cylinder('volvo_roundel_back',trim,[0,front(0,1.13)+.143,1.13],.13,.03,'Y',64);
ring('volvo_iron_mark',alloy,[0,front(0,1.13)+.17,1.13],.13,.014,'Y');
line('iron_mark_arrow',alloy,[[.087,3.308,1.223],[.171,3.308,1.30],[.131,3.308,1.301]],.009);
line('iron_mark_arrow',alloy,[[.171,3.308,1.30],[.171,3.308,1.26]],.009);
// Shaped bumper corners and inset optical headlamp assemblies.
for(const side of [-1,1]){
 const poly=p=>p.map(([x,z])=>[x*side,z]);
 frontPanel('bumper_corner',paint,poly([[.84,1.47],[1.235,1.60],[1.26,.47],[.76,.43],[.67,.62]]),.14,.06,.0);
 frontPanel('headlight_recess',rubber,poly([[1.15,1.43],[1.22,1.44],[1.21,.81],[.87,.70],[.87,.84]]),.026,.028,.045);
 frontPanel('headlight_lens','headlamp_optic',poly([[1.13,1.38],[1.18,1.40],[1.175,.85],[.91,.76],[.93,.88]]),.014,.020,.07);
 const sig=[[side*1.13,1.385],[side*.916,.795],[side*1.174,.872]].map(([x,z])=>[x,front(x,z)+.112,z]);line('led_signature','running_light',sig,.009,10);
 for(const [x,z] of [[1.145,1.19],[1.119,1.075],[1.012,.864],[1.09,.894]]){const xx=side*x,y=front(xx,z)+.091;cylinder('optical_projector',alloy,[xx,y,z],.038,.024,'Y',32);cylinder('optical_glass','lamp_lens',[xx,y+.017,z],.028,.009,'Y',32);}
 frontPanel('foglight_bezel',rubber,poly([[.9,.665],[1.20,.744],[1.20,.634],[.9,.555]]),.035,.025,.046);
 for(const x of [.97,1.10])cylinder('foglight', 'headlamp_optic',[side*x,front(side*x,.63)+.07,.63+(x-.97)*.27],.035,.024,'Y');
}
patch('lower_bumper_lip',trim,64,5,(u,v)=>{const x=(u-.5)*2.53,z=.37+v*.125;return[x,front(x,z)+.028,z]},true);
frontPanel('license_recess',rubber,[[-.36,.58],[.36,.58],[.33,.39],[-.33,.39]],.04,.025,.052);
frontPanel('registration_plate','grille_satin',[[-.26,.543],[.26,.543],[.26,.438],[-.26,.438]],.012,.008,.096);
// Bowed panoramic glass and ceramic borders. Rounded perimeter is shared with seals.
const windShape=roundedOutline([[-1.125,2.405],[1.125,2.405],[1.075,3.47],[-1.075,3.47]],.095,8);
const glassY=(x,z)=>2.949-(z-2.405)*.19-.102*(Math.abs(x)/1.13)**5;
const outerWind=roundedOutline([[-1.184,2.355],[1.184,2.355],[1.139,3.51],[-1.139,3.51]],.10,8);
// Border ring creates an actual window opening; the cockpit stays visible through it.
const wp=[...outerWind.map(([x,z])=>[x,glassY(x,z),z]),...windShape.map(([x,z])=>[x,glassY(x,z)+.004,z])],wf=[];
for(let i=0;i<windShape.length;i++)wf.push([i,(i+1)%windShape.length,(i+1)%windShape.length+windShape.length,i+windShape.length]);geo('windscreen_ceramic_surround','window_frit',wp,wf);
const wn=windShape.length,center=[0,2.875,2.91];const wv=[center,...windShape.map(([x,z])=>[x,glassY(x,z)+.003,z])],wfaces=[];for(let i=0;i<wn;i++)wfaces.push([0,1+(i+1)%wn,1+i]);geo('windshield','glass',wv,wfaces);
line('windshield_rubber_seal',rubber,[...outerWind,outerWind[0]].map(([x,z])=>[x,glassY(x,z)+.01,z]),.012,10);
line('windshield_cowl',trim,Array.from({length:49},(_,i)=>{const x=(i/48-.5)*2.37;return[x,glassY(x,2.37)+.022,2.37]}),.041,12);
for(const side of [-1,1]){line('a_pillar_painted',paint,[[side*1.20,2.813,2.36],[side*1.175,2.69,2.91],[side*1.14,2.605,3.52]],.052,12);const x=side*.57;line('wiper_arm',trim,[[x-.13,2.981,2.39],[x+.03,2.969,2.46],[x+.17,2.944,2.50]],.012,10);line('wiper_blade',rubber,[[x-.37,2.969,2.46],[x+.33,2.955,2.49]],.012,8);cylinder('wiper_spindle',steel,[x-.13,2.974,2.385],.027,.025,'Y');}
// Side skin wraps into the A-pillar and around the wheel arch.
for(const s of [-1,1]){
 const sideX=(y,z)=>s*(1.232-.052*Math.max(0,(z-2.6))-.045*Math.max(0,(y-2.35)/.5));
 const sidePanel=(name,mat,shape,offset=.0,d=.04,r=.035)=>panel(name,mat,shape,([y,z],t)=>[sideX(y,z)+s*(offset+t),y,z],d,r);
 sidePanel('cab_sleeper_side',paint,[[-.02,1.55],[.89,1.55],[.89,3.47],[.01,3.48]],0,.12,.07);
 sidePanel('door_lower_skin',paint,[[.90,1.66],[2.73,1.66],[2.80,2.39],[2.46,2.43],[1.06,2.61],[.90,2.58]],.0,.11,.03);
 // Separate fixed quarterlight and main drop glass with bowed outer surface.
 const windows=[[[.97,2.65],[1.32,2.60],[1.37,3.40],[1.04,3.43]],[[1.39,2.588],[2.68,2.41],[2.63,3.37],[1.445,3.409]]];
 for(let j=0;j<2;j++){const shape=roundedOutline(windows[j],.095,8);sidePanel('side_window_'+s+'_'+j,j===0?'lamp_lens':'glass',shape,.005,.010,0);line('side_window_seal',rubber,[...shape,shape[0]].map(([y,z])=>[sideX(y,z)+s*.016,y,z]),.023,10);}
 sidePanel('door_window_header',paint,[[.88,3.40],[2.67,3.365],[2.66,3.49],[.88,3.50]],0,.09,.04);
 sidePanel('door_b_pillar',trim,[[1.322,2.59],[1.397,2.58],[1.45,3.421],[1.37,3.433]],.02,.035,.012);
 // Curved wheel cutout rises into the lower cab instead of a gap beneath a slab.
 patch('front_fender_skin',paint,64,10,(u,v)=>{const y=.52+u*1.69,dy=y-1.35,bottom=Math.abs(dy)<.664?.54+Math.sqrt(.664**2-dy**2):.43;return[s*(1.238+.018*Math.sin(v*Math.PI)),y,bottom+(1.81-bottom)*v]},s<0);
 const arch=Array.from({length:65},(_,i)=>{const a=Math.PI*i/64;return[s*1.259,1.35+.673*Math.cos(a),.54+.673*Math.sin(a)]});line('wheel_arch_gasket',trim,arch,.025,10);
 line('fender_lower_rear',trim,[[s*1.259,.677,.54],[s*1.259,.59,.42]],.027,8);
 sidePanel('front_step_fairing',paint,[[2.13,.43],[2.74,.45],[2.79,1.67],[2.15,1.74]],0,.12,.06);
 sidePanel('step_well',rubber,[[2.19,.54],[2.58,.56],[2.64,1.41],[2.18,1.42]],.02,.06,.045);
 for(const [z,y,w] of [[.60,2.39,.39],[.94,2.41,.36],[1.28,2.43,.32]]){box('cab_step_tread','grille_satin',[s*1.258,y,z],[.20,w,.055],.02);for(let j=-3;j<=3;j++)box('tread_slot',rubber,[s*1.26,y+j*w/8,z+.028],[.10,.023,.003],.001);}
 const seam=[[-.01,1.82],[.865,1.82],[.88,3.45],[1.03,3.50],[2.67,3.49],[2.76,2.39],[2.73,1.66],[2.10,1.65]].map(([y,z])=>[sideX(y,z)+s*.013,y,z]);line('door_panel_gap',rubber,seam,.0055,6);
 line('door_beltline',trim,[[s*1.247,.94,1.85],[s*1.247,1.53,1.87],[s*1.234,2.64,2.05]],.008,6);
 sidePanel('door_handle_recess',rubber,[[1.06,2.12],[1.34,2.14],[1.34,2.23],[1.06,2.21]],.028,.024,.025);
 sidePanel('door_handle_metal',alloy,[[1.09,2.139],[1.29,2.151],[1.29,2.184],[1.09,2.172]],.052,.01,.007);
 // Full-height rear aero blades with a taper, return lip and panel break.
 for(const [z0,z1] of [[1.41,3.47],[3.487,4.17]])sidePanel(z0>3.48?'cab_roof_wing':'rear_aero_wing',paint,[[-.38,z0],[-.02,z0+.045],[.09,z1],[-.30,z1]],.003,.085,.025);
 line('rear_wing_return',trim,[[s*1.20,-.39,1.44],[s*1.20,-.40,3.40]],.025);
}
// Roof is one continuous loft with curved shoulders and a crowned top.
function roundRect(w,rear,front,r){return roundedOutline([[-w,rear],[w,rear],[w,front],[-w,front]],r,10);}
const levels=[[3.48,1.213,-.02,2.68,.20],[3.61,1.212,-.025,2.64,.21],[3.78,1.197,-.015,2.58,.235],[3.96,1.171,.018,2.47,.25],[4.13,1.12,.07,2.31,.26],[4.23,1.02,.15,2.10,.28],[4.267,.83,.31,1.92,.30]];
const rp=[],rf=[];for(const[z,w,rear,fr,r]of levels)rp.push(...roundRect(w,rear,fr,r).map(([x,y])=>[x,y,z]));const rn=rp.length/levels.length;for(let l=0;l<levels.length-1;l++)for(let i=0;i<rn;i++)rf.push([l*rn+i,l*rn+(i+1)%rn,(l+1)*rn+(i+1)%rn,(l+1)*rn+i]);rf.push([...Array(rn).keys()].map(i=>(levels.length-1)*rn+i));geo('cab_roof_shell',paint,rp,rf);
// Visor follows the roof front; its black panel has moulded ends and marker optics.
frontPanel('cab_roof_visor',trim,[[-1.11,3.49],[1.11,3.49],[1.075,3.79],[-1.075,3.79]],.10,.07,-.392);
frontPanel('cab_roof_fh16_nameplate','window_frit',[[-.72,3.555],[.72,3.555],[.68,3.736],[-.68,3.736]],.01,.03,-.38);
for(const s of [-1,1]){frontPanel('cab_roof_marker', 'headlamp_optic',[[s*.89,3.59],[s*1.005,3.59],[s*.984,3.731],[s*.88,3.731]],.016,.015,-.375);line('cab_roof_marker_led','running_light',[[s*.976,2.704,3.615],[s*.971,2.695,3.701]],.008);box('cab_roof_antenna_base',trim,[s*.80,1.87,4.23],[.095,.19,.065],.025);line('cab_roof_antenna',trim,[[s*.80,1.87,4.24],[s*.80,1.82,4.56]],.006,8);}
box('cab_roof_hatch_seal',rubber,[0,1.12,4.266],[1.28,1.12,.025],.15);box('cab_roof_hatch',paint,[0,1.12,4.280],[1.235,1.075,.018],.15);
for(const s of [-1,1]){const outline=roundedOutline([[.08,3.82],[.64,3.85],[.66,4.11],[.15,4.17]],.08,6);panel('cab_roof_air_intake',trim,outline,([y,z],d)=>[s*(1.168+d),y,z],.03,0);for(let j=0;j<16;j++){const y=.14+j*.028;line('cab_roof_intake_mesh',steel,[[s*1.18,y,3.86],[s*1.16,y,4.11]],.006,5);}}
// Stamped cab rear, horizontal embossing, pipe runs and access ladder.
panel('rear_cab_bulkhead',steel,[[-1.10,1.55],[1.10,1.55],[1.10,3.48],[-1.10,3.48]],([x,z],d)=>[x,-.058-d,z],.06,.035);
for(const z of [1.68,1.94,2.23,2.53,2.86,3.12,3.37]){panel('rear_bulkhead_pressed_rib',trim,[[-.70,z],[.70,z],[.76,z+.095],[.67,z+.15],[-.67,z+.15],[-.76,z+.095]],([x,z],d)=>[x,-.101-d,z],.02,.035);line('rear_bulkhead_rib_edge',steel,[[-.65,-.133,z+.135],[.65,-.133,z+.135]],.009);}
panel('rear_cab_pressing',trim,[[-.61,2.38],[.61,2.38],[.64,2.75],[-.64,2.75]],([x,z],d)=>[x,-.145-d,z],.035,.10);
for(const x of [-.9,.88])line('rear_vertical_loom',rubber,[[x,-.17,1.40],[x,-.19,2.08],[x,-.17,3.37]],.022,10);
for(const x of [.73,1.015])line('rear_access_ladder',steel,[[x,-.22,1.57],[x,-.23,3.38]],.019,10);
for(let j=0;j<7;j++)line('rear_ladder_rung',steel,[[.73,-.23,1.69+j*.247],[1.015,-.23,1.69+j*.247]],.014,10);
for(const x of [-.70,.7]){line('cab_suspension_support',steel,[[x,-.02,1.20],[x,-.23,1.32],[x,-.23,1.69]],.045,12);cylinder('cab_air_spring',rubber,[x,-.20,1.26],.075,.25,'Z');for(let k=0;k<8;k++)ring('cab_air_spring_rib',trim,[x,-.20,1.15+k*.026],.076,.007,'Z',24);}
// C-section rails, perforated mounting plates, chassis fasteners, torque rods.
for(const s of [-1,1]){const x=s*.465;box('chassis_web',steel,[x,-.73,.99],[.035,6.22,.28],.012);for(const z of [.862,1.119])box('chassis_flange',steel,[x-s*.045,-.73,z],[.12,6.22,.023],.006);for(let i=0;i<49;i++){const y=-3.68+i*.115;for(const z of [.92,1.065])cylinder('chassis_rivet',steel,[x+s*.025,y,z],.013,.012,'X',8);}for(const y of [-2.96,-1.53,-.57]){box('chassis_bracket',steel,[x+s*.028,y,.99],[.032,.35,.22],.01);for(const dy of [-.12,.12])for(const z of [.925,1.06])cylinder('chassis_bracket_bolt','grille_satin',[x+s*.05,y+dy,z],.016,.011,'X',6);}}
for(const y of [-3.55,-2.80,-1.18,-.32,.57,1.62]){box('frame_crossmember',steel,[0,y,1.01],[.90,.09,.16],.01);for(const x of [-.28,0,.28])cylinder('crossmember_aperture',rubber,[x,y-.047,1.01],.038,.008,'Y',16);}
for(const [i,y]of [[1,-1.85],[2,-3.22]]){const pref=i===2?'rear_axle_module_':'';cylinder(pref+'differential_casting',steel,[0,y,.58],.215,.37,'X',40);for(const s of [-1,1]){line(pref+'v_torque_link',steel,[[0,y-.35,.59],[s*.37,y+.32,.88]],.033,12);cylinder(pref+'air_bellow',rubber,[s*.43,y+.40,.75],.14,.29,'Z');for(let k=0;k<5;k++)ring(pref+'air_bellow_rib',trim,[s*.43,y+.40,.64+k*.042],.139,.013,'Z',24);line(pref+'damper',alloy,[[s*.59,y-.3,.55],[s*.54,y-.49,1.06]],.027,12);}for(const s of [-1,1])for(let k=0;k<4;k++){const x=s*(.65+k*.15);const path=Array.from({length:41},(_,j)=>{const a=(18+144*j/40)*Math.PI/180;return[x,y+Math.cos(a)*.617,.54+Math.sin(a)*.603]});line(pref+'mudguard_ridge',trim,path,.009,6);}}
line('propeller_shaft',steel,[[0,.17,.73],[0,-1.66,.59]],.062,20);line('interaxle_propeller_shaft',steel,[[0,-2.02,.58],[0,-3.02,.58]],.056,20);
// Brushed saddle tank, band straps, sender, filler cap and opposite equipment box.
cylinder('diesel_tank',alloy,[.91,-.58,.90],.32,1.31,'Y',80);
for(const y of [-1.19,.03]){ring('tank_end_roll', 'grille_satin',[.91,y,.90],.309,.015,'Y');cylinder('tank_end_dish','grille_satin',[.91,y,.90],.30,.014,'Y',64);}
for(const y of [-.99,-.18]){ring('fuel_tank_strap',steel,[.91,y,.90],.326,.022,'Y',64);box('tank_strap_anchor',steel,[.60,y,.83],[.09,.075,.49],.012);}
cylinder('diesel_filler',steel,[1.01,-.32,1.212],.047,.048,'Z');cylinder('diesel_cap',trim,[1.01,-.32,1.243],.050,.02,'Z');
box('battery_equipment_box',trim,[-.92,-.43,.84],[.62,1.04,.66],.07);box('battery_box_lid',steel,[-.92,-.43,1.18],[.66,1.08,.04],.04);
for(const y of [-.79,-.10])box('battery_box_latch',alloy,[-1.242,y,.89],[.014,.045,.16],.01);
box('adblue_housing',trim,[.84,.30,1.02],[.51,.36,.33],.06);cylinder('adblue_blue_cap','screen',[.91,.32,1.20],.042,.03,'Z');
// Perforated catwalk made of actual ribbed planks, open edges and patterned apertures.
for(let j=0;j<6;j++){const y=-.20-j*.082;box('catwalk_plank','grille_satin',[0,y,1.275],[.91,.061,.032],.012);for(let i=-9;i<=9;i++)box('catwalk_anti_slip',alloy,[i*.046,y,1.297],[.016,.047,.008],.003);}
for(const s of [-1,1])line('catwalk_edge',steel,[[s*.48,-.68,1.27],[s*.48,-.14,1.27]],.015);
// Coupling plate with a genuine tapered kingpin throat and pivot supports.
for(const x of [-.28,.28]){box('fifth_wheel_mount',steel,[x,-2.18,1.20],[.16,.91,.17],.03);cylinder('fifth_wheel_pivot',alloy,[x,-2.18,1.30],.058,.23,'X',24);}
const fifth=[[-.64,-2.44],[-.57,-2.00],[-.36,-1.81],[.36,-1.81],[.57,-2.00],[.64,-2.44],[.52,-2.69],[.14,-2.69],[.04,-2.25],[.065,-2.17],[.04,-2.10],[-.04,-2.10],[-.065,-2.17],[-.04,-2.25],[-.14,-2.69],[-.52,-2.69]];
panel('fifth_wheel_casting',steel,fifth,([x,y],d)=>[x,y,1.385+d],.09,.055);
line('fifth_wheel_outer_bead',trim,[...roundedOutline(fifth,.055,4),roundedOutline(fifth,.055,4)[0]].map(([x,y])=>[x,y,1.389]),.012,6);
for(const x of [-.37,.37])line('coupling_grease_channel',trim,[[x,-2.49,1.389],[x*.94,-2.22,1.389],[x*.60,-2.02,1.389]],.005,6);
line('fifth_wheel_release_handle',alloy,[[.35,-2.13,1.29],[.71,-2.04,1.29],[.81,-2.14,1.29]],.012,10);
for(const x of [-.83,.83]){box('rear_lamp_housing',trim,[x,-3.82,.83],[.49,.075,.20],.025);box('rear_tail_lens','tail_red',[x,-3.865,.83],[.30,.025,.13],.015);box('rear_indicator','marker_amber',[x+.17,-3.865,.83],[.075,.025,.13],.012);}
for(const s of [-1,1])for(const y of [-.57,-2.44]){box('side_marker_mount',steel,[s*1.22,y,.75],[.05,.13,.095],.015);box('side_marker','marker_amber',[s*1.251,y,.75],[.015,.10,.06],.012);}
// Reference cockpit: warm inlay, stitched rim, sculpted airbag and a wider realistic binnacle.
line('dashboard_copper_inlay','copper_inlay',[[-1.06,1.655,2.225],[-.86,1.613,2.224],[-.42,1.626,2.224],[-.24,1.643,2.224],[-.19,1.572,2.12],[-.16,1.537,1.927],[.24,1.537,1.923],[.42,1.606,1.98],[.94,1.62,1.985],[1.08,1.67,2.02]],.024,12);
line('passenger_cupholder_inlay','copper_inlay',[[.31,1.37,2.03],[.88,1.37,2.03],[.96,1.44,2.03]],.018,10);
for(let j=0;j<90;j++){const a=j/90*Math.PI*2, x=-.66+.226*Math.cos(a),zz=.226*Math.sin(a);line('steering_assembly_stitch','copper_inlay',[[x,1.44+zz*.454-.017,2.57+zz*.891],[x+.003,1.44+zz*.454-.019,2.57+zz*.891+.006]],.0013,4);}
// Dished alloy wheels: rolled rim, ventilation throats, stud seats and axle-specific hubs.
function latheX(name,mat,center,profile,side,n=80){const verts=[],faces=[];for(const[axial,r]of profile)for(let i=0;i<n;i++){const a=i/n*Math.PI*2;verts.push([center[0]+side*axial,center[1]+r*Math.cos(a),center[2]+r*Math.sin(a)]);}for(let j=0;j<profile.length-1;j++)for(let i=0;i<n;i++)faces.push([j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i]);geo(name,mat,verts,side>0?faces:faces.map(f=>f.toReversed()));}
for(const[axle,y]of [[0,1.35],[1,-1.85],[2,-3.22]])for(const s of [-1,1]){const pref=axle===2?'rear_axle_module_':'',cx=s*(axle===0?1.135:1.238),c=[cx,y,.540];latheX(pref+'alloy_rim',alloy,c,[[-.15,.292],[-.035,.304],[-.008,.303],[.005,.294],[.001,.282],[-.014,.273],[-.042,.248],[-.070,.216],[-.065,.162],[-.024,.124],[.005,.112],[.008,.080]],s);ring(pref+'rim_polished_lip',alloy,c,.298,.009,'X');
 for(let k=0;k<10;k++){const a=k/10*Math.PI*2,yy=y+Math.sin(a)*.211,zz=.54+Math.cos(a)*.211;cylinder(pref+'rim_vent_throat',rubber,[cx-s*.044,yy,zz],.031,.008,'X',28);ring(pref+'rim_vent_roll','grille_satin',[cx-s*.038,yy,zz],.031,.003,'X',28);const by=y+Math.sin(a)*.141,bz=.54+Math.cos(a)*.141;cylinder(pref+'wheel_stud_seat','grille_satin',[cx-s*.026,by,bz],.021,.013,'X',24);cylinder(pref+'wheel_nut',alloy,[cx-s*.01,by,bz],.014,.032,'X',6);cylinder(pref+'wheel_nut_cap',alloy,[cx+s*.008,by,bz],.009,.011,'X',16);}
 latheX(pref+'axle_hub',axle===1?steel:alloy,c,[[-.055,.10],[.015,.102],[.051,.087],[.060,.068],[.065,.045],[.064,.001]],s);ring(pref+'hub_seal',rubber,[cx+s*.049,y,.54],.084,.004,'X',48);
}
// Interior rebuilt around the supplied panorama: broad sloping stack, narrow switch modules,
// integrated passenger storage and a padded multifunction wheel.
const dp='dashboard_plastic',df='dashboard_fabric',sw='switch_plastic';
const stations=[[-1.13,1.57],[-1.02,1.59],[-.79,1.65],[-.48,1.70],[-.26,1.76],[-.08,1.78],[.2,1.73],[.46,1.69],[.82,1.70],[1.10,1.79],[1.14,1.86]],dv=[],dfaces=[];
for(const[x,y]of stations)dv.push([x,y+.07,2.455],[x,y+.025,2.448],[x,y,2.413],[x,y+.015,2.365],[x,2.53,2.365],[x,2.57,2.405],[x,2.54,2.465]);
for(let j=0;j<stations.length-1;j++)for(let k=0;k<7;k++)dfaces.push([j*7+k,j*7+(k+1)%7,(j+1)*7+(k+1)%7,(j+1)*7+k]);geo('continuous_dash_top',df,dv,dfaces);
const faceY=(x,z)=>1.435+(z-1.85)*.30+.045*x;
const interior=(name,mat,poly,depth=.035,r=.025,offset=0)=>panel(name,mat,poly,([x,z],d)=>[x,faceY(x,z)+offset-d,z],depth,r);
interior('sculpted_center_stack',dp,[[-.245,2.425],[.98,2.425],[1.08,2.30],[.99,1.87],[.84,1.78],[.05,1.79],[-.20,1.94]],.24,.09);
interior('console_control_insert',trim,[[-.19,2.365],[.87,2.365],[.87,1.963],[.14,1.902],[-.17,2.00]],.018,.03,-.018);
// Staggered stereo buttons directly below the navigation screen.
interior('stereo_bezel',sw,[[-.18,2.35],[.19,2.35],[.19,2.26],[-.18,2.26]],.02,.017,-.031);
for(let i=0;i<5;i++){const x=-.12+i*.061;interior('radio_key',dp,[[x-.023,2.28],[x+.023,2.28],[x+.023,2.313],[x-.023,2.313]],.006,.005,-.056);line('radio_key_legend','button_legend',[[x-.008,faceY(x,2.30)-.064,2.30],[x+.008,faceY(x,2.30)-.064,2.30]],.0015,4);}
cylinder('radio_knob',alloy,[-.147,faceY(-.147,2.327)-.057,2.327],.018,.021,'Y',32);
// Two physical climate dials and a small temperature strip, with recessed black faces.
interior('climate_control_panel',sw,[[-.17,2.225],[.18,2.225],[.18,2.00],[-.17,2.00]],.02,.02,-.035);
for(const x of [-.091,.103]){const z=2.084,y=faceY(x,z)-.066;cylinder('climate_dial',alloy,[x,y,z],.042,.021,'Y',48);cylinder('climate_dial_face',sw,[x,y-.013,z],.035,.010,'Y',48);ring('climate_dial_inner',trim,[x,y-.02,z],.028,.002,'Y',40);line('climate_pointer','button_legend',[[x,y-.025,z+.024],[x,y-.025,z+.030]],.0018,5);}
interior('climate_temperature_screen','screen',[[-.073,2.157],[.091,2.157],[.091,2.20],[-.073,2.20]],.009,.006,-.068);
for(const x of [-.147,.145])for(const z of [2.166,2.198])interior('climate_small_button',dp,[[x-.017,z-.011],[x+.017,z-.011],[x+.017,z+.011],[x-.017,z+.011]],.005,.003,-.067);
// Passenger vent and modular vehicle controls, each with inset icons rather than large text.
interior('passenger_vent_frame',alloy,[[.30,2.327],[.85,2.327],[.85,2.426],[.30,2.426]],.015,.014,-.019);
interior('passenger_vent_well',rubber,[[.312,2.335],[.838,2.335],[.838,2.419],[.312,2.419]],.018,.006,-.04);
for(let j=0;j<4;j++)line('passenger_vent_blade',trim,[[.32,faceY(.32,2.346+j*.020)-.056,2.346+j*.020],[.83,faceY(.83,2.346+j*.020)-.056,2.346+j*.020]],.0045,6);
for(const x of [.40,.74])box('vent_thumb_tab',alloy,[x,faceY(x,2.376)-.065,2.376],[.025,.016,.024],.005);
for(let row=0;row<3;row++)for(let col=0;col<6;col++){const x=.28+col*.097,z=2.262-row*.101;interior('vehicle_switch',sw,[[x-.035,z-.041],[x+.035,z-.041],[x+.035,z+.041],[x-.035,z+.041]],.012,.007,-.042);const y=faceY(x,z)-.057;line('switch_icon','button_legend',[[x-.010,y,z-.008],[x+.010,y,z-.008],[x+.010,y,z+.008],[x-.010,y,z+.008],[x-.010,y,z-.008]],.0015,4);if(row===0)box('switch_telltale','indicator_green',[x,y-.002,z+.024],[.010,.002,.002],.001);}
// Lower storage bins and passenger cupholder recesses with a moulded copper edge.
interior('lower_stack_storage',rubber,[[.01,1.915],[.68,1.873],[.65,1.72],[.05,1.73]],.075,.045,-.052);
interior('storage_lower_lip',dp,[[.03,1.743],[.66,1.725],[.65,1.69],[.05,1.70]],.06,.025,-.10);
box('cupholder_bridge',dp,[.92,1.42,2.13],[.41,.30,.12],.095);
for(const x of [.81,1.04]){cylinder('cupholder_well',rubber,[x,1.41,2.196],.091,.010,'Z',64);ring('cupholder_moulding',dp,[x,1.41,2.199],.094,.009,'Z',64);for(const a of [0,Math.PI])box('cupholder_rubber_finger',trim,[x+Math.cos(a)*.072,1.41,2.205],[.035,.060,.021],.009);}
line('cupholder_copper_edge','copper_inlay',[[.71,1.263,2.156],[1.10,1.263,2.156]],.012,10);
const tray=roundedOutline([[.36,1.93],[.95,1.93],[.95,2.31],[.36,2.31]],.13,10);panel('passenger_tray',dp,tray,([x,y],d)=>[x,y,2.492+d],.012,0);line('passenger_tray_rolled_edge',dp,[...tray,tray[0]].map(([x,y])=>[x,y,2.515]),.015,10);
// Driver instrument eyebrow follows the display with a softly crowned cover.
interior('driver_switch_bank',dp,[[-1.10,2.40],[-.95,2.40],[-.95,2.62],[-1.10,2.62]],.05,.03,.045);
for(let row=0;row<3;row++)interior('driver_switch',sw,[[-1.074,2.43+row*.055],[-1.010,2.43+row*.055],[-1.010,2.468+row*.055],[-1.074,2.468+row*.055]],.01,.006,.015);
panel('instrument_eyebrow',dp,[[-1.035,2.673],[-.98,2.744],[-.34,2.744],[-.275,2.673]],([x,z],d)=>[x,1.715-d,z],-.20,.035);
// Multifunction steering wheel; all parts share the steering_assembly prefix for game animation.
material('airbag_soft_touch',[.21,.23,.235],.03,.62);
const wheelpoint=(u,v,d=0)=>[-.66+u,1.44+v*.454-d*.891,2.57+v*.891+d*.454];
const wpath=Array.from({length:129},(_,i)=>{const a=i/128*Math.PI*2;let v=.25*Math.sin(a);if(v<-.204)v=-.204+(v+.204)*.47;return wheelpoint(.253*Math.cos(a),v);});line('steering_assembly_rim','steering_leather',wpath,.0205,16);
for(const s of [-1,1]){panel('steering_assembly_button_pod',sw,[[s*.10,-.017],[s*.213,-.012],[s*.21,.06],[s*.095,.067]],([u,v],d)=>wheelpoint(u,v,.006+d),.04,.016);for(let row=0;row<2;row++)for(let col=0;col<3;col++){const u=s*(.125+col*.030),v=.004+row*.031;panel('steering_assembly_switch',trim,[[u-.011,v-.010],[u+.011,v-.010],[u+.011,v+.010],[u-.011,v+.010]],([u,v],d)=>wheelpoint(u,v,.029+d),.006,.003);line('steering_assembly_legend','button_legend',[wheelpoint(u-.004,v,.036),wheelpoint(u+.004,v,.036)],.001,4);}}
panel('steering_assembly_lower_spoke',dp,[[-.085,-.045],[.085,-.045],[.10,-.181],[.058,-.211],[-.058,-.211],[-.10,-.181]],([u,v],d)=>wheelpoint(u,v,d),.045,.025);
panel('steering_assembly_lower_aperture',rubber,[[-.066,-.148],[.066,-.148],[.043,-.195],[-.043,-.195]],([u,v],d)=>wheelpoint(u,v,.026+d),.008,.012);
panel('steering_assembly_airbag','airbag_soft_touch',[[-.119,.09],[-.097,.115],[.099,.115],[.123,.09],[.097,-.114],[.075,-.129],[-.075,-.129],[-.097,-.11]],([u,v],d)=>wheelpoint(u,v,.059+d),.068,.033);
const logoPath=Array.from({length:65},(_,i)=>{const a=i/64*Math.PI*2;return wheelpoint(.026*Math.cos(a),.058+.026*Math.sin(a),.067)});line('steering_assembly_emblem',alloy,logoPath,.0032,8);
panel('steering_assembly_emblem_center',trim,Array.from({length:48},(_,i)=>[.024*Math.cos(i/48*Math.PI*2),.058+.024*Math.sin(i/48*Math.PI*2)]),([u,v],d)=>wheelpoint(u,v,.068+d),.004,0);
const originalWordmark=doc.nodes.find(n=>n.name==='front_volvo_wordmark');const steeringWord={...structuredClone(originalWordmark),name:'steering_assembly_wordmark',translation:axis(wheelpoint(0,.051,.073)),scale:[.37,.37,.37],rotation:[Math.sin(63*Math.PI/360),0,0,Math.cos(63*Math.PI/360)]};doc.nodes.push(steeringWord);doc.scenes[0].nodes.push(doc.nodes.length-1);

// Reposition original lettering to sit on the newly modelled surfaces.
for(const node of doc.nodes){
 if(node.name==='volvo_letters'){node.translation=[0,2.247,-3.157];node.scale=[1.04,1.04,1.04];}
 if(node.name==='front_volvo_wordmark'){node.translation=[0,1.112,-3.323];node.scale=[1.6,1.6,1.6];}
 if(node.name==='fh16_badge'){node.name='cab_roof_fh16_badge';node.translation=[0,3.586,-2.772];node.scale=[1.28,1.28,1.28];}
 if(node.name?.startsWith('instrument_screen'))node.scale=[.94,.94,.94];
 if(node.name?.startsWith('instrument_bezel'))node.scale=[.96,.96,.96];
 if(node.name?.startsWith('navigation_'))node.scale=[.94,.94,.94];
 if(/^headliner_ceiling|^overhead_/.test(node.name)){node.scale=[.90,1,.86];if(node.translation)node.translation[2]+=.13;}
 if(node.name?.startsWith('door_pull_handle'))node.scale=[1,.8,.8];
}
function accessor(array,type,componentType){let data=Buffer.from(array.buffer,array.byteOffset,array.byteLength);const pad=(4-byteLength%4)%4;if(pad){chunks.push(Buffer.alloc(pad));byteLength+=pad;}const view=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:data.length});chunks.push(data);byteLength+=data.length;const n=type==='VEC3'?3:type==='VEC2'?2:1,a={bufferView:view,componentType,count:array.length/n,type};if(type==='VEC3'){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++){const k=i%3;a.min[k]=Math.min(a.min[k],array[i]);a.max[k]=Math.max(a.max[k],array[i]);}}doc.accessors.push(a);return doc.accessors.length-1;}
let triangles=0;
for(const g of groups.values()){const attributes={POSITION:accessor(new Float32Array(g.p),'VEC3',5126),NORMAL:accessor(new Float32Array(g.n),'VEC3',5126),TEXCOORD_0:accessor(new Float32Array(g.uv),'VEC2',5126)},indices=accessor(new Uint32Array(g.idx),'SCALAR',5125);const mesh=doc.meshes.length;doc.meshes.push({name:g.name,primitives:[{attributes,indices,material:M[g.mat]}]});doc.nodes.push({name:g.name,mesh});doc.scenes[0].nodes.push(doc.nodes.length-1);triangles+=g.idx.length/3;}
doc.buffers=[{byteLength}];doc.asset.generator='Nordic Haul reference-led mesh refinement; editable in Blender';doc.asset.extras={referencePass:'2026-10-07',authoring:'Custom curved surfaces, real openings, retained original interior and wheels',referenceImages:['volvo-front.png','volvo-side.png','volvo-rear-chassis.png','volvo-cockpit.png']};
const json=Buffer.from(JSON.stringify(doc)),jp=Buffer.alloc((4-json.length%4)%4,32),bin=Buffer.concat(chunks),bp=Buffer.alloc((4-bin.length%4)%4),head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+json.length+jp.length+8+bin.length+bp.length,8);jh.writeUInt32LE(json.length+jp.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length+bp.length);bh.writeUInt32LE(0x004e4942,4);
// Intermediate only: the shipping model includes subsequent manual Blender edits.
fs.writeFileSync('blender/fh16-aero-generated.glb',Buffer.concat([head,jh,json,jp,bh,bin,bp]));
fs.writeFileSync('blender/fidelity-manifest.json',JSON.stringify({source:input,removedObjects:removed.length,newMeshGroups:groups.size,newTriangles:triangles,bytes:head.readUInt32LE(8),features:[...new Set([...groups.values()].map(g=>g.name))]},null,2));
console.log({removed:removed.length,groups:groups.size,triangles,megabytes:head.readUInt32LE(8)/1e6});
