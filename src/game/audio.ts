export class EngineAudio {
  private ctx?:AudioContext; private oscillator?:OscillatorNode; private gain?:GainNode;
  private requested=false;
  get enabled(){return this.requested&&this.ctx?.state==='running';}
  async enable(context?:AudioContext){
    if(!this.ctx||this.ctx.state==='closed'||(context&&context!==this.ctx)){
      try{this.oscillator?.stop();}catch{}
      this.ctx=context??new AudioContext();this.oscillator=undefined;this.gain=undefined;
    }
    if(this.ctx.state!=='running')await this.ctx.resume();
    if(!this.oscillator){this.oscillator=this.ctx.createOscillator();this.oscillator.type='sawtooth';this.gain=this.ctx.createGain();const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=400;this.oscillator.connect(filter);filter.connect(this.gain);this.gain.connect(this.ctx.destination);this.gain.gain.value=0;this.oscillator.start();}
    this.requested=true;
  }
  update(speed:number,throttle:boolean,active:boolean){
    if(!this.ctx||!this.gain||!this.oscillator)return;
    this.oscillator.frequency.setTargetAtTime(48+(speed%6)*6+(throttle?14:0),this.ctx.currentTime,.12);
    this.gain.gain.setTargetAtTime(this.enabled&&active?(throttle?.07:.045):0,this.ctx.currentTime,.15);
  }
  mute(){this.requested=false;if(this.gain&&this.ctx)this.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.03);}
}
