import test from 'node:test';import assert from 'node:assert/strict';
import { CITIES,tendersFrom,cityFor,project } from '../src/data/europe.ts';
import { freshCareer,settleRace,saveCareer,loadCareer } from '../src/game/career.ts';
test('every city has three valid onward jobs without a job to itself',()=>{
  for(const c of CITIES){const jobs=tendersFrom(c.id);assert.equal(jobs.length,3);assert.equal(new Set(jobs.map(j=>j.destination)).size,3);for(const j of jobs){assert.equal(j.origin,c.id);assert.notEqual(j.destination,c.id);assert.ok(CITIES.some(x=>x.id===j.destination));assert.ok(j.reward>0);assert.ok(j.roadKm>0);const p=project(cityFor(j.destination).lon,cityFor(j.destination).lat);assert.ok(p.x>0&&p.x<1100&&p.y>0&&p.y<820);}}
});
test('delivery relocates the career and reload preserves onward contracts',()=>{
  const c=freshCareer(),job=tendersFrom(c.currentCity)[0];
  const next=settleRace(c,job.reward,1,true,job.destination).career;
  assert.equal(next.currentCity,'hamburg');assert.equal(c.currentCity,'aarhus');
  assert.ok(tendersFrom(next.currentCity).every(j=>j.origin==='hamburg'));
  let data='';const storage={getItem:()=>data,setItem:(_k:string,v:string)=>{data=v;}};saveCareer(next,storage);assert.equal(loadCareer(storage).currentCity,'hamburg');
});
