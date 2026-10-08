/** Narrow windows and wide phones in landscape; desktop styles stay separate. */
export const MOBILE_LAYOUT_QUERY='(max-width: 799px), (max-height: 500px) and (pointer: coarse)';
export const isMobileLayout=()=>matchMedia(MOBILE_LAYOUT_QUERY).matches;
