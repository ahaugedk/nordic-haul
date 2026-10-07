// Public reference data. Prices are estimated new-vehicle increments, ex VAT; not a Volvo quote.
export const SOURCES = {
  builder: 'https://www.volvotrucks.dk/da-dk/tools/truck-builder.html#/da-dk/configurator/fh16aero',
  specification: 'https://www.volvotrucks.dk/content/dam/volvo-trucks/markets/denmark/transport2025/volvo-fh16-aero-780-6x4/fh64t6a_dnk_dan.pdf',
  overview: 'https://www.volvotrucks.dk/content/dam/volvo-trucks/markets/denmark/info-sheets/Volvo-FH16aero-infosheet-da-dk-Global-HR.pdf',
} as const;
export const ENGINES = [
  {id:'D17A600', name:'D17 · 600', hp:600, kw:441, torque:3000, price:0, gearbox:'ATO3112'},
  {id:'D17A700', name:'D17 · 700', hp:700, kw:515, torque:3400, price:80000, gearbox:'ATO3512'},
  {id:'D17A780', name:'D17 · 780', hp:780, kw:574, torque:3800, price:140000, gearbox:'ATO3812'},
] as const;
export const CABS = [
  {id:'FH16ALSL',name:'Lavt langt førerhus',height:147,price:-15000,roof:-.24},
  {id:'FH16ASLP',name:'Langt førerhus',height:171,price:0,roof:0},
  {id:'FH16AHSL',name:'Globetrotter',height:203,price:35000,roof:0.32},
  {id:'FH16AXHS',name:'Globetrotter XL',height:222,price:65000,roof:0.51},
  {id:'FH16AXHE',name:'Globetrotter XXL',height:undefined,price:95000,roof:0.532},
] as const;
export const FINISHES = [
  {id:'2613',name:'Indigo Black Metallic',hex:'#1b2d37',price:8000},
  {id:'2101',name:'Millennium Silver',hex:'#acb5b8',price:8000},
  {id:'2503',name:'Morello Storm',hex:'#71302b',price:8000},
  {id:'2704',name:'Steel Dawn',hex:'#667a82',price:8000},
] as const; // Real builder paint codes; RGB values approximate their appearance on this display.
export const AXLES=[{id:'4x2',name:'4×2 · Medium',price:0,mass:7600},{id:'6x4',name:'6×4 · High',price:130000,mass:8825}] as const;
export type TruckConfig = {engine:typeof ENGINES[number]['id'];cab:typeof CABS[number]['id'];color:string;axle:'4x2'|'6x4';crawler:boolean;cms:boolean;adaptiveLights:boolean;blackEdition:boolean};
export const DEFAULT_CONFIG:TruckConfig = {engine:'D17A600',cab:'FH16AHSL',color:'2613',axle:'6x4',crawler:false,cms:false,adaptiveLights:false,blackEdition:false};
export const START_FUNDS = 1400000;
export const BASE_PRICE = 1050000;
export function engineFor(c:TruckConfig) { return ENGINES.find(e=>e.id===c.engine)!; }
export function cabFor(c:TruckConfig) { return CABS.find(e=>e.id===c.cab)!; }
export function priceFor(c:TruckConfig) { return BASE_PRICE+engineFor(c).price+cabFor(c).price+AXLES.find(a=>a.id===c.axle)!.price+FINISHES.find(f=>f.id===c.color)!.price+(c.crawler?18000:0)+(c.cms?28000:0)+(c.adaptiveLights?12000:0)+(c.blackEdition?18000:0); }
export function validConfig(value:unknown):value is TruckConfig {
  const c=value as TruckConfig;
  return !!c && ENGINES.some(e=>e.id===c.engine) && CABS.some(e=>e.id===c.cab) && FINISHES.some(e=>e.id===c.color) && AXLES.some(e=>e.id===c.axle) && [c.crawler,c.cms,c.adaptiveLights,c.blackEdition].every(x=>typeof x==='boolean');
}
export type Tender={id:string;title:string;location:string;cargo:string;tonnes:number;distance:number;reward:number;par:number;description:string};
export const TENDERS:Tender[] = [
  {id:'harbor',title:'Autobahn kalder',location:'Aarhus · motorvejsbanen',cargo:'Maskindele',tonnes:12,distance:1,reward:42000,par:120,description:'Et motorvejsløb med lange strækninger og stejle bakker. Find din rytme og slå de to andre vognmænd.'},
  {id:'heavy',title:'Den tunge kontrakt',location:'Aarhus · motorvejsbanen',cargo:'Industrimateriel',tonnes:24,distance:1.5,reward:68000,par:180,description:'Mere last, længere distance. De ekstra newtonmeter kan mærkes ud af svingene.'},
  {id:'express',title:'Sidste afgang',location:'Aarhus · motorvejsbanen',cargo:'Reservedele',tonnes:8,distance:2,reward:82000,par:240,description:'To omgange og en stram bonustid. Hold flydende fart og lever før dine konkurrenter.'},
];
