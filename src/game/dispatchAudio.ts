/** UI and race cues only. The supplied race song is managed separately. */
export class DispatchAudio {
  ctx?:AudioContext;enabled=true;onStateChange?:()=>void;startFailed=false;
  private bus?:GainNode;private voices=new Set<OscillatorNode>();private lastHover=0;private lastScroll=0;
  get ready(){return this.ctx?.state==='running';}
  async unlock(){
    try{
      if(!this.ctx||this.ctx.state==='closed'){
        this.ctx=new AudioContext();this.bus=undefined;this.voices.clear();
        this.ctx.addEventListener('statechange',()=>this.onStateChange?.());
      }
      // Retry in every gesture, including after a pending background resume.
      const resume=this.ready?Promise.resolve():this.ctx.resume();
      if(!this.bus){this.bus=this.ctx.createGain();this.bus.gain.value=0;this.bus.connect(this.ctx.destination);}
      await resume;this.applyLevel();this.startFailed=false;this.onStateChange?.();
    }catch(error){this.startFailed=true;this.onStateChange?.();throw error;}
  }
  setEnabled(enabled:boolean){this.enabled=enabled;this.applyLevel();}
  private applyLevel(){if(this.ctx&&this.bus)this.bus.gain.setTargetAtTime(this.enabled?.4:0,this.ctx.currentTime,.02);}
  suspend(){if(this.ctx)void this.ctx.suspend();}
  private tone(frequency:number,duration:number,volume:number,delay=0,type:OscillatorType='sine'){
    if(!this.ready||!this.enabled||!this.ctx||!this.bus)return;
    const start=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
    osc.type=type;osc.frequency.value=frequency;
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(this.bus);osc.start(start);osc.stop(start+duration+.04);this.voices.add(osc);
    osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};
  }
  hover(){if(!this.ready||performance.now()-this.lastHover<120)return;this.lastHover=performance.now();this.tone(1046,.055,.027);}
  scroll(){if(!this.ready||performance.now()-this.lastScroll<220)return;this.lastScroll=performance.now();this.tone(330,.045,.025,0,'triangle');}
  select(){this.tone(392,.10,.09,0,'triangle');this.tone(784,.13,.035,.04);}
  depart(){this.tone(196,.28,.12,0,'triangle');this.tone(392,.32,.07,.10,'triangle');this.tone(784,.4,.06,.20);}
  impact(strength:number){this.tone(95,.14,.11*strength,0,'sawtooth');this.tone(1600,.065,.07*strength,.015,'triangle');}
  countdown(n:number){this.tone(n===0?1046:523,n===0?.4:.15,.12);if(n===0)this.tone(1568,.24,.04,.10);}
  victory(won:boolean){const notes=won?[523,659,784,1046]:[392,523,659];notes.forEach((n,i)=>this.tone(n,.45,.09,i*.12,'triangle'));}
  dispose(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();if(this.ctx)void this.ctx.close();}
}
