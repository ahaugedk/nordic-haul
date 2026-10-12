import test from 'node:test';import assert from 'node:assert/strict';
import { TrafficVoice } from '../src/game/trafficVoice.ts';
test('optional traffic speech uses a Danish voice, falls back silently and ignores old cancellation callbacks',()=>{
  const voices:SpeechSynthesisVoice[]=[],messages:SpeechSynthesisUtterance[]=[];let cancelled=0;
  const synthesis={getVoices:()=>voices,speak:(v:SpeechSynthesisUtterance)=>messages.push(v),cancel:()=>cancelled++};
  const radio=new TrafficVoice(synthesis,text=>({text} as SpeechSynthesisUtterance));
  assert.equal(radio.say('Trafikmelding'),false);assert.equal(messages.length,0);
  voices.push({lang:'en-GB'} as SpeechSynthesisVoice);assert.equal(radio.say('Trafikmelding'),false);
  voices.push({lang:'da-DK'} as SpeechSynthesisVoice);assert.equal(radio.say('Højre spor lukket'),true);assert.equal(messages[0].lang,'da-DK');
  assert.equal(radio.say('Venstre spor lukket'),true);assert.equal(cancelled,1);
  messages[0].onend?.({} as SpeechSynthesisEvent);radio.stop();assert.equal(cancelled,2,'Muting must still cancel the newer message');
  radio.stop();assert.equal(cancelled,2);
});
