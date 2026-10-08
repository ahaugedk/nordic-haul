import { Color4,ParticleSystem,RawTexture,Scene,Texture,Vector3 } from '@babylonjs/core';
import type { RaceSnapshot } from './simulation';

/** Small reusable bursts; no per-impact textures or vehicle-model changes. */
export class CollisionSparks {
  private systems:ParticleSystem[]=[];private cursor=0;private lastId=0;private lastTime=0;
  constructor(scene:Scene){
    const size=32,data=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const radius=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2)),offset=(y*size+x)*4;
      data[offset]=255;data[offset+1]=235;data[offset+2]=160;data[offset+3]=Math.round(Math.max(0,1-radius)**2*255);
    }
    const texture=RawTexture.CreateRGBATexture(data,size,size,scene,false,false,Texture.BILINEAR_SAMPLINGMODE);
    for(let i=0;i<4;i++){
      const sparks=new ParticleSystem('collision sparks '+i,100,scene);sparks.particleTexture=texture;
      sparks.emitter=Vector3.Zero();sparks.minEmitBox.set(-.03,-.02,-.03);sparks.maxEmitBox.set(.03,.02,.03);
      sparks.color1=new Color4(1,.88,.35,1);sparks.color2=new Color4(1,.34,.045,1);sparks.colorDead=new Color4(.85,.08,.01,0);
      sparks.minSize=.018;sparks.maxSize=.045;sparks.minLifeTime=.2;sparks.maxLifeTime=.5;
      sparks.minScaleX=.4;sparks.maxScaleX=.7;sparks.minScaleY=1.5;sparks.maxScaleY=3;
      sparks.billboardMode=ParticleSystem.BILLBOARDMODE_STRETCHED;sparks.blendMode=ParticleSystem.BLENDMODE_ADD;
      sparks.gravity.set(0,-16,0);sparks.emitRate=0;sparks.updateSpeed=1/60;sparks.applyFog=false;
      this.systems.push(sparks);
    }
  }
  update(s:RaceSnapshot){
    const moving=s.elapsed>this.lastTime;this.lastTime=s.elapsed;
    for(const sparks of this.systems)sparks.updateSpeed=moving?1/60:0;
    for(const hit of s.impacts)if(hit.id>this.lastId){
      this.lastId=hit.id;const sparks=this.systems[this.cursor++%this.systems.length];sparks.stop();sparks.reset();
      (sparks.emitter as Vector3).set(hit.x,hit.y,hit.z);
      sparks.minEmitPower=2+hit.strength*2;sparks.maxEmitPower=4+hit.strength*5;
      // Metal fragments inherit forward momentum before gravity pulls them down.
      const carry=s.speed*.85/((sparks.minEmitPower+sparks.maxEmitPower)/2),fx=Math.sin(s.yaw)*carry,fz=Math.cos(s.yaw)*carry;
      sparks.direction1.set(hit.nx*.45+fx-.5,.8,hit.nz*.45+fz-.5);
      sparks.direction2.set(hit.nx*.9+fx+.5,1.4,hit.nz*.9+fz+.5);
      sparks.manualEmitCount=Math.round(18+hit.strength*60);sparks.start();
    }
  }
  reset(){for(const s of this.systems){s.stop();s.reset();}this.lastId=0;this.lastTime=0;this.cursor=0;}
}
