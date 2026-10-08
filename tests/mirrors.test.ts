import test from 'node:test';import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine,RenderTargetTexture,Scene } from '@babylonjs/core';
import { mirrorSurfaceUV,orientMirrorFeed } from '../src/game/mirrorSurface.ts';

test('the actual camera texture maps the top of both exported CMS screens to the top of the render target',()=>{
  const bytes=readFileSync(new URL('../public/models/fh16-aero.glb',import.meta.url)),length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length).toString()),binary=bytes.subarray(28+length);
  const engine=new NullEngine(),scene=new Scene(engine),texture=new RenderTargetTexture('regression',{width:256,height:512},scene,false);
  orientMirrorFeed(texture);const matrix=texture.getTextureMatrix().m;
  const read=(accessor:number,index:number,component:number,width:number)=>{const a=gltf.accessors[accessor],v=gltf.bufferViews[a.bufferView];return binary.readFloatLE((v.byteOffset??0)+(a.byteOffset??0)+index*(v.byteStride??width*4)+component*4);};
  const nodes=gltf.nodes.filter((n:{name:string})=>n.name.startsWith('cms_screen'));assert.equal(nodes.length,2);
  for(const n of nodes){const a=gltf.meshes[n.mesh].primitives[0].attributes,rows=Array.from({length:gltf.accessors[a.POSITION].count},(_,i)=>({y:read(a.POSITION,i,1,3),u:read(a.TEXCOORD_0,i,0,2),v:read(a.TEXCOORD_0,i,1,2)}));
    const top=rows.reduce((a,b)=>a.y>b.y?a:b),bottom=rows.reduce((a,b)=>a.y<b.y?a:b);
    const sample=(p:{u:number;v:number})=>p.u*matrix[1]+p.v*matrix[5]+matrix[9];
    assert.ok(sample(top)>.98);assert.ok(sample(bottom)<.02);
  }
  texture.dispose();scene.dispose();engine.dispose();
});
test('rounded optical mirror surfaces use the same upright convention without atlas UV distortions',()=>{
  const uv=mirrorSurfaceUV(new Float32Array([-1.6,2.6,2.4,-1.4,2.6,2.4,-1.6,3.5,2.4,-1.4,3.5,2.4]));
  assert.deepEqual(Array.from(uv),[1,1,0,1,1,0,0,0]);
});
