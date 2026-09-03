import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CommercialOutcomeProofLedger,
  buildCommercialOutcomeReport,
  type CareerProofEvent
} from '../src/commercial-outcome-proof.js';

function event(overrides: Partial<CareerProofEvent> & Pick<CareerProofEvent, 'id'|'subjectId'|'type'|'occurredAt'>): CareerProofEvent {
  return {
    evidenceRef: `evidence:${overrides.id}`,
    verified: true,
    ...overrides
  };
}

test('commercial outcome proof ledger is idempotent and tamper evident', () => {
  const proof = event({ id:'evt-1', subjectId:'user-1', type:'application_sent', occurredAt:'2026-01-01T00:00:00Z', opportunityId:'job-1' });
  const ledger = new CommercialOutcomeProofLedger();
  assert.equal(ledger.append(proof), true);
  assert.equal(ledger.append(proof), false);
  assert.throws(() => ledger.append({ ...proof, evidenceRef:'different-proof' }), /collision/i);

  const snapshot = ledger.snapshot();
  const restored = CommercialOutcomeProofLedger.restore(snapshot);
  assert.equal(restored.list().length, 1);

  const tampered = structuredClone(snapshot);
  tampered.events[0].type = 'offer_received';
  assert.throws(() => CommercialOutcomeProofLedger.restore(tampered), /integrity/i);
});

test('commercial outcome report measures verified user value across the career lifecycle', () => {
  const events: CareerProofEvent[] = [
    event({ id:'r1', subjectId:'u1', type:'opportunity_recommended', occurredAt:'2026-01-01T00:00:00Z', opportunityId:'j1' }),
    event({ id:'r2', subjectId:'u1', type:'opportunity_useful', occurredAt:'2026-01-01T01:00:00Z', opportunityId:'j1' }),
    event({ id:'rel1', subjectId:'u1', type:'relationship_created', occurredAt:'2026-01-01T02:00:00Z', relationshipId:'p1' }),
    event({ id:'rel2', subjectId:'u1', type:'relationship_useful', occurredAt:'2026-01-02T02:00:00Z', relationshipId:'p1' }),
    event({ id:'a1', subjectId:'u1', type:'application_sent', occurredAt:'2026-01-03T00:00:00Z', opportunityId:'j1', timeSavedMinutes:45 }),
    event({ id:'s1', subjectId:'u1', type:'screen_received', occurredAt:'2026-01-05T00:00:00Z', opportunityId:'j1' }),
    event({ id:'i1', subjectId:'u1', type:'interview_received', occurredAt:'2026-01-07T00:00:00Z', opportunityId:'j1' }),
    event({ id:'o1', subjectId:'u1', type:'offer_received', occurredAt:'2026-01-10T00:00:00Z', opportunityId:'j1' }),
    event({ id:'h1', subjectId:'u1', type:'hire_started', occurredAt:'2026-01-20T00:00:00Z', opportunityId:'j1', compensationBeforeUsd:100000, compensationAfterUsd:120000, satisfactionScore:8 }),
    event({ id:'t1', subjectId:'u1', type:'transition_completed', occurredAt:'2026-01-20T00:00:01Z', fromCareer:'support', toCareer:'operations' }),
    event({ id:'d30', subjectId:'u1', type:'retained_30d', occurredAt:'2026-02-20T00:00:00Z', opportunityId:'j1', satisfactionScore:9 }),
    event({ id:'d90', subjectId:'u1', type:'retained_90d', occurredAt:'2026-04-20T00:00:00Z', opportunityId:'j1', satisfactionScore:9 }),
    event({ id:'mob1', subjectId:'u1', type:'career_mobility_gain', occurredAt:'2026-04-21T00:00:00Z' }),
    event({ id:'unverified', subjectId:'u2', type:'offer_received', occurredAt:'2026-01-10T00:00:00Z', opportunityId:'j2', verified:false, evidenceRef:'self-report-only' })
  ];

  const report = buildCommercialOutcomeReport(events);
  assert.equal(report.subjects, 1);
  assert.equal(report.opportunityPrecision.rate, 1);
  assert.equal(report.usefulRelationshipCreation.rate, 1);
  assert.equal(report.applicationToScreenConversion.rate, 1);
  assert.equal(report.screenToInterviewConversion.rate, 1);
  assert.equal(report.interviewToOfferConversion.rate, 1);
  assert.equal(report.offerToHireConversion.rate, 1);
  assert.equal(report.retention30d.rate, 1);
  assert.equal(report.retention90d.rate, 1);
  assert.equal(report.retention365d.rate, 0);
  assert.equal(report.medianTimeToInterviewDays, 4);
  assert.equal(report.medianTimeToOfferDays, 7);
  assert.equal(report.medianCompensationImprovementPercent, 20);
  assert.equal(report.medianUserTimeSavedMinutes, 45);
  assert.equal(report.medianPostHireSatisfaction, 9);
});
