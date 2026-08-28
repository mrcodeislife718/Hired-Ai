import { createHash, randomUUID } from 'node:crypto';

export type CareerStateNodeKind =
  | 'candidate'
  | 'goal'
  | 'role'
  | 'employer'
  | 'capability'
  | 'evidence'
  | 'credential'
  | 'relationship'
  | 'opportunity'
  | 'application'
  | 'interview'
  | 'offer'
  | 'compensation'
  | 'milestone'
  | 'commitment'
  | 'decision'
  | 'outcome'
  | 'preference'
  | 'blocker'
  | 'career-path';

export type CareerTruthClass = 'observation' | 'inference' | 'verified-fact' | 'system-state';
export type CareerNodeStatus = 'active' | 'inactive' | 'blocked' | 'completed' | 'expired' | 'superseded' | 'contradicted';

export interface CareerStateNode {
  id: string;
  candidateId: string;
  kind: CareerStateNodeKind;
  semanticKey: string;
  label: string;
  status: CareerNodeStatus;
  truthClass: CareerTruthClass;
  confidence: number;
  provenance: string[];
  evidenceIds: string[];
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  validFrom: string;
  validTo?: string;
  staleAfter?: string;
  version: number;
  supersedes?: string;
}

export interface CareerStateEdge {
  id: string;
  candidateId: string;
  from: string;
  to: string;
  type: string;
  confidence: number;
  provenance: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CareerStateContradiction {
  id: string;
  candidateId: string;
  semanticKey: string;
  nodeIds: string[];
  reason: string;
  detectedAt: string;
  resolvedAt?: string;
  resolutionNodeId?: string;
}

export interface CareerStateGraphSnapshot {
  candidateId: string;
  version: number;
  nodes: CareerStateNode[];
  edges: CareerStateEdge[];
  contradictions: CareerStateContradiction[];
  updatedAt: string;
  digest: string;
}

export interface UpsertCareerNodeInput extends Omit<CareerStateNode, 'id' | 'createdAt' | 'updatedAt' | 'version'> {
  id?: string;
}

export interface UpsertCareerEdgeInput extends Omit<CareerStateEdge, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map(key => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value: unknown) { return createHash('sha256').update(stable(value)).digest('hex'); }
function cleanKey(value: string) { return value.trim().toLowerCase().replace(/\s+/g, ' '); }
function clamp(value: number) { return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); }

function materialFingerprint(node: Pick<CareerStateNode,'kind'|'semanticKey'|'label'|'status'|'truthClass'|'data'|'evidenceIds'>) {
  return hash({ kind:node.kind, semanticKey:cleanKey(node.semanticKey), label:node.label, status:node.status, truthClass:node.truthClass, data:node.data, evidenceIds:[...node.evidenceIds].sort() });
}

export class CareerStateGraph {
  private readonly nodes = new Map<string, CareerStateNode>();
  private readonly edges = new Map<string, CareerStateEdge>();
  private readonly contradictions = new Map<string, CareerStateContradiction>();
  private version = 0;
  private updatedAt = new Date().toISOString();

  constructor(readonly candidateId: string, snapshot?: CareerStateGraphSnapshot) {
    if (!snapshot) return;
    if (snapshot.candidateId !== candidateId) throw new Error('career state graph candidate mismatch');
    this.version = snapshot.version;
    this.updatedAt = snapshot.updatedAt;
    for (const node of snapshot.nodes) this.nodes.set(node.id, structuredClone(node));
    for (const edge of snapshot.edges) this.edges.set(edge.id, structuredClone(edge));
    for (const contradiction of snapshot.contradictions) this.contradictions.set(contradiction.id, structuredClone(contradiction));
    if (snapshot.digest !== this.computeDigest()) throw new Error('career state graph snapshot digest mismatch');
  }

  upsertNode(input: UpsertCareerNodeInput) {
    if (input.candidateId !== this.candidateId) throw new Error('career state node candidate mismatch');
    if (!input.semanticKey.trim()) throw new Error('career state node semanticKey is required');
    if (!input.label.trim()) throw new Error('career state node label is required');
    if (!input.validFrom || Number.isNaN(Date.parse(input.validFrom))) throw new Error('career state node validFrom must be an ISO timestamp');

    const semanticKey = cleanKey(input.semanticKey);
    const existing = [...this.nodes.values()]
      .filter(node => cleanKey(node.semanticKey) === semanticKey && node.status !== 'superseded')
      .sort((a,b) => b.version - a.version)[0];
    const now = new Date().toISOString();
    const incomingFingerprint = materialFingerprint({ ...input, semanticKey, evidenceIds:input.evidenceIds });

    if (existing && materialFingerprint(existing) === incomingFingerprint) {
      const refreshed: CareerStateNode = {
        ...existing,
        confidence: Math.max(existing.confidence, clamp(input.confidence)),
        provenance: [...new Set([...existing.provenance, ...input.provenance])],
        evidenceIds: [...new Set([...existing.evidenceIds, ...input.evidenceIds])],
        updatedAt: now
      };
      this.nodes.set(existing.id, refreshed);
      this.bump();
      return { node:structuredClone(refreshed), contradiction:undefined, changed:false };
    }

    let contradiction: CareerStateContradiction | undefined;
    if (existing && !input.supersedes) {
      const incompatible = existing.truthClass === 'verified-fact' || input.truthClass === 'verified-fact' || existing.status === 'active';
      if (incompatible) {
        contradiction = {
          id:`ctr_${randomUUID()}`,
          candidateId:this.candidateId,
          semanticKey,
          nodeIds:[existing.id],
          reason:`conflicting active career state for ${semanticKey}`,
          detectedAt:now
        };
      }
    }

    if (existing && input.supersedes === existing.id) {
      this.nodes.set(existing.id, { ...existing, status:'superseded', validTo:input.validFrom, updatedAt:now });
    }

    const node: CareerStateNode = {
      ...structuredClone(input),
      id:input.id ?? `csn_${randomUUID()}`,
      semanticKey,
      confidence:clamp(input.confidence),
      createdAt:now,
      updatedAt:now,
      version:(existing?.version ?? 0) + 1
    };
    this.nodes.set(node.id, node);

    if (contradiction) {
      contradiction.nodeIds.push(node.id);
      this.contradictions.set(contradiction.id, contradiction);
      if (existing) this.nodes.set(existing.id, { ...this.nodes.get(existing.id)!, status:'contradicted', updatedAt:now });
      this.nodes.set(node.id, { ...node, status:'contradicted' });
    }

    this.bump();
    return { node:structuredClone(this.nodes.get(node.id)!), contradiction:contradiction ? structuredClone(contradiction) : undefined, changed:true };
  }

  upsertEdge(input: UpsertCareerEdgeInput) {
    if (input.candidateId !== this.candidateId) throw new Error('career state edge candidate mismatch');
    if (!this.nodes.has(input.from) || !this.nodes.has(input.to)) throw new Error('career state edge endpoints must exist');
    const existing = [...this.edges.values()].find(edge => edge.from === input.from && edge.to === input.to && edge.type === input.type);
    const now = new Date().toISOString();
    const edge: CareerStateEdge = existing
      ? { ...existing, confidence:Math.max(existing.confidence, clamp(input.confidence)), provenance:[...new Set([...existing.provenance,...input.provenance])], active:input.active, updatedAt:now }
      : { ...structuredClone(input), id:input.id ?? `cse_${randomUUID()}`, confidence:clamp(input.confidence), createdAt:now, updatedAt:now };
    this.edges.set(edge.id, edge);
    this.bump();
    return structuredClone(edge);
  }

  resolveContradiction(contradictionId: string, resolutionNodeId: string) {
    const contradiction = this.contradictions.get(contradictionId);
    if (!contradiction) throw new Error('career state contradiction not found');
    if (!contradiction.nodeIds.includes(resolutionNodeId)) throw new Error('resolution node must participate in contradiction');
    const now = new Date().toISOString();
    for (const nodeId of contradiction.nodeIds) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;
      this.nodes.set(nodeId, { ...node, status:nodeId === resolutionNodeId ? 'active' : 'superseded', updatedAt:now, validTo:nodeId === resolutionNodeId ? node.validTo : now });
    }
    const resolved = { ...contradiction, resolvedAt:now, resolutionNodeId };
    this.contradictions.set(contradictionId, resolved);
    this.bump();
    return structuredClone(resolved);
  }

  node(id: string) { const value = this.nodes.get(id); return value ? structuredClone(value) : undefined; }
  activeByKind(kind: CareerStateNodeKind) { return structuredClone([...this.nodes.values()].filter(node => node.kind === kind && node.status === 'active')); }
  activeBySemanticKey(semanticKey: string) { return structuredClone([...this.nodes.values()].filter(node => cleanKey(node.semanticKey) === cleanKey(semanticKey) && node.status === 'active')); }
  unresolvedContradictions() { return structuredClone([...this.contradictions.values()].filter(item => !item.resolvedAt)); }

  stale(at = new Date()) {
    const now = at.getTime();
    return structuredClone([...this.nodes.values()].filter(node => node.status === 'active' && node.staleAfter && Date.parse(node.staleAfter) <= now));
  }

  summary() {
    const active = [...this.nodes.values()].filter(node => node.status === 'active');
    const byKind = active.reduce<Record<string,number>>((acc,node) => (acc[node.kind]=(acc[node.kind]??0)+1,acc),{});
    return {
      candidateId:this.candidateId,
      version:this.version,
      activeNodes:active.length,
      edges:[...this.edges.values()].filter(edge => edge.active).length,
      unresolvedContradictions:this.unresolvedContradictions().length,
      staleNodes:this.stale().length,
      byKind,
      updatedAt:this.updatedAt,
      digest:this.computeDigest()
    };
  }

  snapshot(): CareerStateGraphSnapshot {
    return {
      candidateId:this.candidateId,
      version:this.version,
      nodes:structuredClone([...this.nodes.values()]),
      edges:structuredClone([...this.edges.values()]),
      contradictions:structuredClone([...this.contradictions.values()]),
      updatedAt:this.updatedAt,
      digest:this.computeDigest()
    };
  }

  private bump() { this.version += 1; this.updatedAt = new Date().toISOString(); }
  private computeDigest() {
    return hash({
      candidateId:this.candidateId,
      version:this.version,
      nodes:[...this.nodes.values()].sort((a,b)=>a.id.localeCompare(b.id)),
      edges:[...this.edges.values()].sort((a,b)=>a.id.localeCompare(b.id)),
      contradictions:[...this.contradictions.values()].sort((a,b)=>a.id.localeCompare(b.id)),
      updatedAt:this.updatedAt
    });
  }
}
