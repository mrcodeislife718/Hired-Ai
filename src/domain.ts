export const PIPELINE_STATES = [
  'DISCOVERED','QUALIFIED','CONTACTED','APPLIED','RECRUITER_SCREEN','TECHNICAL','ONSITE','OFFER','REJECTED'
] as const;
export type PipelineState = typeof PIPELINE_STATES[number];

export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export type Strength = 'strong' | 'adjacent' | 'learning-gap' | 'missing';

export interface CandidateConstraints {
  targetLocations: string[];
  allowedWorkModes: WorkMode[];
  minBaseSalary?: number;
  maxCommuteMiles?: number;
  requiresSponsorship: boolean;
  preferredTitles: string[];
  excludedTerms: string[];
}

export interface CandidateProfile {
  id: string;
  name: string;
  headline: string;
  skills: string[];
  constraints: CandidateConstraints;
}

export interface RawJob {
  source: string;
  sourceId: string;
  url: string;
  company: string;
  title: string;
  location: string;
  workMode: WorkMode;
  description: string;
  requirements: string[];
  preferred: string[];
  salaryMin?: number;
  salaryMax?: number;
  postedAt: string;
  applicantCount?: number;
}

export interface Evidence {
  id: string;
  skill: string;
  repository: string;
  url: string;
  claim: string;
  verification: 'repository' | 'ci' | 'artifact' | 'manual';
  strength: number;
}

export interface SkillGap {
  skill: string;
  strength: Strength;
  evidenceIds: string[];
  explanation: string;
}

export interface ScoreBreakdown {
  technicalFit: number;
  compensation: number;
  careerUpside: number;
  location: number;
  evidenceStrength: number;
  competition: number;
  freshness: number;
  interviewProbability: number;
  total: number;
}

export interface HumanPath {
  name?: string;
  role: string;
  channel: 'email' | 'linkedin' | 'company-site' | 'referral' | 'unknown';
  publicUrl?: string;
  confidence: number;
  source: string;
}

export interface JobIntelligence {
  normalizedRequirements: string[];
  likelyInterviewAreas: string[];
  seniority: 'entry' | 'junior' | 'mid' | 'senior' | 'staff' | 'unknown';
  teamSignals: string[];
}

export interface Opportunity {
  id: string;
  job: RawJob;
  state: PipelineState;
  hardRejected: boolean;
  rejectionReasons: string[];
  intelligence: JobIntelligence;
  gaps: SkillGap[];
  evidenceIds: string[];
  score: ScoreBreakdown;
  humanPaths: HumanPath[];
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  opportunityId: string;
  action: 'SEND_OUTREACH' | 'SUBMIT_APPLICATION' | 'SEND_FOLLOWUP';
  payload: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXECUTED';
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  opportunityId?: string;
  detail: Record<string, unknown>;
}

export interface FeedbackEvent {
  opportunityId: string;
  kind: 'NO_RESPONSE' | 'REJECTED' | 'RECRUITER_SCREEN' | 'TECHNICAL_PASS' | 'TECHNICAL_FAIL' | 'ONSITE' | 'OFFER';
  at: string;
  notes?: string;
}
