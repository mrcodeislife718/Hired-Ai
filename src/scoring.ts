import type { CandidateProfile, RawJob, ScoreBreakdown, SkillGap } from './domain.js';
import { ageInDays, clamp, normalize } from './utils.js';

const weights = {
  technicalFit: 0.24,
  compensation: 0.10,
  careerUpside: 0.12,
  location: 0.10,
  evidenceStrength: 0.16,
  competition: 0.06,
  freshness: 0.08,
  interviewProbability: 0.14
};

export function scoreOpportunity(job: RawJob, profile: CandidateProfile, gaps: SkillGap[], now = new Date()): ScoreBreakdown {
  const required = Math.max(1, job.requirements.length);
  const strong = gaps.filter(g => g.strength === 'strong').length;
  const adjacent = gaps.filter(g => g.strength === 'adjacent').length;
  const missing = gaps.filter(g => g.strength === 'missing').length;
  const technicalFit = clamp(((strong + adjacent * 0.65) / required) * 100);
  const evidenceStrength = clamp(((strong + adjacent * 0.45) / required) * 100);
  const compensation = job.salaryMax
    ? clamp(profile.constraints.minBaseSalary ? ((job.salaryMax - profile.constraints.minBaseSalary + 50_000) / 100_000) * 100 : 75)
    : 55;
  const title = normalize(job.title);
  const careerUpside = profile.constraints.preferredTitles.some(t => title.includes(normalize(t))) ? 92 : 70;
  const location = profile.constraints.targetLocations.some(l => normalize(job.location).includes(normalize(l))) ? 100 : job.workMode === 'remote' ? 80 : 25;
  const applicants = job.applicantCount ?? 75;
  const competition = clamp(100 - Math.log10(Math.max(1, applicants)) * 28);
  const freshness = clamp(100 - ageInDays(job.postedAt, now) * 6);
  const interviewProbability = clamp(technicalFit * 0.52 + evidenceStrength * 0.28 + freshness * 0.15 - missing * 5 + 5);
  const raw = { technicalFit, compensation, careerUpside, location, evidenceStrength, competition, freshness, interviewProbability };
  const total = clamp(Object.entries(weights).reduce((sum, [key, weight]) => sum + raw[key as keyof typeof raw] * weight, 0));
  return { ...raw, total: Math.round(total * 10) / 10 };
}
