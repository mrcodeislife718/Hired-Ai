export type MayaEconomicEvent = {
  type: 'paid_user' | 'interview' | 'offer' | 'placement' | 'retained_after_placement' | 'revenue' | 'delivery_cost';
  userId?: string;
  amountUsd?: number;
};

export class MayaEconomicProductionLedger {
  private readonly events: MayaEconomicEvent[] = [];

  record(event: MayaEconomicEvent): void {
    this.events.push(structuredClone(event));
  }

  metrics() {
    const unique = (type: MayaEconomicEvent['type']) => new Set(this.events.filter((e) => e.type === type).map((e) => e.userId).filter(Boolean)).size;
    const revenue = this.events.filter((e) => e.type === 'revenue').reduce((s, e) => s + (e.amountUsd ?? 0), 0);
    const deliveryCost = this.events.filter((e) => e.type === 'delivery_cost').reduce((s, e) => s + (e.amountUsd ?? 0), 0);
    const paidUsers = unique('paid_user');
    const interviews = unique('interview');
    const offers = unique('offer');
    const placements = unique('placement');
    const retainedAfterPlacement = unique('retained_after_placement');
    return {
      paidUsers,
      interviews,
      offers,
      placements,
      retainedAfterPlacement,
      revenueUsd: revenue,
      deliveryCostUsd: deliveryCost,
      grossContributionUsd: revenue - deliveryCost,
      interviewRatePerPaidUser: paidUsers === 0 ? 0 : interviews / paidUsers,
      offerRatePerPaidUser: paidUsers === 0 ? 0 : offers / paidUsers,
      placementRatePerPaidUser: paidUsers === 0 ? 0 : placements / paidUsers,
      postPlacementRetentionRate: placements === 0 ? 0 : retainedAfterPlacement / placements,
    };
  }
}

export function mayaEconomicProductionGate(metrics: ReturnType<MayaEconomicProductionLedger['metrics']>) {
  const checks = {
    hasPayingUsers: metrics.paidUsers > 0,
    hasRealCareerOutcome: metrics.interviews > 0 || metrics.offers > 0 || metrics.placements > 0,
    positiveGrossContribution: metrics.grossContributionUsd > 0,
    repeatableDemand: metrics.paidUsers >= 10,
    durableCareerRelationship: metrics.placements === 0 || metrics.postPlacementRetentionRate >= 0.3,
  };
  return { productive: Object.values(checks).every(Boolean), checks, metrics };
}
