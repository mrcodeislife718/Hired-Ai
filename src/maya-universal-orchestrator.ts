import type { CandidateProfile, Opportunity, RelationshipRecord } from './domain.js';
import { AcquisitionRoutePlanner, type FunnelEvidence } from './acquisition-route-planner.js';
import type { DecisionMakerGraph } from './decision-maker-graph.js';
import {
  InterviewStoryBank,
  MAYA_UNIVERSALITY_RULES,
  answerApplicationQuestion,
  buildPersonalConversionModel,
  buildUniversalCareerIntelligence,
  calibrateLearning,
  compileApplicationEvidencePackage,
  counterfactualApplicationOptimizer,
  diagnoseRejection,
  negotiationIntelligenceV2,
  opportunityExpectedValue,
  optimizeRelationshipPaths,
  simulateCareerPaths,
  type ApplicationExperiment,
  type CareerPathScenario,
  type ExpectedValueInput,
  type InterviewStory,
  type UniversalEvidence
} from './universal-career-intelligence.js';

export interface MayaUniversalPlanInput {
  profile: CandidateProfile;
  evidence: UniversalEvidence[];
  opportunity: Opportunity;
  relationships?: RelationshipRecord[];
  experiments?: ApplicationExperiment[];
  interviewStories?: InterviewStory[];
  applicationQuestions?: string[];
  expectedValue?: ExpectedValueInput;
  negotiation?: { minimum:number; target:number; currentOffer:number; nonSalaryPriorities?:string[]; competingValues?:number[]; downsideRisks?:string[] };
  rejection?: { stage?:string; notes?:string; knownGapCount?:number };
  careerPaths?: Array<Omit<CareerPathScenario,'probability'> & { evidenceCoverage:number; marketSignal:number }>;
  acquisition?: {
    graph?:DecisionMakerGraph;
    organizationId?:string;
    candidatePersonId?:string;
    fitConfidence:number;
    evidenceStrength:number;
    funnel:FunnelEvidence;
    applicationRequired?:boolean;
    hardGateMissing?:boolean;
  };
}

export function buildMayaUniversalPlan(input: MayaUniversalPlanInput) {
  const intelligence=buildUniversalCareerIntelligence(input.profile,input.evidence,input.opportunity);
  const packageSnapshot=compileApplicationEvidencePackage(input.profile,input.evidence,input.opportunity);
  const experiments=input.experiments??[];
  const conversionModel=buildPersonalConversionModel(experiments);
  const stories=new InterviewStoryBank();
  for(const story of input.interviewStories??[]) stories.add(story);
  const targetStoryTags=[...intelligence.decomposition.successCriteria,...intelligence.decomposition.likelyInterviewFilters];
  const relevantEvidenceIds=packageSnapshot.proofIndex.map(p=>p.id);
  const questionAnswers=(input.applicationQuestions??[]).map(question=>({question,...answerApplicationQuestion(question,packageSnapshot)}));
  const expectedValue=input.expectedValue?opportunityExpectedValue(conversionModel,input.expectedValue):undefined;
  const learning=calibrateLearning(experiments.length, experiments.length ? conversionModel.screenProbability-.5 : 0);
  const acquisitionRoute=input.acquisition?new AcquisitionRoutePlanner(input.acquisition.graph).plan({
    organizationId:input.acquisition.organizationId,
    opportunityId:input.opportunity.job.id,
    candidatePersonId:input.acquisition.candidatePersonId,
    fitConfidence:input.acquisition.fitConfidence,
    evidenceStrength:input.acquisition.evidenceStrength,
    funnel:input.acquisition.funnel,
    applicationRequired:input.acquisition.applicationRequired,
    hardGateMissing:input.acquisition.hardGateMissing
  }):undefined;
  return {
    objective:'maximize verified human hiring access and the probability that the right employer correctly recognizes the candidate’s maximum defensible value, regardless of profession or industry',
    universalityRules:[...MAYA_UNIVERSALITY_RULES],
    intelligence,
    acquisitionRoute,
    relationshipPaths:optimizeRelationshipPaths(input.relationships??[],input.opportunity.job.company),
    interviewStories:stories.retrieve(targetStoryTags,relevantEvidenceIds).slice(0,8),
    experimentLearning:counterfactualApplicationOptimizer(experiments),
    conversionModel,
    expectedValue,
    applicationQuestions:questionAnswers,
    negotiation:input.negotiation?negotiationIntelligenceV2(input.negotiation):undefined,
    rejection:input.rejection?diagnoseRejection({...input.rejection,opportunity:input.opportunity}):undefined,
    learningCalibration:learning,
    careerPaths:simulateCareerPaths(input.careerPaths??[]),
    executionOrder:[
      'decompose the real hiring problem and hard gates',
      'synthesize all profession-appropriate evidence with provenance',
      'compile one immutable evidence package shared across every candidate-facing artifact',
      'diagnose whether the application funnel is producing human evaluation',
      'identify likely decision makers and relationship/introduction routes with provenance and uncertainty',
      'choose the highest-quality human-access route; use formal applications only when strategically useful or required',
      'optimize evaluator attention and strongest defensible positioning',
      'model employer decision stages and plausible competing candidate archetypes',
      'predict and treat objections without inventing facts',
      'compile consistent resume, application, outreach, proof and interview artifacts',
      'prepare evidence-backed interview stories and screening answers',
      'estimate conversion probability and opportunity expected value',
      'close high-value evidence gaps using profession-appropriate proof',
      'record route, message, application and outcome variants for counterfactual learning',
      'calibrate strategy changes to avoid overfitting',
      'diagnose rejections while preserving uncertainty',
      'optimize negotiation and long-term career path after offers'
    ],
    invariant:'No optimization, introduction, outreach, experiment, industry convention, or conversion gain may create a false material fact, infer hiring authority without provenance/confidence, or substitute positioning for a legally or professionally required credential.'
  };
}
