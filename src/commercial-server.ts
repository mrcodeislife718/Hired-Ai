import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AccountRecord } from './accounts.js';
import { BillingEventLedger } from './billing-ledger.js';
import { CommercialPlatform } from './commercial-platform.js';
import { checkoutReady, commercialPlans, hasPlan, planById, type PlanId } from './commercial.js';
import type { HiredEngine } from './engine.js';
import { SlidingWindowLimiter } from './rate-limit.js';
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
const billingLedger = new BillingEventLedger();
const authLimiter = new SlidingWindowLimiter(Number(process.env.HIRED_AUTH_RATE_LIMIT ?? 12), 15 * 60_000);
const apiLimiter = new SlidingWindowLimiter(Number(process.env.HIRED_API_RATE_LIMIT ?? 180), 60_000);

const securityHeaders = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'permissions-policy': 'microphone=(self), camera=(), geolocation=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin'
};

function sendJson(res: ServerResponse, status: number, payload: unknown, extra: Record<string, string> = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...securityHeaders, ...extra });
  res.end(JSON.stringify(payload));
}

function sendHtml(res: ServerResponse, body: string) {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    ...securityHeaders,
    'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://checkout.stripe.com"
  });
  res.end(body);
}

async function readRaw(req: IncomingMessage, maxBytes = 1_000_000) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > maxBytes) throw new Error('request too large');
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson<T = Record<string, unknown>>(req: IncomingMessage): Promise<T> {
  const raw = await readRaw(req);
  if (!raw) return {} as T;
  try { return JSON.parse(raw) as T; }
  catch { throw new Error('invalid JSON'); }
}

function bearer(req: IncomingMessage) {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
}

function clientKey(req: IncomingMessage) {
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0]?.trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function consume(limiter: SlidingWindowLimiter, key: string, res: ServerResponse) {
  const result = limiter.consume(key);
  if (result.allowed) return true;
  sendJson(res, 429, { error: 'too many requests', retryAt: new Date(result.resetAt).toISOString() }, { 'retry-after': String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))) });
  return false;
}

async function requireAccount(req: IncomingMessage, res: ServerResponse) {
  const token = bearer(req);
  const account = await platform.accounts.accountForToken(token);
  if (!account) {
    sendJson(res, 401, { error: 'sign in required' });
    return undefined;
  }
  if (!consume(apiLimiter, account.id, res)) return undefined;
  return { account, token };
}

function requireActivePlan(account: AccountRecord, res: ServerResponse, minimum: PlanId = 'career') {
  if (account.subscription.status === 'active' && hasPlan(account.subscription.plan, minimum)) return true;
  sendJson(res, 402, {
    error: 'active subscription required',
    requiredPlan: minimum,
    subscription: account.subscription
  });
  return false;
}

function ranked(engine: HiredEngine) {
  return engine.selectiveOpportunities(60).sort((a, b) => b.opportunity.score.total - a.opportunity.score.total);
}

function findOpportunity(engine: HiredEngine, message: string, explicitId?: string) {
  if (explicitId) {
    const found = engine.store.opportunities.get(explicitId);
    if (found) return found;
  }
  const lower = message.toLowerCase();
  const items = [...engine.store.opportunities.values()];
  return items.find(item => lower.includes(item.job.company.toLowerCase()) || lower.includes(item.job.title.toLowerCase())) ?? ranked(engine)[0]?.opportunity;
}

function mayaReply(engine: HiredEngine, input: { message?: string; opportunityId?: string; resumeText?: string; socialPlatforms?: string[] }) {
  const message = String(input.message ?? '').trim();
  const lower = message.toLowerCase();
  const socials = input.socialPlatforms?.length ? input.socialPlatforms : ['linkedin'];

  if (input.resumeText) {
    const plan = engine.auditCareer(input.resumeText.slice(0, 200_000), socials);
    return {
      message: plan.resume.likelyOutdated
        ? 'Your resume is behind your current career evidence. I compared it with your verified work, professional presence, and current opportunities and built a modernization plan.'
        : 'Your resume appears reasonably current. I still compared it with your verified evidence and strongest opportunities so we can strengthen anything that is underselling you.',
      type: 'career-audit',
      plan,
      actions: ['Show my best opportunities', 'Improve my professional presence', 'What should I fix first?']
    };
  }

  if (!message) return {
    message: 'I’m Maya. Tell me what you want from your career, what is frustrating you, or what you want me to work on today.',
    actions: ['Find roles I can realistically win', 'Audit my career positioning', 'Help me build my network', 'Prepare me for interviews']
  };

  if (/network|linkedin|github|social|connections|people|recruiter|hiring manager|relationship/.test(lower)) {
    const plan = engine.networkPlan(socials);
    return {
      message: 'I built a network and professional-presence plan from your evidence and opportunity set. I’ll prioritize useful relationships and credible positioning instead of indiscriminate outreach.',
      type: 'network', plan,
      actions: ['Show my strongest jobs', 'What should I improve on GitHub?', 'Who should I connect with first?']
    };
  }

  if (/resume|cv|positioning|outdated|career audit|profile/.test(lower)) return {
    message: 'Attach or paste your current resume and I’ll compare it with your verified work, current skills, career direction, and strongest opportunities. I’ll tell you what is stale, missing, or underselling you.',
    type: 'resume-request', actions: ['Find my strongest jobs', 'Review my professional presence']
  };

  if (/interview|mock|technical|behavioral|prepare|prep/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Choose a role or ask me to find strong opportunities first.' };
    const pkg = engine.package(opportunity.id);
    return {
      message: `I prepared you for ${opportunity.job.title} at ${opportunity.job.company} using the actual requirements, your verified strengths, and the gaps you need to handle truthfully.`,
      type: 'interview', opportunity, readiness: pkg.readiness, interview: pkg.interview,
      actions: ['Explain my weak spots', 'Prepare my application', 'Find a human path']
    };
  }

  if (/apply|application|tailor|cover letter/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Choose an opportunity first.' };
    const pkg = engine.package(opportunity.id);
    if (!pkg.readiness.canOccupyRole) return {
      message: `I do not recommend applying yet. Your readiness for this role is ${pkg.readiness.readinessScore}/100. I would rather help you close the blocking gaps than waste your time with a weak application.`,
      type: 'develop-first', opportunity, readiness: pkg.readiness,
      actions: ['Show me how to close the gaps', 'Find a role I can pursue now']
    };
    return {
      message: `You are sufficiently ready for ${opportunity.job.title} at ${opportunity.job.company}. I prepared a truthful, evidence-grounded package. Submission remains approval-gated.`,
      type: 'application', opportunity, readiness: pkg.readiness,
      package: { resume: pkg.resume, application: pkg.application, outreach: pkg.outreach },
      actions: ['Request application approval', 'Prepare me for interview', 'Find a human path']
    };
  }

  if (/status|today|next|pipeline|attention|follow.?up/.test(lower)) {
    const status = engine.careerStatus();
    return {
      message: `Right now, ${status.priority.length} opportunity${status.priority.length === 1 ? '' : 'ies'} are strong enough to pursue, ${status.developmentCandidates.length} are better treated as development targets, and ${status.pendingApprovals.length} action${status.pendingApprovals.length === 1 ? '' : 's'} await approval.`,
      type: 'status', status,
      actions: ['Show my best opportunity', 'Audit my resume', 'Build my network plan']
    };
  }

  if (/find|job|role|opportunit|work|career move|better position/.test(lower)) {
    const decisions = ranked(engine).slice(0, 8);
    const pursue = decisions.filter(item => item.decision === 'pursue');
    const develop = decisions.filter(item => item.decision === 'develop-first');
    return {
      message: `I found ${pursue.length} role${pursue.length === 1 ? '' : 's'} I would pursue now and ${develop.length} promising role${develop.length === 1 ? '' : 's'} I would treat as development targets. I ranked them by fit, evidence, readiness, compensation, career upside, freshness, and interview probability—not application volume.`,
      type: 'opportunities', opportunities: decisions,
      actions: ['Explain my top match', 'Audit my resume against these jobs', 'Find useful people around these companies']
    };
  }

  if (/why|gap|weak|reject|qualified|fit|evidence|ready/.test(lower)) {
    const opportunity = findOpportunity(engine, message, input.opportunityId);
    if (!opportunity) return { message: 'Ask me to find opportunities first, then I can explain exactly where you stand.' };
    const readiness = engine.assessReadiness(opportunity.id);
    return {
      message: `${opportunity.job.title} at ${opportunity.job.company} is scored ${opportunity.score.total}/100 with role readiness ${readiness.readinessScore}/100. ${readiness.canOccupyRole ? 'I consider it selectively pursuable.' : 'I would not pursue it yet without resolving or manually reviewing the blocking gaps.'}`,
      type: 'fit', opportunity, readiness,
      actions: ['Prepare application', 'Prepare me for interview', 'Show a development plan']
    };
  }

  return {
    message: 'I can work across your whole career: opportunity discovery, resume modernization, GitHub and social positioning, network growth, selective applications, interview preparation, skill-gap closure, offer strategy, and outcome learning. Tell me the outcome you want and I’ll coordinate the work.',
    actions: ['Find my best roles', 'Audit my resume', 'Build my network', 'What should I do today?']
  };
}

async function handleStripeWebhook(req: IncomingMessage, res: ServerResponse) {
  const raw = await readRaw(req, 2_000_000);
  const event = parseStripeEvent(raw, req.headers['stripe-signature'] as string | undefined);
  const claimed = await billingLedger.claim(event.id);
  if (!claimed) return sendJson(res, 200, { received: true, duplicate: true });
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as unknown as StripeCheckoutSession;
      const accountId = accountIdFromMetadata(session.metadata);
      const plan = planFromMetadata(session.metadata);
      if (accountId && plan !== 'none') await platform.accounts.setSubscription(accountId, plan, 'active', session.customer ?? undefined);
    }
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as unknown as StripeSubscription;
      const accountId = accountIdFromMetadata(subscription.metadata);
      const plan = planFromMetadata(subscription.metadata);
      if (accountId) await platform.accounts.setSubscription(accountId, plan, subscriptionState(subscription.status), subscription.customer);
    }
    return sendJson(res, 200, { received: true });
  } catch (error) {
    await billingLedger.release(event.id);
    throw error;
  }
}

const page = () => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maya — Hired AI</title><style>
:root{color-scheme:dark;--bg:#090c11;--panel:#121821;--panel2:#18202c;--border:#2c3748;--text:#f7f9fc;--muted:#9ba8b8;--accent:#fff;--good:#7ee787;--warn:#ffd166}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.shell{min-height:100vh}.hidden{display:none!important}.auth{min-height:100vh;display:grid;place-items:center;padding:24px}.authCard{width:min(460px,100%);background:var(--panel);border:1px solid var(--border);border-radius:24px;padding:28px}.authCard h1{margin:0 0 8px;font-size:31px}.authCard p{color:var(--muted);line-height:1.55}.field{display:grid;gap:6px;margin:13px 0}.field input{width:100%;border:1px solid var(--border);background:#0e131a;color:white;padding:13px;border-radius:12px;outline:none}.primary,.secondary{border:0;border-radius:12px;padding:12px 15px;font-weight:750;cursor:pointer}.primary{background:white;color:#111}.secondary{background:var(--panel2);color:white;border:1px solid var(--border)}.authActions{display:flex;gap:9px;margin-top:16px}.app{min-height:100vh;display:grid;grid-template-columns:240px 1fr}.side{border-right:1px solid var(--border);padding:20px 16px;background:#0c1016;position:fixed;left:0;top:0;bottom:0;width:240px}.brand{font-weight:850;font-size:20px}.mayaLabel{font-size:13px;color:var(--muted);margin:5px 0 24px}.side button{width:100%;border:0;background:transparent;color:#cbd5e1;text-align:left;padding:10px 12px;border-radius:10px;margin:3px 0;cursor:pointer}.side button:hover{background:var(--panel2)}.side .new{border:1px solid var(--border);background:var(--panel);margin-bottom:16px;font-weight:700}.account{position:absolute;bottom:18px;left:16px;right:16px;color:var(--muted);font-size:11px;line-height:1.55}.main{margin-left:240px;min-width:0}.top{height:58px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;background:rgba(9,12,17,.92);backdrop-filter:blur(12px);z-index:3}.status{font-size:11px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:7px 10px}.thread{max-width:900px;margin:0 auto;padding:54px 22px 160px}.welcome{text-align:center;padding:54px 0 20px}.avatar{width:70px;height:70px;border-radius:50%;display:grid;place-items:center;margin:auto;background:linear-gradient(145deg,#29364c,#141a24);border:1px solid #3c4c65;font-weight:850;font-size:23px}.welcome h1{font-size:37px;margin:18px 0 7px}.welcome p{color:var(--muted);max-width:670px;margin:auto;line-height:1.55}.suggestions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:30px auto;max-width:780px}.suggestions button,.action{border:1px solid var(--border);background:var(--panel);color:#e7edf6;border-radius:13px;padding:13px;text-align:left;cursor:pointer}.msg{max-width:84%;padding:13px 15px;margin:17px 0;border-radius:16px;line-height:1.55;white-space:pre-wrap}.user{margin-left:auto;background:#242d3a}.assistant{padding-left:0;background:transparent}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:11px;margin:8px 0 16px}.card{border:1px solid var(--border);background:var(--panel);border-radius:15px;padding:15px;cursor:pointer}.card h3{font-size:15px;margin:0 0 4px}.meta{color:var(--muted);font-size:12px}.score{font-size:22px;font-weight:850;float:right;color:var(--good)}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 18px}.action{padding:8px 10px;font-size:12px}.composerWrap{position:fixed;left:240px;right:0;bottom:0;padding:35px 22px 18px;background:linear-gradient(transparent,var(--bg) 28%)}.composer{max-width:900px;margin:auto;border:1px solid #354155;background:#151b24;border-radius:21px;padding:9px 12px;box-shadow:0 14px 40px rgba(0,0,0,.35)}textarea{width:100%;border:0;background:transparent;color:white;outline:0;resize:none;font:inherit;padding:10px;min-height:52px;max-height:150px}.tools{display:flex;justify-content:space-between;align-items:center}.tools button{border:0;background:transparent;color:#d7e0eb;width:39px;height:39px;border-radius:11px;cursor:pointer}.tools .send{background:white;color:#111}.small{font-size:11px;color:var(--muted);padding-left:8px}.plans{display:grid;gap:12px;margin-top:16px}.plan{border:1px solid var(--border);border-radius:14px;padding:15px;background:#0e131a}.plan strong{font-size:17px}.error{color:#ff9b9b;font-size:13px;margin-top:12px}@media(max-width:760px){.app{display:block}.side{display:none}.main{margin-left:0}.composerWrap{left:0}.suggestions{grid-template-columns:1fr}.thread{padding-left:15px;padding-right:15px}.msg{max-width:95%}}
</style></head><body><div id="auth" class="auth"><div class="authCard"><div style="font-weight:850">Hired AI</div><h1>Meet Maya.</h1><p>Your personal AI career agent for opportunities, positioning, networking, interviews, applications, and long-term career growth.</p><div class="field"><label>Email</label><input id="email" type="email" autocomplete="email"></div><div class="field"><label>Password</label><input id="password" type="password" autocomplete="current-password" minlength="12"></div><div class="authActions"><button class="primary" onclick="login()">Sign in</button><button class="secondary" onclick="register()">Create account</button></div><div id="authError" class="error"></div></div></div><div id="app" class="app hidden"><aside class="side"><div class="brand">Hired AI</div><div class="mayaLabel">Maya · Your AI Career Agent</div><button class="new" onclick="newConversation()">＋ New conversation</button><button onclick="ask('What should I work on today?')">Today</button><button onclick="ask('Find roles I can realistically win')">Opportunities</button><button onclick="ask('Audit my career positioning')">Career</button><button onclick="ask('Help me build my professional network')">Network</button><button onclick="ask('Prepare me for interviews')">Interviews</button><button onclick="showPlans()">Plan & billing</button><div class="account"><div id="accountLabel"></div><button onclick="logout()">Sign out</button></div></aside><main class="main"><header class="top"><strong>Maya</strong><span id="status" class="status">Career intelligence · Evidence grounded</span></header><section id="thread" class="thread"><div id="welcome" class="welcome"><div class="avatar">M</div><h1>What are we working toward?</h1><p>I can help you find roles you can actually succeed in, strengthen your resume and GitHub, build the right network, prepare for interviews, and improve your career over time.</p><div class="suggestions"><button onclick="ask('Find roles I can realistically win')">Find roles I can realistically win</button><button onclick="ask('Audit my career positioning')">Audit my career positioning</button><button onclick="ask('Help me build my professional network')">Help me build my network</button><button onclick="ask('What should I do today?')">Tell me what matters today</button></div></div></section><div class="composerWrap"><div class="composer"><textarea id="input" placeholder="Message Maya…"></textarea><div id="attachment" class="small"></div><div class="tools"><div><button title="Attach resume" onclick="document.getElementById('file').click()">＋</button><input id="file" type="file" hidden accept=".txt,.md,.csv,.json,.html"><button id="mic" title="Talk to Maya">◉</button></div><button class="send" onclick="send()">↑</button></div></div></div></main></div><script>
let token=localStorage.getItem('hired_token')||'',account=null,selectedOpportunityId='',resumeText='',resumeName='';const auth=document.getElementById('auth'),app=document.getElementById('app'),thread=document.getElementById('thread'),welcome=document.getElementById('welcome'),input=document.getElementById('input');
function headers(){return {'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})}}async function api(path,options={}){const r=await fetch(path,{...options,headers:{...headers(),...(options.headers||{})}});const data=await r.json().catch(()=>({error:'invalid server response'}));if(!r.ok)throw Object.assign(new Error(data.error||'request failed'),{status:r.status,data});return data}
async function boot(){if(!token)return showAuth();try{account=await api('/api/me');showApp()}catch{token='';localStorage.removeItem('hired_token');showAuth()}}function showAuth(){auth.classList.remove('hidden');app.classList.add('hidden')}function showApp(){auth.classList.add('hidden');app.classList.remove('hidden');document.getElementById('accountLabel').textContent=account.email+' · '+(account.subscription.status==='active'?account.subscription.plan:'no active plan');document.getElementById('status').textContent=account.subscription.status==='active'?'Maya · '+account.subscription.plan:'Subscription required'}
async function login(){document.getElementById('authError').textContent='';try{const d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})});token=d.token;account=d.account;localStorage.setItem('hired_token',token);showApp()}catch(e){document.getElementById('authError').textContent=e.message}}async function register(){document.getElementById('authError').textContent='';try{const d=await api('/api/auth/register',{method:'POST',body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})});token=d.token;account=d.account;localStorage.setItem('hired_token',token);showApp();showPlans()}catch(e){document.getElementById('authError').textContent=e.message}}async function logout(){try{await api('/api/auth/logout',{method:'POST'})}catch{}token='';account=null;localStorage.removeItem('hired_token');location.reload()}
function newConversation(){[...thread.children].forEach((node,i)=>{if(i>0)node.remove()});welcome.style.display='block';selectedOpportunityId='';input.value=''}function add(role,text){welcome.style.display='none';const d=document.createElement('div');d.className='msg '+role;d.textContent=text;thread.appendChild(d);scrollToBottom()}function scrollToBottom(){window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}function renderActions(actions){if(!actions?.length)return;const w=document.createElement('div');w.className='actions';for(const action of actions){const b=document.createElement('button');b.className='action';b.textContent=action;b.onclick=()=>ask(action);w.appendChild(b)}thread.appendChild(w)}function renderOpportunities(items){if(!items?.length)return;const w=document.createElement('div');w.className='cards';for(const item of items){const o=item.opportunity||item;const readiness=item.readiness;const c=document.createElement('div');c.className='card';c.onclick=()=>{selectedOpportunityId=o.id;input.placeholder='Ask Maya about '+o.job.title+' at '+o.job.company+'…'};c.innerHTML='<div class="score">'+o.score.total+'</div><h3>'+escapeHtml(o.job.title)+'</h3><div class="meta">'+escapeHtml(o.job.company)+' · '+escapeHtml(o.job.location)+' · '+escapeHtml(o.job.workMode)+'</div><div class="meta" style="margin-top:10px">'+(readiness?'Readiness '+readiness.readinessScore+'/100 · ':'')+escapeHtml(item.decision||o.state)+'</div>';w.appendChild(c)}thread.appendChild(w)}function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function send(text){const message=(text??input.value).trim();if(!message&&!resumeText)return;add('user',message||('Attached '+resumeName));input.value='';const typing=document.createElement('div');typing.className='msg assistant';typing.textContent='Maya is working…';thread.appendChild(typing);try{const data=await api('/api/maya/chat',{method:'POST',body:JSON.stringify({message,opportunityId:selectedOpportunityId,resumeText,socialPlatforms:['linkedin','github']})});typing.remove();add('assistant',data.message||'Done.');renderOpportunities(data.opportunities|| (data.opportunity?[data.opportunity]:null));renderActions(data.actions);resumeText='';resumeName='';document.getElementById('attachment').textContent=''}catch(e){typing.remove();if(e.status===402){add('assistant','Your Hired AI subscription is not active yet. Choose a plan and I’ll pick up from here.');showPlans()}else add('assistant',e.message)}}function ask(text){input.value=text;send()}input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});document.getElementById('file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;resumeName=f.name;resumeText=await f.text();document.getElementById('attachment').textContent='Attached: '+f.name});const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;const mic=document.getElementById('mic');if(SpeechRecognition){const rec=new SpeechRecognition();rec.onresult=e=>{input.value=e.results[0][0].transcript;send()};mic.onclick=()=>rec.start()}else mic.onclick=()=>add('assistant','Voice input is not available in this browser.')
async function showPlans(){try{const plans=await api('/api/plans',{method:'GET'});welcome.style.display='none';const wrap=document.createElement('div');wrap.className='msg assistant';wrap.textContent='Choose how you want Maya to work with you.';thread.appendChild(wrap);const grid=document.createElement('div');grid.className='plans';for(const p of plans.plans){const card=document.createElement('div');card.className='plan';card.innerHTML='<strong>'+escapeHtml(p.name)+'</strong> · $'+p.monthlyUsd+'/month<div class="meta" style="margin:7px 0 11px">'+escapeHtml(p.description)+'</div>';const b=document.createElement('button');b.className='primary';b.textContent='Choose '+p.name;b.onclick=()=>checkout(p.id);card.appendChild(b);grid.appendChild(card)}thread.appendChild(grid);if(account?.subscription?.customerRef){const b=document.createElement('button');b.className='secondary';b.textContent='Manage billing';b.onclick=manageBilling;thread.appendChild(b)}scrollToBottom()}catch(e){add('assistant',e.message)}}async function checkout(plan){try{const d=await api('/api/billing/checkout',{method:'POST',body:JSON.stringify({plan})});location.href=d.url}catch(e){add('assistant',e.message)}}async function manageBilling(){try{const d=await api('/api/billing/portal',{method:'POST'});location.href=d.url}catch(e){add('assistant',e.message)}}boot();
</script></body></html>`;

async function route(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/health') return sendJson(res, 200, { ok: true, billing: checkoutReady(), persistence: process.env.DATABASE_URL ? 'postgres' : 'file' });
    if (req.method === 'GET' && url.pathname === '/api/plans') return sendJson(res, 200, { plans: commercialPlans().map(({ stripePriceId, ...plan }) => ({ ...plan, checkoutConfigured: Boolean(stripePriceId) })), billing: checkoutReady() });
    if (req.method === 'POST' && url.pathname === '/api/stripe/webhook') return handleStripeWebhook(req, res);

    if (req.method === 'POST' && (url.pathname === '/api/auth/register' || url.pathname === '/api/auth/login')) {
      if (!consume(authLimiter, clientKey(req), res)) return;
      const body = await readJson<{ email?: string; password?: string }>(req);
      const email = String(body.email ?? '');
      const password = String(body.password ?? '');
      if (url.pathname.endsWith('/register')) {
        const account = await platform.accounts.register(email, password);
        const session = await platform.accounts.createSession(account.id);
        return sendJson(res, 201, { ...session, account: platform.accounts.publicAccount(account) });
      }
      const session = await platform.accounts.login(email, password);
      const account = await platform.accounts.accountForToken(session.token);
      return sendJson(res, 200, { ...session, account: account ? platform.accounts.publicAccount(account) : undefined });
    }

    if (req.method === 'GET' && url.pathname === '/') return sendHtml(res, page());

    const auth = await requireAccount(req, res);
    if (!auth) return;
    const { account, token } = auth;

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      await platform.accounts.logout(token);
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/api/me') return sendJson(res, 200, platform.accounts.publicAccount(account));
    if (req.method === 'PATCH' && url.pathname === '/api/me/profile') {
      const updated = await platform.accounts.updateProfile(account.id, await readJson(req));
      await platform.refreshRuntime(updated);
      return sendJson(res, 200, platform.accounts.publicAccount(updated));
    }
    if (req.method === 'GET' && url.pathname === '/api/me/export') return sendJson(res, 200, await platform.exportAccount(account));
    if (req.method === 'DELETE' && url.pathname === '/api/me') {
      if (account.subscription.status === 'active') return sendJson(res, 409, { error: 'cancel the active Stripe subscription from billing before deleting the account' });
      await platform.purgeAccount(account);
      return sendJson(res, 200, { deleted: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/billing/checkout') {
      const body = await readJson<{ plan?: string }>(req);
      const plan = planById(String(body.plan ?? ''));
      if (!plan) return sendJson(res, 400, { error: 'invalid plan' });
      const session = await createCheckoutSession(account, plan.id);
      if (!session.url) throw new Error('Stripe did not return a checkout URL');
      return sendJson(res, 201, { id: session.id, url: session.url });
    }
    if (req.method === 'POST' && url.pathname === '/api/billing/portal') {
      if (!account.subscription.customerRef) return sendJson(res, 409, { error: 'Stripe customer is not linked yet' });
      return sendJson(res, 201, await createBillingPortal(account.subscription.customerRef));
    }

    if (!requireActivePlan(account, res, 'career')) return;
    const runtime = await platform.runtimeFor(account);
    const engine = runtime.engine;

    if (req.method === 'POST' && url.pathname === '/api/maya/chat') return sendJson(res, 200, mayaReply(engine, await readJson(req)));
    if (req.method === 'GET' && url.pathname === '/api/opportunities') return sendJson(res, 200, engine.selectiveOpportunities(60));
    if (req.method === 'POST' && url.pathname === '/api/discover') return sendJson(res, 200, await platform.discoverFor(account));
    if (req.method === 'POST' && url.pathname === '/api/github/index') {
      const body = await readJson<{ owner?: string }>(req);
      const owner = String(body.owner ?? '').trim();
      if (!owner) return sendJson(res, 400, { error: 'GitHub owner required' });
      return sendJson(res, 200, await platform.indexGitHubFor(account, owner));
    }

    const application = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/application-request$/);
    if (req.method === 'POST' && application) {
      if (!requireActivePlan(account, res, 'pro')) return;
      const result = engine.requestApplication(application[1]);
      await runtime.checkpoint();
      return sendJson(res, 201, result);
    }
    const outreach = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/outreach-request$/);
    if (req.method === 'POST' && outreach) {
      if (!requireActivePlan(account, res, 'pro')) return;
      const result = engine.requestOutreach(outreach[1]);
      await runtime.checkpoint();
      return sendJson(res, 201, result);
    }
    const approve = url.pathname.match(/^\/api\/approvals\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approve) {
      if (!requireActivePlan(account, res, 'pro')) return;
      const result = engine.governor.approve(approve[1]);
      await runtime.checkpoint();
      return sendJson(res, 200, result);
    }

    return sendJson(res, 404, { error: 'not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /unauthorized|credentials|sign in/i.test(message) ? 401 : /not found/i.test(message) ? 404 : 400;
    return sendJson(res, status, { error: message });
  }
}

const port = Number(process.env.PORT ?? 3000);
const server = createServer((req, res) => { void route(req, res); });
server.listen(port, () => console.log(`Hired AI / Maya listening on http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void Promise.all([platform.close(), billingLedger.close()]).finally(() => server.close(() => process.exit(0))));
}
