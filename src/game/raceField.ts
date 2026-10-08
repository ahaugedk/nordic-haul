import type { TruckConfig } from '../data/catalog';

export const RIVALS:readonly {name:string;color:string;engine:TruckConfig['engine'];tonnes:number;maxSpeed:number}[]=[
  {name:'NORDIC',color:'#cbd7d8',engine:'D17A600',tonnes:12,maxSpeed:26},
  {name:'STORM',color:'#e2ad55',engine:'D17A700',tonnes:16,maxSpeed:27},
  {name:'AURORA',color:'#7dc7e9',engine:'D17A780',tonnes:24,maxSpeed:28},
  {name:'VIKING',color:'#e77969',engine:'D17A600',tonnes:8,maxSpeed:27.5},
  {name:'TITAN',color:'#98bd7a',engine:'D17A780',tonnes:20,maxSpeed:29},
  {name:'POLAR',color:'#bca4dd',engine:'D17A700',tonnes:12,maxSpeed:28.5},
];
export const FIELD_SIZE=RIVALS.length+1;
export const GRID_ORIGIN=80,GRID_ROW_SPACING=48;
export type GridSlot={distance:number;lane:number;row:number};
/** Two staggered outer columns leave the middle lane clear for every start. */
export function startingGrid(random:()=>number=Math.random){
  const rows=Math.ceil(FIELD_SIZE/2),side=random()<.5?1:-1;
  const slots:GridSlot[]=Array.from({length:FIELD_SIZE},(_,i)=>({
    distance:GRID_ORIGIN+(rows-1-Math.floor(i/2))*GRID_ROW_SPACING+(i%2)*8,
    lane:(i%2?3.5:-3.5)*side,row:Math.floor(i/2)+1,
  }));
  // Fisher–Yates puts the player and each rival into a fresh, unique slot.
  for(let i=slots.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
  const [player,...rivals]=slots;
  return {player,rivals,place:1+rivals.filter(s=>s.distance>player.distance).length};
}
