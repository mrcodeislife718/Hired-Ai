import test from 'node:test';
import assert from 'node:assert/strict';
import { HiredEngine } from '../src/engine.js';
import { deterministicMayaReply, type MayaResponse } from '../src/maya-service.js';
import { buildMayaWorkflowState, type WorkflowRequestContext } from '../src/maya-workflows.js';
import { testCandidate, testEvidence, testJobs } from './test-records.js';

function engineWithOpportunity() {
  const engine=new HiredEngine(testCandidate(),testEvidence());
  const opportunity=engine.ingest(testJobs()[0]);
  return {engine,opportunity};
}

function workflowFor(engine:HiredEngine,request:WorkflowRequestContext,response:MayaResponse){
  return buildMayaWorkflowState(engine,request,{type:response.type});
}

test('Maya career lifecycle routes produce explicit end-to-end workflow state',()=>{
  const {engine,opportunity}=engineWithOpportunity();
  const cases=[
    {message:'Help me start my career',expected:'career-start'},
    {message:'Help me change careers',expected:'career-transition'},
    {message:'Help me return to work after a career break',expected:'career-reentry'},
    {message:'Help me advance to the next level',expected:'career-advancement'},
    {message:'Assess my career health',expected:'career-health'},
    {message:'Build my network',expected:'network'},
    {message:'Find roles I can realistically win',expected:'opportunity-discovery'},
    {message:'Why am I qualified for this role?',opportunityId:opportunity.id,expected:'opportunity-fit'},
    {message:'Research this company',opportunityId:opportunity.id,expected:'company-research'},
    {message:'Prepare me for the interview',opportunityId:opportunity.id,expected:'interview'}
  ];
  for(const item of cases){
    const request={message:item.message,opportunityId:item.opportunityId};
    const response=deterministicMayaReply(engine,request);
    const workflow=workflowFor(engine,request,response);
    assert.equal(workflow.kind,item.expected);
    assert.equal(workflow.endToEnd,true);
    assert.ok(workflow.steps.length>0);
    assert.ok(workflow.completionDefinition.length>20);
    assert.ok(workflow.invariants.some(rule=>/authorization/i.test(rule)));
  }
});

test('approved outreach advances the opportunity to CONTACTED',()=>{
  const {engine,opportunity}=engineWithOpportunity();
  assert.equal(opportunity.state,'QUALIFIED');
  const approval=engine.requestOutreach(opportunity.id);
  assert.equal(approval.status,'PENDING');
  engine.governor.approve(approval.id);
  engine.governor.executeApproved(approval.id);
  assert.equal(engine.store.opportunities.get(opportunity.id)?.state,'CONTACTED');
  assert.equal(engine.store.approvals.get(approval.id)?.status,'EXECUTED');
});

test('approved application advances the opportunity to APPLIED and closes the internal submission workflow',()=>{
  const {engine,opportunity}=engineWithOpportunity();
  const request={message:'Apply to this role',opportunityId:opportunity.id};
  const reply=deterministicMayaReply(engine,request);
  assert.equal(reply.type,'application');
  const before=workflowFor(engine,request,reply);
  assert.equal(before.kind,'application');
  assert.equal(before.steps.find(step=>step.id==='approval')?.status,'ready');

  const approval=engine.requestApplication(opportunity.id);
  const pending=workflowFor(engine,request,reply);
  assert.equal(pending.steps.find(step=>step.id==='approval')?.status,'complete');

  engine.governor.approve(approval.id);
  engine.governor.executeApproved(approval.id);
  assert.equal(engine.store.opportunities.get(opportunity.id)?.state,'APPLIED');
  assert.equal(engine.store.approvals.get(approval.id)?.status,'EXECUTED');

  engine.recordCareerOutcome({
    id:'career-outcome-application',candidateId:engine.profile.id,opportunityId:opportunity.id,checkpoint:'application',at:new Date().toISOString()
  });
  const after=workflowFor(engine,request,reply);
  assert.equal(after.steps.find(step=>step.id==='learn')?.status,'complete');
});

test('application questions remain bound to the same selected opportunity and evidence package',()=>{
  const {engine,opportunity}=engineWithOpportunity();
  const request={message:'Help me answer the application questions',opportunityId:opportunity.id,applicationQuestions:['Describe your TypeScript experience.','Are you authorized to work in the United States?']};
  const response=deterministicMayaReply(engine,request);
  assert.equal(response.type,'application-questions');
  const workflow=workflowFor(engine,request,response);
  assert.equal(workflow.kind,'application-questions');
  assert.equal(workflow.steps.find(step=>step.id==='questions')?.status,'complete');
  assert.equal(workflow.steps.find(step=>step.id==='package')?.status,'complete');
});

test('negotiation workflow blocks without real offer terms and activates when terms are supplied',()=>{
  const engine=new HiredEngine(testCandidate(),testEvidence());
  const emptyRequest={message:'Help me negotiate my offer'};
  const emptyResponse=deterministicMayaReply(engine,emptyRequest);
  const blocked=workflowFor(engine,emptyRequest,emptyResponse);
  assert.equal(blocked.kind,'offer-negotiation');
  assert.equal(blocked.blocked,true);
  assert.equal(blocked.steps.find(step=>step.id==='offer')?.status,'blocked');

  const request={message:'Help me negotiate my offer',offers:[{employer:'Test Employer',title:'Engineer',base:150000,bonus:10000}]};
  const response=deterministicMayaReply(engine,request);
  const active=workflowFor(engine,request,response);
  assert.equal(active.steps.find(step=>step.id==='offer')?.status,'complete');
  assert.equal(active.steps.find(step=>step.id==='strategy')?.status,'ready');
});
