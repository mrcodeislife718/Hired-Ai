import { createHash } from 'node:crypto';
import type { CandidateProfile, Evidence, Opportunity } from './domain.js';
import type { CareerTwinSnapshot } from './career-twin.js';
import { analyzeCompetitiveApplication } from './candidate-selection-intelligence.js';
import { parseResumeText, planResumeModernization } from './resume-ingestion.js';

export type CareerDocumentKind =
  | 'career-brief'
  | 'master-resume'
  | 'target-resume'
  | 'professional-profile'
  | 'evidence-index'
  | 'accomplishment-bank'
  | 'interview-story-bank'
  | 'gap-plan';

export interface CareerDocumentProvenance {
  candidateId: string;
  careerTwinVersion: number;
  evidenceIds: string[];
  opportunityIds: string[];
  sourceResumePresent: boolean;
  sourceFingerprint: string;
}

export interface CareerDocument {
  id: string;
  kind: CareerDocumentKind;
  title: string;
  version: number;
  status: 'current' | 'needs-input';
  targetOpportunityId?: string;
  generatedAt: string;
  updatedAt: string;
  provenance: CareerDocumentProvenance;
  content: Record<string, unknown>;
  warnings: string[];
}

export interface CareerDocumentationSnapshot {
  candidateId: string;
  version: number;
  documents: CareerDocument[];
  latestResumeText?: string;
  updatedAt: string;
}

export interface CareerDocumentationBuildInput {
  profile: CandidateProfile;
  careerTwin: CareerTwinSnapshot;
  evidence: Evidence[];
  opportunities: Opportunity[];
  resumeText?: string;
  maxTargetResumes?: number;
}

const now = () => new Date().toISOString();
const clean = (values:string[]) => [...new Set(values.map(value=>value.trim()).filter(Boolean))];
const hash = (value:unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const docId = (kind:CareerDocumentKind,targetOpportunityId?:string) => `${kind}:${targetOpportunityId ?? 'canonical'}`;

function currentTargets(input:CareerDocumentationBuildInput) {
  return input.opportunities
    .filter(opportunity=>!opportunity.hardRejected)
    .sort((a,b)=>b.score.total-a.score.total)
    .slice(0,Math.max(1,input.maxTargetResumes ?? 3));
}

function summaryFor(input:CareerDocumentationBuildInput) {
  const twin=input.careerTwin;
  const goals=clean(twin.goals.value);
  const strengths=clean([...twin.strengths.value,...input.evidence.sort((a,b)=>b.strength-a.strength).map(item=>item.skill)]).slice(0,8);
  const desired=twin.trajectory.value.desired || input.profile.constraints.preferredTitles[0];
  return {
    identity:input.profile.name,
    headline:input.profile.headline,
    currentTrajectory:twin.trajectory.value.current,
    desiredTrajectory:desired,
    goals,
    strengths,
    preferredWork:twin.preferredWork.value,
    constraints:clean([...twin.constraints.value,...input.profile.constraints.excludedTerms]),
    compensation:twin.compensation.value
  };
}

function provenance(input:CareerDocumentationBuildInput,opportunityIds:string[],sourceResumePresent:boolean,content:unknown):CareerDocumentProvenance {
  const evidenceIds=clean(input.evidence.map(item=>item.id));
  return {
    candidateId:input.profile.id,
    careerTwinVersion:input.careerTwin.version,
    evidenceIds,
    opportunityIds,
    sourceResumePresent,
    sourceFingerprint:hash({candidateId:input.profile.id,careerTwinVersion:input.careerTwin.version,evidenceIds,opportunityIds,content})
  };
}

function makeDocument(input:CareerDocumentationBuildInput,kind:CareerDocumentKind,title:string,content:Record<string,unknown>,warnings:string[]=[],targetOpportunityId?:string):CareerDocument {
  const at=now();
  const sourceResumePresent=Boolean(input.resumeText?.trim());
  return {
    id:docId(kind,targetOpportunityId),kind,title,version:1,
    status:kind==='master-resume'&&!sourceResumePresent&&input.evidence.length===0?'needs-input':'current',
    targetOpportunityId,generatedAt:at,updatedAt:at,
    provenance:provenance(input,targetOpportunityId?[targetOpportunityId]:[],sourceResumePresent,content),
    content,warnings
  };
}

export function buildCareerDocumentation(input:CareerDocumentationBuildInput):CareerDocument[] {
  const resumeText=String(input.resumeText??'').slice(0,250_000);
  const parsed=parseResumeText(resumeText);
  const evidence=[...input.evidence].sort((a,b)=>b.strength-a.strength);
  const targets=currentTargets(input);
  const summary=summaryFor({...input,evidence});
  const verifiedSkills=clean(evidence.map(item=>item.skill));
  const modernization=planResumeModernization(parsed,input.profile.skills,verifiedSkills);
  const strongest=evidence.slice(0,10);
  const documents:CareerDocument[]=[];

  documents.push(makeDocument(input,'career-brief','Career Brief',{
    ...summary,
    evidenceCount:evidence.length,
    priorityTargets:targets.map(target=>({opportunityId:target.id,title:target.job.title,company:target.job.company,score:target.score.total})),
    unknowns:[
      ...(input.careerTwin.goals.value.length?[]:['career goal not yet confirmed']),
      ...(input.careerTwin.trajectory.value.desired||input.profile.constraints.preferredTitles.length?[]:['target role or trajectory not yet confirmed'])
    ]
  }));

  const masterWarnings:string[]=[];
  if(!resumeText.trim()) masterWarnings.push('No source resume has been supplied; this is an evidence-backed structured draft, not a reconstruction of employment history.');
  if(!evidence.length) masterWarnings.push('No verified evidence is available yet; Maya should gather career history or proof before treating this as application-ready.');
  documents.push(makeDocument(input,'master-resume','Master Resume',{
    headline:input.profile.headline,
    professionalSummary:summary,
    skills:clean([...input.profile.skills,...verifiedSkills,...parsed.skills]),
    evidenceHighlights:strongest.map(item=>({skill:item.skill,claim:item.claim,repository:item.repository,url:item.url,verification:item.verification,strength:item.strength})),
    parsedSource:resumeText.trim()?{emails:parsed.emails,urls:parsed.urls,skills:parsed.skills}:undefined,
    modernization,
    factualRule:'Employment history, dates, titles, scope, metrics, credentials, and outcomes must remain source-supported; missing details stay missing until supplied or verified.'
  },masterWarnings));

  documents.push(makeDocument(input,'professional-profile','Professional Profile',{
    headline:input.profile.headline,
    positioning:summary,
    demonstratedSkills:verifiedSkills,
    proofHighlights:strongest.slice(0,6).map(item=>item.claim),
    targetDirections:clean([...(input.profile.constraints.preferredTitles??[]),input.careerTwin.trajectory.value.desired??''])
  }));

  documents.push(makeDocument(input,'evidence-index','Evidence Index',{
    evidence:evidence.map(item=>({id:item.id,skill:item.skill,claim:item.claim,source:item.repository||item.url,verification:item.verification,strength:item.strength})),
    rule:'Conversation memory and generated wording are not promoted to verified professional evidence without a source.'
  }));

  documents.push(makeDocument(input,'accomplishment-bank','Accomplishment Bank',{
    accomplishments:evidence.map(item=>({evidenceId:item.id,skill:item.skill,claim:item.claim,verifiedBy:item.verification,source:item.repository||item.url,needsQuantification:!(/\d|%|\$|reduced|increased|improved|saved|grew|scaled|launched|delivered/i.test(item.claim))})),
    nextQuestions:evidence.filter(item=>!(/\d|%|\$|reduced|increased|improved|saved|grew|scaled|launched|delivered/i.test(item.claim))).slice(0,8).map(item=>`What verifiable scope, result, user impact, reliability gain, cost effect, or business outcome can be added to: ${item.claim}`)
  }));

  documents.push(makeDocument(input,'interview-story-bank','Interview Story Bank',{
    stories:evidence.slice(0,12).map(item=>({evidenceId:item.id,anchor:item.claim,skill:item.skill,prompts:['What was the situation or problem?','What did you personally own?','What tradeoff or difficult decision did you make?','What verifiable result followed?','What did you learn or change afterward?']})),
    rule:'Story prompts may elicit missing context, but Maya must not invent the answers.'
  }));

  const gapItems=targets.flatMap(target=>target.gaps.filter(gap=>gap.strength!=='strong').map(gap=>({opportunityId:target.id,title:target.job.title,company:target.job.company,skill:gap.skill,strength:gap.strength,evidenceIds:gap.evidenceIds,explanation:gap.explanation})));
  documents.push(makeDocument(input,'gap-plan','Career Gap Plan',{
    gaps:gapItems,
    priorities:gapItems.slice(0,10),
    rule:'Separate hard credential gates from evidence gaps, adjacent capability, and optional employer preferences.'
  }));

  for(const target of targets){
    const analysis=analyzeCompetitiveApplication({profile:input.profile,evidence,opportunity:target,resumeText,applicantPool:target.job.applicantCount});
    documents.push(makeDocument(input,'target-resume',`${target.job.title} at ${target.job.company} — Target Resume`,{
      target:{opportunityId:target.id,title:target.job.title,company:target.job.company},
      headline:`${target.job.title} | ${clean(analysis.story.emphasize).slice(0,3).join(' • ') || input.profile.headline}`,
      targetStory:analysis.story.targetStory,
      emphasize:analysis.story.emphasize,
      moveEarlier:analysis.story.moveEarlier,
      truthfulKeywordGaps:analysis.keywordGaps.filter(gap=>gap.status!=='unsupported'),
      requirementMap:analysis.requirementMap,
      bulletSuggestions:analysis.bulletSuggestions,
      topFiveChanges:analysis.topFiveChanges,
      selectionSimulation:analysis.simulation,
      factualRule:analysis.truthRule
    },analysis.requirementMap.some(item=>item.coverage==='Missing')?['This target has material unsupported requirements; do not hide them with wording.']:[],target.id));
  }
  return documents;
}

export class CareerDocumentationStore {
  private snapshot:CareerDocumentationSnapshot;
  constructor(candidateId:string,snapshot?:CareerDocumentationSnapshot){
    if(snapshot&&snapshot.candidateId!==candidateId) throw new Error('career documentation candidate mismatch');
    this.snapshot=snapshot?structuredClone(snapshot):{candidateId,version:1,documents:[],updatedAt:now()};
  }
  current(){return structuredClone(this.snapshot);}
  rebuild(input:CareerDocumentationBuildInput){
    const generated=buildCareerDocumentation({...input,resumeText:input.resumeText??this.snapshot.latestResumeText});
    const previous=new Map(this.snapshot.documents.map(document=>[document.id,document]));
    const documents=generated.map(document=>{
      const old=previous.get(document.id);
      if(!old)return document;
      if(old.provenance.sourceFingerprint===document.provenance.sourceFingerprint)return old;
      return {...document,version:old.version+1,generatedAt:old.generatedAt,updatedAt:now()};
    });
    this.snapshot={candidateId:this.snapshot.candidateId,version:this.snapshot.version+1,documents,latestResumeText:input.resumeText??this.snapshot.latestResumeText,updatedAt:now()};
    return this.current();
  }
  stale(input:Omit<CareerDocumentationBuildInput,'resumeText'>){
    return this.snapshot.documents.filter(document=>document.provenance.careerTwinVersion!==input.careerTwin.version||document.provenance.evidenceIds.length!==input.evidence.length).map(document=>document.id);
  }
}
