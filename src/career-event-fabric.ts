import { createHash, randomUUID } from 'node:crypto';

export type CareerEventActor = 'user' | 'maya' | 'system' | 'governor' | 'connector' | 'employer' | 'evidence-verifier';
export type CareerEventSource = 'conversation' | 'career-state' | 'evidence' | 'opportunity' | 'workflow' | 'delivery' | 'outcome' | 'external' | 'system';

export type CareerEventType =
  | 'goal_changed'
  | 'evidence_added'
  | 'career_fact_changed'
  | 'opportunity_discovered'
  | 'opportunity_state_changed'
  | 'approval_requested'
  | 'approval_granted'
  | 'action_dispatched'
  | 'provider_acknowledged'
  | 'receipt_verified'
  | 'screen_scheduled'
  | 'interview_completed'
  | 'rejection_recorded'
  | 'offer_received'
  | 'promotion_earned'
  | 'credential_expiring'
  | 'career_outcome_recorded'
  | 'relationship_changed'
  | 'plan_changed'
  | 'state_node_upserted'
  | 'state_edge_upserted'
  | 'state_contradiction_detected';

export interface CareerEvent {
  id: string;
  candidateId: string;
  type: CareerEventType;
  actor: CareerEventActor;
  source: CareerEventSource;
  aggregateId?: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  provenance: string[];
  occurredAt: string;
  recordedAt: string;
  sequence: number;
  previousHash?: string;
  hash: string;
}

export interface CareerEventInput extends Omit<CareerEvent, 'id' | 'recordedAt' | 'sequence' | 'previousHash' | 'hash'> {
  id?: string;
}

export interface CareerEventFabricSnapshot {
  candidateId: string;
  events: CareerEvent[];
  headHash?: string;
  nextSequence: number;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map(key => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown) {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function comparable(event: CareerEventInput) {
  return {
    candidateId: event.candidateId,
    type: event.type,
    actor: event.actor,
    source: event.source,
    aggregateId: event.aggregateId,
    idempotencyKey: event.idempotencyKey,
    payload: event.payload,
    provenance: event.provenance,
    occurredAt: event.occurredAt
  };
}

export class CareerEventFabric {
  private readonly events: CareerEvent[] = [];
  private readonly idempotency = new Map<string, CareerEvent>();
  private nextSequence = 1;

  constructor(readonly candidateId: string, snapshot?: CareerEventFabricSnapshot) {
    if (!snapshot) return;
    if (snapshot.candidateId !== candidateId) throw new Error('career event fabric candidate mismatch');
    this.restore(snapshot.events);
  }

  append(input: CareerEventInput): CareerEvent {
    if (input.candidateId !== this.candidateId) throw new Error('career event candidate mismatch');
    if (!input.idempotencyKey.trim()) throw new Error('career event idempotency key is required');
    if (!input.occurredAt || Number.isNaN(Date.parse(input.occurredAt))) throw new Error('career event occurredAt must be an ISO timestamp');

    const existing = this.idempotency.get(input.idempotencyKey);
    if (existing) {
      if (digest(comparable(input)) !== digest({
        candidateId: existing.candidateId,
        type: existing.type,
        actor: existing.actor,
        source: existing.source,
        aggregateId: existing.aggregateId,
        idempotencyKey: existing.idempotencyKey,
        payload: existing.payload,
        provenance: existing.provenance,
        occurredAt: existing.occurredAt
      })) throw new Error(`career event idempotency conflict: ${input.idempotencyKey}`);
      return structuredClone(existing);
    }

    const previousHash = this.events.at(-1)?.hash;
    const recordedAt = new Date().toISOString();
    const base = {
      id: input.id ?? `cev_${randomUUID()}`,
      candidateId: input.candidateId,
      type: input.type,
      actor: input.actor,
      source: input.source,
      aggregateId: input.aggregateId,
      idempotencyKey: input.idempotencyKey,
      payload: structuredClone(input.payload),
      provenance: [...input.provenance],
      occurredAt: input.occurredAt,
      recordedAt,
      sequence: this.nextSequence,
      previousHash
    };
    const event: CareerEvent = { ...base, hash: digest(base) };
    this.events.push(event);
    this.idempotency.set(event.idempotencyKey, event);
    this.nextSequence += 1;
    return structuredClone(event);
  }

  all(): CareerEvent[] { return structuredClone(this.events); }
  recent(limit = 50): CareerEvent[] { return structuredClone(this.events.slice(-Math.max(1, Math.min(500, Math.floor(limit))))); }
  byAggregate(aggregateId: string): CareerEvent[] { return structuredClone(this.events.filter(event => event.aggregateId === aggregateId)); }

  verifyChain() {
    let previousHash: string | undefined;
    let expectedSequence = 1;
    for (const event of this.events) {
      if (event.sequence !== expectedSequence) return { valid:false, reason:`sequence discontinuity at ${event.id}` };
      if (event.previousHash !== previousHash) return { valid:false, reason:`hash-chain discontinuity at ${event.id}` };
      const { hash, ...base } = event;
      if (digest(base) !== hash) return { valid:false, reason:`event digest mismatch at ${event.id}` };
      previousHash = event.hash;
      expectedSequence += 1;
    }
    return { valid:true, headHash:previousHash, events:this.events.length };
  }

  replay<T>(seed: T, reducer: (state: T, event: CareerEvent) => T): T {
    const integrity = this.verifyChain();
    if (!integrity.valid) throw new Error(`cannot replay invalid career event chain: ${integrity.reason}`);
    return this.events.reduce((state, event) => reducer(state, structuredClone(event)), structuredClone(seed));
  }

  snapshot(): CareerEventFabricSnapshot {
    return { candidateId:this.candidateId, events:this.all(), headHash:this.events.at(-1)?.hash, nextSequence:this.nextSequence };
  }

  restore(events: CareerEvent[]) {
    this.events.length = 0;
    this.idempotency.clear();
    this.nextSequence = 1;
    for (const source of [...events].sort((a,b) => a.sequence - b.sequence)) {
      if (source.candidateId !== this.candidateId) throw new Error('career event restore candidate mismatch');
      if (this.idempotency.has(source.idempotencyKey)) throw new Error(`duplicate career event idempotency key during restore: ${source.idempotencyKey}`);
      this.events.push(structuredClone(source));
      this.idempotency.set(source.idempotencyKey, structuredClone(source));
      this.nextSequence = Math.max(this.nextSequence, source.sequence + 1);
    }
    const integrity = this.verifyChain();
    if (!integrity.valid) throw new Error(`invalid restored career event chain: ${integrity.reason}`);
  }
}
