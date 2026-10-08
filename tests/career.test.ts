import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG,priceFor,validConfig } from '../src/data/catalog.ts';
import { freshCareer,buyConfiguration,settleRace,loadCareer,saveCareer } from '../src/game/career.ts';
test('a purchase deducts only the configuration difference and refuses debt',()=>{
  const career=freshCareer(),upgrade={...career.truck,engine:'D17A780' as const};
  const bought=buyConfiguration(career,upgrade)!;
  assert.equal(bought.funds,career.funds-120000);
  assert.equal(career.truck.engine,'D17A600');
  assert.equal(buyConfiguration({...career,funds:100},upgrade),null);
  const back=buyConfiguration(bought,career.truck)!;assert.equal(back.funds,career.funds);
});
test('placing and time bonus settle once through an immutable career update',()=>{
  const c=freshCareer(),paid=settleRace(c,42000,2,true);
  assert.equal(paid.payout,39900);assert.equal(paid.career.funds,c.funds+39900);assert.equal(paid.career.races,1);assert.equal(paid.career.wins,0);assert.equal(c.races,0);
});
test('career survives reload and malformed saves are rejected',()=>{
  let stored='';const storage={getItem:()=>stored,setItem:(_k:string,v:string)=>{stored=v;}};
  const c=settleRace(freshCareer(),42000,1,false).career;saveCareer(c,storage);assert.deepEqual(loadCareer(storage),c);
  stored='{"version":1,"funds":-1}';assert.deepEqual(loadCareer(storage),freshCareer());
  assert.equal(validConfig({...DEFAULT_CONFIG,color:'invented paint'}),false);
  assert.equal(priceFor(DEFAULT_CONFIG),1168000);
});
