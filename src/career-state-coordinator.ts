import type { AuditEvent, CandidateProfile, Evidence, Opportunity } from './domain.js';
import type { CareerFact, CareerTwinSnapshot } from './career-twin.js';
import type { CareerOutcomeEvent } from './career-outcomes.js';
import { CareerEventFabric, type CareerEventFabricSnapshot, type CareerEventType } from './career-event-fabric.js';
import { CareerStateGraph, type CareerStateGraphSnapshot, type CareerTruthClass } from './career-state-graph.js';

export interface CareerStateCoordinatorSnapshot {
  graph: CareerStateGraphSnapshot;
  events: CareerEventFabricSnapshot;
}

function truthFromFact(fact: CareerFact): CareerTruthClass {
  if (fact.source === 'verified-evidence' || fact.source === 'outcome' || fact.source === 'employer') return 'verified-fact';
  if (fact.source === 'inference') return 'inference';
  return 'observation';
}

function eventType(action: string): CareerEventType | undefined {
  const map: Record<string, CareerEventType> = {
    OPPORTUNITY_INGESTED:'opportunity_discovered',
    STATE_TRANSITION:'opportunity_state_changed',
    APPROVAL_REQUESTED:'approval_requested',
    APPROVAL_GRANTED:'approval_granted',
    APPROVED_ACTION_EXECUTED:'action_dispatched',
    PROVIDER_ACKNOWLEDGED:'provider_acknowledged',
    DELIVERY_VERIFIED_RECEIVED:'receipt_verified'
  };
  return map[action];
}

export class CareerStateCoordinator {
  readonly graph: CareerStateGraph;
  readonly events: CareerEventFabric;

  constructor(readonly profile: CandidateProfile, snapshot?: CareerStateCoordinatorSnapshot) {
    this.graph = new CareerStateGraph(profile.id, snapshot?.graph);
    this.events = new CareerEventFabric(profile.id, snapshot?.events);
    if (!snapshot) this.seedCandidate();
  }

  private seedCandidate() {
    const at = new Date().toISOString();
    const result = this.graph.upsertNode({
      candidateId:this.profile.id,
      kind:'candidate',
      semanticKey:`candidate:${this.profile.id}`,
      label:this.profile.name || 'candidate',
      status:'active',
      truthClass:'system-state',
      confidence:1,
      provenance:['candidate-profile'],
      evidenceIds:[],
      data:{ headline:this.profile.headline, skills:[...this.profile.skills], constraints:structuredClone(this.profile.constraints) },
      validFrom:at
    });
    this.events.append({
      candidateId:this.profile.id,
      type:'state_node_upserted',
      actor:'system',
      source:'career-state',
      aggregateId:result.node.id,
      idempotencyKey:`seed:candidate:${this.profile.id}`,
      payload:{ kind:'candidate', semanticKey:result.node.semanticKey },
      provenance:['candidate-profile'],
      occurredAt:at
    });
  }

  captureGovernorAudit(audit: AuditEvent, opportunity?: Opportunity) {
    const mapped = eventType(audit.action);
    if (!mapped) return;
    this.events.append({
      candidateId:this.profile.id,
      type:mapped,
      actor:audit.actor === 'Human' ? 'user' : audit.actor === 'DeliveryVerifier' ? 'connector' : 'governor',
      source:audit.action.includes('DELIVERY') || audit.action.includes('PROVIDER') || audit.action.includes('EXECUTED') ? 'delivery' : 'workflow',
      aggregateId:audit.opportunityId,
      idempotencyKey:`audit:${audit.id}`,
      payload:{ ...structuredClone(audit.detail), opportunityId:audit.opportunityId },
      provenance:[`audit:${audit.id}`],
      occurredAt:audit.at
    });
    if (opportunity) this.syncOpportunity(opportunity, `audit:${audit.id}`);
  }

  syncOpportunity(opportunity: Opportunity, provenance: string) {
    const semanticKey = `opportunity:${opportunity.id}`;
    const previous = this.graph.activeBySemanticKey(semanticKey)[0];
    const result = this.graph.upsertNode({
      candidateId:this.profile.id,
      kind:'opportunity',
      semanticKey,
      label:`${opportunity.job.title} at ${opportunity.job.company}`,
      status:opportunity.state === 'REJECTED' ? 'inactive' : 'active',
      truthClass:'system-state',
      confidence:1,
      provenance:[provenance, `job-source:${opportunity.job.source}:${opportunity.job.sourceId}`],
      evidenceIds:[...opportunity.evidenceIds],
      data:{ state:opportunity.state, score:opportunity.score.total, company:opportunity.job.company, title:opportunity.job.title, source:opportunity.job.source, sourceId:opportunity.job.sourceId, hardRejected:opportunity.hardRejected },
      validFrom:opportunity.updatedAt,
      supersedes:previous?.id
    });
    if (result.contradiction) this.recordContradiction(result.contradiction.id, result.contradiction.semanticKey, result.contradiction.nodeIds, provenance, result.contradiction.detectedAt);
    return result.node;
  }

  syncEvidence(evidence: Evidence, occurredAt = new Date().toISOString()) {
    const semanticKey = `evidence:${evidence.id}`;
    const previous = this.graph.activeBySemanticKey(semanticKey)[0];
    const result = this.graph.upsertNode({
      candidateId:this.profile.id,
      kind:'evidence',
      semanticKey,
      label:evidence.claim || evidence.skill,
      status:'active',
      truthClass:'verified-fact',
      confidence:Math.max(0,Math.min(1,evidence.strength/100)),
      provenance:[`evidence:${evidence.id}`, evidence.url],
      evidenceIds:[evidence.id],
      data:{ skill:evidence.skill, claim:evidence.claim, verification:evidence.verification, repository:evidence.repository, url:evidence.url, strength:evidence.strength },
      validFrom:occurredAt,
      supersedes:previous?.id
    });
    this.events.append({
      candidateId:this.profile.id,
      type:'evidence_added',
      actor:'evidence-verifier',
      source:'evidence',
      aggregateId:evidence.id,
      idempotencyKey:`evidence:${evidence.id}:${result.node.version}`,
      payload:{ skill:evidence.skill, verification:evidence.verification, strength:evidence.strength, nodeId:result.node.id },
      provenance:[`evidence:${evidence.id}`],
      occurredAt
    });
    return result.node;
  }

  syncCareerTwinField(key: keyof CareerTwinSnapshot, fact: CareerFact, snapshotVersion: number) {
    const semanticKey = `career-twin:${String(key)}`;
    const previous = this.graph.activeBySemanticKey(semanticKey)[0];
    const result = this.graph.upsertNode({
      candidateId:this.profile.id,
      kind:key === 'goals' ? 'goal' : key === 'compensation' ? 'compensation' : key === 'constraints' || key === 'preferredWork' || key === 'dislikedWork' || key === 'values' ? 'preference' : 'capability',
      semanticKey,
      label:String(key),
      status:'active',
      truthClass:truthFromFact(fact),
      confidence:fact.confidence === 'confirmed' ? 1 : fact.confidence === 'high' ? 0.85 : fact.confidence === 'medium' ? 0.65 : 0.4,
      provenance:[`career-twin:v${snapshotVersion}`, `source:${fact.source}`],
      evidenceIds:[...fact.evidenceIds],
      data:{ value:structuredClone(fact.value), source:fact.source, confidence:fact.confidence },
      validFrom:fact.observedAt,
      supersedes:previous?.id
    });
    this.events.append({
      candidateId:this.profile.id,
      type:key === 'goals' ? 'goal_changed' : 'career_fact_changed',
      actor:fact.source === 'user' ? 'user' : 'system',
      source:fact.source === 'verified-evidence' ? 'evidence' : 'career-state',
      aggregateId:result.node.id,
      idempotencyKey:`career-twin:${String(key)}:v${snapshotVersion}`,
      payload:{ key:String(key), value:structuredClone(fact.value), source:fact.source, confidence:fact.confidence, nodeId:result.node.id },
      provenance:[`career-twin:v${snapshotVersion}`,...fact.evidenceIds.map(id=>`evidence:${id}`)],
      occurredAt:fact.observedAt
    });
    if (result.contradiction) this.recordContradiction(result.contradiction.id, result.contradiction.semanticKey, result.contradiction.nodeIds, `career-twin:v${snapshotVersion}`, result.contradiction.detectedAt);
    return result.node;
  }

  syncCareerFact(fact: CareerFact, snapshotVersion: number) {
    const semanticKey = `career-fact:${fact.key}`;
    const previous = this.graph.activeBySemanticKey(semanticKey)[0];
    const result = this.graph.upsertNode({
      candidateId:this.profile.id,
      kind:'capability',
      semanticKey,
      label:fact.key,
      status:'active',
      truthClass:truthFromFact(fact),
      confidence:fact.confidence === 'confirmed' ? 1 : fact.confidence === 'high' ? 0.85 : fact.confidence === 'medium' ? 0.65 : 0.4,
      provenance:[`career-twin:v${snapshotVersion}`, `source:${fact.source}`],
      evidenceIds:[...fact.evidenceIds],
      data:{ value:structuredClone(fact.value), source:fact.source, confidence:fact.confidence },
      validFrom:fact.observedAt,
      supersedes:previous?.id
    });
    this.events.append({
      candidateId:this.profile.id,
      type:'career_fact_changed',
      actor:fact.source === 'user' ? 'user' : 'system',
      source:fact.source === 'verified-evidence' ? 'evidence' : 'career-state',
      aggregateId:result.node.id,
      idempotencyKey:`career-fact:${fact.key}:v${snapshotVersion}`,
      payload:{ key:fact.key, value:structuredClone(fact.value), source:fact.source, confidence:fact.confidence, nodeId:result.node.id },
      provenance:[`career-twin:v${snapshotVersion}`,...fact.evidenceIds.map(id=>`evidence:${id}`)],
      occurredAt:fact.observedAt
    });
    if (result.contradiction) this.recordContradiction(result.contradiction.id, result.contradiction.semanticKey, result.contradiction.nodeIds, `career-twin:v${snapshotVersion}`, result.contradiction.detectedAt);
    return result.node;
  }

  syncOutcome(outcome: CareerOutcomeEvent) {
    const result = this.graph.upsertNode({
      candidateId:this.profile.id,
      kind:outcome.checkpoint === 'promotion' ? 'milestone' : outcome.checkpoint === 'offer' || outcome.checkpoint === 'accepted' ? 'offer' : 'outcome',
      semanticKey:`outcome:${outcome.id}`,
      label:`${outcome.checkpoint} outcome`,
      status:'completed',
      truthClass:'verified-fact',
      confidence:1,
      provenance:[`career-outcome:${outcome.id}`],
      evidenceIds:[],
      data:structuredClone(outcome) as unknown as Record<string,unknown>,
      validFrom:outcome.at
    });
    this.events.append({
      candidateId:this.profile.id,
      type:outcome.checkpoint === 'promotion' ? 'promotion_earned' : outcome.checkpoint === 'offer' ? 'offer_received' : 'career_outcome_recorded',
      actor:'system',
      source:'outcome',
      aggregateId:outcome.opportunityId ?? outcome.id,
      idempotencyKey:`career-outcome:${outcome.id}`,
      payload:{ checkpoint:outcome.checkpoint, opportunityId:outcome.opportunityId, nodeId:result.node.id },
      provenance:[`career-outcome:${outcome.id}`],
      occurredAt:outcome.at
    });
    return result.node;
  }

  snapshot(): CareerStateCoordinatorSnapshot { return { graph:this.graph.snapshot(), events:this.events.snapshot() }; }
  summary() { return { graph:this.graph.summary(), eventIntegrity:this.events.verifyChain(), recentEvents:this.events.recent(10) }; }

  private recordContradiction(id:string, semanticKey:string, nodeIds:string[], provenance:string, occurredAt:string) {
    this.events.append({
      candidateId:this.profile.id,
      type:'state_contradiction_detected',
      actor:'system',
      source:'career-state',
      aggregateId:id,
      idempotencyKey:`contradiction:${id}`,
      payload:{ semanticKey, nodeIds:[...nodeIds] },
      provenance:[provenance],
      occurredAt
    });
  }
}
