export const SKY_FRAGMENT_SHADER=`
precision highp float;
varying vec3 direction;
uniform float daylight;
uniform float twilight;
uniform vec3 sunDirection;

float skyHash(vec2 p){
  vec3 q=fract(vec3(p.xyx)*.1031);
  q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}

vec3 starlight(vec3 d){
  // Stable sky coordinates: stars stay fixed when the truck or camera moves.
  vec2 uv=vec2(atan(d.z,d.x)*.159154943+.5,asin(clamp(d.y,-1.0,1.0))*.318309886+.5);
  vec2 grid=uv*vec2(256.0,128.0),cell=floor(grid);
  float seed=skyHash(cell+vec2(17.7,83.1));
  // Sparse occupancy, independent sub-cell positions, sizes and luminosity.
  float present=step(.985,seed);
  vec2 center=.18+.64*vec2(skyHash(cell+vec2(93.4,11.7)),skyHash(cell+vec2(41.9,67.2)));
  float radius=mix(.06,.18,skyHash(cell+vec2(29.3,151.8)));
  float luminosity=.18+.82*pow(skyHash(cell+vec2(181.3,7.5)),1.8);
  float point=1.0-smoothstep(radius*.2,radius,length(fract(grid)-center));
  vec3 tint=mix(vec3(.68,.79,1.0),vec3(1.0,.94,.83),skyHash(cell+vec2(3.8,207.6)));
  return tint*point*luminosity*present*smoothstep(.015,.14,d.y);
}

void main(){
  vec3 d=normalize(direction);
  float h=max(d.y,0.0);
  vec3 night=mix(vec3(.028,.043,.09),vec3(.008,.015,.042),pow(h,.45));
  vec3 day=mix(vec3(.63,.76,.82),vec3(.16,.39,.69),pow(h,.55));
  vec3 sky=mix(night,day,daylight);
  sky+=twilight*vec3(.5,.15,.045)*pow(1.0-h,5.0);
  float sunDot=dot(d,sunDirection);
  sky+=vec3(1.0,.82,.5)*smoothstep(.9988,.9996,sunDot)*daylight;
  sky+=vec3(.17,.15,.08)*pow(max(sunDot,0.0),32.0)*daylight;
  sky+=starlight(d)*pow(1.0-daylight,2.0);
  gl_FragColor=vec4(sky,1.0);
}`;
