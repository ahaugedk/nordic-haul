import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';

const bytes=readFileSync(new URL('../public/models/fh16-aero.glb',import.meta.url));
const jsonLength=bytes.readUInt32LE(12);
const gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
const binary=bytes.subarray(28+jsonLength);

test('shipping Blender export preserves configurable modules and excludes superseded geometry',()=>{
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const names=gltf.nodes.map((n:{name:string})=>n.name);
  for(const prefix of ['cab_roof_shell','rear_axle_module','steering_assembly_rim','instrument_screen','navigation_screen','cms_screen','mirror_','aero_front_skin','fifth_wheel'])
    assert.ok(names.some((n:string)=>n.startsWith(prefix)),`Missing runtime module: ${prefix}`);
  assert.ok(!names.some((n:string)=>/Orphan|^front_fascia|^cab_front_lower/.test(n)));
  for(const name of ['body_paint','glass','trim','cloth'])
    assert.ok(gltf.materials.some((m:{name:string})=>m.name===name),`Missing configurable material: ${name}`);
});

test('all exported mesh attributes and triangle references are valid',()=>{
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
    const position=gltf.accessors[primitive.attributes.POSITION];
    for(const attribute of ['POSITION','NORMAL']){
      const a=gltf.accessors[primitive.attributes[attribute]],v=gltf.bufferViews[a.bufferView];
      assert.equal(a.componentType,5126);
      assert.equal(a.count,position.count);
      for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)
        assert.ok(Number.isFinite(binary.readFloatLE((v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??12)+k*4)),`${mesh.name}: non-finite ${attribute}`);
    }
    const a=gltf.accessors[primitive.indices],v=gltf.bufferViews[a.bufferView];
    const width=a.componentType===5125?4:2;
    assert.equal(a.count%3,0);
    for(let i=0;i<a.count;i++){
      const offset=(v.byteOffset??0)+(a.byteOffset??0)+i*width;
      const index=width===4?binary.readUInt32LE(offset):binary.readUInt16LE(offset);
      assert.ok(index<position.count,`${mesh.name}: vertex index outside mesh`);
    }
  }
});

function vertices(node:any){
  const transform=Matrix.Compose(Vector3.FromArray(node.scale??[1,1,1]),Quaternion.FromArray(node.rotation??[0,0,0,1]),Vector3.FromArray(node.translation??[0,0,0]));
  const primitive=gltf.meshes[node.mesh].primitives[0];
  const a=gltf.accessors[primitive.attributes.POSITION],v=gltf.bufferViews[a.bufferView];
  const points:Vector3[]=[];
  for(let i=0;i<a.count;i++){
    const p=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??12);
    const world=Vector3.TransformCoordinates(new Vector3(binary.readFloatLE(p),binary.readFloatLE(p+4),binary.readFloatLE(p+8)),transform);
    points.push(new Vector3(world.x,-world.z,world.y)); // Blender: across, forward, up.
  }
  return {points,primitive};
}

test('driver sightlines reach both displays without crossing their housings',()=>{
  const eye=new Vector3(-.65,.82,3.07);
  const panels=gltf.nodes.filter((n:any)=>/^cockpit_(cluster_shell|instrument_hood|hood_front_edge|navigation_housing)$/.test(n.name));
  assert.equal(panels.length,4);
  for(const name of ['instrument_screen','navigation_screen']){
    const {points:corners}=vertices(gltf.nodes.find((n:any)=>n.name===name));
    const centre=corners.reduce((sum,p)=>sum.add(p),Vector3.Zero()).scale(1/corners.length);
    // Centre and inset corners cover the legible area rather than just one pixel.
    const targets=[centre,...corners.map(p=>Vector3.Lerp(centre,p,.8))];
    for(const target of targets)for(const node of panels){
      const {points,primitive}=vertices(node),a=gltf.accessors[primitive.indices],v=gltf.bufferViews[a.bufferView];
      const width=a.componentType===5125?4:2;
      const index=(i:number)=>{const o=(v.byteOffset??0)+(a.byteOffset??0)+i*width;return width===4?binary.readUInt32LE(o):binary.readUInt16LE(o)};
      const direction=target.subtract(eye);
      for(let i=0;i<a.count;i+=3){
        const p=points[index(i)],e1=points[index(i+1)].subtract(p),e2=points[index(i+2)].subtract(p);
        const h=Vector3.Cross(direction,e2),det=Vector3.Dot(e1,h);if(Math.abs(det)<1e-9)continue;
        const s=eye.subtract(p),u=Vector3.Dot(s,h)/det;if(u<0||u>1)continue;
        const q=Vector3.Cross(s,e1),w=Vector3.Dot(direction,q)/det;if(w<0||u+w>1)continue;
        const distance=Vector3.Dot(e2,q)/det;
        assert.ok(distance<=0||distance>=.999,`${node.name} obscures ${name}`);
      }
    }
  }
});
