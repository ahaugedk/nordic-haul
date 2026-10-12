import { engineFor,type TruckConfig,type Tender } from '../data/catalog';
import { transportMass } from './drivetrain';
export const ECO_PAY_PER_LITRE=50;
export type FuelMode='idle'|'coast'|'climb'|'steady'|'waste';
export type FuelSnapshot={remaining:number;start:number;used:number;percent:number;instant:number|null;hourly:number;average:number;mode:FuelMode;empty:boolean};
export function virtualRoadKm(tender:Tender){const value=(tender as Tender&{roadKm?:number}).roadKm;return value&&Number.isFinite(value)&&value>0?value:tender.distance*360;}
/** Trip fuel allowance, not an OEM tank-capacity specification. */
export function startFuel(tender:Tender){return Math.ceil((virtualRoadKm(tender)*(.36+tender.tonnes*.0025)+10)/5)*5;}
export function economyBonus(litres:number){return Math.floor(Math.max(0,Number.isFinite(litres)?litres:0)*ECO_PAY_PER_LITRE);}
/** Calibrated game consumption: load, grade, speed and pedal choice matter. */
export function fuelDemand(truck:TruckConfig,tonnes:number,speed:number,grade:number,throttle:boolean,brake:boolean){
  const mass=transportMass(truck,tonnes),kph=speed*3.6;
  const uphill=Math.max(0,grade)*400*(mass/30000);
  const load=Math.max(0,(mass-22000)/1000)*.35;
  const drag=10*((kph/80)**2-1);
  const engine=1+Math.max(0,engineFor(truck).kw/441-1)*.04;
  const per100=throttle?Math.max(20,Math.min(180,(29+load+uphill+drag+(grade<-.025?8:0)+(brake?18:0))*1.4*engine*(truck.cms?.985:1))):0;
  const hourly=throttle?18+engineFor(truck).kw*.04:2;
  const mode:FuelMode=speed<2.2?'idle':!throttle?'coast':grade>.025?'climb':grade<-.025||kph>90||brake?'waste':'steady';
  return {per100,hourly,mode};
}
export class FuelMeter {
  readonly start:number;readonly scale:number;remaining:number;distanceKm=0;
  private current:number|null=null;private hourly=2;private mode:FuelMode='idle';private smoothed=0;
  constructor(private truck:TruckConfig,private tender:Tender,physicalMetres:number,private enabled=true){
    this.start=startFuel(tender);this.remaining=this.start;this.scale=virtualRoadKm(tender)/(Math.max(1,physicalMetres)/1000);
  }
  step(dt:number,metres:number,speed:number,grade:number,throttle:boolean,brake:boolean){
    if(!this.enabled||this.empty)return;
    const demand=fuelDemand(this.truck,this.tender.tonnes,speed,grade,throttle,brake),km=Math.max(0,metres)/1000*this.scale;
    this.distanceKm+=km;this.mode=demand.mode;this.hourly=demand.hourly;
    this.smoothed+=(demand.per100-this.smoothed)*Math.min(1,dt*3);this.current=speed<2.2?null:this.smoothed;
    const burn=speed<2.2?demand.hourly*this.scale*dt/3600:km*demand.per100/100;
    this.remaining=Math.max(0,this.remaining-burn);
  }
  get empty(){return this.enabled&&this.remaining<=1e-6;}
  snapshot():FuelSnapshot{
    const used=this.start-this.remaining;
    return {remaining:this.remaining,start:this.start,used,percent:Math.max(0,Math.min(1,this.remaining/this.start)),instant:this.current,hourly:this.hourly,average:this.distanceKm>.1?used/this.distanceKm*100:0,mode:this.mode,empty:this.empty};
  }
}
