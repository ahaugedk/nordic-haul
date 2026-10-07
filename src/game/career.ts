import { DEFAULT_CONFIG, START_FUNDS, priceFor, validConfig, type TruckConfig } from '../data/catalog';
import { CITIES } from '../data/europe';
export type Career={version:1;funds:number;truck:TruckConfig;races:number;wins:number;earned:number;currentCity:string};
const key='nordic-haul-career-v1';
export function freshCareer():Career {return {version:1,funds:START_FUNDS-priceFor(DEFAULT_CONFIG),truck:{...DEFAULT_CONFIG},races:0,wins:0,earned:0,currentCity:'aarhus'};}
export function loadCareer(storage:Pick<Storage,'getItem'>=localStorage):Career {
  try {const v=JSON.parse(storage.getItem(key)??'null'); if(v?.version===1&&validConfig(v.truck)&&[v.funds,v.races,v.wins,v.earned].every(x=>Number.isFinite(x)&&x>=0))return {...v,currentCity:CITIES.some(c=>c.id===v.currentCity)?v.currentCity:'aarhus'};}catch{/* Recover safely from an incomplete save. */}
  return freshCareer();
}
export function saveCareer(c:Career,storage:Pick<Storage,'setItem'>=localStorage) {try {storage.setItem(key,JSON.stringify(c));}catch{/* The game still runs when storage is unavailable. */}}
export function upgradeCost(c:Career,draft:TruckConfig){return priceFor(draft)-priceFor(c.truck);}
export function buyConfiguration(c:Career,draft:TruckConfig):Career|null {
  if(!validConfig(draft))return null;
  const cost=upgradeCost(c,draft); if(cost>c.funds)return null;
  return {...c,funds:c.funds-cost,truck:{...draft}};
}
export function settleRace(c:Career,base:number,place:number,withinTime:boolean,destination?:string):{career:Career;payout:number;bonus:number} {
  const bonus=withinTime?Math.round(base*.15):0;
  const payout=Math.round(base*([1,.8,.65][place-1]??.65))+bonus;
  return {career:{...c,funds:c.funds+payout,races:c.races+1,wins:c.wins+(place===1?1:0),earned:c.earned+payout,currentCity:CITIES.some(x=>x.id===destination)?destination!:c.currentCity},payout,bonus};
}
