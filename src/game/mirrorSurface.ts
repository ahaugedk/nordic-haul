/** Match the exported CMS convention: the physical top uses V=0, bottom V=1. */
export function mirrorSurfaceUV(positions:ArrayLike<number>){
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<positions.length;i+=3){minX=Math.min(minX,positions[i]);maxX=Math.max(maxX,positions[i]);minY=Math.min(minY,positions[i+1]);maxY=Math.max(maxY,positions[i+1]);minZ=Math.min(minZ,positions[i+2]);maxZ=Math.max(maxZ,positions[i+2]);}
  const axis=maxX-minX>=maxZ-minZ?0:2,min=axis===0?minX:minZ,span=Math.max(.0001,axis===0?maxX-minX:maxZ-minZ),height=Math.max(.0001,maxY-minY);
  const uv=new Float32Array(positions.length/3*2);
  for(let i=0;i<positions.length;i+=3){uv[i/3*2]=1-(positions[i+axis]-min)/span;uv[i/3*2+1]=1-(positions[i+1]-minY)/height;}
  return uv;
}
/** Render targets sample their top at V=1; the exported screens use V=0. */
export function orientMirrorFeed(texture:{vScale:number;vOffset:number}){texture.vScale=-1;texture.vOffset=1;}
