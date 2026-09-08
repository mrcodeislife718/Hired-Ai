import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { ApplicationLineageStore } from '../src/application-lineage.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

const resume='Test Candidate\nSoftware Engineer\nBuilt backend services with TypeScript and Node.js.';

test('resume-path documentation uses the live Career Twin and survives engine restoration',()=>{
  const candidate=testCandidate();
  const evidence=testEvidence();
  const engine=new HiredEngine(candidate,evidence);
  engine.ingest(testJobs()[0]);
  engine.auditCareer(resume);
  engine.updateCareerTwin('goals',{key:'goals',value:['Become a staff-level platform engineer'],source:'user',confidence:'confirmed',evidenceIds:[],observedAt:new Date().toISOString()});
  const plan=engine.auditCareer(resume);
  const brief=plan.documentation.find(document=>document.kind==='career-brief');
  assert.ok(brief);
  assert.deepEqual(brief?.content.goals,['Become a staff-level platform engineer']);
  assert.equal(brief?.provenance.careerTwinVersion,engine.careerTwin.current().version);

  const restored=new HiredEngine(candidate,evidence,engine.durableState());
  const restoredBrief=restored.careerDocumentation().documents.find(document=>document.id===brief?.id);
  assert.equal(restoredBrief?.provenance.sourceFingerprint,brief?.provenance.sourceFingerprint);
  assert.deepEqual(restoredBrief?.content.goals,['Become a staff-level platform engineer']);
});

test('document staleness compares exact evidence and target fingerprints rather than counts',()=>{
  const candidate=testCandidate();
  const evidence=testEvidence();
  const engine=new HiredEngine(candidate,evidence);
  engine.ingest(testJobs()[0]);
  engine.auditCareer(resume);
  assert.deepEqual(engine.staleCareerDocuments(),[]);

  const replacement={...evidence[0],id:`${evidence[0].id}-replacement`,claim:`${evidence[0].claim} with changed proof`};
  const restored=new HiredEngine(candidate,[replacement],engine.durableState());
  assert.ok(restored.staleCareerDocuments().length>0);
});

test('application lineage freezes exact versions and links outcomes without rewriting history',()=>{
  const store=new ApplicationLineageStore('candidate-1');
  const frozen=store.freeze({opportunityId:'opp-1',careerTwinVersion:7,careerDocumentationVersion:11,documentIds:['target-resume:opp-1'],evidenceIds:['ev-2','ev-1'],applicationPackage:{answer:'original'}});
  const second=store.freeze({opportunityId:'opp-1',careerTwinVersion:8,careerDocumentationVersion:12,documentIds:['target-resume:opp-1'],evidenceIds:['ev-3'],applicationPackage:{answer:'new'}});
  assert.notEqual(frozen.id,second.id);
  assert.notEqual(frozen.packageDigest,second.packageDigest);
  store.linkOutcome(frozen.id,'outcome-1');

  const restored=new ApplicationLineageStore('candidate-1',store.state());
  const history=restored.forOpportunity('opp-1');
  assert.equal(history.length,2);
  assert.deepEqual(history.find(item=>item.id===frozen.id)?.outcomeIds,['outcome-1']);
  assert.equal(history.find(item=>item.id===frozen.id)?.careerTwinVersion,7);
});
