import test from 'node:test';import assert from 'node:assert/strict';
import { DispatchAudio } from '../src/game/dispatchAudio.ts';
import { EngineAudio } from '../src/game/audio.ts';
import { RaceMusic,RACE_MUSIC_SOURCES } from '../src/game/raceMusic.ts';
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
  const audio=new DispatchAudio();
  try{await Promise.all([audio.unlock(),audio.unlock()]);await fn(audio,FakeContext.instances[0]);}
  finally{audio.dispose();if(previousContext)Object.defineProperty(globalThis,'AudioContext',previousContext);else Reflect.deleteProperty(globalThis,'AudioContext');if(previousDocument)Object.defineProperty(globalThis,'document',previousDocument);else Reflect.deleteProperty(globalThis,'document');}
}
test('sound defaults on, unlocking a menu produces no music and the master flag silences UI cues',async()=>withAudio(async(audio,ctx)=>{
  assert.equal(audio.enabled,true);assert.equal(ctx.sources.length,0,'No synthesized garage music');
  audio.select();assert.equal(ctx.sources.length,2);assert.ok(ctx.gains[0].gain.value>0);
  audio.setEnabled(false);const count=ctx.sources.length;audio.select();assert.equal(ctx.sources.length,count);assert.equal(ctx.gains[0].gain.value,0);
  audio.setEnabled(true);audio.select();assert.equal(ctx.sources.length,count+2);
}));
test('a trusted retry can resume sound even while an earlier background resume is pending',{timeout:1500},async()=>withAudio(async(audio,ctx)=>{
  const gainCount=ctx.gains.length;audio.suspend();let attempts=0,release:()=>void=()=>{};
  ctx.resume=()=>{ctx.resumes++;attempts++;if(attempts===1)return new Promise<void>(resolve=>{release=resolve;});ctx.state='running';release();return Promise.resolve();};
  const background=audio.unlock();await audio.unlock();await background;
  assert.equal(attempts,2);assert.equal(FakeContext.instances.length,1);assert.equal(audio.ready,true);
  assert.equal(ctx.gains.length,gainCount,'Retries must not duplicate the mixer or reschedule existing notes');
}));
test('closed context is rebuilt and not reported as a successful silent unlock',async()=>withAudio(async(audio,ctx)=>{
  await ctx.close();await audio.unlock();assert.equal(FakeContext.instances.length,2);
  assert.equal(audio.ready,true);assert.equal(audio.startFailed,false);assert.equal(FakeContext.instances[1].sources.length,0);audio.select();assert.equal(FakeContext.instances[1].sources.length,2);
}));
test('failed audio start is visible and a later gesture can retry it',async()=>withAudio(async(audio,ctx)=>{
  audio.suspend();ctx.resume=async()=>{throw new Error('Browser interrupted audio');};
  await assert.rejects(audio.unlock());assert.equal(audio.startFailed,true);assert.equal(audio.ready,false);
  ctx.resume=async()=>{ctx.state='running';};await audio.unlock();assert.equal(audio.startFailed,false);assert.equal(audio.ready,true);
}));
test('diesel audio follows the shared context, driving activity, mute and context replacement',async()=>withAudio(async(_audio,ctx)=>{
  const engine=new EngineAudio();await engine.enable(ctx as unknown as AudioContext);
  const gain=ctx.gains.at(-1)!.gain;engine.update(12,true,true);assert.ok(gain.value>0);
  engine.update(12,true,false);assert.equal(gain.value,0);engine.update(0,false,true);assert.ok(gain.value>0);
  engine.mute();engine.update(12,true,true);assert.equal(gain.value,0);
  await ctx.close();assert.equal(engine.enabled,false);const replacement=new FakeContext();await engine.enable(replacement as unknown as AudioContext);
  engine.update(8,true,true);assert.equal(engine.enabled,true);assert.ok(replacement.gains[0].gain.value>0);
}));

class FakeMedia {
  muted=false;currentTime=0;paused=true;dataset:Record<string,string>={};plays=0;pauses=0;rejectNext=false;
  play(){this.plays++;if(this.rejectNext){this.rejectNext=false;return Promise.reject(new Error('Blocked'));}this.paused=false;return Promise.resolve();}
  pause(){this.pauses++;this.paused=true;}
}
test('supplied song starts only at race start and repeats from the beginning for a new race',async()=>{
  const media=new FakeMedia(),music=new RaceMusic(media);
  assert.equal(media.plays,0);assert.equal(media.paused,true);music.start();assert.equal(media.plays,1,'play must be invoked synchronously in the start gesture');
  await Promise.resolve();assert.equal(media.dataset.playback,'playing');media.currentTime=35;music.stop();assert.equal(media.paused,true);assert.equal(media.currentTime,0);
  music.start();assert.equal(media.currentTime,0);assert.equal(media.plays,2);
  assert.deepEqual(RACE_MUSIC_SOURCES.map(s=>s.type),['audio/mpeg','audio/ogg']);
});
test('master mute keeps music timing, while pause/resume freezes and restores the same song position',()=>{
  const media=new FakeMedia(),music=new RaceMusic(media);music.start();media.currentTime=19;
  music.setEnabled(false);assert.equal(media.muted,true);assert.equal(media.paused,false);assert.equal(media.currentTime,19);
  music.setEnabled(true);assert.equal(media.muted,false);assert.equal(media.currentTime,19);
  music.pause();assert.equal(media.paused,true);assert.equal(media.currentTime,19);
  music.resume();assert.equal(media.paused,false);assert.equal(media.currentTime,19);
  music.stop();music.resume();assert.equal(media.paused,true,'Returning to garage/results must keep music stopped');
});
test('a blocked soundtrack can retry from a later gesture and late promises cannot resurrect a stopped race',async()=>{
  const media=new FakeMedia(),music=new RaceMusic(media);media.rejectNext=true;music.start();await Promise.resolve();await Promise.resolve();assert.equal(media.dataset.playback,'blocked');
  music.setEnabled(true);await Promise.resolve();assert.equal(media.dataset.playback,'playing');
  let resolve:()=>void=()=>{};media.play=()=>{media.paused=false;return new Promise<void>(r=>{resolve=r;});};
  music.start();music.stop();resolve();await Promise.resolve();assert.equal(media.paused,true);assert.equal(media.dataset.playback,'stopped');
});
