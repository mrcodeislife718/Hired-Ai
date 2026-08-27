export type EmployerSignalSeverity = 'info' | 'caution' | 'high-risk';

export interface EmployerQualitySignal {
  id: string;
  label: string;
  severity: EmployerSignalSeverity;
  confidence: number;
  source: string;
  evidence: string;
}

export interface EmployerQualityAssessment {
  score: number;
  confidence: number;
  warnings: EmployerQualitySignal[];
  positives: EmployerQualitySignal[];
  unknowns: string[];
  recommendation: 'healthy' | 'investigate' | 'caution' | 'do-not-recommend-without-review';
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function assessEmployerQuality(signals: EmployerQualitySignal[], unknowns: string[] = []): EmployerQualityAssessment {
  const highRisk = signals.filter(signal => signal.severity === 'high-risk');
  const caution = signals.filter(signal => signal.severity === 'caution');
  const positives = signals.filter(signal => signal.severity === 'info');
  const penalty = highRisk.reduce((sum, signal) => sum + 28 * (clamp(signal.confidence) / 100), 0)
    + caution.reduce((sum, signal) => sum + 12 * (clamp(signal.confidence) / 100), 0);
  const positiveLift = Math.min(20, positives.reduce((sum, signal) => sum + 5 * (clamp(signal.confidence) / 100), 0));
  const score = clamp(80 - penalty + positiveLift);
  const signalConfidence = signals.length ? signals.reduce((sum, signal) => sum + clamp(signal.confidence), 0) / signals.length : 40;
  const confidence = clamp(signalConfidence - Math.min(35, unknowns.length * 7));
  const recommendation: EmployerQualityAssessment['recommendation'] = highRisk.some(signal => signal.confidence >= 75)
    ? 'do-not-recommend-without-review'
    : score < 50 ? 'caution'
    : score < 70 ? 'investigate'
    : 'healthy';
  return { score, confidence, warnings:[...highRisk, ...caution], positives, unknowns:[...unknowns], recommendation };
}

export function employerQualityAllowsRecommendation(assessment: EmployerQualityAssessment) {
  return assessment.recommendation !== 'do-not-recommend-without-review';
}
