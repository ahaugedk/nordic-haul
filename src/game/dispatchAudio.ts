/** Original procedural garage score and racing UI cues, synthesized locally. */
export class DispatchAudio {
  ctx?:AudioContext;
  private master?:GainNode;private effects?:GainNode;private noise?:AudioBuffer;
  private timer?:ReturnType<typeof setInterval>;private tick=0;private lastHover=0;
  enabled=false;active=false;
  async enable(){
    this.ctx??=new AudioContext();await this.ctx.resume();
    if(!this.master){
      this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);
      this.effects=this.ctx.createGain();this.effects.connect(this.ctx.destination);
      this.noise=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*.16),this.ctx.sampleRate);
      const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    this.enabled=true;this.master.gain.setTargetAtTime(this.active?.20:0,this.ctx.currentTime,.15);this.effects!.gain.setTargetAtTime(.20,this.ctx.currentTime,.08);
    if(!this.timer)this.timer=setInterval(()=>{if(this.active&&this.enabled&&!document.hidden)this.beat();},60000/124/4);
  }
  async toggle(){
    if(this.enabled){this.enabled=false;this.master?.gain.setTargetAtTime(0,this.ctx!.currentTime,.15);this.effects?.gain.setTargetAtTime(0,this.ctx!.currentTime,.1);}
    else await this.enable();
  }
  setActive(active:boolean){this.active=active;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(active&&this.enabled?.20:0,this.ctx.currentTime,.3);}
  private tone(frequency:number,duration:number,volume:number,delay=0,type:OscillatorType='sine',effect=false){
    if(!this.ctx||!this.master||!this.enabled)return;
    const start=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
    osc.type=type;osc.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=type==='sawtooth'?550:2800;
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(effect?this.effects!:this.master);osc.start(start);osc.stop(start+duration+.04);
    osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();};
  }
  private kick(){
    if(!this.ctx||!this.master)return;
    const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),t=this.ctx.currentTime;
    osc.frequency.setValueAtTime(130,t);osc.frequency.exponentialRampToValueAtTime(43,t+.13);
    gain.gain.setValueAtTime(.24,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.23);
    osc.connect(gain);gain.connect(this.master);osc.start(t);osc.stop(t+.25);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  private hat(snare=false){
    if(!this.ctx||!this.master||!this.noise)return;
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain(),t=this.ctx.currentTime;
    source.buffer=this.noise;filter.type='highpass';filter.frequency.value=snare?1500:7500;
    gain.gain.setValueAtTime(snare?.07:.017,t);gain.gain.exponentialRampToValueAtTime(.0001,t+(snare?.11:.025));
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();source.stop(t+.15);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  private beat(){
    const step=this.tick++%16,root=[73.416,65.406,58.270,65.406][Math.floor(this.tick/32)%4];
    if(step%4===0)this.kick();if(step%2===0)this.hat();if(step===4||step===12)this.hat(true);
    if([0,3,6,8,11,14].includes(step))this.tone(root*(step===11?2:1),.17,.12,0,'sawtooth');
    if(step%2===1)this.tone(root*[4,6,5,8][Math.floor(step/2)%4],.19,.035,0,'triangle');
    if(step===0)for(const ratio of [2,2.4,3])this.tone(root*ratio,1.5,.022,0,'sine');
  }
  hover(){if(!this.ctx||performance.now()-this.lastHover<130)return;this.lastHover=performance.now();this.tone(1046,.08,.045,0,'sine',true);}
  select(){this.tone(392,.13,.09,0,'triangle',true);this.tone(784,.16,.035,.045,'sine',true);}
  depart(){this.tone(196,.28,.12,0,'triangle',true);this.tone(392,.32,.07,.10,'triangle',true);this.tone(784,.4,.06,.20,'sine',true);}
  countdown(n:number){this.tone(n===0?1046:523,n===0?.4:.15,.12,0,'sine',true);if(n===0)this.tone(1568,.24,.04,.10,'sine',true);}
  victory(won:boolean){const notes=won?[523,659,784,1046]:[392,523,659];notes.forEach((n,i)=>this.tone(n,.45,.09,i*.12,'triangle',true));}
}
