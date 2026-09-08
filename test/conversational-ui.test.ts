import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMayaPage } from '../src/web-ui.js';

test('career product is conversation-first rather than dashboard-first',()=>{
 const html=renderMayaPage();
 assert.match(html,/Your career, handled as a conversation/i);
 assert.match(html,/Message Maya/i);
 assert.match(html,/New conversation/i);
 assert.match(html,/\/api\/maya\/chat/);
 assert.match(html,/career transition plan/i);
 assert.match(html,/Help me advance/i);
 assert.match(html,/guided onboarding/i);
 assert.doesNotMatch(html,/panelGrid/);
 assert.doesNotMatch(html,/career dashboard/i);
 assert.doesNotMatch(html,/Senior Backend Engineer/);
 assert.doesNotMatch(html,/\$165K/);
});

test('Maya voice is explicit opt-in and remains part of the same conversation',()=>{
 const html=renderMayaPage();
 assert.match(html,/Talk to Maya/i);
 assert.match(html,/spoken replies/i);
 assert.match(html,/SpeechRecognition|webkitSpeechRecognition/);
 assert.match(html,/SpeechSynthesisUtterance/);
 assert.match(html,/Maya only listens after you press the microphone/i);
 assert.match(html,/toggleListening/);
 assert.match(html,/toggleVoiceOutput/);
 assert.match(html,/localStorage\.getItem\('mayaVoiceOutput'\)/);
});
