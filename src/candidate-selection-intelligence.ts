import type { CandidateProfile, Evidence, Opportunity } from './domain.js';
import { positionCapability, type PositionedClaim } from './candidate-positioning.js';
import { normalize } from './utils.js';

export type CoverageLevel = 'Strong' | 'Moderate' | 'Weak' | 'Missing';
export type SelectionPerspective = 'hiring-manager' | 'senior-recruiter' | 'ats';

export interface RequirementEvidenceMap {
  requirement: string;
  coverage: CoverageLevel;
  claim: PositionedClaim;
  evidenceIds: string[];
  evidenceSources: string[];
  resumeVisible: boolean;
  portfolioOnly: boolean;
  action: string;
}

export interface PerspectiveAssessment {
  perspective: SelectionPerspective;
  score: number;
  positives: string[];
  risks: string[];
  decisionSignal: 'advance' | 'borderline' | 'reject-risk';
}

export interface KeywordGap {
  keyword: string;
  status: 'supported-but-missing' | 'weakly-supported' | 'unsupported';
  evidenceIds: string[];
  recommendation: string;
}

export interface ResumeStoryAnalysis {
  currentStory: string;
  targetStory: string;
  emphasize: string[];
  shortenOrRemove: string[];
  moveEarlier: string[];
}

export interface ResumeRewriteSuggestion {
  sourceText: string;
  suggestedText: string;
  evidenceIds: string[];
  reason: string;
  safeToUse: boolean;
}

export interface CompetitiveSelectionSimulation {
  assumedApplicantPool: number;
  assumedInterviewSlots: number;
  estimatedInterviewProbability: number;
  estimateBasis: string[];
  likelySelectionReasons: string[];
  likelyRejectionReasons: string[];
  verdict: 'likely-shortlist' | 'competitive-but-not-secure' | 'unlikely-shortlist';
}

export interface CompetitiveApplicationAnalysis {
  opportunityId: string;
  role: string;
  company: string;
  requirementMap: RequirementEvidenceMap[];
  perspectives: PerspectiveAssessment[];
  keywordGaps: KeywordGap[];
  story: ResumeStoryAnalysis;
  bulletSuggestions: ResumeRewriteSuggestion[];
  topFiveChanges: string[];
  simulation: CompetitiveSelectionSimulation;
  roleSpecificResumePlan: string[];
  evidenceDiscoveryRule: string;
  truthRule: string;
}

const STOPWORDS = new Set(['and','the','with','for','from','that','this','into','your','you','our','are','will','have','has','using','use','years','year','experience','required','preferred','skills','skill','ability','work','working','role','team','strong','knowledge','understanding']);
const clamp = (n:number) => Math.max(0, Math.min(100, Math.round(n)));
const uniq = <T>(values:T[]) => [...new Set(values)];
const tokens = (value:string) => normalize(value).split(/\s+/).map(v=>v.replace(/[^a-z0-9+#.]/g,'')).filter(v=>v.length > 2 && !STOPWORDS.has(v));
const containsPhrase = (text:string, phrase:string) => normalize(text).includes(normalize(phrase));

function coverageFor(claim: PositionedClaim): CoverageLevel {
  if (!claim.permitted) return 'Missing';
  if (claim.confidence === 'evidence-limited') return claim.defendabilityScore >= 60 ? 'Weak' : 'Missing';
  if (claim.defendabilityScore >= 82) return 'Strong';
  if (claim.defendabilityScore >= 58) return 'Moderate';
  return 'Weak';
}

function evidenceSources(evidence: Evidence[], ids: string[]) {
  return uniq(evidence.filter(item=>ids.includes(item.id)).map(item=>item.repository || item.url).filter(Boolean));
}

export function mapRequirementsToEvidence(input: {
  profile: CandidateProfile;
  evidence: Evidence[];
  opportunity: Opportunity;
  resumeText: string;
}): RequirementEvidenceMap[] {
  const requirements = uniq([...input.opportunity.job.requirements, ...input.opportunity.job.preferred].map(v=>v.trim()).filter(Boolean));
  return requirements.map(requirement => {
    const claim = positionCapability({ profile:input.profile, evidence:input.evidence, requirement });
    const coverage = coverageFor(claim);
    const visible = containsPhrase(input.resumeText, requirement) || tokens(requirement).some(token=>normalize(input.resumeText).includes(token));
    const sources = evidenceSources(input.evidence, claim.evidenceIds);
    const portfolioOnly = !visible && claim.evidenceIds.length > 0;
    let action: string;
    if (coverage === 'Missing') action = 'Do not claim this requirement. Treat it as a real gap unless new authorized evidence proves it.';
    else if (portfolioOnly) action = 'Promote the strongest authorized proof into the role-specific resume or application package so the evaluator does not miss it.';
    else if (coverage === 'Weak') action = 'Keep wording explicitly transferable or adjacent and strengthen proof before relying on this requirement.';
    else action = 'Keep this evidence visible and tie it directly to role impact, scope, ownership, and technical depth.';
    return { requirement, coverage, claim, evidenceIds:claim.evidenceIds, evidenceSources:sources, resumeVisible:visible, portfolioOnly, action };
  });
}

function scorePerspective(perspective: SelectionPerspective, map: RequirementEvidenceMap[], resumeText:string): PerspectiveAssessment {
  const weights: Record<CoverageLevel,number> = { Strong:100, Moderate:72, Weak:42, Missing:0 };
  const base = map.length ? map.reduce((sum,item)=>sum+weights[item.coverage],0)/map.length : 0;
  const strong = map.filter(item=>item.coverage==='Strong');
  const missing = map.filter(item=>item.coverage==='Missing');
  const hidden = map.filter(item=>item.portfolioOnly);
  const outcomeLanguage = /(improved|reduced|increased|launched|delivered|built|designed|implemented|owned|led|scaled|saved|revenue|latency|users|customers|percent|%)/i.test(resumeText);
  let score = base;
  const positives:string[] = [];
  const risks:string[] = [];

  if (perspective === 'hiring-manager') {
    score += outcomeLanguage ? 7 : -7;
    if (strong.length) positives.push(`${strong.length} requirements have strong defendable proof.`);
    if (outcomeLanguage) positives.push('The resume contains execution or outcome-oriented language.');
    if (hidden.length) risks.push(`${hidden.length} relevant proof signals exist outside the resume and could be overlooked.`);
    if (!outcomeLanguage) risks.push('The resume under-signals impact, ownership, scope, or delivered outcomes.');
  } else if (perspective === 'senior-recruiter') {
    const visibleStrong = strong.filter(item=>item.resumeVisible).length;
    score += visibleStrong * 2;
    positives.push(`${visibleStrong} strong requirements are readily visible in the resume.`);
    if (hidden.length) risks.push('Recruiter scan risk: material qualifications are buried in portfolio evidence rather than the resume.');
    if (missing.length) risks.push(`${missing.length} requirements have no defensible support.`);
  } else {
    const visible = map.filter(item=>item.resumeVisible && item.coverage!=='Missing').length;
    const coverage = map.length ? visible/map.length : 0;
    score = (base * .55) + (coverage * 45);
    if (visible) positives.push(`${visible} supported requirements are textually discoverable for matching.`);
    if (hidden.length) risks.push(`${hidden.length} supported requirements may be missed by text-first candidate-job matching.`);
    if (missing.length) risks.push('Unsupported keywords are intentionally not injected merely to raise match score.');
  }

  score = clamp(score);
  return { perspective, score, positives, risks, decisionSignal:score>=76?'advance':score>=55?'borderline':'reject-risk' };
}

export function assessSelectionPerspectives(map: RequirementEvidenceMap[], resumeText:string): PerspectiveAssessment[] {
  return (['hiring-manager','senior-recruiter','ats'] as SelectionPerspective[]).map(p=>scorePerspective(p,map,resumeText));
}

export function detectKeywordGaps(map: RequirementEvidenceMap[], resumeText:string): KeywordGap[] {
  const resume = normalize(resumeText);
  const out: KeywordGap[] = [];
  for (const item of map) {
    for (const keyword of tokens(item.requirement)) {
      if (resume.includes(keyword)) continue;
      const existing = out.find(g=>g.keyword===keyword);
      if (existing) continue;
      if (item.coverage === 'Strong' || item.coverage === 'Moderate') {
        out.push({ keyword, status:'supported-but-missing', evidenceIds:item.evidenceIds, recommendation:`Add ${keyword} only in a truthful context tied to the supporting evidence.` });
      } else if (item.coverage === 'Weak') {
        out.push({ keyword, status:'weakly-supported', evidenceIds:item.evidenceIds, recommendation:`Use ${keyword} only with adjacent/transferable wording unless stronger evidence is obtained.` });
      } else {
        out.push({ keyword, status:'unsupported', evidenceIds:[], recommendation:`Do not add ${keyword} merely for ATS matching; first obtain real evidence if the capability is required.` });
      }
    }
  }
  return out;
}

function topEvidenceSkills(evidence:Evidence[]) {
  return [...evidence].sort((a,b)=>b.strength-a.strength).map(item=>item.skill).filter(Boolean);
}

export function analyzeResumeStory(input:{profile:CandidateProfile;evidence:Evidence[];map:RequirementEvidenceMap[];resumeText:string;opportunity:Opportunity}): ResumeStoryAnalysis {
  const visibleStrong = input.map.filter(item=>item.resumeVisible && ['Strong','Moderate'].includes(item.coverage)).map(item=>item.requirement);
  const hiddenStrong = input.map.filter(item=>item.portfolioOnly && ['Strong','Moderate'].includes(item.coverage)).map(item=>item.requirement);
  const strongest = uniq(topEvidenceSkills(input.evidence)).slice(0,4);
  const currentStory = visibleStrong.length
    ? `The current resume most clearly presents a candidate aligned through ${visibleStrong.slice(0,3).join(', ')}.`
    : `The current resume does not make the strongest verified capabilities sufficiently obvious for this role.`;
  const targetStory = `Present ${input.profile.name} as a ${input.opportunity.job.title} candidate whose strongest provable fit is ${uniq([...hiddenStrong,...visibleStrong,...strongest]).slice(0,5).join(', ') || 'the role-relevant verified evidence'}, with every major claim traceable to proof.`;
  const shortenOrRemove = input.map.filter(item=>item.coverage==='Missing').map(item=>`Any unsupported positioning that implies ${item.requirement}`).slice(0,5);
  return {
    currentStory,
    targetStory,
    emphasize:uniq([...hiddenStrong,...visibleStrong]).slice(0,7),
    shortenOrRemove,
    moveEarlier:hiddenStrong.slice(0,5)
  };
}

function candidateBullets(resumeText:string) {
  return resumeText.split(/\r?\n/).map(v=>v.trim()).filter(v=>/^[-*•]/.test(v) || v.length>45).slice(0,30);
}

export function suggestTruthfulBulletRewrites(resumeText:string, evidence:Evidence[], map:RequirementEvidenceMap[]): ResumeRewriteSuggestion[] {
  const bullets = candidateBullets(resumeText);
  const strongEvidence = [...evidence].sort((a,b)=>b.strength-a.strength);
  const weakBullets = bullets.filter(line=>!/(improved|reduced|increased|launched|delivered|built|designed|implemented|owned|led|scaled|saved|automated|deployed)/i.test(line)).slice(0,5);
  const suggestions:ResumeRewriteSuggestion[] = [];
  for (let i=0;i<weakBullets.length;i++) {
    const proof = strongEvidence[i % Math.max(1,strongEvidence.length)];
    if (!proof) break;
    const relevant = map.find(item=>item.evidenceIds.includes(proof.id));
    const scope = relevant ? ` in support of ${relevant.requirement}` : '';
    suggestions.push({
      sourceText:weakBullets[i],
      suggestedText:`Built or implemented ${proof.claim}${scope}; emphasize the actual scope, ownership, technical depth, users, reliability, performance, cost, or business result only where the candidate can verify those details.`,
      evidenceIds:[proof.id],
      reason:'Replace duty-style language with a proof-linked action/impact structure without inventing a metric.',
      safeToUse:true
    });
  }
  return suggestions;
}

function estimatedProbability(perspectives:PerspectiveAssessment[], map:RequirementEvidenceMap[], applicantPool:number, interviewSlots:number) {
  const avg = perspectives.length ? perspectives.reduce((s,p)=>s+p.score,0)/perspectives.length : 0;
  const strongRatio = map.length ? map.filter(m=>m.coverage==='Strong').length/map.length : 0;
  const missingRatio = map.length ? map.filter(m=>m.coverage==='Missing').length/map.length : 0;
  const raw = (avg*.58) + (strongRatio*30) - (missingRatio*24);
  const slotPressure = Math.max(.25, Math.min(1, (interviewSlots/applicantPool)*12));
  return clamp(raw*slotPressure);
}

export function simulateCompetitiveSelection(input:{perspectives:PerspectiveAssessment[];map:RequirementEvidenceMap[];applicantPool?:number;interviewSlots?:number}): CompetitiveSelectionSimulation {
  const applicantPool = Math.max(1,input.applicantPool ?? 200);
  const interviewSlots = Math.max(1,Math.min(applicantPool,input.interviewSlots ?? 10));
  const probability = estimatedProbability(input.perspectives,input.map,applicantPool,interviewSlots);
  const strong = input.map.filter(m=>m.coverage==='Strong');
  const hidden = input.map.filter(m=>m.portfolioOnly);
  const missing = input.map.filter(m=>m.coverage==='Missing');
  return {
    assumedApplicantPool:applicantPool,
    assumedInterviewSlots:interviewSlots,
    estimatedInterviewProbability:probability,
    estimateBasis:[
      'This is a heuristic estimate, not a factual prediction of an employer decision.',
      'It combines evidence coverage, evaluator-perspective scores, missing requirements, and interview-slot scarcity.',
      'It does not assume unsupported candidate claims are true.'
    ],
    likelySelectionReasons:strong.slice(0,5).map(m=>`${m.requirement} has strong defendable evidence.`),
    likelyRejectionReasons:uniq([
      ...missing.slice(0,5).map(m=>`${m.requirement} is unsupported or missing.`),
      ...hidden.slice(0,5).map(m=>`${m.requirement} is supported but may be invisible in a fast resume scan.`)
    ]),
    verdict:probability>=60?'likely-shortlist':probability>=30?'competitive-but-not-secure':'unlikely-shortlist'
  };
}

export function analyzeCompetitiveApplication(input:{
  profile:CandidateProfile;
  evidence:Evidence[];
  opportunity:Opportunity;
  resumeText:string;
  applicantPool?:number;
  interviewSlots?:number;
}): CompetitiveApplicationAnalysis {
  const requirementMap = mapRequirementsToEvidence(input);
  const perspectives = assessSelectionPerspectives(requirementMap,input.resumeText);
  const keywordGaps = detectKeywordGaps(requirementMap,input.resumeText);
  const story = analyzeResumeStory({ ...input, map:requirementMap });
  const bulletSuggestions = suggestTruthfulBulletRewrites(input.resumeText,input.evidence,requirementMap);
  const simulation = simulateCompetitiveSelection({ perspectives, map:requirementMap, applicantPool:input.applicantPool, interviewSlots:input.interviewSlots });
  const portfolioOnly = requirementMap.filter(m=>m.portfolioOnly && m.coverage!=='Missing');
  const missing = requirementMap.filter(m=>m.coverage==='Missing');
  const supportedKeywords = keywordGaps.filter(g=>g.status==='supported-but-missing');
  const rankedChanges = [
    portfolioOnly[0] ? `Surface proof for ${portfolioOnly[0].requirement} directly in the resume; it is currently discoverable outside the resume but easy to miss.` : '',
    story.moveEarlier[0] ? `Move ${story.moveEarlier[0]} earlier so the strongest role-relevant evidence appears in the first scan.` : '',
    supportedKeywords[0] ? `Add the supported missing term “${supportedKeywords[0].keyword}” in a truthful evidence-backed context.` : '',
    bulletSuggestions[0] ? 'Rewrite the weakest duty-style bullet around verified action, scope, ownership, technical depth, and actual impact.' : '',
    missing[0] ? `Do not disguise the gap in ${missing[0].requirement}; either close it, show adjacent evidence accurately, or deprioritize it.` : '',
    'Make the first third of the resume tell the target-role story rather than a generic career history.',
    'Attach or link portfolio proof for claims that materially influence selection.'
  ].filter(Boolean);
  return {
    opportunityId:input.opportunity.id,
    role:input.opportunity.job.title,
    company:input.opportunity.job.company,
    requirementMap,
    perspectives,
    keywordGaps,
    story,
    bulletSuggestions,
    topFiveChanges:uniq(rankedChanges).slice(0,5),
    simulation,
    roleSpecificResumePlan:[
      `Lead with a headline and summary aligned to ${input.opportunity.job.title}, not a generic identity.`,
      'Order experience and projects by relevance to this role rather than chronology alone.',
      'For each important requirement, surface the strongest authorized proof and preserve a traceable evidence path.',
      'Use supported job-language keywords naturally; never inject unsupported experience for matching.',
      'Rewrite bullets around verified impact, scope, ownership, technical depth, and business relevance.',
      'Remove or compress material that consumes attention without strengthening this specific candidacy.'
    ],
    evidenceDiscoveryRule:'Do not treat “not present on the resume” as “candidate cannot do it.” With candidate authorization, search the available GitHub, portfolio, work-artifact, project, credential, and other evidence sources before classifying an important requirement as missing.',
    truthRule:'Optimize the visibility and selection value of real evidence. Never invent employment, skills, ownership, scope, metrics, credentials, dates, production use, or outcomes.'
  };
}
