import type { Tender } from './catalog';
export type City={id:string;name:string;country:string;lon:number;lat:number};
export const CITIES:City[]=[
 {id:'aarhus',name:'Aarhus',country:'Danmark',lon:10.2039,lat:56.1629},
 {id:'copenhagen',name:'København',country:'Danmark',lon:12.5683,lat:55.6761},
 {id:'gothenburg',name:'Göteborg',country:'Sverige',lon:11.9746,lat:57.7089},
 {id:'oslo',name:'Oslo',country:'Norge',lon:10.7522,lat:59.9139},
 {id:'stockholm',name:'Stockholm',country:'Sverige',lon:18.0686,lat:59.3293},
 {id:'hamburg',name:'Hamburg',country:'Tyskland',lon:9.9937,lat:53.5511},
 {id:'berlin',name:'Berlin',country:'Tyskland',lon:13.405,lat:52.52},
 {id:'rotterdam',name:'Rotterdam',country:'Nederlandene',lon:4.4777,lat:51.9244},
 {id:'paris',name:'Paris',country:'Frankrig',lon:2.3522,lat:48.8566},
 {id:'lyon',name:'Lyon',country:'Frankrig',lon:4.8357,lat:45.764},
 {id:'munich',name:'München',country:'Tyskland',lon:11.582,lat:48.1351},
 {id:'milan',name:'Milano',country:'Italien',lon:9.19,lat:45.4642},
 {id:'prague',name:'Prag',country:'Tjekkiet',lon:14.4378,lat:50.0755},
 {id:'warsaw',name:'Warszawa',country:'Polen',lon:21.0122,lat:52.2297},
 {id:'vienna',name:'Wien',country:'Østrig',lon:16.3738,lat:48.2082},
 {id:'barcelona',name:'Barcelona',country:'Spanien',lon:2.1734,lat:41.3851},
];
const links:Record<string,string[]>={aarhus:['hamburg','copenhagen','gothenburg'],copenhagen:['berlin','gothenburg','hamburg'],gothenburg:['oslo','stockholm','copenhagen'],oslo:['gothenburg','stockholm','aarhus'],stockholm:['gothenburg','copenhagen','warsaw'],hamburg:['rotterdam','berlin','aarhus'],berlin:['warsaw','prague','hamburg'],rotterdam:['paris','hamburg','lyon'],paris:['lyon','rotterdam','barcelona'],lyon:['milan','paris','barcelona'],munich:['milan','vienna','hamburg'],milan:['lyon','munich','vienna'],prague:['munich','vienna','berlin'],warsaw:['berlin','vienna','stockholm'],vienna:['milan','prague','warsaw'],barcelona:['lyon','paris','milan']};
export function cityFor(id:string){return CITIES.find(c=>c.id===id)??CITIES[0];}
export function project(lon:number,lat:number){const merc=(v:number)=>Math.log(Math.tan(Math.PI/4+v*Math.PI/360));return {x:(lon+14)/54*1100,y:28+(merc(70)-merc(Math.min(82,Math.max(-82,lat))))/(merc(70)-merc(35))*755};}
export function approximateRoadKm(a:City,b:City){const rad=Math.PI/180;const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;return Math.round(6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))*1.25/10)*10;}
export type TravelTender=Tender&{origin:string;destination:string;roadKm:number};
export const LOAD_TIERS=[{tonnes:8,label:'Let last',risk:'Lettere at vinde'},{tonnes:16,label:'Mellemtung last',risk:'Kræver god fart op ad bakkerne'},{tonnes:24,label:'Tung last',risk:'Sværere at vinde · højere betaling'}] as const;
export function cargoPremium(tonnes:number){return Math.round(tonnes*1100);}
export function withLoad(job:TravelTender,tonnes:number):TravelTender{
  if(!LOAD_TIERS.some(t=>t.tonnes===tonnes))return job;
  return {...job,tonnes,reward:job.reward-cargoPremium(job.tonnes)+cargoPremium(tonnes)};
}
export function tendersFrom(id:string):TravelTender[]{
  const a=cityFor(id);
  return (links[a.id]??links.aarhus).map((dest,i)=>{
    const b=cityFor(dest),km=approximateRoadKm(a,b),tonnes=[8,24,16][i],distance=[1,1.25,1.5][i];
    return {id:`${a.id}-${b.id}`,title:`${a.name} → ${b.name}`,origin:a.id,destination:b.id,location:`${a.country} / ${b.country}`,cargo:['Maskindele','Industrimateriel','Reservedele'][i],tonnes,distance,reward:Math.round((27000+km*38)/1000)*1000+cargoPremium(tonnes),par:Math.round(120*distance),roadKm:km,description:'Tre spor, to rivaler og bakker op til 7 %. Vælg last: flere ton giver større præmie, men koster fart opad.'};
  });
}
export function routePath(a:City,b:City){const p=project(a.lon,a.lat),q=project(b.lon,b.lat);return `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${((p.x+q.x)/2-22).toFixed(1)},${((p.y+q.y)/2-30).toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`;}
