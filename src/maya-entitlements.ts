import type { MayaRequest } from './maya-service.js';

/**
 * Maps a Maya conversation turn to the minimum named product capability it invokes.
 * The server supplies billing authority; the model/client cannot self-upgrade access.
 */
export function candidateMayaCapability(input:MayaRequest):string {
  const message=String(input.message??'').toLowerCase();
  if(input.applicationQuestions?.length||/apply|application form|application question|screening question|cover letter|submit/.test(message))return 'candidate-acquisition-orchestration';
  if(input.offers?.length||/negotia|counter.?offer|offer package|compare.*offer|compensation package|salary offer/.test(message))return 'candidate-negotiation';
  if(input.funnel||/funnel|conversion|not getting interviews|no interviews|keep getting rejected/.test(message))return 'candidate-funnel-learning';
  if(/competitive selection|ats|200 applicants|make the cut|competing candidates|hiring manager perspective|recruiter perspective/.test(message))return 'candidate-competitive-selection';
  if(input.resumeText||/tailor.*resume|target.*resume|rewrite.*resume.*role/.test(message))return 'candidate-targeted-docs';
  if(input.githubAudit||/network|linkedin|social|connections|warm intro|referral|mentor|professional presence/.test(message))return 'candidate-professional-presence';
  if(/company research|employer research|salary|compensation intelligence|culture|evaluate.*employer/.test(message))return 'candidate-company-comp';
  if(/career development|development plan|gap plan|what should i learn|skill gap/.test(message))return 'candidate-development';
  return 'candidate-conversation';
}
