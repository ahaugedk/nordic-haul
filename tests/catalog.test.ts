import test from 'node:test';import assert from 'node:assert/strict';
import { AXLES,CABS,ENGINES,FINISHES,DEFAULT_CONFIG,OPTION_PRICES,CRAWLER_SPEC,priceFor,validConfig } from '../src/data/catalog.ts';
import { transportMass } from '../src/game/drivetrain.ts';
import { loadCareer,saveCareer,freshCareer,buyConfiguration } from '../src/game/career.ts';
test('audited D17 powers, torque and gearbox pairs match the manufacturer matrix',()=>{
  assert.deepEqual(ENGINES.map(e=>[e.id,e.hp,e.kw,e.torque,e.gearbox]),[['D17A600',600,441,3000,'ATO3112'],['D17A700',700,515,3400,'ATO3512'],['D17A780',780,574,3800,'ATO3812']]);
  assert.deepEqual(CABS.map(c=>[c.id,c.height,c.tunnelHeight]),[['FH16ALSL',147,138],['FH16ASLP',171,162],['FH16AHSL',205,196],['FH16AXHS',220,211],['FH16AXHE',220,211]]);
  assert.deepEqual(FINISHES.map(c=>[c.id,c.name]),[['2613','Indigo Black Metallic'],['2101','Millennium Silver'],['2503','Morello Storm'],['2704','Steel Dawn']]);
});
test('every exposed combination stays internally consistent and prices each equipment option once',()=>{
  for(const engine of ENGINES)for(const cab of CABS)for(const axle of AXLES)for(const color of FINISHES){
    const base={...DEFAULT_CONFIG,engine:engine.id,cab:cab.id,axle:axle.id,color:color.id,crawler:false,cms:false,adaptiveLights:false,blackEdition:false};assert.equal(validConfig(base),true);
    for(let mask=0;mask<16;mask++){const config={...base,crawler:!!(mask&1),cms:!!(mask&2),adaptiveLights:!!(mask&4),blackEdition:!!(mask&8)};
      assert.equal(validConfig(config),true);const extras=(config.crawler?OPTION_PRICES.crawler:0)+(config.cms?OPTION_PRICES.cms:0)+(config.adaptiveLights?OPTION_PRICES.adaptiveLights:0)+(config.blackEdition?OPTION_PRICES.blackEdition:0);
      assert.equal(priceFor(config)-priceFor(base),extras);
    }
  }
  assert.equal(transportMass({...DEFAULT_CONFIG,crawler:true},24)-transportMass(DEFAULT_CONFIG,24),CRAWLER_SPEC.addedMass);
});
test('price recalibration preserves saved money and the same owned truck',()=>{
  const career={...freshCareer(),funds:177000};let data='';const storage={getItem:()=>data,setItem:(_k:string,v:string)=>{data=v;}};
  saveCareer(career,storage);const loaded=loadCareer(storage);assert.deepEqual(loaded,career);
  const upgrade={...loaded.truck,engine:'D17A780' as const};assert.equal(buyConfiguration(loaded,upgrade)!.funds,57000);
  assert.equal(priceFor(DEFAULT_CONFIG),1168000);
});
