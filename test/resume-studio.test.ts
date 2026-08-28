import test from 'node:test';
import assert from 'node:assert/strict';
import { MayaResumeStudio } from '../src/resume-studio.js';
import { testEvidence } from './test-records.js';

const studio = new MayaResumeStudio();
const evidence=testEvidence();
const raw = `Professional Summary\nSoftware engineer building production systems.\nSkills: TypeScript, Node.js, Python\nPortfolio: https://test.invalid/work\nEmail: person@test.invalid\nBuilt and launched reliable APIs in 2026.`;

test('free tier can create an ATS-safe professional resume package', () => {
  const pkg = studio.build({ access:'free', rawResumeText:raw, evidence, identity:'Software Engineer' });
  assert.equal(pkg.template.id, 'ats-classic');
  assert.equal(pkg.template.atsSafe, true);
  assert.ok(pkg.audit.overall > 0);
});

test('free tier cannot silently use paid templates', () => {
  assert.throws(() => studio.build({ access:'free', rawResumeText:raw, evidence, templateId:'technical-impact' }), /requires career access/);
});

test('targeted resume exposes missing evidence instead of fabricating fit', () => {
  const pkg = studio.build({ access:'career', rawResumeText:raw, evidence, identity:'Software Engineer', targetTitle:'Staff Rust Engineer', targetRequirements:['TypeScript','Rust'], templateId:'technical-impact' });
  assert.ok(pkg.audit.missingEvidence.includes('Rust'));
  assert.doesNotMatch(pkg.sections.summary, /expert in Rust/i);
});

test('creative template warns that an ATS-safe companion is required', () => {
  const pkg = studio.build({ access:'pro', rawResumeText:raw, evidence, templateId:'creative-editorial' });
  assert.equal(pkg.template.atsSafe, false);
  assert.ok(pkg.audit.warnings.some(x => /ATS-safe companion/i.test(x)));
});
