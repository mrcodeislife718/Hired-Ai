import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMayaPage } from '../src/web-ui.js';

test('production conversation UI contains no placeholder attributes',()=>{
  const html=renderMayaPage();
  assert.doesNotMatch(html,/\bplaceholder\s*=/i);
  assert.match(html,/aria-label="Tell Maya what you want from your career"/);
  assert.match(html,/aria-label="Message Maya"/);
});
