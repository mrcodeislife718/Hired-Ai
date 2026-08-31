import assert from 'node:assert/strict';
import test from 'node:test';
import { AcquisitionRoutePlanner } from '../src/acquisition-route-planner.js';
import { DecisionMakerGraph } from '../src/decision-maker-graph.js';

test('planner reroutes away from blind applications when human evaluation is not happening',()=>{
  const graph=new DecisionMakerGraph();
  const org=graph.upsertOrganization({name:'Acme',domains:['acme.example'],confidence:1,source:[{provider:'test',observedAt:new Date().toISOString()}]});
  const candidate=graph.upsertPerson({name:'Candidate',confidence:1,source:[{provider:'test',observedAt:new Date().toISOString()}]});
  const manager=graph.upsertPerson({name:'Hiring Manager',organizationId:org.id,title:'Director of Operations',confidence:0.95,source:[{provider:'test',observedAt:new Date().toISOString()}]});
  graph.connectAuthority({personId:manager.id,organizationId:org.id,kind:'hiring-manager',observed:true,confidence:0.9,rationale:'job owner',source:[{provider:'test',observedAt:new Date().toISOString()}]});
  graph.connectRelationship({fromPersonId:candidate.id,toPersonId:manager.id,kind:'prior-contact',strength:0.7,observed:true,source:[{provider:'test',observedAt:new Date().toISOString()}]});

  const plan=new AcquisitionRoutePlanner(graph).plan({organizationId:org.id,candidatePersonId:candidate.id,fitConfidence:0.9,evidenceStrength:0.9,funnel:{applications:10,recruiterResponses:0,interviews:0,offers:0,automatedRejections:8}});
  assert.equal(plan.applicationBottleneck,true);
  assert.equal(plan.primary?.route,'warm-introduction');
  assert.ok(plan.alternatives.some(route=>route.route==='direct-hiring-manager'));
});

test('genuine hard gates force develop-first instead of misleading outreach',()=>{
  const plan=new AcquisitionRoutePlanner().plan({fitConfidence:0.9,evidenceStrength:0.9,hardGateMissing:true,funnel:{applications:0,recruiterResponses:0,interviews:0,offers:0,automatedRejections:0}});
  assert.equal(plan.primary?.route,'develop-first');
});
