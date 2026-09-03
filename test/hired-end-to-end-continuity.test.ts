import test from 'node:test';
import assert from 'node:assert/strict';
import { mayaLanguagePrompt } from '../src/maya-language.js';
import { CareerInsightLedger, type InsightEvent } from '../src/career-insight-network.js';
import { createTrainingManifest } from '../src/proprietary-maya-model.js';
import { employerGrowthPlan, validateGrowthPlan } from '../src/employer-growth-pricing.js';
import { buildGigCareerPlan } from '../src/gig-career.js';
import { evaluateAssessment, issueVerifiedBadge, type AssessmentDefinition } from '../src/verified-assessments.js';

test('one user journey retains continuity across support, proof, hiring outcome, insights, and proprietary learning', () => {
  const prompt = mayaLanguagePrompt({
    userMessage:'I am nervous about tomorrow but I really want this healthcare administration career.',
    deterministicAnswer:'Interview is scheduled and the candidate has verified assessment evidence.',
    context:{careerTwin:{goals:'Healthcare Administration'},outcomes:[{checkpoint:'interview',status:'verified'}],evidence:[{kind:'assessment',status:'verified'}]}
  });
  assert.match(prompt,/END-TO-END CAREER CONTINUITY/);
  assert.match(prompt,/TURN-SPECIFIC SUPPORT PLAN/);
  assert.match(prompt,/healthcare administration/i);
  assert.match(prompt,/interview/i);

  const event: InsightEvent = {
    id:'evt_hire_1',subjectId:'candidate_1',kind:'hire',occurredAt:'2026-09-03T12:00:00.000Z',profession:'healthcare administration',industry:'healthcare',employerSegment:'startup',outcome:'hired',source:'hired-ai',verified:true,analyticsConsent:true,modelTrainingConsent:true,sensitive:false
  };
  const ledger = new CareerInsightLedger();
  ledger.append(event);
  ledger.append(event);
  assert.equal(ledger.all().length,1,'retry must not double count the outcome');
  const restored = new CareerInsightLedger(ledger.snapshot());
  assert.equal(restored.all().length,1,'snapshot replay must preserve the outcome exactly once');

  const manifest=createTrainingManifest([{id:'policy_1',task:'career continuity',input:'candidate has interview tomorrow',idealOutput:'continue interview preparation without re-onboarding',source:'hired-ai-policy',approved:true}],restored.all(),'2026-09-03T13:00:00.000Z');
  assert.equal(manifest.userDerivedExamples,1);
  assert.equal(manifest.releaseBlockedUntilPassed,true);
  assert.ok(manifest.requiredEvaluations.includes('career-outcome-quality'));
});

test('assessment evidence can become a badge and continue into employer/gig career surfaces', () => {
  const definition:AssessmentDefinition={id:'ops_v1',title:'Verified Operations Capability',profession:'operations',kind:'structured-interview',instructions:['Use concrete evidence.'],criteria:[{id:'prioritization',label:'Prioritization',weight:1,minimum:70}]};
  const result=evaluateAssessment(definition,'candidate_1','candidate-requested',[{criterionId:'prioritization',score:86,evidence:'Explained an attributable operational result and verification method',evaluator:'hybrid'}],'2026-09-03T12:00:00.000Z');
  const badge=issueVerifiedBadge(definition,result);
  assert.equal(badge.status,'active');
  assert.equal(badge.candidateId,'candidate_1');

  const gig=buildGigCareerPlan({workerId:'candidate_1',services:['delivery'],platforms:['marketplace-a'],transitionTarget:'Operations Coordinator'},[{service:'delivery',completedJobs:180,repeatCustomers:22,verified:true}]);
  assert.ok(gig.transitionBridge?.includes('Operations Coordinator'));
  assert.ok(gig.currentProof.length>0);

  assert.equal(validateGrowthPlan().valid,true);
  assert.equal(employerGrowthPlan.monthlyUsd,599);
  assert.equal(employerGrowthPlan.annualBillingMonthlyEquivalentUsd,479);
});
