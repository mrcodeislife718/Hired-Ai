import { id } from './utils.js';

export type EmployerRole = 'owner' | 'admin' | 'recruiter' | 'hiring-manager' | 'viewer';
export type CandidateVisibility = 'private' | 'matched-employers' | 'discoverable';

export interface EmployerMember { accountId: string; role: EmployerRole; joinedAt: string; }
export interface EmployerOrganization { id: string; name: string; createdAt: string; members: EmployerMember[]; }

export interface EmployerJob {
  id: string;
  organizationId: string;
  title: string;
  location: string;
  workMode: 'onsite' | 'hybrid' | 'remote';
  salaryMin?: number;
  salaryMax?: number;
  responsibilities: string[];
  mustHaves: string[];
  trainable: string[];
  preferred: string[];
  teamContext: string[];
  successOutcomes: string[];
  status: 'draft' | 'open' | 'paused' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateSourcingConsent {
  candidateId: string;
  visibility: CandidateVisibility;
  allowedOrganizationIds: string[];
  blockedOrganizationIds: string[];
  shareCompensationTarget: boolean;
  shareCareerPreferences: boolean;
  updatedAt: string;
}

const permissions: Record<EmployerRole, Set<string>> = {
  owner: new Set(['org:manage','members:manage','job:write','candidate:source','candidate:view','analytics:view']),
  admin: new Set(['members:manage','job:write','candidate:source','candidate:view','analytics:view']),
  recruiter: new Set(['job:write','candidate:source','candidate:view','analytics:view']),
  'hiring-manager': new Set(['job:write','candidate:view','analytics:view']),
  viewer: new Set(['analytics:view'])
};

export class EmployerPlatform {
  private readonly organizations = new Map<string, EmployerOrganization>();
  private readonly jobs = new Map<string, EmployerJob>();
  private readonly consent = new Map<string, CandidateSourcingConsent>();

  createOrganization(name: string, ownerAccountId: string) {
    if (!name.trim() || !ownerAccountId) throw new Error('organization name and owner required');
    const now = new Date().toISOString();
    const org: EmployerOrganization = { id:id('org'), name:name.trim(), createdAt:now, members:[{ accountId:ownerAccountId, role:'owner', joinedAt:now }] };
    this.organizations.set(org.id, org);
    return structuredClone(org);
  }

  organization(orgId: string) { const org=this.organizations.get(orgId); return org ? structuredClone(org) : undefined; }

  private roleFor(orgId: string, accountId: string) { return this.organizations.get(orgId)?.members.find(member => member.accountId === accountId)?.role; }
  assertPermission(orgId: string, accountId: string, permission: string) {
    const role = this.roleFor(orgId, accountId);
    if (!role || !permissions[role].has(permission)) throw new Error(`permission denied: ${permission}`);
    return role;
  }

  addMember(orgId: string, actorAccountId: string, accountId: string, role: Exclude<EmployerRole,'owner'>) {
    this.assertPermission(orgId, actorAccountId, 'members:manage');
    const org = this.organizations.get(orgId)!;
    const existing = org.members.find(member => member.accountId === accountId);
    if (existing) existing.role = role;
    else org.members.push({ accountId, role, joinedAt:new Date().toISOString() });
    return structuredClone(org);
  }

  createJob(orgId: string, actorAccountId: string, input: Omit<EmployerJob,'id'|'organizationId'|'createdBy'|'createdAt'|'updatedAt'>) {
    this.assertPermission(orgId, actorAccountId, 'job:write');
    if (!input.title.trim()) throw new Error('job title required');
    if (!input.responsibilities.length || !input.successOutcomes.length) throw new Error('real responsibilities and success outcomes are required');
    const now = new Date().toISOString();
    const job: EmployerJob = { ...structuredClone(input), id:id('employer_job'), organizationId:orgId, createdBy:actorAccountId, createdAt:now, updatedAt:now };
    this.jobs.set(job.id, job);
    return structuredClone(job);
  }

  listJobs(orgId: string, actorAccountId: string) {
    this.assertPermission(orgId, actorAccountId, 'analytics:view');
    return [...this.jobs.values()].filter(job => job.organizationId === orgId).map(structuredClone);
  }

  setCandidateConsent(consent: CandidateSourcingConsent) {
    if (!consent.candidateId) throw new Error('candidateId required');
    const next = { ...structuredClone(consent), updatedAt:new Date().toISOString() };
    this.consent.set(consent.candidateId, next);
    return structuredClone(next);
  }

  candidateConsent(candidateId: string) { const value=this.consent.get(candidateId); return value ? structuredClone(value) : undefined; }

  canOrganizationSourceCandidate(candidateId: string, orgId: string) {
    const consent = this.consent.get(candidateId);
    if (!consent || consent.visibility === 'private') return false;
    if (consent.blockedOrganizationIds.includes(orgId)) return false;
    if (consent.visibility === 'discoverable') return true;
    return consent.allowedOrganizationIds.includes(orgId);
  }
}
