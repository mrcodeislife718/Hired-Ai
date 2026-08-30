export type HiringAudience = 'candidate' | 'employer' | 'recruiter' | 'unknown';

export type ProxySignal =
  | 'layoff'
  | 'employment-gap'
  | 'degree'
  | 'career-change'
  | 'caregiving'
  | 'self-employment'
  | 'early-career'
  | 'unconventional-background';

export interface BiasSignal {
  signal: ProxySignal;
  observedFact: string;
  unsupportedInference: string;
  jobRelevantAlternative: string;
  severity: 'watch' | 'material';
}

export interface BiasGuidance {
  audience: HiringAudience;
  detected: boolean;
  signals: BiasSignal[];
  candidateGuidance: string[];
  evaluatorGuidance: string[];
  principle: string;
}

const SIGNALS: Array<{
  signal: ProxySignal;
  pattern: RegExp;
  observedFact: string;
  unsupportedInference: string;
  jobRelevantAlternative: string;
  severity: 'watch' | 'material';
}> = [
  {
    signal: 'layoff',
    pattern: /\b(laid\s*off|layoff|layoffs|reduction in force|rif|position eliminated|role eliminated)\b/i,
    observedFact: 'An employment relationship ended because of a layoff or role elimination.',
    unsupportedInference: 'The layoff proves weak performance, low ability, or low value.',
    jobRelevantAlternative: 'Evaluate documented performance, outcomes, references, role-relevant skills, recent proof, and the reason for the reduction when known.',
    severity: 'material'
  },
  {
    signal: 'employment-gap',
    pattern: /\b(employment gap|career gap|gap on (my|the) resume|unemployed|out of work|between jobs|return(?:ing)? to work|re-?enter(?:ing)?)\b/i,
    observedFact: 'There is a period without conventional employment.',
    unsupportedInference: 'The gap proves skill decay, lack of ambition, unreliability, or poor performance.',
    jobRelevantAlternative: 'Evaluate current capability, recency of relevant practice, refreshed evidence, references, work samples, and actual role requirements.',
    severity: 'material'
  },
  {
    signal: 'degree',
    pattern: /\b(no degree|without a degree|lack of degree|college degree|bachelor'?s|bachelors|four[- ]year degree|degree required)\b/i,
    observedFact: 'A formal degree credential is present, absent, or being considered as a screen.',
    unsupportedInference: 'Degree status alone proves or disproves ability to perform the job.',
    jobRelevantAlternative: 'Treat legally or professionally required credentials as hard gates; otherwise compare the degree requirement with demonstrated skills, outcomes, assessments, experience, and equivalent evidence.',
    severity: 'material'
  },
  {
    signal: 'career-change',
    pattern: /\b(career change|change careers|switch careers|pivot|transition(?:ing)? careers?|different field|different industry)\b/i,
    observedFact: 'The person is moving between roles, functions, or industries.',
    unsupportedInference: 'A non-linear path means the candidate lacks commitment or relevant ability.',
    jobRelevantAlternative: 'Map transferable capability, adjacent experience, role-specific proof, genuine gaps, and required credentials.',
    severity: 'watch'
  },
  {
    signal: 'caregiving',
    pattern: /\b(caregiv|caregiver|family leave|parental leave|maternity leave|paternity leave|caring for (a|my) (child|parent|family))\b/i,
    observedFact: 'Time was spent on caregiving or family responsibilities.',
    unsupportedInference: 'Caregiving predicts lower commitment, availability, competence, or future performance.',
    jobRelevantAlternative: 'Evaluate current availability against actual job requirements and assess capability using role-relevant evidence.',
    severity: 'material'
  },
  {
    signal: 'self-employment',
    pattern: /\b(self[- ]employ|freelanc|independent contractor|consult(?:ant|ing)|own business|entrepreneur)\b/i,
    observedFact: 'Some experience came from self-employment, freelance, consulting, or entrepreneurship.',
    unsupportedInference: 'Nontraditional employment is inherently less credible than payroll employment.',
    jobRelevantAlternative: 'Verify scope, clients where disclosable, artifacts, outcomes, references, revenue or delivery evidence, and role-relevant responsibilities.',
    severity: 'watch'
  },
  {
    signal: 'early-career',
    pattern: /\b(entry[- ]level|early career|first job|new grad|graduate|junior|no experience)\b/i,
    observedFact: 'The candidate has limited conventional tenure in the target occupation.',
    unsupportedInference: 'Limited tenure means the candidate cannot already demonstrate useful capability.',
    jobRelevantAlternative: 'Use work samples, education, apprenticeships, assessments, projects, volunteering, references, and demonstrated learning velocity where relevant.',
    severity: 'watch'
  },
  {
    signal: 'unconventional-background',
    pattern: /\b(nontraditional|non-traditional|unconventional background|unusual background|bootcamp|self[- ]taught|transferable skills)\b/i,
    observedFact: 'The candidate reached the role through a nonstandard path.',
    unsupportedInference: 'A nonstandard path is weaker than a conventional pedigree regardless of demonstrated capability.',
    jobRelevantAlternative: 'Compare the candidate with the actual work: required credentials, demonstrated skills, evidence quality, outcomes, and ability to perform the role.',
    severity: 'watch'
  }
];

export function inferHiringAudience(message: string): HiringAudience {
  const lower = message.toLowerCase();
  if (/\b(my candidate|our candidate|applicant|we are hiring|we're hiring|screen candidates?|hiring criteria|shortlist|interview panel)\b/.test(lower)) return 'employer';
  if (/\b(i recruit|i'm a recruiter|i am a recruiter|recruiting candidates?|my client|sourcing candidates?)\b/.test(lower)) return 'recruiter';
  if (/\b(my resume|my cv|my job search|i was laid off|i got laid off|i am unemployed|i'm unemployed|help me get hired|my career)\b/.test(lower)) return 'candidate';
  return 'unknown';
}

export function analyzeHiringBias(message: string, audience: HiringAudience = inferHiringAudience(message)): BiasGuidance {
  const signals = SIGNALS.filter(item => item.pattern.test(message)).map(({ pattern: _pattern, ...signal }) => signal);
  const candidateGuidance = signals.length ? [
    'Do not let a weak proxy become the center of your story; lead with current, role-relevant evidence of capability.',
    'State context truthfully and briefly when it matters, then redirect to verified skills, outcomes, projects, references, recency, and trajectory.',
    'Prepare proof for the exact requirement the employer is trying to predict instead of over-explaining personal circumstances.',
    'Treat a biased screen as a market risk to route around where possible: strengthen warm paths, evidence-rich applications, referrals, portfolios, assessments, and target selection.'
  ] : [];
  const evaluatorGuidance = signals.length ? [
    'Separate observed facts from assumptions about performance, ability, reliability, or value.',
    'Ask whether the screen has a defensible connection to the work and whether a less noisy job-relevant measure is available.',
    'Preserve legitimate credential, licensing, safety, authorization, and availability requirements as real gates.',
    'Prefer structured, role-relevant evidence such as validated skills, outcomes, work samples, assessments, references, recency, and demonstrated trajectory.'
  ] : [];
  return {
    audience,
    detected: signals.length > 0,
    signals,
    candidateGuidance,
    evaluatorGuidance,
    principle: 'Protect candidates from unfair inference and protect employers from bad hiring decisions caused by unfair inference.'
  };
}

export function mayaBiasContext(message: string) {
  const analysis = analyzeHiringBias(message);
  if (!analysis.detected) return '';
  const facts = analysis.signals.map(signal => `- ${signal.observedFact}`).join('\n');
  const inferences = analysis.signals.map(signal => `- Do not infer: ${signal.unsupportedInference}`).join('\n');
  const alternatives = analysis.signals.map(signal => `- Prefer: ${signal.jobRelevantAlternative}`).join('\n');
  return `HIRING BIAS / WEAK-PROXY CHECK\nAudience: ${analysis.audience}\n${facts}\n${inferences}\n${alternatives}\nPrinciple: ${analysis.principle}`;
}

export function deterministicBiasNotice(message: string) {
  const analysis = analyzeHiringBias(message);
  if (!analysis.detected) return '';
  const primary = analysis.signals[0];
  const extra = analysis.signals.length > 1 ? ` I also see ${analysis.signals.length - 1} additional weak-proxy risk${analysis.signals.length === 2 ? '' : 's'} in what you described.` : '';
  if (analysis.audience === 'employer' || analysis.audience === 'recruiter') {
    return `One hiring-quality warning: ${primary.observedFact} That fact does not by itself justify the inference that ${primary.unsupportedInference.charAt(0).toLowerCase()}${primary.unsupportedInference.slice(1)} ${primary.jobRelevantAlternative}${extra}`;
  }
  return `One thing I want to protect you from: some hiring processes may treat this as a negative proxy even when it does not directly predict job performance. ${primary.observedFact} That does not by itself mean ${primary.unsupportedInference.charAt(0).toLowerCase()}${primary.unsupportedInference.slice(1)} We should keep the context brief and lead with direct evidence of what you can do now.${extra}`;
}

export function applyDeterministicBiasGuidance(message: string, answer: string) {
  const notice = deterministicBiasNotice(message);
  return notice ? `${answer}\n\n${notice}` : answer;
}
