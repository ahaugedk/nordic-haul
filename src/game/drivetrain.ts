import { AXLES,CRAWLER_SPEC,engineFor,type TruckConfig } from '../data/catalog';
export const MAX_SPEED=33.3;
// Closed-throttle deceleration is accelerated for compressed racing time.
// This is a game calibration, not a real tyre rolling-resistance coefficient.
export const COAST_RESISTANCE_SCALE=4;
export const TRAILER_EMPTY_MASS=6500; // Generic game estimate; not an OEM specification.
export function transportMass(truck:TruckConfig,tonnes:number){return AXLES.find(a=>a.id===truck.axle)!.mass+(truck.crawler?CRAWLER_SPEC.addedMass:0)+TRAILER_EMPTY_MASS+tonnes*1000;}
/** Simplified driveline: engine kW -> tractive power, launch traction limit, rolling resistance, aero drag and grade. */
export function accelerationFor(truck:TruckConfig,tonnes:number,speed:number,grade:number,throttle:boolean,brake:boolean){
  const e=engineFor(truck),mass=transportMass(truck,tonnes);
  // Estimated effective wheel force at launch. Extra payload does not increase the engine's available tractive force.
  const launchForce=63000*(e.torque/3000)*(truck.crawler&&speed<2?1.06:1);
  const force=throttle?Math.min(launchForce,e.kw*1000*.84/Math.max(4,speed)):0;
  const resistance=mass*9.81*.007+4.1*(truck.cms?.98:1)*speed*speed;
  const hill=mass*9.81*grade/Math.sqrt(1+grade*grade);
  const coastDamping=throttle?0:resistance*(COAST_RESISTANCE_SCALE-1);
  return (force-resistance-coastDamping-hill)/mass-(brake?5.4:0);
}
