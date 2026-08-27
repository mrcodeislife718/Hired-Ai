import type { Evidence } from './domain.js';
import { parseResumeText, planResumeModernization, type ResumeProfile } from './resume-ingestion.js';

export type ResumeAccess = 'free' | 'career' | 'pro' | 'concierge';
export type ResumeTemplateId = 'ats-classic' | 'modern-professional' | 'technical-impact' | 'executive-signature' | 'creative-editorial';
export type ResumeVariant = 'master' | 'targeted' | 'one-page' | 'two-page' | 'executive' | 'technical';

export interface ResumeTemplate {
  id: ResumeTemplateId;
  name: string;
  access: ResumeAccess;
  atsSafe: boolean;
  bestFor: string[];
  designPrinciples: string[];
  constraints: string[];
}

export interface ResumeSourceRecord {
  identity: string;
  headline?: string;
  summary?: string;
  skills: string[];
  evidence: Evidence[];
  rawResume: ResumeProfile;
  targetTitle?: string;
  targetCompany?: string;
  targetRequirements?: string[];
}

export interface ResumeQualityAudit {
  truthfulness: number;
  evidenceCoverage: number;
  relevance: number;
  clarity: number;
  impactOrientation: number;
  atsCompatibility: number;
  visualHierarchy: number;
  overall: number;
  unsupportedClaims: string[];
  missingEvidence: string[];
  warnings: string[];
}

export interface ResumePackage {
  access: ResumeAccess;
  template: ResumeTemplate;
  variant: ResumeVariant;
  title: string;
  source: ResumeSourceRecord;
  modernization: ReturnType<typeof planResumeModernization>;
  sections: {
    headline: string;
    summary: string;
    skills: string[];
    evidenceHighlights: Array<{ skill: string; repository: string; claim: string; url: string }>;
  };
  audit: ResumeQualityAudit;
  paidEnhancements: string[];
}

const accessRank: Record<ResumeAccess, number> = { free: 0, career: 1, pro: 2, concierge: 3 };

export const resumeTemplates: ResumeTemplate[] = [
  {
    id: 'ats-classic', name: 'ATS Classic', access: 'free', atsSafe: true,
    bestFor: ['most professional roles', 'career transitions', 'high-volume ATS environments'],
    designPrinciples: ['single-column reading order', 'strong section hierarchy', 'high information density without clutter', 'plain-text-safe contact details'],
    constraints: ['no critical information in graphics', 'no text boxes required for meaning', 'no keyword stuffing']
  },
  {
    id: 'modern-professional', name: 'Modern Professional', access: 'career', atsSafe: true,
    bestFor: ['business', 'operations', 'product', 'modern professional roles'],
    designPrinciples: ['restrained typography', 'clear achievement hierarchy', 'balanced whitespace', 'premium editorial rhythm'],
    constraints: ['preserve ATS reading order', 'decoration may never carry semantic meaning']
  },
  {
    id: 'technical-impact', name: 'Technical Impact', access: 'career', atsSafe: true,
    bestFor: ['software engineering', 'AI', 'data', 'infrastructure', 'technical leadership'],
    designPrinciples: ['evidence-forward projects', 'technical depth with business impact', 'compact technology taxonomy', 'portfolio visibility'],
    constraints: ['every material technical claim must be supportable', 'project work must be labeled accurately']
  },
  {
    id: 'executive-signature', name: 'Executive Signature', access: 'pro', atsSafe: true,
    bestFor: ['staff+', 'directors', 'executives', 'transformation leaders'],
    designPrinciples: ['leadership scope first', 'organizational outcomes', 'strategic narrative', 'boardroom-level restraint'],
    constraints: ['no unsupported scale metrics', 'leadership claims require evidence']
  },
  {
    id: 'creative-editorial', name: 'Creative Editorial', access: 'pro', atsSafe: false,
    bestFor: ['portfolio-led creative roles', 'brand', 'media', 'design-adjacent applications where a PDF is reviewed by humans'],
    designPrinciples: ['editorial hierarchy', 'distinctive but professional composition', 'portfolio storytelling', 'visual identity'],
    constraints: ['must be paired with an ATS-safe version when ATS ingestion is expected', 'never sacrifice readability for decoration']
  }
];

function templateFor(id: ResumeTemplateId, access: ResumeAccess) {
  const template = resumeTemplates.find(t => t.id === id);
  if (!template) throw new Error('unknown resume template');
  if (accessRank[access] < accessRank[template.access]) throw new Error(`${template.name} requires ${template.access} access or higher`);
  return template;
}

function scoreAudit(source: ResumeSourceRecord, template: ResumeTemplate): ResumeQualityAudit {
  const raw = source.rawResume.rawText;
  const lower = raw.toLowerCase();
  const evidenceSkills = new Set(source.evidence.map(e => e.skill.toLowerCase()));
  const claimedSkills = source.rawResume.skills;
  const unsupported = claimedSkills.filter(skill => !evidenceSkills.has(skill.toLowerCase()));
  const targetRequirements = source.targetRequirements ?? [];
  const matchedRequirements = targetRequirements.filter(req =>
    source.evidence.some(e => e.skill.toLowerCase() === req.toLowerCase() || e.claim.toLowerCase().includes(req.toLowerCase()))
  );
  const measurable = /\b\d+(?:\.\d+)?%|\$\d|\b\d+x\b|reduced|increased|improved|saved|grew|launched|delivered|built|implemented/i.test(raw);
  const hasSummary = /(summary|profile|professional summary|career summary)/i.test(raw);
  const truthfulness = Math.max(0, Math.round(100 - unsupported.length * 12));
  const evidenceCoverage = Math.round((source.evidence.length ? Math.min(1, new Set(source.evidence.map(e => e.skill.toLowerCase())).size / Math.max(1, new Set([...claimedSkills, ...source.evidence.map(e => e.skill)]).size)) : 0) * 100);
  const relevance = targetRequirements.length ? Math.round((matchedRequirements.length / targetRequirements.length) * 100) : 75;
  const clarity = Math.min(100, (hasSummary ? 25 : 10) + (source.rawResume.emails.length ? 20 : 10) + (source.rawResume.urls.length ? 20 : 10) + 35);
  const impactOrientation = measurable ? 90 : 55;
  const atsCompatibility = template.atsSafe ? 95 : 55;
  const visualHierarchy = template.id === 'ats-classic' ? 82 : template.id === 'creative-editorial' ? 96 : 92;
  const overall = Math.round((truthfulness * 0.2) + (evidenceCoverage * 0.15) + (relevance * 0.2) + (clarity * 0.1) + (impactOrientation * 0.15) + (atsCompatibility * 0.12) + (visualHierarchy * 0.08));
  const warnings: string[] = [];
  if (!template.atsSafe) warnings.push('Use an ATS-safe companion version when the employer uses automated parsing.');
  if (!measurable) warnings.push('Resume is weak on demonstrated outcomes; add supported scope or results where available.');
  if (!source.rawResume.urls.length) warnings.push('No portfolio or professional URL was detected.');
  if (source.rawResume.likelyOutdated) warnings.push(...source.rawResume.staleSignals);
  return {
    truthfulness, evidenceCoverage, relevance, clarity, impactOrientation, atsCompatibility, visualHierarchy, overall,
    unsupportedClaims: unsupported,
    missingEvidence: targetRequirements.filter(req => !matchedRequirements.includes(req)),
    warnings
  };
}

export class MayaResumeStudio {
  build(input: {
    access: ResumeAccess;
    rawResumeText: string;
    evidence?: Evidence[];
    currentSkills?: string[];
    identity?: string;
    headline?: string;
    targetTitle?: string;
    targetCompany?: string;
    targetRequirements?: string[];
    templateId?: ResumeTemplateId;
    variant?: ResumeVariant;
  }): ResumePackage {
    const rawResume = parseResumeText(input.rawResumeText.slice(0, 250_000));
    const evidence = input.evidence ?? [];
    const currentSkills = input.currentSkills ?? evidence.map(e => e.skill);
    const source: ResumeSourceRecord = {
      identity: input.identity ?? 'Career professional',
      headline: input.headline,
      skills: [...new Set([...currentSkills, ...rawResume.skills])],
      evidence,
      rawResume,
      targetTitle: input.targetTitle,
      targetCompany: input.targetCompany,
      targetRequirements: input.targetRequirements
    };
    const template = templateFor(input.templateId ?? 'ats-classic', input.access);
    const modernization = planResumeModernization(rawResume, currentSkills, evidence.map(e => e.skill));
    const strongest = [...evidence].sort((a,b) => b.strength - a.strength).slice(0, input.access === 'free' ? 4 : 8);
    const title = input.targetTitle ? `${input.identity ?? source.identity} — ${input.targetTitle}` : `${input.identity ?? source.identity} — Professional Resume`;
    const summary = input.targetTitle
      ? `${input.identity ?? source.identity} positioned for ${input.targetTitle}${input.targetCompany ? ` at ${input.targetCompany}` : ''}, emphasizing demonstrated strengths and verified evidence without overstating unsupported experience.`
      : `${input.identity ?? source.identity} represented through current skills, demonstrated work, and evidence-backed professional strengths.`;
    const paidEnhancements = input.access === 'free'
      ? ['Upgrade for job-specific variants, premium ATS-safe templates, multiple resume versions, deeper evidence audits, and advanced career targeting.']
      : input.access === 'career'
        ? ['Targeted resume variants', 'Premium ATS-safe templates', 'Role-specific evidence prioritization', 'Version history and regeneration']
        : input.access === 'pro'
          ? ['Everything in Career', 'Executive and editorial templates', 'Multi-role resume portfolio', 'Advanced positioning and gap analysis', 'Application-specific resume generation']
          : ['Everything in Pro', 'Human-review workflow', 'High-stakes executive/offer-transition review', 'Priority editorial refinement'];
    const pkg: ResumePackage = {
      access: input.access,
      template,
      variant: input.variant ?? (input.targetTitle ? 'targeted' : 'master'),
      title,
      source,
      modernization,
      sections: {
        headline: input.headline ?? input.targetTitle ?? source.identity,
        summary,
        skills: source.skills,
        evidenceHighlights: strongest.map(e => ({ skill: e.skill, repository: e.repository, claim: e.claim, url: e.url }))
      },
      audit: {} as ResumeQualityAudit,
      paidEnhancements
    };
    pkg.audit = scoreAudit(source, template);
    return pkg;
  }
}
