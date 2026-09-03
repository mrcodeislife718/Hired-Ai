export interface GigProfile {
  workerId: string;
  services: string[];
  platforms: string[];
  desiredWeeklyIncome?: number;
  hoursAvailable?: number;
  transitionTarget?: string;
}

export interface GigSignal {
  service: string;
  completedJobs: number;
  repeatCustomers: number;
  averageRating?: number;
  grossIncome?: number;
  verified: boolean;
}

export interface GigCareerPlan {
  currentProof: string[];
  incomeRisks: string[];
  nextMoves: string[];
  transitionBridge?: string;
}

export function buildGigCareerPlan(profile: GigProfile, signals: GigSignal[]): GigCareerPlan {
  const verified = signals.filter(signal=>signal.verified);
  const currentProof = verified.flatMap(signal=>[
    `${signal.service}: ${signal.completedJobs} verified completed jobs`,
    ...(signal.repeatCustomers > 0 ? [`${signal.service}: ${signal.repeatCustomers} repeat customers`] : [])
  ]);
  const platformConcentration = profile.platforms.length <= 1;
  const incomeRisks = [
    ...(platformConcentration ? ['income depends on a single marketplace or channel'] : []),
    ...(verified.length === 0 ? ['work history is not yet backed by verified outcome evidence'] : []),
    ...(!profile.desiredWeeklyIncome ? ['weekly income target is not defined'] : [])
  ];
  const nextMoves = [
    'turn completed gig outcomes into portable career evidence',
    'identify the highest-value services by earnings, repeat demand, and future career transferability',
    ...(platformConcentration ? ['build a second authorized demand channel to reduce platform concentration'] : []),
    ...(profile.transitionTarget ? [`map gig evidence into the requirements for ${profile.transitionTarget}`] : ['decide whether the goal is higher gig income, an independent business, or transition into a salaried career'])
  ];
  return {
    currentProof,
    incomeRisks,
    nextMoves,
    transitionBridge: profile.transitionTarget ? `Translate verified gig work into evidence for ${profile.transitionTarget} instead of treating gig history as disposable work.` : undefined
  };
}

export const GIG_ECONOMY_POSITIONING = {
  principle:'Gig work is real work and can be both an income path and a bridge into a dream career.',
  surfaces:['gig opportunity discovery','portable proof','income goals','multi-platform strategy','customer outcomes','ratings and repeat work','independent-business transition','salary-career transition','interview translation','verified badges where appropriate']
} as const;
