import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AccountRecord } from './accounts.js';
import { BillingEventLedger } from './billing-ledger.js';
import { CommercialPlatform } from './commercial-platform.js';
import { checkoutReady, commercialPlans, hasPlan, planById, type PlanId } from './commercial.js';
import type { ConnectorCapability } from './connector-fabric.js';
import { DurableEmployerPlatform } from './durable-employer-platform.js';
import type { EmployerRole } from './employer-platform.js';
import { baseSecurityHeaders, clearSessionCookie, enforceOrigin, sessionCookie, sessionToken } from './http-security.js';
import { MayaService, type MayaRequest } from './maya-service.js';
import { MayaResumeStudio, type ResumeAccess, type ResumeTemplateId, type ResumeVariant } from './resume-studio.js';
import { rateLimiterFromEnv, type AsyncRateLimiter } from './rate-limit.js';
import { id } from './utils.js';
import { renderMayaPage } from './web-ui.js';
import type { CareerFact, CareerTwinSnapshot } from './career-twin.js';
import type { CareerOutcomeEvent } from './career-outcomes.js';
import type { OpportunityWatchRule } from './saved-opportunities.js';
import type { FeedbackEvent, PipelineState, RawJob } from './domain.js';
import {
  accountIdFromMetadata,
  createBillingPortal,
  createCheckoutSession,
  parseStripeEvent,
  planFromMetadata,
  subscriptionState,
  type StripeCheckoutSession,
  type StripeSubscription
} from './stripe.js';

const platform = new CommercialPlatform();
const maya = new MayaService();
const resumeStudio = new MayaResumeStudio();
const employers = await DurableEmployerPlatform.create();
const billingLedger = new BillingEventLedger();
const authLimiter = rateLimiterFromEnv(Number(process.env.HIRED_AUTH_RATE_LIMIT ?? 12), 15 * 60_000, 'auth');
const apiLimiter = rateLimiterFromEnv(Number(process.env.HIRED_API_RATE_LIMIT ?? 180), 60_000, 'api');
const CONNECTOR_CAPABILITIES = new Set<ConnectorCapability>(['submit-application','send-outreach','send-email','create-calendar-event','read-opportunities','read-employer-intelligence','read-compensation','verify-credential']);

function sendJson(res: ServerResponse, status: number, payload: unknown, extra: Record<string,string> = {}) {
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', ...baseSecurityHeaders, ...extra });
  res.end(JSON.stringify(payload));
}
function sendHtml(res: ServerResponse, body: string) {
  res.writeHead(200, {
    'content-type':'text/html; charset=utf-8',
    ...baseSecurityHeaders,
    'content-security-policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://checkout.stripe.com"
  });
  res.end(body);
}
async function readRaw(req: IncomingMessage, maxBytes=1_000_000) {
  const chunks: Buffer[]=[]; let size=0;
  for await (const chunk of req) { const value=Buffer.from(chunk); size+=value.length; if(size>maxBytes) throw new Error('request too large'); chunks.push(value); }
  return Buffer.concat(chunks).toString('utf8');
}
async function readJson<T=Record<string,unknown>>(req: IncomingMessage): Promise<T> {
  const raw=await readRaw(req); if(!raw) return {} as T;
  try { return JSON.parse(raw) as T; } catch { throw new Error('invalid JSON'); }
}
function clientKey(req: IncomingMessage) { return String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'; }
async function consume(limiter: AsyncRateLimiter,key:string,res:ServerResponse){const result=await limiter.consume(key);if(result.allowed)return true;sendJson(res,429,{error:'too many requests',retryAt:new Date(result.resetAt).toISOString()},{'retry-after':String(Math.max(1,Math.ceil((result.resetAt-Date.now())/1000)))});return false;}
async function requireAccount(req:IncomingMessage,res:ServerResponse){const token=sessionToken(req);const account=await platform.accounts.accountForToken(token);if(!account){sendJson(res,401,{error:'sign in required'});return undefined;}if(!await consume(apiLimiter,account.id,res))return undefined;return{account,token};}
function requireActivePlan(account:AccountRecord,res:ServerResponse,minimum:PlanId='career'){if(account.subscription.status==='active'&&hasPlan(account.subscription.plan,minimum))return true;sendJson(res,402,{error:'active subscription required',requiredPlan:minimum,subscription:account.subscription});return false;}
function accountCookieHeaders(token:string,expiresAt:string){return{'set-cookie':sessionCookie(token,expiresAt)};}
function resumeAccessFor(account: AccountRecord): ResumeAccess { return account.subscription.status === 'active' && account.subscription.plan !== 'none' ? account.subscription.plan as ResumeAccess : 'free'; }

async function handleStripeWebhook(req:IncomingMessage,res:ServerResponse){const raw=await readRaw(req,2_000_000);const event=parseStripeEvent(raw,req.headers['stripe-signature'] as string|undefined);const claimed=await billingLedger.claim(event.id);if(!claimed)return sendJson(res,200,{received:true,duplicate:true});try{if(event.type==='checkout.session.completed'){const session=event.data.object as unknown as StripeCheckoutSession;const accountId=accountIdFromMetadata(session.metadata);const plan=planFromMetadata(session.metadata);if(accountId&&plan!=='none')await platform.accounts.setSubscription(accountId,plan,'active',session.customer??undefined);}if(event.type==='customer.subscription.created'||event.type==='customer.subscription.updated'||event.type==='customer.subscription.deleted'){const subscription=event.data.object as unknown as StripeSubscription;const accountId=accountIdFromMetadata(subscription.metadata);const plan=planFromMetadata(subscription.metadata);if(accountId)await platform.accounts.setSubscription(accountId,plan,subscriptionState(subscription.status),subscription.customer);}return sendJson(res,200,{received:true});}catch(error){await billingLedger.release(event.id);throw error;}}

async function route(req:IncomingMessage,res:ServerResponse){const url=new URL(req.url??'/','http://localhost');try{
  if(req.method==='GET'&&url.pathname==='/')return sendHtml(res,renderMayaPage());
  if(req.method==='GET'&&url.pathname==='/health')return sendJson(res,200,{ok:true,product:'Hired AI',agent:'Maya',persistence:process.env.DATABASE_URL?'postgres':'file',billing:checkoutReady(),languageModelConfigured:Boolean(process.env.OPENAI_API_KEY),telemetryConfigured:Boolean(process.env.HIRED_TELEMETRY_ENDPOINT),surfaces:{resumeStudio:true,careerTwin:true,savedJobs:true,watches:true,employerFoundation:true,employerDurableState:true,proactiveCareerOS:true,connectorFabric:true,transactionalOutbox:true,distributedRateLimit:Boolean(process.env.DATABASE_URL)}});
  if(req.method==='GET'&&url.pathname==='/api/plans')return sendJson(res,200,{plans:commercialPlans().map(({stripePriceId,...plan})=>({...plan,checkoutConfigured:Boolean(stripePriceId)})),billing:checkoutReady()});
  if(req.method==='POST'&&url.pathname==='/api/stripe/webhook')return handleStripeWebhook(req,res);
  if(req.method&&!['GET','HEAD','OPTIONS'].includes(req.method)&&!enforceOrigin(req,res))return;

  if(req.method==='POST'&&(url.pathname==='/api/auth/register'||url.pathname==='/api/auth/login')){
    if(!await consume(authLimiter,clientKey(req),res))return;
    const body=await readJson<{email?:string;password?:string}>(req);const email=String(body.email??''),password=String(body.password??'');
    if(url.pathname.endsWith('/register')){const account=await platform.accounts.register(email,password);const session=await platform.accounts.createSession(account.id);return sendJson(res,201,{account:platform.accounts.publicAccount(account),expiresAt:session.expiresAt},accountCookieHeaders(session.token,session.expiresAt));}
    const session=await platform.accounts.login(email,password);const account=await platform.accounts.accountForToken(session.token);return sendJson(res,200,{account:account?platform.accounts.publicAccount(account):undefined,expiresAt:session.expiresAt},accountCookieHeaders(session.token,session.expiresAt));
  }

  const auth=await requireAccount(req,res);if(!auth)return;const{account,token}=auth;
  if(req.method==='POST'&&url.pathname==='/api/auth/logout'){await platform.accounts.logout(token);return sendJson(res,200,{ok:true},{'set-cookie':clearSessionCookie()});}
  if(req.method==='POST'&&url.pathname==='/api/auth/password'){const body=await readJson<{currentPassword?:string;newPassword?:string}>(req);await platform.accounts.changePassword(account.id,String(body.currentPassword??''),String(body.newPassword??''));return sendJson(res,200,{ok:true,signInAgain:true},{'set-cookie':clearSessionCookie()});}
  if(req.method==='GET'&&url.pathname==='/api/me')return sendJson(res,200,platform.accounts.publicAccount(account));
  if(req.method==='PATCH'&&url.pathname==='/api/me/profile'){const updated=await platform.accounts.updateProfile(account.id,await readJson(req));await platform.refreshRuntime(updated);return sendJson(res,200,platform.accounts.publicAccount(updated));}
  if(req.method==='GET'&&url.pathname==='/api/me/export'){const exported=await platform.exportAccount(account);const messages=await maya.history(account.id,100);return sendJson(res,200,{...exported,conversations:messages});}
  if(req.method==='DELETE'&&url.pathname==='/api/me'){if(account.subscription.status==='active')return sendJson(res,409,{error:'cancel the active Stripe subscription from billing before deleting the account'});await maya.clearHistory(account.id);await platform.purgeAccount(account);return sendJson(res,200,{deleted:true},{'set-cookie':clearSessionCookie()});}
  if(req.method==='POST'&&url.pathname==='/api/billing/checkout'){const body=await readJson<{plan?:string}>(req);const plan=planById(String(body.plan??''));if(!plan)return sendJson(res,400,{error:'invalid plan'});const session=await createCheckoutSession(account,plan.id);if(!session.url)throw new Error('Stripe did not return a checkout URL');return sendJson(res,201,{id:session.id,url:session.url});}
  if(req.method==='POST'&&url.pathname==='/api/billing/portal'){if(!account.subscription.customerRef)return sendJson(res,409,{error:'Stripe customer is not linked yet'});return sendJson(res,201,await createBillingPortal(account.subscription.customerRef));}

  const runtime=await platform.runtimeFor(account);const engine=runtime.engine;

  if(req.method==='POST'&&url.pathname==='/api/resume-studio'){
    const body=await readJson<{rawResumeText?:string;targetTitle?:string;targetCompany?:string;targetRequirements?:string[];templateId?:ResumeTemplateId;variant?:ResumeVariant}>(req);
    const access=resumeAccessFor(account);
    const pkg=resumeStudio.build({access,rawResumeText:String(body.rawResumeText??''),evidence:[...engine.store.evidence.values()],currentSkills:account.profile.skills,identity:account.profile.name,targetTitle:body.targetTitle,targetCompany:body.targetCompany,targetRequirements:body.targetRequirements,templateId:body.templateId,variant:body.variant});
    return sendJson(res,200,pkg);
  }
  if(req.method==='GET'&&url.pathname==='/api/career/twin')return sendJson(res,200,engine.careerTwin.current());
  if(req.method==='PATCH'&&url.pathname==='/api/career/twin'){
    const body=await readJson<{key?:keyof Pick<CareerTwinSnapshot,'goals'|'strengths'|'growthAreas'|'preferredWork'|'dislikedWork'|'values'|'compensation'|'trajectory'|'constraints'>;fact?:CareerFact}>(req);
    if(!body.key||!body.fact)return sendJson(res,400,{error:'career twin key and fact are required'});
    const result=engine.updateCareerTwin(body.key as never,body.fact as never);await runtime.checkpoint();return sendJson(res,200,result);
  }
  if(req.method==='POST'&&url.pathname==='/api/career/facts'){const fact=await readJson<CareerFact>(req);const result=engine.addCareerFact(fact);await runtime.checkpoint();return sendJson(res,201,result);}
  if(req.method==='GET'&&url.pathname==='/api/career/outcomes')return sendJson(res,200,{events:engine.outcomes.all(account.profile.id),summary:engine.careerOutcomeSummary()});
  if(req.method==='POST'&&url.pathname==='/api/career/outcomes'){const body=await readJson<Partial<CareerOutcomeEvent>>(req);const result=engine.recordCareerOutcome({...body,id:body.id??id('career_outcome'),candidateId:account.profile.id,at:body.at??new Date().toISOString()} as CareerOutcomeEvent);await runtime.checkpoint();return sendJson(res,201,result);}
  if(req.method==='GET'&&url.pathname==='/api/saved-opportunities')return sendJson(res,200,{items:engine.savedOpportunities()});
  if(req.method==='GET'&&url.pathname==='/api/opportunity-watches')return sendJson(res,200,{watches:engine.opportunityWatches(),matches:engine.saved.evaluate([...engine.store.opportunities.values()],account.profile.id)});
  if(req.method==='POST'&&url.pathname==='/api/opportunity-watches'){const body=await readJson<Partial<OpportunityWatchRule>>(req);const rule={...body,id:body.id??id('watch'),candidateId:account.profile.id,createdAt:body.createdAt??new Date().toISOString(),updatedAt:new Date().toISOString(),cadence:body.cadence??'daily',enabled:body.enabled??true,query:String(body.query??'')} as OpportunityWatchRule;const result=engine.upsertOpportunityWatch(rule);await runtime.checkpoint();return sendJson(res,201,result);}
  const savedMatch=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/save$/);
  if(savedMatch&&req.method==='POST'){const body=await readJson<{notes?:string;priority?:'low'|'medium'|'high'}>(req);const result=engine.saveOpportunity(savedMatch[1],body.notes,body.priority);await runtime.checkpoint();return sendJson(res,201,result);}
  if(savedMatch&&req.method==='DELETE'){const result=engine.unsaveOpportunity(savedMatch[1]);await runtime.checkpoint();return sendJson(res,200,{removed:result});}

  if(req.method==='POST'&&url.pathname==='/api/employer/organizations'){const body=await readJson<{name?:string}>(req);return sendJson(res,201,await employers.createOrganization(String(body.name??''),account.id));}
  const orgMember=url.pathname.match(/^\/api\/employer\/organizations\/([^/]+)\/members$/);
  if(orgMember&&req.method==='POST'){const body=await readJson<{accountId?:string;role?:EmployerRole}>(req);if(!body.accountId||!body.role||body.role==='owner')return sendJson(res,400,{error:'member accountId and non-owner role required'});return sendJson(res,201,await employers.addMember(orgMember[1],account.id,body.accountId,body.role));}
  const orgJobs=url.pathname.match(/^\/api\/employer\/organizations\/([^/]+)\/jobs$/);
  if(orgJobs&&req.method==='GET')return sendJson(res,200,{jobs:employers.listJobs(orgJobs[1],account.id)});
  if(orgJobs&&req.method==='POST'){const body=await readJson<Record<string,unknown>>(req);return sendJson(res,201,await employers.createJob(orgJobs[1],account.id,body as never));}
  if(req.method==='PUT'&&url.pathname==='/api/candidate/sourcing-consent'){const body=await readJson<Record<string,unknown>>(req);return sendJson(res,200,await employers.setCandidateConsent({...body,candidateId:account.profile.id,updatedAt:new Date().toISOString()} as never));}
  if(req.method==='GET'&&url.pathname==='/api/candidate/sourcing-consent')return sendJson(res,200,employers.candidateConsent(account.profile.id)??{candidateId:account.profile.id,visibility:'private',allowedOrganizationIds:[],blockedOrganizationIds:[],shareCompensationTarget:false,shareCareerPreferences:false});

  if(!requireActivePlan(account,res,'career'))return;
  if(req.method==='POST'&&url.pathname==='/api/maya/chat'){const result=await maya.respond(account.id,engine,await readJson<MayaRequest>(req));await runtime.checkpoint();return sendJson(res,200,result);}
  if(req.method==='GET'&&url.pathname==='/api/maya/history'){const limit=Number(url.searchParams.get('limit')??40);return sendJson(res,200,{messages:await maya.history(account.id,Number.isFinite(limit)?limit:40)});}
  if(req.method==='DELETE'&&url.pathname==='/api/maya/history'){await maya.clearHistory(account.id);return sendJson(res,200,{cleared:true});}
  if(req.method==='GET'&&url.pathname==='/api/maya/attention'){const result=engine.evaluateProactive();await runtime.checkpoint();return sendJson(res,200,{summary:result.summary,signals:result.signals});}
  const attentionAck=url.pathname.match(/^\/api\/maya\/attention\/([^/]+)\/acknowledge$/);
  if(attentionAck&&req.method==='POST'){const result=engine.acknowledgeProactive(attentionAck[1]);await runtime.checkpoint();return sendJson(res,200,result);}
  const attentionSnooze=url.pathname.match(/^\/api\/maya\/attention\/([^/]+)\/snooze$/);
  if(attentionSnooze&&req.method==='POST'){const body=await readJson<{until?:string}>(req);if(!body.until||Number.isNaN(Date.parse(body.until)))return sendJson(res,400,{error:'valid snooze until timestamp required'});const until=new Date(body.until);if(until.getTime()<=Date.now())return sendJson(res,400,{error:'snooze until must be in the future'});const result=engine.snoozeProactive(attentionSnooze[1],until);await runtime.checkpoint();return sendJson(res,200,result);}
  if(req.method==='GET'&&url.pathname==='/api/career/status'){const status=engine.careerStatus();await runtime.checkpoint();return sendJson(res,200,status);}
  if(req.method==='GET'&&url.pathname==='/api/opportunities')return sendJson(res,200,engine.selectiveOpportunities(60));
  if(req.method==='POST'&&url.pathname==='/api/discover')return sendJson(res,200,await platform.discoverFor(account));
  if(req.method==='POST'&&url.pathname==='/api/github/index'){const body=await readJson<{owner?:string;token?:string}>(req);const owner=String(body.owner??'').trim();if(!owner)return sendJson(res,400,{error:'GitHub owner required'});return sendJson(res,200,await platform.indexGitHubFor(account,owner,typeof body.token==='string'&&body.token.trim()?body.token.trim():undefined));}
  if(req.method==='POST'&&url.pathname==='/api/opportunities'){const result=engine.ingest(await readJson<RawJob>(req));await runtime.checkpoint();return sendJson(res,201,result);}
  const packageMatch=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/package$/);if(packageMatch&&req.method==='GET')return sendJson(res,200,engine.package(packageMatch[1]));
  const application=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/application-request$/);if(application&&req.method==='POST'){if(!requireActivePlan(account,res,'pro'))return;const result=engine.requestApplication(application[1]);await runtime.checkpoint();return sendJson(res,201,result);}
  const outreach=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/outreach-request$/);if(outreach&&req.method==='POST'){if(!requireActivePlan(account,res,'pro'))return;const result=engine.requestOutreach(outreach[1]);await runtime.checkpoint();return sendJson(res,201,result);}
  const transition=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/transition$/);if(transition&&req.method==='POST'){const body=await readJson<{state:PipelineState}>(req);const result=engine.governor.transition(transition[1],body.state);await runtime.checkpoint();return sendJson(res,200,result);}
  const feedback=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/feedback$/);if(feedback&&req.method==='POST'){const body=await readJson<Omit<FeedbackEvent,'opportunityId'>>(req);const result=engine.recordFeedback({...body,opportunityId:feedback[1]});await runtime.checkpoint();return sendJson(res,200,result);}
  if(req.method==='GET'&&url.pathname==='/api/connectors'){if(!requireActivePlan(account,res,'pro'))return;return sendJson(res,200,{connectors:runtime.connectors.available(),integrity:runtime.connectors.integrity()});}
  if(req.method==='GET'&&url.pathname==='/api/connectors/operations'){if(!requireActivePlan(account,res,'pro'))return;return sendJson(res,200,{operations:runtime.connectors.all(),deadLetters:runtime.connectors.deadLetters(),integrity:runtime.connectors.integrity()});}
  const connectorRetry=url.pathname.match(/^\/api\/connectors\/operations\/([^/]+)\/retry$/);
  if(connectorRetry&&req.method==='POST'){if(!requireActivePlan(account,res,'pro'))return;const result=await runtime.retryConnectorOperation(connectorRetry[1]);return sendJson(res,200,{operation:result,confirmedReceived:result.state==='verified-received'});}
  const approve=url.pathname.match(/^\/api\/approvals\/([^/]+)\/approve$/);if(approve&&req.method==='POST'){if(!requireActivePlan(account,res,'pro'))return;const result=engine.governor.approve(approve[1]);await runtime.checkpoint();return sendJson(res,200,result);}
  const connectorDispatch=url.pathname.match(/^\/api\/approvals\/([^/]+)\/connector-dispatch$/);
  if(connectorDispatch&&req.method==='POST'){if(!requireActivePlan(account,res,'pro'))return;const body=await readJson<{connectorId?:string;capability?:string;maxAttempts?:number}>(req);const connectorId=String(body.connectorId??'').trim(),capability=String(body.capability??'') as ConnectorCapability;if(!connectorId)return sendJson(res,400,{error:'connectorId required'});if(!CONNECTOR_CAPABILITIES.has(capability))return sendJson(res,400,{error:'supported connector capability required'});const result=await runtime.dispatchApproved(connectorDispatch[1],connectorId,capability,body.maxAttempts);return sendJson(res,200,{operation:result,delivery:{state:engine.governor.deliveryState(connectorDispatch[1]),history:engine.governor.deliveryHistory(connectorDispatch[1])},confirmedReceived:result.state==='verified-received'});}
  const delivery=url.pathname.match(/^\/api\/approvals\/([^/]+)\/delivery$/);if(delivery&&req.method==='GET'){if(!requireActivePlan(account,res,'pro'))return;return sendJson(res,200,{state:engine.governor.deliveryState(delivery[1]),history:engine.governor.deliveryHistory(delivery[1])});}
  const legacyDeliveryMutation=/^\/api\/approvals\/[^/]+\/(provider-acknowledged|verified-received|execute)$/.test(url.pathname);
  if(legacyDeliveryMutation&&req.method==='POST'){if(!requireActivePlan(account,res,'pro'))return;return sendJson(res,410,{error:'direct delivery-state mutation is disabled; use governed connector-dispatch so provider acknowledgement and verified receipt originate from the connector boundary'});}
  return sendJson(res,404,{error:'not found'});
}catch(error){const message=error instanceof Error?error.message:String(error);const status=/credentials|sign in|required authentication/i.test(message)?401:/permission denied/i.test(message)?403:/not found/i.test(message)?404:/too large/i.test(message)?413:400;return sendJson(res,status,{error:message});}}

const port=Number(process.env.PORT??3000);const server=createServer((req,res)=>{void route(req,res);});server.listen(port,()=>console.log(`Hired AI / Maya listening on http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{server.close(()=>{void Promise.allSettled([platform.close(),employers.close(),billingLedger.close(),authLimiter.close?.()??Promise.resolve(),apiLimiter.close?.()??Promise.resolve()]).finally(()=>process.exit(0));});});
