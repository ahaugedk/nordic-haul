import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG,START_FUNDS,priceFor,validConfig } from '../src/data/catalog.ts';
import { freshCareer,buyConfiguration,settleRace,loadCareer,saveCareer,upgradeCost } from '../src/game/career.ts';
test('starting capital includes the truck and the chosen truck is paid for only once',()=>{
  const career=freshCareer();
  assert.equal(career.funds,START_FUNDS);assert.equal(career.ownsTruck,false);
  const draft={...career.truck,cms:true};
  assert.equal(upgradeCost(career,draft),priceFor(draft));
  const bought=buyConfiguration(career,draft)!;
  assert.equal(bought.funds,START_FUNDS-priceFor(draft));assert.equal(bought.ownsTruck,true);
  assert.equal(career.funds,START_FUNDS);assert.equal(career.ownsTruck,false);
  assert.deepEqual(buyConfiguration(bought,draft),bought);
  assert.equal(buyConfiguration({...career,funds:priceFor(draft)-1},draft),null);
  assert.equal(buyConfiguration({...career,funds:priceFor(draft)},draft)!.funds,0);
  assert.equal(buyConfiguration(career,DEFAULT_CONFIG)!.funds,32000);
});
test('after purchase an upgrade deducts only the configuration difference and refuses debt',()=>{
  const starter=buyConfiguration(freshCareer(),DEFAULT_CONFIG)!;
  const career=settleRace(settleRace(starter,42000,1,true).career,42000,1,true).career,upgrade={...career.truck,engine:'D17A780' as const};
  const bought=buyConfiguration(career,upgrade)!;
  assert.equal(bought.funds,career.funds-120000);
  assert.equal(career.truck.engine,'D17A600');
  assert.equal(buyConfiguration({...career,funds:100},upgrade),null);
  const back=buyConfiguration(bought,career.truck)!;assert.equal(back.funds,career.funds);
});
test('the standard start forces equipment choices and engines unlock through race earnings',()=>{
  const c=freshCareer(),starter=buyConfiguration(c,DEFAULT_CONFIG)!;
  assert.equal(c.funds,1200000);assert.equal(starter.funds,32000);
  const flags=['crawler','cms','adaptiveLights','blackEdition'] as const;
  let maxExtras=0;
  for(let mask=0;mask<16;mask++){
    const draft={...DEFAULT_CONFIG};flags.forEach((key,i)=>draft[key]=!!(mask&(1<<i)));
    if(buyConfiguration(c,draft))maxExtras=Math.max(maxExtras,flags.filter(key=>draft[key]).length);
  }
  assert.equal(maxExtras,2,'A standard starter cannot buy nearly every add-on');
  const motor700={...DEFAULT_CONFIG,engine:'D17A700' as const},motor780={...DEFAULT_CONFIG,engine:'D17A780' as const};
  assert.equal(buyConfiguration(c,motor700),null);assert.equal(buyConfiguration(c,motor780),null);
  const win=settleRace(starter,42000,1,true).career;
  assert.ok(buyConfiguration(win,motor700));assert.equal(buyConfiguration(win,motor780),null);
  assert.ok(buyConfiguration(settleRace(win,42000,1,true).career,motor780));
  assert.ok(buyConfiguration(c,{...DEFAULT_CONFIG,axle:'4x2',engine:'D17A780'}),'A cheaper chassis remains a valid funding trade-off');
});
test('old unspent initial grants are rebalanced while purchased and progressed careers retain their funds',()=>{
  const unstarted={...freshCareer(),funds:1400000,truck:{...DEFAULT_CONFIG,cms:true}};
  const load=(c:object)=>loadCareer({getItem:()=>JSON.stringify(c)});
  assert.deepEqual(load(unstarted),{...unstarted,funds:1200000});
  for(const c of [
    {...unstarted,ownsTruck:true,funds:232000},
    {...unstarted,ownsTruck:true,funds:87000,truck:{...DEFAULT_CONFIG,engine:'D17A780' as const,cms:true}},
    {...unstarted,ownsTruck:true,races:2,earned:100000,funds:332000},
  ])assert.deepEqual(load(c),c);
});
test('placing and time bonus settle once through an immutable career update',()=>{
  const c=buyConfiguration(freshCareer(),DEFAULT_CONFIG)!,paid=settleRace(c,42000,2,true);
  assert.equal(paid.payout,39900);assert.equal(paid.career.funds,c.funds+39900);assert.equal(paid.career.races,1);assert.equal(paid.career.wins,0);assert.equal(c.races,0);
});
test('career survives reload and malformed saves are rejected',()=>{
  let stored='';const storage={getItem:()=>stored,setItem:(_k:string,v:string)=>{stored=v;}};
  saveCareer(freshCareer(),storage);assert.deepEqual(loadCareer(storage),freshCareer());
  const bought=buyConfiguration(freshCareer(),DEFAULT_CONFIG)!;
  saveCareer(bought,storage);assert.deepEqual(loadCareer(storage),bought);
  assert.equal(upgradeCost(loadCareer(storage),DEFAULT_CONFIG),0);
  const c=settleRace(bought,42000,1,false).career;saveCareer(c,storage);assert.deepEqual(loadCareer(storage),c);
  stored='{"version":1,"funds":-1}';assert.deepEqual(loadCareer(storage),freshCareer());
  assert.equal(validConfig({...DEFAULT_CONFIG,color:'invented paint'}),false);
  assert.equal(priceFor(DEFAULT_CONFIG),1168000);
});
test('legacy untouched starts regain initial capital while established careers keep their truck and money',()=>{
  const legacy={...freshCareer(),version:1,ownsTruck:undefined};
  const load=(changes:object)=>loadCareer({getItem:()=>JSON.stringify({...legacy,...changes})});
  for(const funds of [177000,232000])assert.deepEqual(load({funds}),freshCareer());
  for(const changes of [
    {funds:177000,races:1,wins:1,earned:42000},
    {funds:177000,currentCity:'hamburg'},
    {funds:57000,truck:{...DEFAULT_CONFIG,engine:'D17A780'}},
    {funds:250000},
  ]){
    const loaded=load(changes);assert.equal(loaded.ownsTruck,true);assert.equal(loaded.version,2);
    assert.equal(loaded.funds,(changes as {funds:number}).funds);
    assert.deepEqual(loaded.truck,'truck' in changes?changes.truck:DEFAULT_CONFIG);
    assert.equal(upgradeCost(loaded,loaded.truck),0);
  }
});
