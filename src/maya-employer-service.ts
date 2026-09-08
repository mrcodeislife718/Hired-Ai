import type { EmployerPlatform } from './employer-platform.js';
import { buildEmployerHiringPlan, calibrateEmployerRole, type EmployerCandidateInput } from './employer-hiring-os.js';
import { capabilitiesFor, lockedCapabilitiesFor, type EmployerAccessTier } from './two-sided-capabilities.js';

export interface EmployerMayaRequest {
  message?: string;
  organizationId: string;
  actorAccountId: string;
  accessTier?: EmployerAccessTier;
  jobId?: string;
  candidates?: EmployerCandidateInput[];
  shortlistSize?: number;
}

export interface EmployerMayaResponse extends Record<string, unknown> {
  message: string;
  actions?: string[];
}

function findJob(platform:EmployerPlatform,input:EmployerMayaRequest,message:string){
  const jobs=platform.listJobs(input.organizationId,input.actorAccountId);
  if(input.jobId)return jobs.find(job=>job.id===input.jobId);
  const lower=message.toLowerCase();
  return jobs.find(job=>lower.includes(job.title.toLowerCase()))??jobs.find(job=>job.status==='open')??jobs[0];
}

export function deterministicEmployerMayaReply(platform:EmployerPlatform,input:EmployerMayaRequest):EmployerMayaResponse {
  const message=String(input.message??'').trim();
  const lower=message.toLowerCase();
  const tier=input.accessTier??'free';
  const availableCapabilities=capabilitiesFor('employer',tier);
  const lockedCapabilities=lockedCapabilitiesFor('employer',tier);

  if(!message){
    return {
      message:'I’m Maya. Tell me who you need to hire and what successful performance actually looks like. I’ll help turn that into a calibrated hiring brief, separate hard gates from trainable preferences, and build an evidence-first path from sourcing through interviews and hiring.',
      type:'employer-welcome',accessTier:tier,availableCapabilities,lockedCapabilities,
      actions:['Help me define this role','Calibrate an existing job','Find qualified candidates','Build the interview process','Show my hiring capabilities']
    };
  }

  if(/what can you do|capabilit|plan|tier|upgrade|access/.test(lower))return {
    message:'Your employer access is organized around useful hiring outcomes. Core role calibration, an owned pipeline, consent-aware match previews, evidence explanations, a structured interview kit and data controls remain available at the free foundation; paid tiers add sourcing scale, assessments, collaboration, automation, analytics and enterprise integrations.',
    type:'employer-capabilities',accessTier:tier,availableCapabilities,lockedCapabilities,
    actions:['Calibrate my role','Review my candidate pipeline','Build a shortlist','Show what the next tier adds']
  };

  const job=findJob(platform,input,message);
  if(/brief|calibrat|job description|requirements|must.?have|trainable|role definition|unrealistic/.test(lower)){
    if(!job)return {message:'Create or select a role first. I’ll turn the actual responsibilities and success outcomes into a calibrated hiring brief instead of treating every preference as a hard gate.',type:'employer-role-needed',actions:['Create a role','Show my roles']};
    const calibration=calibrateEmployerRole(job);
    return {
      message:calibration.risks.length?`I calibrated ${job.title} and found ${calibration.risks.length} issue(s) worth resolving before you increase sourcing volume.`:`${job.title} has a solid role foundation: responsibilities, success outcomes and requirement classes are usable for evidence-first sourcing.`,
      type:'employer-role-calibration',job,calibration,
      actions:['Resolve the biggest role risk','Build a shortlist','Build the interview process','Show the true hard gates']
    };
  }

  if(/candidate|shortlist|source|sourcing|match|talent|who should|rank/.test(lower)){
    if(!job)return {message:'Select an open role first so I can evaluate candidates against real work rather than generic similarity.',type:'employer-role-needed',actions:['Show my open roles','Create a role']};
    const candidates=input.candidates??[];
    const plan=buildEmployerHiringPlan(job,candidates,input.shortlistSize);
    return {
      message:candidates.length?`I evaluated ${candidates.length} candidate record(s) for ${job.title}. ${plan.shortlist.length} are currently eligible for the evidence-backed shortlist; candidates without the required sourcing consent or with unsupported hard gates are not advanced.`:'The role is calibrated. I need consented candidate evidence from the Hired AI network, your owned talent pool, or another authorized source before I can build a truthful shortlist.',
      type:'employer-hiring-plan',plan,accessTier:tier,
      actions:['Explain the top candidate','Show missing evidence','Build assessments','Prepare structured interviews','Review excluded candidates']
    };
  }

  if(/interview|assessment|test|scorecard|work sample|screen/.test(lower)){
    if(!job)return {message:'Select a role first. Interview and assessment design should come from the real job, not generic personality questions.',type:'employer-role-needed',actions:['Show my roles','Create a role']};
    const plan=buildEmployerHiringPlan(job,input.candidates??[],input.shortlistSize);
    return {
      message:'I built the evaluation path from the actual role requirements and success outcomes. It starts with evidence review, then uses consistent capability questions and work/outcome simulation, and ends with mutual-fit questions. Maya can recommend; the consequential hiring decision remains human-authorized.',
      type:'employer-interview-plan',interviewPlan:plan.interviewPlan,decisionBoundary:plan.decisionBoundary,
      actions:['Show the structured questions','Which assessment would reduce uncertainty most?','Review the candidate evidence first']
    };
  }

  if(/pipeline|stage|stuck|aging|conversion|hiring funnel/.test(lower)){
    const jobs=platform.listJobs(input.organizationId,input.actorAccountId);
    return {message:`Your owned hiring workspace currently contains ${jobs.length} role(s). Maya should diagnose where hiring is losing qualified people—role definition, sourcing, response, screen, interview, offer or retention—before increasing activity.`,type:'employer-pipeline',jobs,actions:['Show open roles','Diagnose a specific role','Review sourcing quality','Review interview signal quality']};
  }

  return {
    message:'I can work backward from the hiring outcome with you. Give me the role, the problem you are trying to solve, a candidate set, an interview concern, or a hiring bottleneck and I’ll keep the reasoning evidence-based, consent-aware and tied to your owned hiring state.',
    type:'employer-guidance',accessTier:tier,availableCapabilities,
    actions:['Calibrate my role','Find candidates','Build assessments','Prepare interviews','Diagnose my pipeline']
  };
}
