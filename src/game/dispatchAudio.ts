import { loadAudioSettings,saveAudioSettings,nextStation,RADIO_STATIONS,type AudioSettings } from './radio';
/** Original game radio, with an audio-clock scheduler independent of the rendering frame rate. */
export class DispatchAudio {
  ctx?:AudioContext;settings:AudioSettings=loadAudioSettings();
  private musicBus?:GainNode;private effectsBus?:GainNode;private compressor?:DynamicsCompressorNode;private noise?:AudioBuffer;
  private timer?:ReturnType<typeof setInterval>;private tick=0;private nextBeat=0;private lastHover=0;private lastScroll=0;
  private pending?:Promise<void>;private racing=false;private voices=new Set<AudioScheduledSourceNode>();
  get enabled(){return this.settings.effects;}
  get station(){return RADIO_STATIONS[this.settings.station];}
  get ready(){return this.ctx?.state==='running';}
  get musicPlaying(){return !!this.ready&&this.settings.music&&this.settings.volume>0;}
  async unlock(){
    if(this.pending)return this.pending;
    this.pending=this.initialize();try{await this.pending;}finally{this.pending=undefined;}
  }
  private async initialize(){
    this.ctx??=new AudioContext();if(this.ctx.state!=='running')await this.ctx.resume();
    if(!this.musicBus){
      this.musicBus=this.ctx.createGain();this.effectsBus=this.ctx.createGain();this.compressor=this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value=-16;this.compressor.knee.value=20;this.compressor.ratio.value=4;this.compressor.attack.value=.005;this.compressor.release.value=.15;
      this.musicBus.connect(this.compressor);this.effectsBus.connect(this.compressor);this.compressor.connect(this.ctx.destination);
      this.noise=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*.2),this.ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      this.nextBeat=this.ctx.currentTime+.035;
    }
    this.applyLevels();this.schedule();
    if(!this.timer)this.timer=setInterval(()=>this.schedule(),25);
  }
  private applyLevels(){
    if(!this.ctx||!this.musicBus||!this.effectsBus)return;
    this.musicBus.gain.setTargetAtTime(this.settings.music?this.settings.volume*(this.racing?.17:.24):0,this.ctx.currentTime,.12);
    this.effectsBus.gain.setTargetAtTime(this.settings.effects?.24:0,this.ctx.currentTime,.04);
  }
  setRacing(racing:boolean){this.racing=racing;this.applyLevels();}
  toggleEffects(){this.settings.effects=!this.settings.effects;saveAudioSettings(this.settings);this.applyLevels();}
  toggleMusic(){this.settings.music=!this.settings.music;saveAudioSettings(this.settings);this.nextBeat=(this.ctx?.currentTime??0)+.04;this.applyLevels();}
  toggleEngine(){this.settings.engine=!this.settings.engine;saveAudioSettings(this.settings);}
  setVolume(volume:number){this.settings.volume=Math.max(0,Math.min(1,volume));saveAudioSettings(this.settings);this.applyLevels();}
  changeStation(direction=1){
    this.settings.station=nextStation(this.settings.station,direction);saveAudioSettings(this.settings);this.tick=0;this.nextBeat=(this.ctx?.currentTime??0)+.07;
    // Cancel sustained notes from the previous station so two channels cannot overlap.
    for(const voice of this.voices){try{voice.stop((this.ctx?.currentTime??0)+.025);}catch{}}this.voices.clear();
  }
  stationCue(){this.tone(180,.06,.09,0,'triangle',true);this.tone(720,.11,.045,.065,'sine',true);}
  suspend(){if(this.ctx)void this.ctx.suspend();}
  private schedule(){
    if(!this.ctx||this.ctx.state!=='running'||!this.settings.music||this.settings.volume===0||document.hidden)return;
    if(this.nextBeat<this.ctx.currentTime)this.nextBeat=this.ctx.currentTime+.025;
    while(this.nextBeat<this.ctx.currentTime+.12){this.beat(this.nextBeat);this.nextBeat+=60/this.station.bpm/4;}
  }
  private tone(frequency:number,duration:number,volume:number,delay=0,type:OscillatorType='sine',effect=false,at?:number){
    if(!this.ctx||!this.musicBus||!this.effectsBus||(effect&&!this.settings.effects))return;
    const start=(at??this.ctx.currentTime)+delay,osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
    osc.type=type;osc.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=type==='sawtooth'?850:type==='square'?600:3500;
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(effect?this.effectsBus:this.musicBus);osc.start(start);osc.stop(start+duration+.04);
    if(!effect)this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();filter.disconnect();gain.disconnect();};
  }
  private kick(at:number){
    if(!this.ctx||!this.musicBus)return;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
    osc.frequency.setValueAtTime(140,at);osc.frequency.exponentialRampToValueAtTime(42,at+.12);gain.gain.setValueAtTime(.28,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.23);
    osc.connect(gain);gain.connect(this.musicBus);osc.start(at);osc.stop(at+.25);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};
  }
  private hat(at:number,snare=false){
    if(!this.ctx||!this.musicBus||!this.noise)return;
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.noise;filter.type='highpass';filter.frequency.value=snare?1500:7500;
    gain.gain.setValueAtTime(snare?.075:.022,at);gain.gain.exponentialRampToValueAtTime(.0001,at+(snare?.11:.03));source.connect(filter);filter.connect(gain);gain.connect(this.musicBus);source.start(at);source.stop(at+.16);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
  }
  private beat(at:number){
    const station=this.station,step=this.tick%16,bar=Math.floor(this.tick/16),root=station.roots[Math.floor(bar/2)%station.roots.length];this.tick++;
    if(station.id==='night'){if(step===0||step===10)this.kick(at);if(step%4===2)this.hat(at);if(step===4||step===12)this.hat(at,true);}
    else{if(step%4===0)this.kick(at);if(step%(station.id==='redline'?1:2)===0)this.hat(at);if(step===4||step===12)this.hat(at,true);}
    if((station.bass as readonly number[]).includes(step))this.tone(root*(step===11?2:1),.19,.13,0,station.wave,false,at);
    if(step%2===1)this.tone(root*station.lead[Math.floor(step/2)%station.lead.length],station.id==='night'?.36:.2,station.id==='redline'?.04:.032,0,'triangle',false,at);
    if(step===0)for(const ratio of [2,2.4,3])this.tone(root*ratio,station.id==='night'?2.3:1.4,station.pad,0,'sine',false,at);
  }
  hover(){if(!this.ready||performance.now()-this.lastHover<120)return;this.lastHover=performance.now();this.tone(1046,.055,.027,0,'sine',true);}
  scroll(){if(!this.ready||performance.now()-this.lastScroll<220)return;this.lastScroll=performance.now();this.tone(330,.045,.025,0,'triangle',true);}
  select(){this.tone(392,.10,.09,0,'triangle',true);this.tone(784,.13,.035,.04,'sine',true);}
  depart(){this.tone(196,.28,.12,0,'triangle',true);this.tone(392,.32,.07,.10,'triangle',true);this.tone(784,.4,.06,.20,'sine',true);}
  countdown(n:number){this.tone(n===0?1046:523,n===0?.4:.15,.12,0,'sine',true);if(n===0)this.tone(1568,.24,.04,.10,'sine',true);}
  victory(won:boolean){const notes=won?[523,659,784,1046]:[392,523,659];notes.forEach((n,i)=>this.tone(n,.45,.09,i*.12,'triangle',true));}
  dispose(){if(this.timer)clearInterval(this.timer);for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();if(this.ctx)void this.ctx.close();}
}
