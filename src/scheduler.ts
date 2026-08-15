import type { Opportunity } from './domain.js';
export interface FollowUpTask { opportunityId:string; dueAt:string; reason:string; }
export function dueFollowUps(opportunities:Opportunity[],now=new Date(),afterDays=4):FollowUpTask[]{const cutoff=afterDays*86_400_000;return opportunities.filter(o=>['CONTACTED','APPLIED'].includes(o.state)).filter(o=>now.getTime()-new Date(o.updatedAt).getTime()>=cutoff).map(o=>({opportunityId:o.id,dueAt:now.toISOString(),reason:`${o.state.toLowerCase()} has had no recorded progression for ${afterDays}+ days`}));}
