import { readFile } from 'node:fs/promises';

export interface ResumeProfile {
  rawText: string;
  skills: string[];
  emails: string[];
  urls: string[];
  yearsMentioned: number[];
  latestYearMentioned?: number;
  likelyOutdated: boolean;
  staleSignals: string[];
}

export interface ResumeModernizationPlan {
  likelyOutdated: boolean;
  staleSignals: string[];
  missingCurrentSkills: string[];
  missingEvidenceSkills: string[];
  recommendedActions: string[];
}

const known = ['python','javascript','typescript','react','node.js','node','docker','kubernetes','postgresql','sql','mongodb','redis','aws','gcp','java','c++','php','linux','github','rest api'];

export function parseResumeText(rawText: string): ResumeProfile {
  const lower = rawText.toLowerCase();
  const yearsMentioned = [...rawText.matchAll(/\b(?:19|20)\d{2}\b/g)].map(m => Number(m[0])).filter(Number.isFinite);
  const latestYearMentioned = yearsMentioned.length ? Math.max(...yearsMentioned) : undefined;
  const currentYear = new Date().getUTCFullYear();
  const staleSignals: string[] = [];
  if (latestYearMentioned && currentYear - latestYearMentioned >= 2) staleSignals.push(`latest dated experience appears to stop in ${latestYearMentioned}`);
  if (!/linkedin\.com/i.test(rawText)) staleSignals.push('LinkedIn profile is not referenced');
  if (!/github\.com/i.test(rawText)) staleSignals.push('GitHub or public technical portfolio is not referenced');
  if (!/(summary|profile|professional summary|career summary)/i.test(rawText)) staleSignals.push('no clear current professional summary detected');
  if (!/(impact|result|improved|reduced|increased|built|designed|implemented|delivered|launched)/i.test(rawText)) staleSignals.push('experience appears weakly outcome-oriented');
  return {
    rawText,
    skills: known.filter(s => lower.includes(s)),
    emails: [...rawText.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)].map(m => m[0]),
    urls: [...rawText.matchAll(/https?:\/\/[^\s)]+/g)].map(m => m[0]),
    yearsMentioned,
    latestYearMentioned,
    likelyOutdated: staleSignals.length >= 2,
    staleSignals
  };
}

export function planResumeModernization(profile: ResumeProfile, currentSkills: string[] = [], evidenceSkills: string[] = []): ResumeModernizationPlan {
  const normalizedResume = new Set(profile.skills.map(s => s.toLowerCase()));
  const missingCurrentSkills = currentSkills.filter(s => !normalizedResume.has(s.toLowerCase()));
  const missingEvidenceSkills = evidenceSkills.filter(s => !normalizedResume.has(s.toLowerCase()));
  const recommendedActions: string[] = [];
  if (profile.likelyOutdated) recommendedActions.push('rebuild the resume around the user’s current career identity and most recent verified work');
  if (missingCurrentSkills.length) recommendedActions.push('add current skills only where they can be supported by real experience or evidence');
  if (missingEvidenceSkills.length) recommendedActions.push('surface verified portfolio evidence that is absent from the current resume');
  recommendedActions.push('rewrite bullets around scope, action, technical depth, measurable result, and relevance to target roles');
  recommendedActions.push('remove stale or low-value material that no longer supports the target career direction');
  recommendedActions.push('maintain a durable master career record so future resumes can be regenerated instead of manually rebuilt');
  return { likelyOutdated: profile.likelyOutdated, staleSignals: profile.staleSignals, missingCurrentSkills, missingEvidenceSkills, recommendedActions };
}

export async function ingestResumeFile(path: string) {
  return parseResumeText(await readFile(path, 'utf8'));
}
