import test from 'node:test';import assert from 'node:assert/strict';
import { DEFAULT_AUDIO,RADIO_STATIONS,loadAudioSettings,saveAudioSettings,nextStation } from '../src/game/radio.ts';
import { DispatchAudio } from '../src/game/dispatchAudio.ts';
import { EngineAudio } from '../src/game/audio.ts';
class Parameter {value=0;setValueAtTime(v:number){this.value=v;}setTargetAtTime(v:number){this.value=v;}exponentialRampToValueAtTime(v:number){this.value=v;}}
class Source {frequency=new Parameter();type='';buffer:unknown;onended?:()=>void;starts:number[]=[];stops:number[]=[];connect(_node:unknown){}disconnect(){}start(t=0){this.starts.push(t);}stop(t=0){this.stops.push(t);}}
class FakeContext {
  static instances:FakeContext[]=[];currentTime=0;sampleRate=8000;state='suspended';destination={};resumes=0;sources:Source[]=[];gains:{gain:Parameter;connect:(v:unknown)=>void;disconnect:()=>void}[]=[];
  constructor(){FakeContext.instances.push(this);}addEventListener(_event:string,_callback:()=>void){}async resume(){this.resumes++;this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
  createGain(){const g={gain:new Parameter(),connect:(_v:unknown)=>{},disconnect:()=>{}};this.gains.push(g);return g;}
  createOscillator(){const s=new Source();this.sources.push(s);return s;}createBufferSource(){return this.createOscillator();}
  createBiquadFilter(){return {type:'',frequency:new Parameter(),connect:(_v:unknown)=>{},disconnect:()=>{}};}
  createDynamicsCompressor(){return {threshold:new Parameter(),knee:new Parameter(),ratio:new Parameter(),attack:new Parameter(),release:new Parameter(),connect:(_v:unknown)=>{}};}
  createBuffer(_channels:number,length:number,_rate:number){return {getChannelData:()=>new Float32Array(length)};}
}
async function withAudio(fn:(audio:DispatchAudio,ctx:FakeContext)=>void|Promise<void>){
  const previousContext=Object.getOwnPropertyDescriptor(globalThis,'AudioContext'),previousDocument=Object.getOwnPropertyDescriptor(globalThis,'document');FakeContext.instances=[];
  Object.defineProperty(globalThis,'AudioContext',{value:FakeContext,configurable:true});Object.defineProperty(globalThis,'document',{value:{hidden:false},configurable:true});
  const audio=new DispatchAudio();audio.settings={...DEFAULT_AUDIO};
  try{await Promise.all([audio.unlock(),audio.unlock()]);await fn(audio,FakeContext.instances[0]);}
  finally{audio.dispose();if(previousContext)Object.defineProperty(globalThis,'AudioContext',previousContext);else Reflect.deleteProperty(globalThis,'AudioContext');if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else Reflect.deleteProperty(globalThis,'document');}
}
test('radio preferences survive reload, reject bad stations and clamp volume',()=>{
  let data='';const storage={getItem:()=>data,setItem:(_k:string,v:string)=>{data=v;}};
  const settings={effects:false,music:true,engine:false,volume:.25,station:2};saveAudioSettings(settings,storage);assert.deepEqual(loadAudioSettings(storage),settings);
  data='{"station":1000,"volume":8,"effects":"no"}';assert.equal(loadAudioSettings(storage).station,0);assert.equal(loadAudioSettings(storage).volume,1);assert.equal(loadAudioSettings(storage).effects,true);
  data='{broken';assert.deepEqual(loadAudioSettings(storage),DEFAULT_AUDIO);
  assert.equal(nextStation(2),0);assert.equal(nextStation(0,-1),2);assert.equal(new Set(RADIO_STATIONS.map(s=>s.bpm)).size,3);
});
test('first concurrent UI gestures unlock one context and menu music continues into a race',async()=>withAudio(async(audio,ctx)=>{
  assert.equal(FakeContext.instances.length,1);assert.equal(ctx.resumes,1);assert.ok(ctx.sources.length>0);assert.equal(audio.musicPlaying,true);
  const menu=ctx.gains[0].gain.value;audio.setRacing(true);assert.ok(ctx.gains[0].gain.value>0&&ctx.gains[0].gain.value<menu);assert.equal(audio.musicPlaying,true);
  const before=ctx.sources.length;audio.select();assert.equal(ctx.sources.length,before+2);
  audio.toggleEffects();const muted=ctx.sources.length;audio.select();assert.equal(ctx.sources.length,muted);assert.equal(ctx.gains[1].gain.value,0);assert.ok(ctx.gains[0].gain.value>0);
  audio.toggleMusic();assert.equal(ctx.gains[0].gain.value,0);assert.equal(audio.musicPlaying,false);
}));
test('channel changes cancel old music, preserve mute choices and resume without a backlog after suspension',async()=>withAudio(async(audio,ctx)=>{
  const old=[...ctx.sources];audio.changeStation(1);assert.equal(audio.station.id,'redline');assert.ok(old.every(s=>s.stops.at(-1)===.025));
  audio.setVolume(.3);audio.toggleEffects();audio.changeStation(1);assert.equal(audio.station.id,'night');assert.equal(audio.settings.effects,false);assert.equal(audio.settings.volume,.3);
  audio.suspend();assert.equal(ctx.state,'suspended');ctx.currentTime=100;const before=ctx.sources.length;await audio.unlock();assert.equal(audio.musicPlaying,true);assert.ok(ctx.sources.length-before<12,'Resume must not schedule every missed beat');
}));
test('a trusted retry can resume sound even while an earlier background resume is pending',{timeout:1500},async()=>withAudio(async(audio,ctx)=>{
  const gainCount=ctx.gains.length;audio.suspend();let attempts=0,release:()=>void=()=>{};
  ctx.resume=()=>{ctx.resumes++;attempts++;if(attempts===1)return new Promise<void>(resolve=>{release=resolve;});ctx.state='running';release();return Promise.resolve();};
  const background=audio.unlock();await audio.unlock();await background;
  assert.equal(attempts,2);assert.equal(FakeContext.instances.length,1);assert.equal(audio.musicPlaying,true);
  assert.equal(ctx.gains.length,gainCount,'Retries must not duplicate the mixer or reschedule existing notes');
}));
test('automatic unlock preserves saved mute while explicit play restores a zero-volume radio',async()=>withAudio(async(audio,ctx)=>{
  audio.toggleMusic();audio.setVolume(0);audio.toggleEffects();await audio.unlock();
  assert.equal(audio.settings.music,false);assert.equal(audio.settings.volume,0);assert.equal(audio.musicPlaying,false);
  audio.playMusic();assert.equal(audio.musicPlaying,true);assert.equal(audio.settings.volume,.55);
  assert.equal(audio.settings.effects,false);assert.equal(ctx.gains[1].gain.value,0);
}));
test('closed context is rebuilt and not reported as a successful silent unlock',async()=>withAudio(async(audio,ctx)=>{
  await ctx.close();await audio.unlock();assert.equal(FakeContext.instances.length,2);
  assert.equal(audio.ready,true);assert.equal(audio.startFailed,false);assert.ok(FakeContext.instances[1].sources.length>0);
}));
test('failed audio start is visible and a later gesture can retry it',async()=>withAudio(async(audio,ctx)=>{
  audio.suspend();ctx.resume=async()=>{throw new Error('Browser interrupted audio');};
  await assert.rejects(audio.unlock());assert.equal(audio.startFailed,true);assert.equal(audio.ready,false);
  ctx.resume=async()=>{ctx.state='running';};await audio.unlock();assert.equal(audio.startFailed,false);assert.equal(audio.musicPlaying,true);
}));
test('diesel audio follows the shared context, driving activity, mute and context replacement',async()=>withAudio(async(_audio,ctx)=>{
  const engine=new EngineAudio();await engine.enable(ctx as unknown as AudioContext);
  const gain=ctx.gains.at(-1)!.gain;engine.update(12,true,true);assert.ok(gain.value>0);
  engine.update(12,true,false);assert.equal(gain.value,0);engine.update(0,false,true);assert.ok(gain.value>0);
  engine.mute();engine.update(12,true,true);assert.equal(gain.value,0);
  await ctx.close();assert.equal(engine.enabled,false);const replacement=new FakeContext();await engine.enable(replacement as unknown as AudioContext);
  engine.update(8,true,true);assert.equal(engine.enabled,true);assert.ok(replacement.gains[0].gain.value>0);
}));
