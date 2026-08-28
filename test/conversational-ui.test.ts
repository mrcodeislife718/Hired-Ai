import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMayaPage } from '../src/web-ui.js';

test('career product is conversation-first rather than dashboard-first',()=>{
 const html=renderMayaPage();
 assert.match(html,/Your career, handled as a conversation/i);
 assert.match(html,/Message Maya/i);
 assert.match(html,/New conversation/i);
 assert.match(html,/\/api\/maya\/chat/);
 assert.match(html,/Help me change careers/i);
 assert.match(html,/Help me advance/i);
 assert.doesNotMatch(html,/panelGrid/);
 assert.doesNotMatch(html,/career dashboard/i);
 assert.doesNotMatch(html,/Senior Backend Engineer/);
 assert.doesNotMatch(html,/\$165K/);
});
