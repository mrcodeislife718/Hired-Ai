import type { HiredEngine } from './engine.js';
import { ConversationStore } from './conversations.js';
import { MayaLanguageModel } from './maya-language.js';
import { ReliabilityEfficiencyLedger, executeReliably } from './reliability-efficiency.js';
import { buildCareerAdvantagePlan, type FunnelObservation } from './career-advantage.js';
import { buildUniversalPlanFromEngine } from './maya-universal-engine-adapter.js';
import { buildMayaWorkflowState } from './maya-workflows.js';
import { toUniversalEvidence, type UniversalEvidence } from './universal-career-intelligence.js';
import { auditGithubForCareer, buildInterviewPractice, buildNetworkingPlan, buildSocialCareerPlan, compareAndNegotiateOffers, surfaceCoverage, type GithubCareerAuditInput, type OfferInput } from './career-surfaces.js';

export interface MayaRequest {
  message?: string;
  opportunityId?: string;
  resumeText?: string;
  socialPlatforms?: string[];
  offers?: OfferInput[];
  targetBase?: number;
  githubAudit?: GithubCareerAuditInput;
  additionalEvidence?: UniversalEvidence[];
  applicationQuestions?: string[];
  funnel?: FunnelObservation;
}

export interface MayaResponse extends Record<string, unknown> { message: string; actions?: string[]; }

function ranked(engine:HiredEngine) {
  return engine.selectiveOpportunities(60)
    .map(decision=>({...decision,opportunity:engine.store.opportunities.get(decision.opportunityId)}))
    .filter(item=>Boolean(item.opportunity))
    .sort((a,b)=>b.opportunityScore-a.opportunityScore);
}

function findOpportunity(engine:HiredEngine,message:string,explicitId?:string) {
  if(explicitId){const found=engine.store.opportunities.get(explicitId);if(found)return found;}
  const lower=message.toLowerCase();
  return [...engine.store.opportunities.values()].find(item=>lower.includes(item.job.company.toLowerCase())||lower.includes(item.job.title.toLowerCase()))??ranked(engine)[0]?.opportunity;
}

function evidenceFor(engine:HiredEngine,input:MayaRequest) {
  return [...toUniversalEvidence([...engine.store.evidence.values()]),...(input.additionalEvidence??[])];
}

function advantage(engine:HiredEngine,input:MayaRequest) {
  return buildCareerAdvantagePlan({
    profile:engine.profile,
    evidence:evidenceFor(engine,input),
    opportunities:[...engine.store.opportunities.values()],
    relationships:[],
    message:input.message,
    funnel:input.funnel,
    hasCurrentRole:Boolean(engine.careerTwin.current().facts.find(f=>/current role|employment|employer/i.test(f.key)))
  });
}

function universalFor(engine:HiredEngine,input:MayaRequest,message:string) {
  const opportunity=findOpportunity(engine,message,input.opportunityId);
  if(!opportunity)return undefined;
  return buildUniversalPlanFromEngine(engine,opportunity.id,{additionalEvidence:input.additionalEvidence,applicationQuestions:input.applicationQuestions});
}

function targetLabel(engine:HiredEngine) {
  return engine.profile.constraints.preferredTitles.length?engine.profile.constraints.preferredTitles.slice(0,3).join(', '):'your next role';
}

export function deterministicMayaReply(engine:HiredEngine,input:MayaRequest):MayaResponse {
  const message=String(input.message??'').trim();
  const lower=message.toLowerCase();
  const socials=input.socialPlatforms?.length?input.socialPlatforms:['linkedin'];
  const opportunities=[...engine.store.opportunities.values()];

  if(input.resumeText){
    const plan=engine.auditCareer(input.resumeText.slice(0,200_000),socials);
    return {message:plan.resume.parsed.likelyOutdated?'Your resume is behind your current career evidence. I rebuilt the analysis around your strongest defensible value, target direction, and current opportunity evidence.':'Your resume is reasonably current, but I still checked where it is underselling you, weakly proven, poorly ordered, or misaligned with the roles you want.',type:'career-audit',plan,advantage:advantage(engine,input),actions:['Rewrite it for my strongest target role','Show me what employers will notice first','What proof am I missing?','Show my best opportunities']};
  }

  if(!message)return {message:'I’m Maya. Tell me the career outcome you want. You can be starting from zero, changing fields, returning after a break, trying to get hired now, negotiating an offer, or moving up. I’ll work backward from the outcome using the evidence and constraints that actually apply to your profession.',type:'welcome',advantage:advantage(engine,input),actions:['Help me start my career','Help me change careers','Find roles I can realistically win','Help me advance where I am','Audit my resume','Prepare me for an interview']};

  if(/what can you do|capabilit|everything you can|career surfaces|well.?rounded/.test(lower))return {message:'I can help across the full career lifecycle: choosing direction, proving capability, finding work, getting through screens and interviews, negotiating, advancing, switching fields, reentering after a break, building professional relationships, improving compensation, evaluating employers, and preserving future options. I adapt to the profession instead of assuming every career works like software.',type:'capabilities',coverage:surfaceCoverage(),advantage:advantage(engine,input),actions:['Assess my career health','Build my next-move plan','Find my strongest roles','Show my biggest career bottleneck','Help me earn more','Help me transition fields']};

  if(/first job|start my career|starting my career|no experience|entry level|graduate|new career|apprentice/.test(lower))return {message:`I built a career-entry plan around ${targetLabel(engine)}. I separated hard credential gates from things we can prove through education, work samples, volunteering, assessments, references, transferable experience, projects, or other legitimate evidence.`,type:'career-start',advantage:advantage(engine,input),actions:['What should I prove first?','Which entry roles should I target?','Build my first resume','How do I get experience without already having the job?','Who should I talk to?']};

  if(/career change|change careers|switch careers|transition|pivot|move into|different field|different industry/.test(lower))return {message:'I mapped the transition by separating what already transfers, what needs translation into the target field’s language, what is genuinely missing, and what is a hard credential gate. We should close the smallest high-value proof gaps instead of making you restart from zero.',type:'career-transition',advantage:advantage(engine,input),actions:['Show my transferable strengths','Show the hard gates','What proof should I build?','Which transition role is easiest to win first?','Rewrite my story for the new field']};

  if(/return to work|reenter|re-enter|career break|employment gap|laid off|layoff|unemployed|back to work/.test(lower))return {message:'I built a reentry plan that restores current proof, keeps the gap in proportion, and leads with what you can do now. We address the gap when it matters without letting it become your entire career story.',type:'career-reentry',advantage:advantage(engine,input),actions:['Fix my reentry narrative','Show me roles I can win now','What evidence should I refresh?','Help me explain the gap','Rebuild my network']};

  if(/promotion|advance|advancement|next level|raise|move up|leadership|manager|director|executive|internal mobility|internal role/.test(lower))return {message:'I built an advancement plan around next-level evidence, not title aspiration. It shows what value you already prove, what the next level demands, what evidence is missing, how to expand scope, how to prepare a promotion case, and when internal mobility or the external market gives you more leverage.',type:'career-advancement',advantage:advantage(engine,input),actions:['Build my promotion case','What next-level evidence am I missing?','Should I move internally or leave?','Help me ask for a raise','Map my next two career steps']};

  if(/career health|career score|bottleneck|what should i fix|where am i weak|career risk|career resilience|optionality/.test(lower)){
    const plan=advantage(engine,input);
    return {message:`Your current career-health score is ${plan.health.total}/100. The weakest dimension is ${plan.health.weakestDimension}; the strongest is ${plan.health.strongestDimension}. The score is a decision aid—the underlying evidence and target role matter more.`,type:'career-health',advantage:plan,actions:['Fix my weakest dimension','Show my career risks','Increase my bargaining power','Increase my career options','Build a 90-day plan']};
  }

  if(/funnel|conversion|applications.*response|not getting interviews|no interviews|keep getting rejected|rejections|why.*not.*hired/.test(lower)){
    const plan=advantage(engine,input);
    return {message:input.funnel?`I diagnosed the job-search funnel before changing strategy. The strongest current signal points to ${plan.funnel?.primaryFailureMode??'an uncertain failure mode'}, with ${plan.funnel?.confidence??0}% confidence.`:'Give me your recent application, recruiter-screen, interview, and offer counts. I’ll identify which stage is actually failing before we change the resume, targeting, networking, interview prep, or application volume.',type:'funnel-diagnosis',advantage:plan,actions:input.funnel?['Show the corrective actions','What should I stop doing?','Compare warm vs cold applications','Rebuild the failing stage']:['I can provide my numbers','Audit my targeting first','Audit my resume first']};
  }

  if(/github|repo|repository|portfolio.*code|code portfolio/.test(lower)){
    const audit=input.githubAudit?auditGithubForCareer(input.githubAudit):undefined;
    return {message:audit?'I audited GitHub as one relevant proof source and ranked what makes capability easiest to verify.':'If GitHub matters to your target role, I can use it as one proof source. It is not a universal requirement: Maya can also use employment evidence, licenses, certifications, references, assessments, publications, portfolios, work samples, awards, education, volunteer work, and other legitimate proof.',type:'github-career',presence:engine.careerPresenceProfile(socials),audit,actions:['Which proof should I feature?','Improve my professional presence','Find roles that value this evidence','What non-GitHub proof should I add?']};
  }

  if(/network|linkedin|social|connections|people|recruiter|hiring manager|relationship|warm intro|community|referral|mentor/.test(lower)){
    const targetCompanies=opportunities.filter(o=>!o.hardRejected).sort((a,b)=>b.score.total-a.score.total).slice(0,8).map(o=>o.job.company);
    return {message:'I built a relationship plan around people who can hire, refer, validate, advise, or provide accurate market information. The objective is credible access and useful relationships, not connection count.',type:'network',plan:engine.networkPlan(socials),networking:buildNetworkingPlan({targetCompanies}),social:buildSocialCareerPlan(socials,engine.profile.constraints.preferredTitles,[...engine.store.evidence.values()]),actions:['Who should I contact first?','Write my outreach','What should I post or share?','Find warm paths to my top roles','Build my relationship map']};
  }

  if(/resume|cv|positioning|outdated|career audit|profile|professional summary/.test(lower))return {message:'Paste your current resume here. I’ll compare it with your verified career record, target roles, profession-specific hiring requirements, and strongest opportunity evidence, then strengthen it without inventing experience, credentials, metrics, scope, or outcomes.',type:'resume-request',actions:['Find my strongest jobs','Assess my career health','Show what evidence I should gather first']};

  if(/negotia|counter.?offer|offer package|compare.*offer|compensation package|salary offer|raise/.test(lower)){
    if(input.offers?.length)return {message:'I compared the offers across compensation and career tradeoffs and built a negotiation sequence. I will not invent competing offers, deadlines, market data, or leverage.',type:'offer-negotiation',strategy:compareAndNegotiateOffers(input.offers,input.targetBase),advantage:advantage(engine,input),actions:['Which terms should I negotiate first?','Help me make the ask','Compare role quality too','What is my walk-away point?']};
    return {message:'Give me the offer details—pay, bonus, commission or equity if applicable, schedule, benefits, title, scope, location, flexibility, advancement path, and anything else that matters. I’ll compare the economics and career tradeoffs and help you negotiate without bluffing.',type:'offer-negotiation-request',actions:['Compare two offers','Help me set a target','Prepare my negotiation conversation','Evaluate the role beyond pay']};
  }

  if(/interview|practice interview|technical|behavioral|prepare|prep|screening call|phone screen/.test(lower)){
    const opportunity=findOpportunity(engine,message,input.opportunityId);if(!opportunity)return {message:'Choose a role or ask me to find strong opportunities first. I’ll tailor preparation to the actual profession and evaluation stages.',actions:['Find my best roles','Tell me the role manually']};
    const pkg=engine.package(opportunity.id);
    return {message:`I prepared you for ${opportunity.job.title} at ${opportunity.job.company} using the actual requirements, likely decision stages, your strongest proof, likely objections, and evidence-backed stories.`,type:'interview',opportunity,readiness:pkg.readiness,interview:pkg.interview,practice:buildInterviewPractice(opportunity),universal:buildUniversalPlanFromEngine(engine,opportunity.id,{additionalEvidence:input.additionalEvidence}),actions:['Start with the first interview stage','Challenge my weakest area','Build my story bank','What questions should I ask them?','Explain likely objections']};
  }

  if(/application question|screening question|employer question|application form|questionnaire/.test(lower)){
    const universal=universalFor(engine,input,message);if(!universal)return {message:'Choose an opportunity and give me the application questions. I’ll classify each one and answer from the same evidence package used everywhere else.',actions:['Find my best opportunity','I can paste the questions']};
    return {message:'I compiled the application questions from the same evidence package used for your resume, outreach, and interview preparation so the story stays consistent. Eliminatory questions stay factual; positioning questions get the strongest defensible answer.',type:'application-questions',universal,actions:['Show the strongest answer first','Check every answer for consistency','Prepare follow-up interview proof']};
  }

  if(/company|employer|salary|pay|culture|review|research|manager|team/.test(lower)){
    const opportunity=findOpportunity(engine,message,input.opportunityId);if(!opportunity)return {message:'Choose a company or opportunity first. I’ll separate sourced facts, role evidence, compensation signals, reliability, and unknowns instead of filling gaps with assumptions.'};
    const pkg=engine.package(opportunity.id);
    return {message:`Here is what I can currently establish about ${opportunity.job.company}. I keep unknowns visible and identify what you should verify before committing time or accepting an offer.`,type:'company-research',company:opportunity.job.company,job:opportunity.job,intelligence:opportunity.intelligence,reliability:pkg.reliability,unknowns:pkg.reliability.unknowns,universal:buildUniversalPlanFromEngine(engine,opportunity.id,{additionalEvidence:input.additionalEvidence}),actions:['Is this role worth pursuing?','What should I verify?','What could make this a bad job for me?','Prepare me to evaluate them in the interview']};
  }

  if(/apply|application|tailor|cover letter|submit/.test(lower)){
    const opportunity=findOpportunity(engine,message,input.opportunityId);if(!opportunity)return {message:'Choose an opportunity first. I’ll build the application from one evidence package so the resume, answers, outreach, and interview story remain consistent.'};
    const pkg=engine.package(opportunity.id);const universal=buildUniversalPlanFromEngine(engine,opportunity.id,{additionalEvidence:input.additionalEvidence,applicationQuestions:input.applicationQuestions});
    if(!pkg.readiness.canOccupyRole)return {message:`I do not recommend submitting yet. Your current readiness is ${pkg.readiness.readinessScore}/100. I’d rather identify whether the blockers are mandatory, quickly provable, trainable, or only employer wish-list items.`,type:'develop-first',opportunity,readiness:pkg.readiness,universal,actions:['Show the true blockers','Find a role I can pursue now','Build the smallest proof plan','Recheck wishlist requirements']};
    return {message:`You are sufficiently ready for ${opportunity.job.title} at ${opportunity.job.company}. I prepared a consistent, evidence-grounded package with strongest-defensible positioning. Identity-bearing submission remains approval-gated.`,type:'application',opportunity,readiness:pkg.readiness,package:{resume:pkg.resume,application:pkg.application,outreach:pkg.outreach},universal,actions:['Request application approval','Find a human path first','Prepare for interview','Explain the strongest positioning choices']};
  }

  if(/status|today|next|pipeline|attention|follow.?up|my jobs|saved|what should i do now/.test(lower)){
    const status=engine.careerStatus();const plan=advantage(engine,input);
    return {message:`Right now, ${status.priority.length} opportunity${status.priority.length===1?'':'ies'} are strong enough to pursue, ${status.developmentCandidates.length} are development targets, and ${status.pendingApprovals.length} identity-bearing action${status.pendingApprovals.length===1?'':'s'} await approval. Your current career bottleneck is ${plan.health.weakestDimension}.`,type:'status',status,advantage:plan,actions:['Show my single best next action','Show my best opportunity','Fix my career bottleneck','Prepare for my next interview','Build my follow-up plan']};
  }

  if(/find|job|role|opportunit|work|career move|better position|job alert|openings/.test(lower)){
    const decisions=ranked(engine).slice(0,10);const pursue=decisions.filter(x=>x.decision==='pursue');const develop=decisions.filter(x=>x.decision==='develop-first');const plan=advantage(engine,input);
    return {message:`I found ${pursue.length} role${pursue.length===1?'':'s'} I would pursue now and ${develop.length} promising role${develop.length===1?'':'s'} I would treat as development targets. I rank them by evidence, readiness, expected career value, compensation, freshness, competition, and interview probability—not application volume.`,type:'opportunities',opportunities:decisions,frontier:plan.opportunityFrontier,actions:['Explain my top match','Show the highest-upside option','Show the easiest role to win','Audit my resume against these jobs','Find warm paths']};
  }

  if(/why|gap|weak|qualified|fit|evidence|ready|objection|competition|competitor/.test(lower)){
    const opportunity=findOpportunity(engine,message,input.opportunityId);if(!opportunity)return {message:'Ask me to find opportunities first, then I can explain exactly where you stand and what an employer is likely to question.'};
    const readiness=engine.assessReadiness(opportunity.id);
    return {message:`${opportunity.job.title} at ${opportunity.job.company} is scored ${opportunity.score.total}/100 with role readiness ${readiness.readinessScore}/100. ${readiness.canOccupyRole?'I consider it selectively pursuable.':'I would not submit yet without resolving or validating the blocking gaps.'}`,type:'fit',opportunity,readiness,universal:buildUniversalPlanFromEngine(engine,opportunity.id,{additionalEvidence:input.additionalEvidence}),actions:['Show likely objections','Where do I beat competing candidates?','Where am I vulnerable?','Build the application','Show the smallest gap-closing action']};
  }

  return {message:'Tell me the outcome you want. I can coordinate the whole career system conversationally: starting, reentering, switching careers, finding work, evidence building, resumes, applications, professional presence, relationships, interviews, negotiation, promotions, internal mobility, employer evaluation, compensation growth, and long-term career resilience.',type:'career-router',coverage:surfaceCoverage(),advantage:advantage(engine,input),actions:['Assess my career health','Find my best roles','Help me change careers','Help me move up','Audit my resume','Build my network','Prepare me for an interview']};
}

export class MayaService {
  constructor(private readonly conversations=new ConversationStore(),private readonly language=new MayaLanguageModel(),private readonly reliability=new ReliabilityEfficiencyLedger()){}
  async respond(accountId:string,engine:HiredEngine,input:MayaRequest):Promise<MayaResponse>{
    const userMessage=String(input.message??'').trim()||(input.resumeText?'Please review the resume I attached.':'');
    if(userMessage)await this.conversations.append(accountId,'user',userMessage,{opportunityId:input.opportunityId});
    const result=deterministicMayaReply(engine,input);const history=await this.conversations.recent(accountId,16);
    const workflow=buildMayaWorkflowState(engine,input,{type:result.type});
    const rendered=this.language.configured?await executeReliably({operation:'maya.language.render',retries:1,ledger:this.reliability,primary:()=>this.language.render({userMessage,deterministicAnswer:result.message,context:{history,result:{...result,message:undefined},workflow}),fallback:async()=>result.message,verify:value=>typeof value==='string'&&value.trim().length>0}):result.message;
    if(!this.language.configured)this.reliability.record({operation:'maya.deterministic.render',startedAt:Date.now(),finishedAt:Date.now(),success:true,modelCalls:0});
    await this.conversations.append(accountId,'assistant',rendered,{type:result.type,workflowKind:workflow.kind,currentStep:workflow.currentStep});
    return {...result,message:rendered,workflow,languageModel:this.language.configured?'configured-with-verified-fallback':'deterministic-engine',reliability:this.reliability.snapshot()};
  }
  history(accountId:string,limit=40){return this.conversations.recent(accountId,limit)}
  clearHistory(accountId:string){return this.conversations.clear(accountId)}
  reliabilitySnapshot(){return this.reliability.snapshot()}
  close(){return this.conversations.close()}
}
