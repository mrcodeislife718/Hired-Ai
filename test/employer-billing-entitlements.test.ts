import test from 'node:test';
import assert from 'node:assert/strict';
import { EmployerPlatform } from '../src/employer-platform.js';
import { employerCapabilityDecision } from '../src/runtime-entitlements.js';

test('employer organizations start free and active billing unlocks only the subscribed tier',()=>{
  const platform=new EmployerPlatform();
  const org=platform.createOrganization('Acme','owner-1');
  assert.equal(platform.organizationAccessTier(org.id),'free');
  assert.equal(employerCapabilityDecision(org.subscription,'employer-basic-pipeline').allowed,true);
  assert.equal(employerCapabilityDecision(org.subscription,'employer-sourcing').allowed,false);

  const starter=platform.setOrganizationSubscription(org.id,'starter','active',{customerRef:'cus_org_1',subscriptionRef:'sub_org_1',eventCreatedAt:100});
  assert.equal(platform.organizationAccessTier(org.id),'starter');
  assert.equal(employerCapabilityDecision(starter.subscription,'employer-sourcing').allowed,true);
  assert.equal(employerCapabilityDecision(starter.subscription,'employer-ai-interviewer').allowed,false);
});

test('employer Stripe events are monotonic and customer identity cannot cross organizations',()=>{
  const platform=new EmployerPlatform();
  const first=platform.createOrganization('First','owner-1');
  const second=platform.createOrganization('Second','owner-2');
  platform.setOrganizationSubscription(first.id,'pro','canceled',{customerRef:'cus_owned',subscriptionRef:'sub_owned',eventCreatedAt:300});
  platform.setOrganizationSubscription(first.id,'pro','active',{customerRef:'cus_owned',subscriptionRef:'sub_owned',eventCreatedAt:200});
  assert.equal(platform.organization(first.id)?.subscription.status,'canceled');
  assert.throws(()=>platform.setOrganizationSubscription(second.id,'starter','active',{customerRef:'cus_owned',subscriptionRef:'sub_other',eventCreatedAt:400}),/already linked/);
});

test('legacy employer snapshots without subscription restore safely to free access',()=>{
  const source=new EmployerPlatform();
  const org=source.createOrganization('Legacy','owner-1');
  const snapshot=source.snapshot() as unknown as {organizations:Array<Record<string,unknown>>;jobs:unknown[];consent:unknown[];pipeline:unknown[];fairness:unknown[]};
  delete snapshot.organizations[0].subscription;
  const restored=new EmployerPlatform(snapshot as never);
  assert.equal(restored.organizationAccessTier(org.id),'free');
  assert.equal(restored.organization(org.id)?.subscription.plan,'free');
});
