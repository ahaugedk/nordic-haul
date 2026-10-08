export class EngineAudio {
  private ctx?:AudioContext; private oscillator?:OscillatorNode; private gain?:GainNode;
  enabled=false;
  async enable(context?:AudioContext){
    this.ctx??=context??new AudioContext();await this.ctx.resume();
    if(!this.oscillator){this.oscillator=this.ctx.createOscillator();this.oscillator.type='sawtooth';this.gain=this.ctx.createGain();const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=220;this.oscillator.connect(filter);filter.connect(this.gain);this.gain.connect(this.ctx.destination);this.gain.gain.value=0;this.oscillator.start();}
    this.enabled=true;
  }
  update(speed:number,throttle:boolean,active:boolean){
    if(!this.ctx||!this.gain||!this.oscillator)return;
    this.oscillator.frequency.setTargetAtTime(29+(speed%6)*4+(throttle?8:0),this.ctx.currentTime,.12);
    this.gain.gain.setTargetAtTime(this.enabled&&active?(throttle?.025:.012):0,this.ctx.currentTime,.15);
  }
  mute(){this.enabled=false;if(this.gain&&this.ctx)this.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.03);}
}
