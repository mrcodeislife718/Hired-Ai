import test from 'node:test';
import assert from 'node:assert/strict';
import { CareerTwin } from '../src/career-twin.js';
import { assessEmployerQuality, employerQualityAllowsRecommendation } from '../src/employer-quality.js';

test('Career Twin preserves provenance and prevents confirmed inference', () => {
  const twin = new CareerTwin('candidate-1');
  const before = twin.current();
  const after = twin.update('preferredWork', {
    key:'preferredWork', value:['systems design','building products'], source:'user', confidence:'confirmed', evidenceIds:[], observedAt:new Date().toISOString()
  });
  assert.equal(after.version, before.version + 1);
  assert.deepEqual(after.preferredWork.value, ['systems design','building products']);
  assert.throws(() => twin.update('values', {
    key:'values', value:['autonomy'], source:'inference', confidence:'confirmed', evidenceIds:[], observedAt:new Date().toISOString()
  }), /inference cannot be marked confirmed/);
});

test('high-confidence employer warning requires review before recommendation', () => {
  const result = assessEmployerQuality([
    { id:'s1', label:'role materially misrepresented in repeated verified reports', severity:'high-risk', confidence:90, source:'verified-outcomes', evidence:'multiple attributable post-hire outcomes' }
  ]);
  assert.equal(result.recommendation, 'do-not-recommend-without-review');
  assert.equal(employerQualityAllowsRecommendation(result), false);
});

test('unknown employer conditions reduce confidence instead of fabricating certainty', () => {
  const result = assessEmployerQuality([], ['manager quality unknown','team autonomy unknown','retention history unknown']);
  assert.ok(result.confidence < 40);
  assert.ok(result.unknowns.length === 3);
});
