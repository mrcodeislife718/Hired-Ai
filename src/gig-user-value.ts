import type { UserValueIntervention } from './user-value-orchestrator.js';

export interface GigWorkerValueInputs {
  incomeGoal?: number;
  idleTimeHigh?: boolean;
  repeatCustomersAvailable?: boolean;
  platformConcentrationHigh?: boolean;
  portableProofWeak?: boolean;
  wantsIndependentBusiness?: boolean;
  wantsSalariedTransition?: boolean;
}

export function gigWorkerValueInterventions(input: GigWorkerValueInputs): UserValueIntervention[] {
  const interventions: UserValueIntervention[] = [
    {
      id:'gig-income', kind:'economic-upside', label:'Increase useful paid work and earnings quality',
      rationale:'Gig workers need more income, better work and less unpaid waiting—not more marketplace browsing.',
      expectedOutcome: input.incomeGoal ? `Move earnings toward the user’s ${input.incomeGoal} income target.` : 'Increase earnings and the quality of paid opportunities.',
      friction:0.14, confidence:0.84, urgency:0.85, reversible:true,
      signals:[{dimension:'income-upside',value:1},{dimension:'outcome-progress',value:0.92},{dimension:'time-saved',value:0.75}]
    },
    {
      id:'gig-access', kind:'opportunity-access', label:'Prioritize higher-value clients and repeat work',
      rationale:'Repeat clients and stronger-fit opportunities reduce acquisition waste and income volatility.',
      expectedOutcome:'Increase conversion, repeat business and paid utilization.', friction:0.18, confidence:input.repeatCustomersAvailable ? 0.92 : 0.76, urgency:input.idleTimeHigh ? 0.95 : 0.72, reversible:true,
      signals:[{dimension:'success-probability',value:0.92},{dimension:'income-upside',value:0.9},{dimension:'retention',value:0.8},{dimension:'effort-reduction',value:0.75}]
    },
    {
      id:'gig-proof', kind:'smallest-high-value-gap', label:'Turn completed work into portable proof',
      rationale:'Ratings, repeat customers, completed jobs and outcomes should become evidence the worker owns and can reuse.',
      expectedOutcome:'Increase bargaining power and access beyond a single platform.', friction:0.16, confidence:0.9, urgency:input.portableProofWeak ? 0.9 : 0.64, reversible:true,
      signals:[{dimension:'strategic-compounding',value:0.98},{dimension:'success-probability',value:0.85},{dimension:'income-upside',value:0.8},{dimension:'trust',value:0.8}]
    },
    {
      id:'gig-friction', kind:'friction-removal', label:'Reduce unpaid coordination and dead time',
      rationale:'Scheduling, follow-up, proof capture and opportunity comparison should not consume the time the worker could spend earning.',
      expectedOutcome:'Increase paid utilization and reduce operational overhead.', friction:0.1, confidence:0.88, urgency:input.idleTimeHigh ? 0.94 : 0.72, reversible:true,
      signals:[{dimension:'time-saved',value:1},{dimension:'effort-reduction',value:0.96},{dimension:'income-upside',value:0.82}]
    }
  ];

  if (input.platformConcentrationHigh) interventions.push({
    id:'gig-platform-risk', kind:'opportunity-access', label:'Reduce dependence on one platform',
    rationale:'A worker whose income depends on one marketplace is exposed to ranking, fee, policy and demand changes they do not control.',
    expectedOutcome:'Create multiple customer and opportunity channels while preserving current income.', friction:0.28, confidence:0.84, urgency:0.86, reversible:true,
    signals:[{dimension:'strategic-compounding',value:0.95},{dimension:'income-upside',value:0.8},{dimension:'trust',value:0.7}]
  });

  if (input.wantsIndependentBusiness) interventions.push({
    id:'gig-business', kind:'economic-upside', label:'Convert gig momentum into an independent business path',
    rationale:'When the user wants ownership, Hired AI should help turn customer evidence, pricing power and repeat work into a business transition.',
    expectedOutcome:'Increase ownership, margin and long-term economic upside.', friction:0.4, confidence:0.74, urgency:0.65, reversible:true,
    signals:[{dimension:'income-upside',value:0.96},{dimension:'strategic-compounding',value:1},{dimension:'outcome-progress',value:0.86}]
  });

  if (input.wantsSalariedTransition) interventions.push({
    id:'gig-salaried-bridge', kind:'opportunity-access', label:'Translate gig evidence into a salaried career transition',
    rationale:'Completed gigs can prove reliability, customer outcomes, operations, sales, craft or technical capability when translated into the target employer’s evidence language.',
    expectedOutcome:'Turn independent work into credible access to salaried roles.', friction:0.24, confidence:0.82, urgency:0.72, reversible:true,
    signals:[{dimension:'outcome-progress',value:0.96},{dimension:'success-probability',value:0.88},{dimension:'income-upside',value:0.82}]
  });

  return interventions;
}
