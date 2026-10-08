/** Narrow windows and wide phones in landscape; desktop styles stay separate. */
export const MOBILE_LAYOUT_QUERY='(max-width: 799px), (max-height: 500px) and (pointer: coarse)';
export const isMobileLayout=()=>matchMedia(MOBILE_LAYOUT_QUERY).matches;
export function isAppleMobile(userAgent:string,maxTouchPoints=0){
  return /iPhone|iPad|iPod/.test(userAgent)||(/Macintosh/.test(userAgent)&&maxTouchPoints>1);
}
/** Measured CSS pixels, independent of screen DPR and Safari's browser chrome. */
export function previewFrame(rect:{left:number;top:number;width:number;height:number}){
  if(rect.width<1||rect.height<50)return null;
  return {left:rect.left,top:rect.top+44,width:rect.width,height:Math.max(1,rect.height-50)};
}
