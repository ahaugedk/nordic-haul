/** One full day per 24 real seconds: 2.5 days per minute of unpaused race time. */
export const DAY_SECONDS=24;
export function dayCycle(elapsed:number){
  const totalHours=8+elapsed/DAY_SECONDS*24,hour=totalHours%24,day=1+Math.floor(totalHours/24);
  const sun=Math.sin((hour-6)/24*Math.PI*2);
  const daylight=Math.max(0,Math.min(1,(sun+.12)/.48));
  const twilight=Math.max(0,1-Math.abs(sun)/.24);
  return {day,hour,sun,daylight,twilight,night:daylight<.3,label:`DAG ${day} · ${Math.floor(hour).toString().padStart(2,'0')}:${Math.floor(hour%1*60).toString().padStart(2,'0')}`};
}
