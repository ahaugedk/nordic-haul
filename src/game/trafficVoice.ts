/** Optional native Danish speech; the traffic chime/caption works without it. */
export class TrafficVoice {
  private speaking=false;private generation=0;
  constructor(private synthesis:Pick<SpeechSynthesis,'getVoices'|'speak'|'cancel'>|undefined=typeof speechSynthesis==='undefined'?undefined:speechSynthesis,
    private utterance:(text:string)=>SpeechSynthesisUtterance=text=>new SpeechSynthesisUtterance(text)){}
  say(text:string){
    const voice=this.synthesis?.getVoices().find(v=>v.lang.toLowerCase().startsWith('da'));if(!voice||!this.synthesis)return false;
    this.stop();const message=this.utterance(text);message.voice=voice;message.lang='da-DK';message.rate=1.05;message.volume=.8;
    const generation=this.generation;this.speaking=true;message.onend=message.onerror=()=>{if(generation===this.generation)this.speaking=false;};
    try{this.synthesis.speak(message);return true;}catch{this.speaking=false;return false;}
  }
  stop(){this.generation++;if(this.speaking)this.synthesis?.cancel();this.speaking=false;}
}
