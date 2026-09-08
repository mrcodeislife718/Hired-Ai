import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { buildCareerDocumentation, CareerDocumentationStore } from '../src/career-documentation.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

const resume=`Test Candidate\nSoftware Engineer\nBuilt backend services with TypeScript and Node.js.\nGitHub: https://github.com/test/candidate`;

function setup(){
  const candidate=testCandidate();
  const evidence=testEvidence();
  const engine=new HiredEngine(candidate,evidence);
  engine.ingest(testJobs()[0]);
  return {candidate,evidence,engine};
}

test('career documentation turns one factual source into a coherent document portfolio',()=>{
  const {candidate,evidence,engine}=setup();
  const docs=buildCareerDocumentation({profile:candidate,careerTwin:engine.careerTwin.current(),evidence,opportunities:[...engine.store.opportunities.values()],resumeText:resume});
  const kinds=new Set(docs.map(doc=>doc.kind));
  for(const required of ['career-brief','master-resume','target-resume','professional-profile','evidence-index','accomplishment-bank','interview-story-bank','gap-plan']) assert.ok(kinds.has(required as never));
  assert.ok(docs.every(doc=>doc.provenance.candidateId===candidate.id));
  assert.ok(docs.every(doc=>doc.provenance.sourceFingerprint.length===64));
  assert.ok(docs.find(doc=>doc.kind==='master-resume')?.provenance.sourceResumePresent);
});

test('Maya does not fabricate employment history when onboarding begins without a resume',()=>{
  const {candidate,evidence,engine}=setup();
  const docs=buildCareerDocumentation({profile:candidate,careerTwin:engine.careerTwin.current(),evidence,opportunities:[...engine.store.opportunities.values()]});
  const master=docs.find(doc=>doc.kind==='master-resume');
  assert.ok(master);
  assert.equal(master?.provenance.sourceResumePresent,false);
  assert.ok(master?.warnings.some(warning=>/not a reconstruction of employment history/i.test(warning)));
  assert.match(String(master?.content.factualRule),/must remain source-supported/i);
});

test('documentation store versions changed documents but preserves unchanged versions',()=>{
  const {candidate,evidence,engine}=setup();
  const store=new CareerDocumentationStore(candidate.id);
  const first=store.rebuild({profile:candidate,careerTwin:engine.careerTwin.current(),evidence,opportunities:[...engine.store.opportunities.values()],resumeText:resume});
  const second=store.rebuild({profile:candidate,careerTwin:engine.careerTwin.current(),evidence,opportunities:[...engine.store.opportunities.values()]});
  const firstMaster=first.documents.find(doc=>doc.kind==='master-resume');
  const secondMaster=second.documents.find(doc=>doc.kind==='master-resume');
  assert.equal(secondMaster?.version,firstMaster?.version);
  engine.updateCareerTwin('goals',{key:'goals',value:['Move into senior engineering'],source:'user',confidence:'confirmed',evidenceIds:[],observedAt:new Date().toISOString()});
  const third=store.rebuild({profile:candidate,careerTwin:engine.careerTwin.current(),evidence,opportunities:[...engine.store.opportunities.values()]});
  const thirdMaster=third.documents.find(doc=>doc.kind==='master-resume');
  assert.ok((thirdMaster?.version??0)>(secondMaster?.version??0));
});

test('target resumes use live opportunity context and preserve truthful gap handling',()=>{
  const {candidate,evidence,engine}=setup();
  const opportunity=[...engine.store.opportunities.values()][0];
  const docs=buildCareerDocumentation({profile:candidate,careerTwin:engine.careerTwin.current(),evidence,opportunities:[opportunity],resumeText:resume});
  const targeted=docs.find(doc=>doc.kind==='target-resume');
  assert.equal(targeted?.targetOpportunityId,opportunity.id);
  assert.ok(Array.isArray(targeted?.content.requirementMap));
  assert.match(String(targeted?.content.factualRule),/never invent/i);
});
