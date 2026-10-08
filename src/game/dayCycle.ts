/** The sky clock is independent of route distance, race time and bonus deadlines. */
export const DAY_SECONDS=40;
export const DAY_CYCLE_LABEL=`${(60/DAY_SECONDS).toLocaleString('da-DK')} DØGN / MINUT`;
export function dayCycle(elapsed:number){
  const totalHours=8+elapsed/DAY_SECONDS*24,hour=totalHours%24,day=1+Math.floor(totalHours/24);
  const sun=Math.sin((hour-6)/24*Math.PI*2);
  const daylight=Math.max(0,Math.min(1,(sun+.12)/.48));
  const twilight=Math.max(0,1-Math.abs(sun)/.24);
  return {day,hour,sun,daylight,twilight,night:daylight<.3,label:`DAG ${day} · ${Math.floor(hour).toString().padStart(2,'0')}:${Math.floor(hour%1*60).toString().padStart(2,'0')}`};
}
