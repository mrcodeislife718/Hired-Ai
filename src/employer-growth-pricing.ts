export interface GrowthEmployerPlan {
  id: 'growth';
  name: 'Growth';
  monthlyUsd: number;
  annualBillingMonthlyEquivalentUsd: number;
  annualUsd: number;
  placementFeePercent: number;
  includes: string[];
}

/** Premium employer tier intentionally benchmarked near upper-market assessment/recruiting SaaS pricing. */
export const employerGrowthPlan: GrowthEmployerPlan = {
  id:'growth',
  name:'Growth',
  monthlyUsd:599,
  annualBillingMonthlyEquivalentUsd:479,
  annualUsd:5748,
  placementFeePercent:10,
  includes:[
    'conversational role intake','candidate sourcing and matching','AI interviewer','verified assessments','quiz and scenario testing','evidence-backed badges','collaborative hiring','startup hiring workflows','gig-talent matching','outcome analytics','priority support'
  ]
};

export function validateGrowthPlan(plan = employerGrowthPlan) {
  const problems:string[]=[];
  if(plan.monthlyUsd < 500) problems.push('growth monthly price is below premium positioning');
  if(plan.annualBillingMonthlyEquivalentUsd >= plan.monthlyUsd) problems.push('annual commitment must receive a discount');
  if(plan.annualUsd !== plan.annualBillingMonthlyEquivalentUsd*12) problems.push('annual price must equal monthly-equivalent times 12');
  if(plan.placementFeePercent < 8 || plan.placementFeePercent > 20) problems.push('placement fee is outside market band');
  return {valid:problems.length===0,problems};
}
