import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { candidate, evidence } from './seed.js';
import { demoJobs } from './demo-data.js';
import { HiredRuntime } from './runtime.js';
import { authorizeApiKey } from './auth.js';
import { commercialPlans, checkoutReady, planById } from './commercial.js';
import { parseResumeText } from './resume-ingestion.js';

const runtime = await HiredRuntime.create(candidate, evidence);
const engine = runtime.engine;
runtime.startAutoCheckpoint();
if (process.env.HIRED_DEMO !== 'false' && engine.store.opportunities.size === 0) {
  for (const job of demoJobs) {
    try { engine.ingest(job); } catch {}
  }
}

const json = (res: ServerResponse, status: number, payload: unknown) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin'
  });
  res.end(JSON.stringify(payload));
};

const html = (res: ServerResponse, body: string) => {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin',
    'content-security-policy': "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"
  });
  res.end(body);
};

const readBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const b = Buffer.from(chunk);
    size += b.length;
    if (size > 1_000_000) throw new Error('request too large');
    chunks.push(b);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const authorized = (req: IncomingMessage, res: ServerResponse) => {
  if (authorizeApiKey(req.headers.authorization)) return true;
  json(res, 401, { error: 'unauthorized' });
  return false;
};

function ranked() {
  return engine.selectiveOpportunities(60).sort((a, b) => b.opportunity.score.total - a.opportunity.score.total);
}

function findOpportunity(message: string, explicitId?: string) {
  if (explicitId) {
    const found = engine.store.opportunities.get(explicitId);
    if (found) return found;
  }
  const lower = message.toLowerCase();
  const items = [...engine.store.opportunities.values()];
  return items.find(o => lower.includes(o.job.company.toLowerCase()) || lower.includes(o.job.title.toLowerCase())) ?? ranked()[0]?.opportunity;
}

function mayaReply(input: { message?: string; opportunityId?: string; resumeText?: string; socialPlatforms?: string[] }) {
  const message = String(input.message ?? '').trim();
  const lower = message.toLowerCase();
  const socials = input.socialPlatforms?.length ? input.socialPlatforms : ['linkedin'];

  if (input.resumeText) {
    const plan = engine.auditCareer(input.resumeText.slice(0, 200_000), socials);
    return {
      message: plan.resume.likelyOutdated
        ? 'I found signs that your resume is behind your current career evidence. I built a modernization plan and compared it with your portfolio, career presence, and current opportunity set.'
        : 'Your resume appears reasonably current. I still compared it with your verified evidence and current opportunities so we can strengthen anything that is underselling you.',
      type: 'career-audit',
      plan,
      actions: ['Show my best opportunities', 'Improve my professional presence', 'What should I fix first?']
    };
  }

  if (!message) {
    return {
      message: 'I’m Maya. Tell me what you want from your career, what is frustrating you, or what you want me to work on today.',
      actions: ['Find roles I can realistically win', 'Audit my career positioning', 'Help me build my network', 'Prepare me for interviews']
    };
  }

  if (/network|linkedin|github|social|connections|people|recruiter|hiring manager|relationship/.test(lower)) {
    const plan = engine.networkPlan(socials);
    return {
      message: 'I built a network and professional-presence plan from your current evidence and opportunity set. I’ll prioritize useful relationships and credible positioning instead of indiscriminate outreach.',
      type: 'network',
      plan,
      actions: ['Show my strongest jobs', 'What should I improve on GitHub?', 'Who should I connect with first?']
    };
  }

  if (/resume|cv|positioning|outdated|career audit|profile/.test(lower)) {
    return {
      message: 'Attach or paste your current resume and I’ll compare it with your verified work, current skills, career direction, and strongest opportunities. I’ll tell you what is stale, what is missing, and what should change.',
      type: 'resume-request',
      actions: ['Find my strongest jobs', 'Review my professional presence']
    };
  }

  if (/interview|mock|technical|behavioral|prepare|prep/.test(lower)) {
    const opp = findOpportunity(message, input.opportunityId);
    if (!opp) return { message: 'Choose a role or ask me to find strong opportunities first.' };
    const pkg = engine.package(opp.id);
    return {
      message: `I prepared you for ${opp.job.title} at ${opp.job.company} using the actual role requirements, your verified strengths, and the gaps you need to handle truthfully.`,
      type: 'interview',
      opportunity: opp,
      readiness: pkg.readiness,
      interview: pkg.interview,
      actions: ['Run a mock interview', 'Explain my weak spots', 'Prepare my application']
    };
  }

  if (/apply|application|tailor|cover letter/.test(lower)) {
    const opp = findOpportunity(message, input.opportunityId);
    if (!opp) return { message: 'Choose an opportunity first.' };
    const pkg = engine.package(opp.id);
    if (!pkg.readiness.canOccupyRole) {
      return {
        message: `I do not recommend applying yet. This role has a readiness score of ${pkg.readiness.readinessScore}/100 and material gaps I would rather help you close than waste your time with a weak application.`,
        type: 'develop-first',
        opportunity: opp,
        readiness: pkg.readiness,
        actions: ['Show me how to close the gaps', 'Find a role I can pursue now']
      };
    }
    return {
      message: `You are sufficiently ready for ${opp.job.title} at ${opp.job.company}. I prepared a truthful, evidence-grounded package. Submission remains approval-gated.`,
      type: 'application',
      opportunity: opp,
      readiness: pkg.readiness,
      package: { resume: pkg.resume, application: pkg.application, outreach: pkg.outreach },
      actions: ['Request application approval', 'Prepare me for interview', 'Find a human path']
    };
  }

  if (/status|today|next|pipeline|attention|follow.?up/.test(lower)) {
    const status = engine.careerStatus();
    return {
      message: `Here is what matters now: ${status.priority.length} opportunity${status.priority.length === 1 ? '' : 'ies'} are strong enough to pursue, ${status.developmentCandidates.length} are better treated as development targets, and ${status.pendingApprovals.length} action${status.pendingApprovals.length === 1 ? '' : 's'} await approval.`,
      type: 'status',
      status,
      actions: ['Show my best opportunity', 'Audit my resume', 'Build my network plan']
    };
  }

  if (/find|job|role|opportunit|work|career move|better position/.test(lower)) {
    const decisions = ranked().slice(0, 8);
    const pursue = decisions.filter(d => d.decision === 'pursue');
    const develop = decisions.filter(d => d.decision === 'develop-first');
    return {
      message: `I found ${pursue.length} role${pursue.length === 1 ? '' : 's'} I would pursue now and ${develop.length} promising role${develop.length === 1 ? '' : 's'} I would treat as development targets. I ranked them by fit, evidence, readiness, compensation, career upside, freshness, and interview probability—not application volume.`,
      type: 'opportunities',
      opportunities: decisions,
      actions: ['Explain my top match', 'Audit my resume against these jobs', 'Find useful people around these companies']
    };
  }

  if (/why|gap|weak|reject|qualified|fit|evidence|ready/.test(lower)) {
    const opp = findOpportunity(message, input.opportunityId);
    if (!opp) return { message: 'Ask me to find opportunities first, then I can explain exactly where you stand.' };
    const readiness = engine.assessReadiness(opp.id);
    return {
      message: `${opp.job.title} at ${opp.job.company} is scored ${opp.score.total}/100 with role readiness ${readiness.readinessScore}/100. ${readiness.canOccupyRole ? 'I consider it selectively pursuable.' : 'I would not pursue it yet without resolving or manually reviewing the blocking gaps.'}`,
      type: 'fit',
      opportunity: opp,
      readiness,
      actions: ['Prepare application', 'Prepare me for interview', 'Show a development plan']
    };
  }

  return {
    message: 'I can work across your whole career: opportunity discovery, resume modernization, GitHub and social positioning, network growth, selective applications, interview preparation, skill-gap closure, offer strategy, and outcome learning. Tell me the outcome you want and I’ll coordinate the work.',
    actions: ['Find my best roles', 'Audit my resume', 'Build my network', 'What should I do today?']
  };
}

const page = () => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maya — Hired AI</title>
<style>
:root{color-scheme:dark;--bg:#0a0d12;--panel:#121720;--panel2:#171d27;--border:#283141;--text:#f7f9fc;--muted:#9aa7b8;--good:#78e08f;--warn:#ffd166}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.app{min-height:100vh;display:grid;grid-template-columns:240px 1fr}.side{border-right:1px solid var(--border);padding:20px 16px;background:#0c1016}.brand{font-weight:800;font-size:19px;margin-bottom:6px}.maya{font-size:13px;color:var(--muted);margin-bottom:26px}.side button{width:100%;border:0;background:transparent;color:#cbd5e1;text-align:left;padding:10px 12px;border-radius:10px;margin:3px 0;cursor:pointer}.side button:hover{background:var(--panel2)}.side .new{border:1px solid var(--border);background:var(--panel);margin-bottom:18px;font-weight:700}.foot{position:absolute;bottom:18px;width:200px;color:var(--muted);font-size:11px;line-height:1.5}.main{min-width:0}.top{height:58px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;background:rgba(10,13,18,.92);backdrop-filter:blur(12px);z-index:3}.top strong{font-size:14px}.status{font-size:11px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:7px 10px}.thread{max-width:880px;margin:0 auto;padding:55px 22px 160px}.welcome{text-align:center;padding:55px 0 20px}.avatar{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;margin:auto;background:linear-gradient(145deg,#27344a,#151b25);border:1px solid #3b4960;font-weight:800;font-size:23px}.welcome h1{font-size:36px;margin:18px 0 7px}.welcome p{color:var(--muted);max-width:650px;margin:0 auto;line-height:1.55}.suggestions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:30px auto;max-width:760px}.suggestions button,.actions button{border:1px solid var(--border);background:var(--panel);color:#e6edf7;border-radius:13px;padding:13px;text-align:left;cursor:pointer}.suggestions button:hover,.actions button:hover{border-color:#526279}.msg{max-width:82%;padding:13px 15px;margin:17px 0;border-radius:16px;line-height:1.55;white-space:pre-wrap}.user{margin-left:auto;background:#242c38}.assistant{padding-left:0;background:transparent}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:11px;margin:8px 0 16px}.card{border:1px solid var(--border);background:var(--panel);border-radius:15px;padding:15px}.card h3{font-size:15px;margin:0 0 4px}.meta{color:var(--muted);font-size:12px}.score{font-size:22px;font-weight:800;float:right}.good{color:var(--good)}.warn{color:var(--warn)}.chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}.chip{font-size:11px;background:#1c2430;border-radius:999px;padding:5px 7px;color:#c8d2df}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 18px}.actions button{padding:8px 10px;font-size:12px}.composerWrap{position:fixed;left:240px;right:0;bottom:0;padding:35px 22px 18px;background:linear-gradient(transparent,var(--bg) 28%)}.composer{max-width:880px;margin:auto;border:1px solid #354155;background:#151b24;border-radius:21px;padding:9px 12px;box-shadow:0 14px 40px rgba(0,0,0,.35)}textarea{width:100%;border:0;background:transparent;color:white;outline:0;resize:none;font:inherit;padding:10px;min-height:52px;max-height:150px}.tools{display:flex;justify-content:space-between;align-items:center}.tools button{border:0;background:transparent;color:#d7e0eb;width:39px;height:39px;border-radius:11px;cursor:pointer}.tools button:hover{background:#252e3a}.tools .send{background:white;color:#111}.small{font-size:11px;color:var(--muted);padding-left:8px}@media(max-width:760px){.app{grid-template-columns:1fr}.side{display:none}.composerWrap{left:0}.suggestions{grid-template-columns:1fr}.thread{padding-left:15px;padding-right:15px}.msg{max-width:95%}}
</style></head>
<body><div class="app"><aside class="side"><div class="brand">Hired AI</div><div class="maya">Maya · Your AI Career Agent</div><button class="new" onclick="location.reload()">＋ New conversation</button><button onclick="ask('What should I work on today?')">Today</button><button onclick="ask('Find roles I can realistically win')">Opportunities</button><button onclick="ask('Audit my career positioning')">Career</button><button onclick="ask('Help me build my professional network')">Network</button><button onclick="ask('Prepare me for interviews')">Interviews</button><button onclick="showPlans()">Plans</button><div class="foot">Maya works across your career.<br>Important external actions remain approval-gated.</div></aside><main class="main"><header class="top"><strong>Maya</strong><span class="status">Career intelligence · Evidence grounded</span></header><div class="thread" id="thread"><div class="welcome" id="welcome"><div class="avatar">M</div><h1>Hi, I’m Maya.</h1><p>I’m your AI career agent. Tell me where you want your career to go and I’ll help with opportunities, your resume, GitHub, professional network, interviews, applications, and the gaps standing between you and better roles.</p><div class="suggestions"><button onclick="ask('Find roles I can realistically win')">Find roles I can realistically win</button><button onclick="ask('My resume may be outdated. Help me fix it.')">Modernize my resume</button><button onclick="ask('Help me build a stronger professional network')">Build my career network</button><button onclick="ask('What should I do to advance my career?')">Plan my next move</button></div></div></div><div class="composerWrap"><div class="composer"><textarea id="input" placeholder="Message Maya…"></textarea><div id="fileName" class="small"></div><div class="tools"><div><button title="Attach resume" onclick="document.getElementById('file').click()">＋</button><input id="file" hidden type="file" accept=".txt,.md,.csv,.json,.html"><button id="mic" title="Talk to Maya">◉</button></div><button class="send" onclick="send()">↑</button></div></div></div></main></div>
<script>
const thread=document.getElementById('thread'),welcome=document.getElementById('welcome'),input=document.getElementById('input'),fileName=document.getElementById('fileName');let resumeText='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function scrollDown(){window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}
function add(role,text){welcome.style.display='none';const d=document.createElement('div');d.className='msg '+role;d.textContent=text;thread.appendChild(d);scrollDown()}
function cards(items){if(!items?.length)return;const wrap=document.createElement('div');wrap.className='cards';for(const item of items){const d=item.opportunity?item.opportunity:item;const readiness=item.readiness;const decision=item.decision;const c=document.createElement('div');c.className='card';const score=d.score?.total??0;c.innerHTML='<span class="score '+(score>=75?'good':'warn')+'">'+esc(score)+'</span><h3>'+esc(d.job?.title)+'</h3><div class="meta">'+esc(d.job?.company)+' · '+esc(d.job?.location)+' · '+esc(d.job?.workMode)+'</div><div class="chips"><span class="chip">'+esc(decision??d.state)+'</span>'+(readiness?'<span class="chip">readiness '+esc(readiness.readinessScore)+'</span>':'')+'</div>';wrap.appendChild(c)}thread.appendChild(wrap)}
function actionButtons(actions){if(!actions?.length)return;const wrap=document.createElement('div');wrap.className='actions';for(const a of actions){const b=document.createElement('button');b.textContent=a;b.onclick=()=>ask(a);wrap.appendChild(b)}thread.appendChild(wrap)}
async function ask(text){input.value=text;await send()}
async function send(){const message=input.value.trim();if(!message&&!resumeText)return;add('user',message||'Review my attached resume');input.value='';const payload={message,resumeText:resumeText||undefined,socialPlatforms:['linkedin']};resumeText='';fileName.textContent='';try{const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw new Error(data.error||'request failed');add('assistant',data.message||'Done.');if(data.opportunities)cards(data.opportunities);else if(data.opportunity)cards([data.opportunity]);actionButtons(data.actions)}catch(e){add('assistant','I hit a problem completing that request. '+e.message)}}
document.getElementById('file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;resumeText=await f.text();fileName.textContent='Attached: '+f.name});input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(SR){const rec=new SR();rec.onresult=e=>{input.value=e.results[0][0].transcript;send()};document.getElementById('mic').onclick=()=>rec.start()}else document.getElementById('mic').style.opacity='.35';
async function showPlans(){const r=await fetch('/api/plans');const data=await r.json();add('assistant','Choose the level of Maya you want. Paid access is activated through the configured checkout link.');const wrap=document.createElement('div');wrap.className='cards';for(const p of data.plans){const c=document.createElement('div');c.className='card';c.innerHTML='<h3>'+esc(p.name)+' · $'+esc(p.monthlyUsd)+'/mo</h3><div class="meta">'+esc(p.description)+'</div>';if(p.checkoutUrl){const b=document.createElement('button');b.textContent='Choose '+p.name;b.style.marginTop='12px';b.onclick=()=>location.href=p.checkoutUrl;c.appendChild(b)}wrap.appendChild(c)}thread.appendChild(wrap);scrollDown()}
</script></body></html>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/') return html(res, page());
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, product: 'Hired AI', agent: 'Maya', checkout: checkoutReady() });
    if (req.method === 'GET' && url.pathname === '/api/plans') return json(res, 200, { plans: commercialPlans(), checkout: checkoutReady() });
    if (req.method === 'POST' && url.pathname === '/api/checkout') {
      const input = await readBody(req);
      const plan = planById(String(input.planId ?? ''));
      if (!plan) return json(res, 404, { error: 'plan not found' });
      if (!plan.checkoutUrl) return json(res, 503, { error: 'checkout is not configured for this plan' });
      return json(res, 200, { planId: plan.id, checkoutUrl: plan.checkoutUrl });
    }
    if (url.pathname.startsWith('/api/') && !authorized(req, res)) return;
    if (req.method === 'POST' && url.pathname === '/api/chat') return json(res, 200, mayaReply(await readBody(req)));
    if (req.method === 'GET' && url.pathname === '/api/opportunities') return json(res, 200, { opportunities: engine.selectiveOpportunities(0) });
    if (req.method === 'GET' && url.pathname === '/api/career-status') return json(res, 200, engine.careerStatus());
    if (req.method === 'POST' && url.pathname === '/api/career-audit') {
      const input = await readBody(req);
      return json(res, 200, engine.auditCareer(String(input.resumeText ?? ''), Array.isArray(input.socialPlatforms) ? input.socialPlatforms : ['linkedin']));
    }
    const appMatch = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/application-request$/);
    if (req.method === 'POST' && appMatch) return json(res, 200, engine.requestApplication(appMatch[1]));
    const outreachMatch = url.pathname.match(/^\/api\/opportunities\/([^/]+)\/outreach-request$/);
    if (req.method === 'POST' && outreachMatch) return json(res, 200, engine.requestOutreach(outreachMatch[1]));
    const approveMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approveMatch) return json(res, 200, engine.governor.approve(approveMatch[1]));
    const executeMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)\/execute$/);
    if (req.method === 'POST' && executeMatch) return json(res, 200, engine.governor.executeApproved(executeMatch[1]));
    return json(res, 404, { error: 'not found' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unexpected error';
    return json(res, /not found/i.test(message) ? 404 : 400, { error: message });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Hired AI · Maya listening on http://localhost:${port}`));
