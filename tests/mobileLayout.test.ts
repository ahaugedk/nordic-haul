import test from 'node:test';
import assert from 'node:assert/strict';
import { isAppleMobile,previewFrame } from '../src/game/mobileLayout.ts';

test('iOS uses the compatibility renderer, including an iPad with a desktop user agent',()=>{
  assert.equal(isAppleMobile('Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile Safari/604.1',5),true);
  assert.equal(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15',5),true);
  assert.equal(isAppleMobile('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15',0),false);
  assert.equal(isAppleMobile('Mozilla/5.0 (Linux; Android 16) Chrome/140 Mobile',5),false);
});
test('garage canvas follows its measured area through Safari toolbar and orientation changes',()=>{
  const portrait={left:0,top:56,width:375,height:246};
  assert.deepEqual(previewFrame(portrait),{left:0,top:100,width:375,height:196});
  assert.deepEqual(previewFrame({...portrait,height:310}),{left:0,top:100,width:375,height:260});
  assert.deepEqual(previewFrame({left:0,top:56,width:470,height:302}),{left:0,top:100,width:470,height:252});
  assert.equal(previewFrame({left:0,top:0,width:0,height:0}),null,'Wait for layout instead of setting an empty or invalid render area');
});
