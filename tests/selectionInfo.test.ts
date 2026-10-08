import test from 'node:test';import assert from 'node:assert/strict';
import { DEFAULT_CONFIG } from '../src/data/catalog.ts';
import { selectedPartInfo,type SelectedPart } from '../src/game/selectionInfo.ts';
test('manufacturer info follows the current engine and linked gearbox',()=>{
  const truck={...DEFAULT_CONFIG,engine:'D17A780' as const};const engine=selectedPartInfo('engine',truck),gear=selectedPartInfo('gear',truck);
  assert.match(engine.title,/780/);assert.ok(engine.facts.some(([,value])=>value.includes('574 kW')));assert.ok(engine.facts.some(([,value])=>value.includes('ATO3812')));
  assert.match(gear.title,/ATO3812/);assert.ok(gear.facts.some(([,value])=>value.includes('3.800')));
  const crawler=selectedPartInfo('gear',{...truck,crawler:true});assert.ok(crawler.facts.some(([,v])=>v==='ASO-C'));assert.ok(crawler.facts.some(([,v])=>v==='48 kg'));
});
test('every selectable part has a manufacturer source and correct XXL/Black Edition scope',()=>{
  for(const part of ['engine','gear','cab','axle','mirror','lights','interior','paint'] as SelectedPart[]){const info=selectedPartInfo(part,DEFAULT_CONFIG);assert.ok(info.title&&info.description&&info.facts.length);assert.match(info.source,/^https:\/\/(www\.volvotrucks\.dk|stpi\.it\.volvo\.com)\//);}
  const xxl=selectedPartInfo('cab',{...DEFAULT_CONFIG,cab:'FH16AXHE'});assert.ok(xxl.facts.some(([,v])=>v==='220 cm'));assert.ok(xxl.facts.some(([,v])=>v==='213 cm'));
  const interior=selectedPartInfo('interior',{...DEFAULT_CONFIG,blackEdition:true});assert.match(interior.description,/stolebetræk og dørpaneler/);
});
