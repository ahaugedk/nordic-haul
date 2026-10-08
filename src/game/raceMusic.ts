export const RACE_MUSIC_SOURCES=[
  {src:'/audio/nordic-haul.mp3',type:'audio/mpeg'},
  {src:'/audio/nordic-haul.ogg',type:'audio/ogg'},
] as const;

export function createRaceMusicElement(){
  const audio=document.createElement('audio');audio.id='race-music';audio.hidden=true;audio.preload='auto';audio.loop=true;audio.volume=.48;
  for(const source of RACE_MUSIC_SOURCES){const element=document.createElement('source');element.src=source.src;element.type=source.type;audio.append(element);}
  document.body.append(audio);return audio;
}
/** play() is called synchronously in the start/resume gesture for iOS Safari. */
export class RaceMusic {
  private active=false;private paused=false;private enabled=true;private attempt=0;
  constructor(public element:Pick<HTMLAudioElement,'play'|'pause'|'muted'|'currentTime'|'paused'|'dataset'>=createRaceMusicElement()){}
  start(){this.active=true;this.paused=false;this.element.currentTime=0;this.play();}
  pause(){if(!this.active)return;this.paused=true;this.attempt++;this.element.pause();this.element.dataset.playback='paused';}
  resume(){if(!this.active)return;this.paused=false;this.play();}
  stop(){this.active=false;this.paused=false;this.attempt++;this.element.pause();this.element.currentTime=0;this.element.dataset.playback='stopped';}
  setEnabled(enabled:boolean){
    this.enabled=enabled;this.element.muted=!enabled;
    // Master mute keeps the song timeline; unmute can also retry a blocked play.
    if(enabled&&this.active&&!this.paused&&this.element.paused)this.play();
  }
  private play(){
    if(!this.active||this.paused)return;
    const attempt=++this.attempt;this.element.muted=!this.enabled;
    this.element.dataset.playback='starting';
    try{void this.element.play().then(()=>{
      if(attempt===this.attempt)this.element.dataset.playback='playing';
    }).catch(()=>{if(attempt===this.attempt)this.element.dataset.playback='blocked';});}
    catch{if(attempt===this.attempt)this.element.dataset.playback='blocked';}
  }
}
