import './style.css';
import './racing.css';
import { AXLES,CABS,ENGINES,FINISHES,SOURCES,TENDERS,START_FUNDS,cabFor,engineFor,priceFor,type TruckConfig,type Tender } from './data/catalog';
import { buyConfiguration,loadCareer,saveCareer,settleRace,upgradeCost } from './game/career';
import { TruckScene } from './game/scene';
import { initPhysics,Simulation,type Controls,type RaceSnapshot } from './game/simulation';
import { EngineAudio } from './game/audio';
import { TRACK,TRACK_RX,TRACK_RZ } from './game/track';
import { dayCycle } from './game/dayCycle';
import { cityFor,tendersFrom,withLoad,type TravelTender } from './data/europe';
import { europeMap } from './game/europeMap';
import { DispatchAudio } from './game/dispatchAudio';

const app=document.querySelector<HTMLDivElement>('#app')!;
const canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
const money=(v:number)=>new Intl.NumberFormat('da-DK').format(v)+' kr.';
const clock=(v:number)=>`${Math.floor(v/60).toString().padStart(2,'0')}:${Math.floor(v%60).toString().padStart(2,'0')}`;
let career=loadCareer(),draft:TruckConfig={...career.truck};
let mode:'garage'|'tenders'|'race'|'results'='garage',section='motor';
let chosen:TravelTender=tendersFrom(career.currentCity)[0],sim:Simulation|undefined,view:TruckScene;
let result:{payout:number;bonus:number;place:number;time:number}|undefined;
let showSources=false,accumulator=0,hudTime=0;
let lastCountdownCue=-1;let lastRenderedMode:string|undefined;
const input:Controls={throttle:false,brake:false,left:false,right:false};
const audio=new EngineAudio();
const dispatchAudio=new DispatchAudio();
function syncAudioControls(){
  const menu=document.getElementById('menu-sound');if(menu){menu.textContent=`LYD ${dispatchAudio.enabled?'TIL':'FRA'}`;menu.setAttribute('aria-pressed',String(dispatchAudio.enabled));}
  const map=document.getElementById('map-sound');if(map){map.classList.toggle('on',dispatchAudio.enabled);map.setAttribute('aria-pressed',String(dispatchAudio.enabled));map.innerHTML=`<span class="audio-bars"><i></i><i></i><i></i><i></i></span>${dispatchAudio.enabled?'Musik og lyd til':'Aktivér musik og lyd'}`;}
}
app.innerHTML='<div class="loading"><span class="wordmark">NORDIC HAUL</span><h1>Klar til tung racing?</h1><p>Motorer klargøres. Din garage er på vej …</p><div class="load-line"></div></div>';

function header(){return `<header class="topbar"><a class="brand" href="#" aria-label="Til garagen"><span class="game-name">NORDIC <em>HAUL</em></span><span class="brand-divider"></span><span class="wordmark">V O L V O</span></a><nav aria-label="Spiltrin"><button data-nav="garage" class="${mode==='garage'?'active':''}">01 <span>Garage</span></button><button data-nav="tenders" class="${mode==='tenders'?'active':''}">02 <span>Kontrakter</span></button><span class="nav-race ${mode==='race'?'active':''}">03 <span>Kørsel</span></span></nav><div class="header-right"><button class="menu-sound" id="menu-sound" aria-label="Slå musik og menulyde til eller fra" aria-pressed="${dispatchAudio.enabled}">LYD ${dispatchAudio.enabled?'TIL':'FRA'}</button>${mode==='garage'?'':`<div class="balance"><span>DIT BUDGET</span><strong>${money(career.funds)}</strong></div>`}</div></header>`;}

function garage(){
  const e=engineFor(draft),delta=upgradeCost(career,draft),affordable=delta<=career.funds;
  const option=(title:string,detail:string,price:number,selected:boolean,attr:string)=>`<button class="option ${selected?'selected':''}" ${attr}><span class="option-name">${title}<i>${selected?'✓':'+'}</i></span><span class="option-detail">${detail}</span><span class="option-footer"><span>Estimat · ekskl. moms</span><b>${price?'+ '+money(price):'Basis'}</b></span></button>`;
  let options='';
  if(section==='motor')options=ENGINES.map(x=>option(x.name,`${x.torque.toLocaleString('da-DK')} Nm · ${x.kw} kW · 17,3 l`,x.price,draft.engine===x.id,`data-engine="${x.id}"`)).join('')+`<div class="subsection"><span class="label">GEARKASSE · ${e.gearbox}</span><div class="compact-options">${option('I-Shift','12 trin · automatisk',0,!draft.crawler,'data-crawler="false"')}${option('I-Shift Crawler Gears','Ekstra krybegear',18000,draft.crawler,'data-crawler="true"')}</div></div>`;
  if(section==='cab')options=CABS.map(x=>option(x.name,`${x.id} · ${x.height?x.height+" cm indvendig højde":"Udvidet sovekabine"}`,x.price,draft.cab===x.id,`data-cab="${x.id}"`)).join('');
  if(section==='chassis')options=AXLES.map(x=>option(x.name,`Trækker · ${x.mass.toLocaleString('da-DK')} kg anslået egenvægt`,x.price,draft.axle===x.id,`data-axle="${x.id}"`)).join('')+`<div class="fixed-spec"><span>VERIFICERET I BUILDEREN</span><strong>No sideskirt · Waterfall finish</strong><p>6×4 tilbyder kun “No sideskirt” i den viste builder. De øvrige akselvarianter er endnu ikke modelleret.</p></div>`;
  if(section==='equipment')options=`<span class="label">SPEJLE</span><div class="compact-options">${option('Mirrors','Traditionelle sidespejle',0,!draft.cms,'data-cms="false"')}${option('Camera Monitor System','Kamerahuse og skærme',28000,draft.cms,'data-cms="true"')}</div><span class="label">FORLYGTER</span><div class="compact-options">${option('LED-forlygte','Basislys',0,!draft.adaptiveLights,'data-lights="false"')}${option('LED · adaptivt fjernlys','Valg som i Volvo Builder',12000,draft.adaptiveLights,'data-lights="true"')}</div><div class="color-picker"><span class="label">METALLIC LAK · ESTIMAT + 8.000 KR.</span><div class="swatches">${FINISHES.map(c=>`<button aria-label="${c.id} ${c.name}" aria-pressed="${draft.color===c.id}" data-color="${c.id}" class="swatch ${draft.color===c.id?'selected':''}" style="--paint:${c.hex}"></button>`).join('')}</div><p>${FINISHES.find(c=>c.id===draft.color)!.id} ${FINISHES.find(c=>c.id===draft.color)!.name}</p></div>`;
  if(section==='interior')options=option('FH16','Builderens FH16-interiør',0,!draft.blackEdition,'data-interior="false"')+option('Black Edition','Mørk indvendig finish',18000,draft.blackEdition,'data-interior="true"')+`<p class="fixed-note">Interiørvalget ændrer kabinens materialer. Sædernes form er foreløbig en studiemodel.</p>`;
  return `<section class="garage-copy"><span class="eyebrow">PIT GARAGE / ${cityFor(career.currentCity).name.toUpperCase()}</span><h1>BYG DIN<br><em>VINDER.</em></h1><p>Din truck. Dit setup.<br>Næste sejr.</p><div class="garage-record"><span><strong>${career.wins}</strong> SEJRE</span><span><strong>${career.races}</strong> LØB</span></div></section><section class="truck-caption"><span class="eyebrow">DIN MASKINE</span><h2>Volvo FH16 Aero</h2><p>${cabFor(draft).name} <span> / </span> ${draft.axle.replace('x','×')}</p><div class="spec-strip"><div><strong>${e.hp}<small> hk</small></strong><span>MOTOREFFEKT</span></div><div><strong>${e.torque.toLocaleString('da-DK')}<small> Nm</small></strong><span>DREJNINGSMOMENT</span></div><div><strong>12<small> trin</small></strong><span>I-SHIFT</span></div></div></section><aside class="config-panel"><div class="panel-title"><div><span class="eyebrow">VOLVO FH16 AERO</span><h2>Dit setup</h2></div><span class="round-icon">↗</span></div><div class="tabs" role="tablist" aria-label="Konfigurationskategori">${[['motor','Drivlinje'],['cab','Kabine'],['chassis','Chassis'],['equipment','Udvendigt'],['interior','Interiør']].map(([id,label])=>`<button role="tab" aria-selected="${section===id}" data-section="${id}" class="${section===id?'active':''}">${label}</button>`).join('')}</div><div class="options">${options}</div><div class="configuration-bill"><div><span>Estimeret nypris · ekskl. moms</span><b>${money(priceFor(draft))}</b></div><div class="garage-budget"><span>Dit budget</span><strong>${money(career.funds)}</strong></div><div><span>${delta<0?'Tilbage ved ombygning':'Denne ombygning'}</span><strong>${delta<0?'+ ':''}${money(Math.abs(delta))}</strong></div></div>${!affordable?'<p class="budget-warning" role="status">Budgettet rækker ikke. Vælg en billigere konfiguration.</p>':''}<button class="primary" id="commit" ${!affordable?'disabled':''}>${delta?'Monter & videre':'Vælg dit løb'} <span>→</span></button><p class="panel-note">Prisgæt ca. ±20 % · Tilvalg ca. ±40 %<br>Ombygning afregnes som prisforskel i spillet.</p></aside><div class="viewer-controls"><button data-viewer="exterior">Udvendigt</button><button data-viewer="interior">Førerhus</button><button data-panel>${document.body.dataset.panel==='show'?'Skjul konfiguration':'Vis konfiguration'}</button></div><div class="viewer-hint"><span>↔</span> Træk for at se rundt · Scroll for at zoome</div>`;
}
function tenders(){return europeMap(career.currentCity,chosen,dispatchAudio.enabled,career.races);}
function race(){return `<div class="race-header"><span class="race-brand">NORDIC HAUL <small> / ${chosen.title}</small></span><div><button class="icon-button" id="sound" aria-label="Slå motorlyd til eller fra">Lyd ${audio.enabled?'til':'fra'}</button><button class="icon-button" id="pause">Pause</button></div></div><div class="speed-effects" aria-hidden="true"></div><section class="race-status"><div><span>PLACERING</span><strong id="place">1 <small>/ 3</small></strong></div><div><span>TID / BONUS ${clock(chosen.par)}</span><strong id="time">00:00</strong></div><div><span>RUTEN</span><strong id="progress">0 %</strong></div></section><div class="race-route" aria-hidden="true"><span id="route-fill"></span></div><div id="countdown" class="countdown">3</div><div id="offroad" class="offroad" hidden>Uden for vejen · R bringer dig tilbage</div><div class="driver-hud"><span>HASTIGHED</span><strong id="speed">0 <small>km/t</small></strong><div>${engineFor(career.truck).name} <span> / </span> ${chosen.tonnes} t last</div></div><div class="race-environment"><strong id="day-clock">DAG 1 · 08:00</strong><span id="hill-grade">STIGNING + 6,4 %</span><span id="night-lights">2,5 DØGN / MINUT</span></div><div class="rival-board"><span>RIVALER</span><strong><i class="rival-dot silver"></i> NORDIC / 600 HK</strong><strong><i class="rival-dot gold"></i> STORM / 700 HK</strong></div><div class="minimap"><svg viewBox="0 0 160 210" aria-label="Kort over motorvejsbanen"><path d="${TRACK.filter((_,i)=>i%8===0).map((p,i)=>`${i?'L':'M'}${(80+p.x/TRACK_RX*52).toFixed(1)},${(105+p.z/TRACK_RZ*87).toFixed(1)}`).join(' ')} Z"/><circle id="map-rival-0" class="rival-silver" r="3"/><circle id="map-rival-1" class="rival-gold" r="3"/><circle id="map-player" cx="132" cy="43" r="4"/></svg><span>AUTOBAHN / HILL RUN</span></div><div class="race-controls"><span><kbd>W</kbd> / <kbd>↑</kbd> Gas</span><span><kbd>S</kbd> / <kbd>↓</kbd> Bremse</span><span><kbd>A</kbd><kbd>D</kbd> Styr</span><span><kbd>R</kbd> Tilbage på vejen</span><span><kbd>Esc</kbd> Pause</span></div><div class="touch-controls"><button data-control="left" aria-label="Styr til venstre">←</button><button data-control="right" aria-label="Styr til højre">→</button><button data-control="brake">Bremse</button><button data-control="throttle">Gas</button></div><div id="pause-overlay"></div>`;}
function results(){return `<div class="tender-backdrop"></div><section class="result-panel"><span class="eyebrow">LØBET ER I HUS</span><span class="place-medal">0${result!.place}</span><h1>${result!.place===1?'SEJR!':'NY TUR. NY CHANCE.'}</h1><p>Ankommet til ${cityFor(career.currentCity).name} · ${clock(result!.time)} · ${result!.place}. plads af 3</p><div class="result-bill"><div><span>Betaling for løbet</span><strong>${money(result!.payout-result!.bonus)}</strong></div><div><span>Bonus for levering inden ${clock(chosen.par)}</span><strong>${money(result!.bonus)}</strong></div><div class="result-total"><span>Optjent</span><strong>${money(result!.payout)}</strong></div></div><button class="primary" id="return">Garagen i ${cityFor(career.currentCity).name} <span>→</span></button><button class="secondary" id="next-tender">Næste kontrakt fra ${cityFor(career.currentCity).name} →</button><p class="panel-note">Nu har du ${money(career.funds)} til næste ombygning.</p></section>`;}
function sources(){return `<div class="modal-shade" id="source-shade"><section class="source-dialog" role="dialog" aria-modal="true" aria-labelledby="source-title"><button class="close" id="close-sources" aria-label="Luk kilder">×</button><span class="eyebrow">OM PROTOTYPEN</span><h2 id="source-title">Offentlige kilder.<br>Egne 3D-modeller.</h2><p>Motorer, moment, førerhuse og optionskoder kommer fra Volvo Trucks' danske materiale. Vi har set en forskel mellem builderens motorliste og FH16 Aero-databladet; D17-specifikationerne bruges her.</p><p>Kombinationer af motor og gearkasse er valgt konservativt efter gearkassens momentkapacitet. Volvo skal validere det samlede katalog før en officiel version.</p><ul><li><a href="${SOURCES.builder}" target="_blank" rel="noopener">Volvo Truck Builder ↗</a></li><li><a href="${SOURCES.specification}" target="_blank" rel="noopener">Dansk FH16 6×4-datablad · februar 2025 ↗</a></li><li><a href="${SOURCES.overview}" target="_blank" rel="noopener">FH16 Aero · oversigt ↗</a></li></ul><p>3D-modellen er en forenklet, original Blender-studiemodel og cockpitfortolkning. Laknavne og koder følger builderen; farver på skærmen er tilnærmelser. Prisgæt gælder nye køretøjer ekskl. moms: ca. ±20 % samlet og ±40 % for tilvalg. Ingen officielle Volvo-tilbud. Transportløb, præmier og ombygningsafregning er spilmekanik. CMS viser kamerafeeds under kørslen. Automatiske natforlygter er aktive. Rivalerne kører med generiske sættevogne. Volvos adaptive fjernlys, spillerens synlige trailer og multiplayer er ikke implementeret.</p><p>Prisanker: <a href="https://www.trucks.nl/volvo-fh-16780-globetrotter-xl-aero-4x2-new-full-spec-retarder-night-clima-full-air-new-9209237-vd" target="_blank" rel="noopener">Ny FH16 Aero 780 4×2 hos VAEX / TrucksNL · €174.900 ekskl. moms ↗</a>. Ved regnekurs 7,46: ca. 1,31 mio. kr. Tilvalgspriserne er vores skøn; annoncen angiver ikke særpriser.</p><p class="source-tech">${view.backend} · Rapier WebAssembly · ${view.quality==='balanced'?'Balanceret grafik':'Tilpasset laptopgrafik'}</p></section></div>`;}
function render(){
  document.body.dataset.mode=mode;dispatchAudio.setActive(mode!=='race');
  app.innerHTML=(mode==='race'?race():header()+(mode==='garage'?garage():mode==='tenders'?tenders():results()))+(mode==='race'?'':`<footer><span>NORDIC HAUL <span class="footer-dot">/</span> ${career.races} løb / ${career.wins} sejre</span><button id="sources">Kilder og modelstatus ↗</button></footer>`)+(showSources?sources():'');
  if(mode!==lastRenderedMode&&!matchMedia('(prefers-reduced-motion: reduce)').matches){app.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'});}lastRenderedMode=mode;
  if(mode==='race')bindTouch();
  if(showSources)document.querySelector<HTMLButtonElement>('#close-sources')?.focus();
}
function clearInputs(){for(const k of Object.keys(input) as (keyof Controls)[])input[k]=false;}
function commit(){const c=buyConfiguration(career,draft);if(!c)return false;career=c;saveCareer(career);return true;}
function goGarage(){sim?.dispose();sim=undefined;mode='garage';draft={...career.truck};chosen=tendersFrom(career.currentCity)[0];view.configure(draft);view.setMode('garage');clearInputs();render();}
async function startRace(){
  dispatchAudio.depart();dispatchAudio.setActive(false);lastCountdownCue=-1;mode='race';clearInputs();sim?.dispose();sim=new Simulation(career.truck,chosen);accumulator=0;view.setRoute(cityFor(chosen.origin).name,cityFor(chosen.destination).name);view.setMode('race');view.updateRace(sim.snapshot());render();
  if(audio.enabled)await audio.enable();
}
function pause(){
  if(!sim||mode!=='race')return;sim.paused=!sim.paused;clearInputs();
  document.querySelector('#pause-overlay')!.innerHTML=sim.paused?'<div class="pause-card" role="dialog" aria-modal="true"><span class="eyebrow">PAUSE</span><h2>PITSTOP.</h2><button class="primary" id="resume">Fortsæt løbet →</button><button class="secondary" id="abandon">Afbryd og gå til garagen</button><p>Et afbrudt løb giver ingen præmie.</p></div>':'';
  document.querySelector('#pause')!.textContent=sim.paused?'Fortsæt':'Pause';
}
function bindTouch(){document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach(b=>{const key=b.dataset.control as keyof Controls;b.addEventListener('pointerdown',ev=>{ev.preventDefault();input[key]=true;b.setPointerCapture(ev.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>input[key]=false);});}
app.addEventListener('click',async ev=>{
  const b=(ev.target as HTMLElement).closest<HTMLElement>('button,a.brand,[data-city],[data-route]');if(!b)return;
  if(!dispatchAudio.ctx&&b.id!=='menu-sound'&&b.id!=='map-sound')void dispatchAudio.enable().then(syncAudioControls).catch(()=>{});
  if(b.id!=='menu-sound'&&b.id!=='map-sound')dispatchAudio.select();
  if(b.dataset.engine){draft.engine=b.dataset.engine as TruckConfig['engine'];view.configure(draft);render();}
  else if(b.dataset.cab){draft.cab=b.dataset.cab as TruckConfig['cab'];view.configure(draft);render();}
  else if(b.dataset.axle){draft.axle=b.dataset.axle as TruckConfig['axle'];view.configure(draft);render();}
  else if(b.dataset.crawler){draft.crawler=b.dataset.crawler==='true';view.configure(draft);render();}
  else if(b.dataset.cms){draft.cms=b.dataset.cms==='true';view.configure(draft);render();}
  else if(b.dataset.lights){draft.adaptiveLights=b.dataset.lights==='true';view.configure(draft);render();}
  else if(b.dataset.interior){draft.blackEdition=b.dataset.interior==='true';view.configure(draft);render();}
  else if(b.dataset.color){draft.color=b.dataset.color;view.configure(draft);render();}
  else if(b.dataset.section){section=b.dataset.section;render();}
  else if(b.dataset.viewer){view.previewInterior(b.dataset.viewer==='interior');}
  else if(b.hasAttribute('data-panel')){document.body.dataset.panel=document.body.dataset.panel==='show'?'hide':'show';b.textContent=document.body.dataset.panel==='show'?'Skjul konfiguration':'Vis konfiguration';}
  else if(b.dataset.load){chosen=withLoad(chosen,Number(b.dataset.load));render();}
  else if(b.dataset.tender||b.dataset.city||b.dataset.route){const choice=tendersFrom(career.currentCity).find(t=>t.id===(b.dataset.tender??b.dataset.route)||t.destination===b.dataset.city);if(choice){chosen=choice;if(!dispatchAudio.ctx)await dispatchAudio.enable();dispatchAudio.select();render();}}
  else if(b.id==='commit'||b.dataset.nav==='tenders'){if(commit()){mode='tenders';chosen=tendersFrom(career.currentCity)[0];dispatchAudio.setActive(true);if(!dispatchAudio.ctx)await dispatchAudio.enable();render();}}
  else if(b.dataset.nav==='garage'||b.classList.contains('brand')){ev.preventDefault();goGarage();}
  else if(b.id==='start')await startRace();
  else if(b.id==='map-sound'||b.id==='menu-sound'){await dispatchAudio.toggle();render();}
  else if(b.id==='return'||b.id==='abandon')goGarage();
  else if(b.id==='next-tender'){sim?.dispose();sim=undefined;chosen=tendersFrom(career.currentCity)[0];mode='tenders';view.setMode('garage');render();}
  else if(b.id==='pause'||b.id==='resume')pause();
  else if(b.id==='sources'){showSources=true;render();}
  else if(b.id==='close-sources'){showSources=false;render();document.querySelector<HTMLButtonElement>('#sources')?.focus();}
  else if(b.id==='sound'){if(audio.enabled)audio.mute();else await audio.enable();b.textContent='Lyd '+(audio.enabled?'til':'fra');}
});
app.addEventListener('pointerover',ev=>{if(mode==='tenders'&&(ev.target as HTMLElement).closest('[data-city],[data-tender]'))dispatchAudio.hover();});
window.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&showSources){showSources=false;render();return;}
  if(mode==='tenders'&&(ev.key==='Enter'||ev.key===' ')){const city=(ev.target as HTMLElement).closest<HTMLElement>('[data-city]');if(city){ev.preventDefault();city.dispatchEvent(new MouseEvent('click',{bubbles:true}));}return;}
  if(mode!=='race')return;
  const key=ev.key.toLowerCase();const control=({w:'throttle',arrowup:'throttle',s:'brake',arrowdown:'brake',a:'left',arrowleft:'left',d:'right',arrowright:'right'} as Record<string,keyof Controls>)[key];
  if(control){ev.preventDefault();input[control]=true;}
  else if(key==='r'&&!sim?.paused)sim?.resetToRoad();
  else if(key==='escape'&&!ev.repeat)pause();
});
window.addEventListener('keyup',ev=>{const control=({w:'throttle',arrowup:'throttle',s:'brake',arrowdown:'brake',a:'left',arrowleft:'left',d:'right',arrowright:'right'} as Record<string,keyof Controls>)[ev.key.toLowerCase()];if(control)input[control]=false;});
window.addEventListener('blur',()=>{clearInputs();if(mode==='race'&&sim&&!sim.paused)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(mode==='race'&&sim&&!sim.paused)pause();}});
function updateHUD(s:RaceSnapshot){
  const set=(id:string,value:string)=>{const e=document.getElementById(id);if(e)e.innerHTML=value;};
  set('speed',`${Math.round(s.speed*3.6)} <small>km/t</small>`);set('place',`${s.place} <small>/ 3</small>`);set('time',clock(s.elapsed));set('progress',`${Math.floor(s.progress*100)} %`);
  const cue=s.countdown>0?Math.ceil(s.countdown):0;if(cue!==lastCountdownCue){lastCountdownCue=cue;dispatchAudio.countdown(cue);}
  const count=document.getElementById('countdown');if(count){count.textContent=s.countdown>0?cue.toString():s.elapsed<1?'KØR!':'';count.hidden=s.countdown<=0&&s.elapsed>=1;}
  const fill=document.getElementById('route-fill');if(fill)fill.style.transform=`scaleX(${s.progress})`;
  document.body.style.setProperty('--speed-effect',Math.min(.65,Math.max(0,(s.speed-13)/25)).toFixed(2));
  const off=document.getElementById('offroad');if(off)off.hidden=!s.offRoad;
  const c=dayCycle(s.elapsed);set('day-clock',c.label);set('hill-grade',`${s.grade>=0?'STIGNING +':'NEDKØRSEL '}${(s.grade*100).toFixed(1).replace('.',',')} %`);set('night-lights',c.night?'FORLYGTER TÆNDT':'2,5 DØGN / MINUT');
  const dot=(id:string,x:number,z:number)=>{document.getElementById(id)?.setAttribute('cx',(80+x/TRACK_RX*52).toString());document.getElementById(id)?.setAttribute('cy',(105+z/TRACK_RZ*87).toString());};
  dot('map-player',s.x,s.z);s.ai.forEach((a,i)=>dot('map-rival-'+i,a.x,a.z));
}
try{
  await initPhysics();view=await TruckScene.create(canvas);view.configure(draft);render();
  view.start(dt=>{
    if(mode==='race'&&sim){
      accumulator+=dt;while(accumulator>=1/60){sim.step(input);accumulator-=1/60;}
      const s=sim.snapshot();view.updateRace(s);audio.update(s.speed,input.throttle,!sim.paused&&s.countdown<=0);
      hudTime+=dt;if(hudTime>.08){updateHUD(s);hudTime=0;}
      if(s.done){const paid=settleRace(career,chosen.reward,s.place,s.elapsed<=chosen.par,chosen.destination);career=paid.career;saveCareer(career);result={payout:paid.payout,bonus:paid.bonus,place:s.place,time:s.elapsed};mode='results';audio.update(0,false,false);dispatchAudio.victory(s.place===1);render();}
    }else audio.update(0,false,false);
  });
}catch(error){console.error(error);app.innerHTML='<div class="loading"><h1>Garagen kunne ikke åbnes.</h1><p>Prøv en opdateret browser med hardwareacceleration, og genindlæs siden.</p><button onclick="location.reload()">Prøv igen</button></div>';}
