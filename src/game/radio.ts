export const RADIO_STATIONS=[
  {id:'haul',name:'HAUL FM',genre:'Synthwave',bpm:110,roots:[65.406,58.270,51.913,58.270],bass:[0,3,6,8,11,14],lead:[4,6,5,8],wave:'sawtooth',pad:.026},
  {id:'redline',name:'REDLINE',genre:'Electro / racing',bpm:144,roots:[73.416,73.416,65.406,82.407],bass:[0,2,4,6,8,10,12,14],lead:[4,8,6,5,8,6,4,3],wave:'square',pad:.014},
  {id:'night',name:'NIGHT DRIVE',genre:'Downtempo',bpm:92,roots:[55,65.406,73.416,58.270],bass:[0,6,8,14],lead:[4,5,6,3],wave:'triangle',pad:.035},
] as const;
export type AudioSettings={effects:boolean;music:boolean;engine:boolean;volume:number;station:number};
export const DEFAULT_AUDIO:AudioSettings={effects:true,music:true,engine:true,volume:.55,station:0};
export const AUDIO_STORAGE_KEY='nordic-haul-audio-v1';
export function loadAudioSettings(storage?:Pick<Storage,'getItem'>):AudioSettings{
  try{const s=storage??localStorage,value=JSON.parse(s.getItem(AUDIO_STORAGE_KEY)??'null');if(!value||typeof value!=='object')return {...DEFAULT_AUDIO};
    return {effects:typeof value.effects==='boolean'?value.effects:true,music:typeof value.music==='boolean'?value.music:true,engine:typeof value.engine==='boolean'?value.engine:true,volume:typeof value.volume==='number'&&Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):.55,station:Number.isInteger(value.station)&&value.station>=0&&value.station<RADIO_STATIONS.length?value.station:0};
  }catch{return {...DEFAULT_AUDIO};}
}
export function saveAudioSettings(settings:AudioSettings,storage?:Pick<Storage,'setItem'>){try{(storage??localStorage).setItem(AUDIO_STORAGE_KEY,JSON.stringify(settings));}catch{}}
export function nextStation(index:number,direction=1){return ((index+direction)%RADIO_STATIONS.length+RADIO_STATIONS.length)%RADIO_STATIONS.length;}
