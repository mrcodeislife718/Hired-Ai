import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { DiscoveryOrchestrator, sourcesFromEnv } from './discovery.js';
import { demoJobs } from './demo-data.js';
import { candidate, evidence } from './seed.js';
import type { FeedbackEvent, Opportunity, PipelineState, RawJob } from './domain.js';
import { HiredRuntime } from './runtime.js';
import { authorizeApiKey } from './auth.js';
import { GitHubPortfolioIndexer } from './portfolio.js';
import { dueFollowUps } from './scheduler.js';
import { parseResumeText } from './resume-ingestion.js';

const runtime = await HiredRuntime.create(candidate, evidence);
const engine = runtime.engine;
runtime.startAutoCheckpoint();
if (process.env.HIRED_DEMO !== 'false' && engine.store.opportunities.size === 0) demoJobs.forEach(j => { try { engine.ingest(j); } catch {} });

const json = (res:ServerResponse, status:number, body:unknown) => { res.writeHead(status, {'content-type':'application/json'}); res.end(JSON.stringify(body)); };
const body = async (req:IncomingMessage) => { const chunks:Buffer[]=[]; for await (const chunk of req) chunks.push(Buffer.from(chunk)); const raw=Buffer.concat(chunks).toString('utf8'); return raw ? JSON.parse(raw) : {}; };
const esc = (v:unknown) => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

interface ChatCard {
  opportunityId:string;
  title:string;
  company:string;
  location:string;
  workMode:string;
  score:number;
  state:string;
  salary?:string;
  strengths:string[];
  gaps:string[];
  humanPaths:number;
}
interface ChatResponse { message:string; cards?:ChatCard[]; actions?:string[]; detail?:unknown; }

const opportunityCard = (o:Opportunity):ChatCard => ({
  opportunityId:o.id,
  title:o.job.title,
  company:o.job.company,
  location:o.job.location,
  workMode:o.job.workMode,
  score:o.score.total,
  state:o.state,
  salary:o.job.salaryMin || o.job.salaryMax ? `${o.job.salaryMin ? `$${o.job.salaryMin.toLocaleString()}` : '?'}${o.job.salaryMax ? ` – $${o.job.salaryMax.toLocaleString()}` : ''}` : undefined,
  strengths:o.gaps.filter(g=>g.strength==='strong').slice(0,5).map(g=>g.skill),
  gaps:o.gaps.filter(g=>g.strength==='missing' || g.strength==='learning-gap').slice(0,4).map(g=>g.skill),
  humanPaths:o.humanPaths.length
});

function rankedOpportunities(){ return [...engine.store.opportunities.values()].filter(o=>!o.hardRejected).sort((a,b)=>b.score.total-a.score.total); }
function findOpportunity(input:{opportunityId?:string;message:string}){
  if(input.opportunityId){ const found=engine.store.opportunities.get(input.opportunityId); if(found) return found; }
  const text=input.message.toLowerCase();
  return rankedOpportunities().find(o=>text.includes(o.job.company.toLowerCase()) || text.includes(o.job.title.toLowerCase())) ?? rankedOpportunities()[0];
}

function conversationalReply(input:{message:string;opportunityId?:string;attachmentText?:string;attachmentName?:string}):ChatResponse {
  const message=input.message.trim();
  const lower=message.toLowerCase();
  if(input.attachmentText){
    const parsed=parseResumeText(input.attachmentText.slice(0,120000));
    return { message:`I reviewed ${input.attachmentName ?? 'your document'} and found ${parsed.skills.length} recognized technical skills. I can use this alongside your verified portfolio evidence when we qualify jobs.`, detail:{skills:parsed.skills,urls:parsed.urls}, actions:['Find my best matches','Show my strongest evidence','Find jobs with fewer gaps'] };
  }
  if(!message) return {message:'Tell me what kind of role you want, what matters most, or ask me to work your current pipeline.'};
  if(/find|search|match|jobs|roles|opportunit/.test(lower)){
    const cards=rankedOpportunities().slice(0,6).map(opportunityCard);
    return {message:`I have ${cards.length} strong opportunities ready to review. I ranked them by technical fit, evidence strength, compensation, location, freshness and estimated interview probability—not by application volume.`,cards,actions:['Explain my top match','Prepare the best application','Find recruiter paths']};
  }
  if(/why|fit|qualified|qualification|evidence|gap/.test(lower)){
    const opp=findOpportunity(input); if(!opp) return {message:'I do not have a qualified opportunity to explain yet. Ask me to find jobs first.'};
    const strong=opp.gaps.filter(g=>g.strength==='strong').map(g=>g.skill);
    const gaps=opp.gaps.filter(g=>g.strength!=='strong').map(g=>`${g.skill} (${g.strength})`);
    return {message:`${opp.job.title} at ${opp.job.company} is scored ${opp.score.total}/100. Strong evidence: ${strong.slice(0,6).join(', ') || 'none yet'}. Remaining gaps: ${gaps.slice(0,5).join(', ') || 'no material gaps detected'}.`,cards:[opportunityCard(opp)],detail:{score:opp.score,evidenceIds:opp.evidenceIds,gaps:opp.gaps},actions:['Prepare application','Find recruiter path','Prepare me for interview']};
  }
  if(/apply|application|resume|cover letter|tailor|package/.test(lower)){
    const opp=findOpportunity(input); if(!opp) return {message:'I need a qualified opportunity before I can prepare an application package.'};
    const pkg=engine.package(opp.id);
    return {message:`I prepared the application package for ${opp.job.title} at ${opp.job.company}. I kept unsupported claims out and grounded the package in verified evidence. Nothing is submitted until you approve it.`,cards:[opportunityCard(opp)],detail:{resume:pkg.resume,application:pkg.application},actions:['Request application approval','Show evidence','Prepare interview']};
  }
  if(/recruiter|hiring manager|human path|contact|outreach|introduc/.test(lower)){
    const opp=findOpportunity(input); if(!opp) return {message:'I need an opportunity before I can search its human paths.'};
    return {message:`I found ${opp.humanPaths.length} public or authorized human path${opp.humanPaths.length===1?'':'s'} for ${opp.job.company}. I can prepare outreach, but identity-bearing contact remains approval-gated.`,cards:[opportunityCard(opp)],detail:{humanPaths:opp.humanPaths},actions:['Prepare outreach','Show company intelligence','Show application package']};
  }
  if(/interview|technical screen|onsite|prepare me|prep/.test(lower)){
    const opp=findOpportunity(input); if(!opp) return {message:'Choose an opportunity and I will prepare you for its interview process.'};
    const pkg=engine.package(opp.id);
    return {message:`I prepared role-specific interview guidance for ${opp.job.title} at ${opp.job.company}, grounded in the job requirements, company intelligence and your evidence gaps.`,cards:[opportunityCard(opp)],detail:{interview:pkg.interview},actions:['Explain my gaps','Show evidence','Show pipeline']};
  }
  if(/pipeline|status|follow.?up|what.*next|progress/.test(lower)){
    const d=engine.dashboard(); const followups=dueFollowUps([...engine.store.opportunities.values()]);
    return {message:`Your pipeline currently has ${engine.store.opportunities.size} opportunities, ${d.pendingApprovals.length} pending approvals and ${followups.length} follow-ups due.`,detail:{counts:d.counts,followUps:followups,pendingApprovals:d.pendingApprovals},actions:['Show best matches','Show pending approvals','Prepare follow-ups']};
  }
  return {message:'I can find and qualify jobs, explain exactly why you match, ground claims in portfolio evidence, prepare tailored applications, find recruiter paths, manage follow-ups, and prepare interviews. Tell me the outcome you want.',actions:['Find my best jobs','Work my pipeline','Prepare me for interviews']};
}

const page = () => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hired AI</title><style>
:root{color-scheme:dark;--bg:#0b0d10;--panel:#11151b;--panel2:#151a22;--border:#272d38;--muted:#98a2b3;--text:#f7f9fc;--green:#7ee787;--blue:#7ab7ff;--accent:#ffffff}*{box-sizing:border-box}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--text);margin:0;height:100vh;overflow:hidden}.app{display:grid;grid-template-columns:250px 1fr;height:100vh}.sidebar{border-right:1px solid var(--border);padding:18px 14px;background:#0d1015;display:flex;flex-direction:column}.brand{font-size:20px;font-weight:800;padding:10px 12px;margin-bottom:18px}.new{border:1px solid var(--border);background:var(--panel2);color:var(--text);border-radius:12px;padding:12px;text-align:left;font-weight:700}.nav{margin-top:20px;display:grid;gap:6px}.nav button{border:0;background:transparent;color:#c8d0dc;padding:10px 12px;text-align:left;border-radius:9px;font-size:14px}.nav button.active,.nav button:hover{background:#171c24;color:white}.sidefoot{margin-top:auto;color:var(--muted);font-size:12px;padding:10px}.main{display:flex;flex-direction:column;min-width:0}.top{height:58px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 24px}.top strong{font-size:14px}.pill{font-size:12px;border:1px solid var(--border);border-radius:999px;padding:7px 10px;color:var(--muted)}.conversation{flex:1;overflow:auto;padding:34px 22px 150px}.thread{max-width:860px;margin:0 auto}.welcome{text-align:center;padding:70px 10px 30px}.orb{width:62px;height:62px;margin:auto;border:1px solid #39414e;border-radius:20px;display:grid;place-items:center;font-size:26px;background:linear-gradient(145deg,#151a22,#0d1015)}h1{font-size:34px;margin:18px 0 8px}.welcome p{color:var(--muted);font-size:16px}.suggestions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:30px auto;max-width:720px}.suggestions button,.action{border:1px solid var(--border);background:var(--panel);color:#e8ecf2;border-radius:12px;padding:13px;text-align:left;cursor:pointer}.suggestions button:hover,.action:hover{border-color:#4c5768}.msg{max-width:84%;margin:18px 0;padding:13px 15px;border-radius:16px;line-height:1.5;white-space:pre-wrap}.user{margin-left:auto;background:#242a33}.assistant{background:transparent;padding-left:0}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:10px 0 18px}.card{background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:16px}.score{float:right;font-size:25px;font-weight:800;color:var(--green)}.card h3{margin:0 40px 6px 0;font-size:16px}.meta{color:var(--muted);font-size:12px}.chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}.chip{font-size:11px;border-radius:999px;padding:5px 7px;background:#1c222c;color:#cbd5e1}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}.action{padding:8px 10px;font-size:12px}.composerwrap{position:fixed;left:250px;right:0;bottom:0;background:linear-gradient(transparent,var(--bg) 24%);padding:30px 22px 18px}.composer{max-width:860px;margin:auto;background:#171b22;border:1px solid #303744;border-radius:20px;padding:10px 12px;box-shadow:0 10px 36px rgba(0,0,0,.35)}textarea{width:100%;resize:none;border:0;outline:0;background:transparent;color:white;font:inherit;min-height:48px;max-height:140px;padding:10px}.tools{display:flex;justify-content:space-between;align-items:center}.toolset{display:flex;gap:8px}.icon{width:38px;height:38px;border:0;border-radius:10px;background:transparent;color:#d9e0ea;cursor:pointer;font-size:17px}.icon:hover{background:#252b35}.send{background:white;color:#111}.attach{font-size:11px;color:var(--muted);padding-left:8px}.typing{color:var(--muted);font-size:13px;margin:8px 0}@media(max-width:760px){.app{grid-template-columns:1fr}.sidebar{display:none}.composerwrap{left:0}.suggestions{grid-template-columns:1fr}.conversation{padding-left:15px;padding-right:15px}.msg{max-width:94%}}
</style></head><body><div class="app"><aside class="sidebar"><div class="brand">Hired AI</div><button class="new" onclick="location.reload()">＋ New job search</button><div class="nav"><button class="active">◉ Chat</button><button onclick="quick('Find my best matching jobs')">⌕ Jobs</button><button onclick="quick('Show my application pipeline')">▣ Applications</button><button onclick="quick('Find recruiter paths for my top opportunity')">◎ People</button><button onclick="quick('Prepare me for my next interview')">◇ Interviews</button><button onclick="quick('Show my pipeline status and what I should do next')">↗ Pipeline</button></div><div class="sidefoot">Governed actions · Evidence-grounded qualification<br><br>Hired AI works the search. You stay in control.</div></aside><main class="main"><header class="top"><strong>Job acquisition agent</strong><span class="pill">Evidence grounded · Approval gated</span></header><section class="conversation" id="conversation"><div class="thread" id="thread"><div class="welcome" id="welcome"><div class="orb">✦</div><h1>What job do you want next?</h1><p>Talk or type. I’ll find opportunities, prove your fit, prepare applications, find human paths and work the pipeline with you.</p><div class="suggestions"><button onclick="quick('Find me the best AI engineering jobs that match what I have actually built')">Find my strongest job matches</button><button onclick="quick('Which current opportunity gives me the best chance of an interview?')">Rank by interview probability</button><button onclick="quick('Show me where my strongest portfolio evidence helps me qualify')">Use my portfolio evidence</button><button onclick="quick('Work my current pipeline and tell me what needs attention')">Work my hiring pipeline</button></div></div></div></section><div class="composerwrap"><div class="composer"><textarea id="input" placeholder="Message Hired AI…" rows="1"></textarea><div id="attachment" class="attach"></div><div class="tools"><div class="toolset"><button class="icon" title="Attach resume or text file" onclick="document.getElementById('file').click()">＋</button><input id="file" type="file" hidden accept=".txt,.md,.json,.csv,.html"><button class="icon" id="mic" title="Talk to Hired AI">◉</button></div><button class="icon send" title="Send" onclick="send()">↑</button></div></div></div></main></div><script>
const input=document.getElementById('input'),thread=document.getElementById('thread'),welcome=document.getElementById('welcome'),attachment=document.getElementById('attachment');let selectedOpportunityId,attachmentText='',attachmentName='';
function escs(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addMsg(role,text){if(welcome)welcome.style.display='none';const d=document.createElement('div');d.className='msg '+role;d.textContent=text;thread.appendChild(d);scroll();}
function scroll(){document.getElementById('conversation').scrollTop=document.getElementById('conversation').scrollHeight;}
function renderCards(cards){if(!cards?.length)return;const wrap=document.createElement('div');wrap.className='cards';cards.forEach(c=>{const el=document.createElement('div');el.className='card';el.onclick=()=>{selectedOpportunityId=c.opportunityId;input.placeholder='Ask about '+c.title+' at '+c.company+'…';};el.innerHTML='<div class="score">'+escs(c.score)+'</div><h3>'+escs(c.title)+'</h3><div class="meta">'+escs(c.company)+' · '+escs(c.location)+' · '+escs(c.workMode)+(c.salary?' · '+escs(c.salary):'')+'</div><div class="chips">'+(c.strengths||[]).slice(0,4).map(x=>'<span class="chip">✓ '+escs(x)+'</span>').join('')+(c.gaps||[]).slice(0,2).map(x=>'<span class="chip">△ '+escs(x)+'</span>').join('')+'</div><div class="meta" style="margin-top:10px">'+escs(c.state)+' · '+escs(c.humanPaths)+' human paths</div>';wrap.appendChild(el)});thread.appendChild(wrap);scroll();}
function renderActions(actions){if(!actions?.length)return;const wrap=document.createElement('div');wrap.className='actions';actions.forEach(a=>{const b=document.createElement('button');b.className='action';b.textContent=a;b.onclick=()=>quick(a);wrap.appendChild(b)});thread.appendChild(wrap);scroll();}
async function send(text){const message=(text??input.value).trim();if(!message&&!attachmentText)return;addMsg('user',message||('Attached '+attachmentName));input.value='';const t=document.createElement('div');t.className='typing';t.textContent='Hired AI is working…';thread.appendChild(t);scroll();try{const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message,opportunityId:selectedOpportunityId,attachmentText,attachmentName})});const data=await r.json();t.remove();addMsg('assistant',data.message||data.error||'I could not complete that request.');renderCards(data.cards);renderActions(data.actions);attachmentText='';attachmentName='';attachment.textContent='';}catch(e){t.remove();addMsg('assistant','I hit a local connection error. Please confirm the Hired AI server is still running.');}}
function quick(text){input.value=text;send();}
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
document.getElementById('file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;attachmentName=f.name;attachmentText=await f.text();attachment.textContent='Attached: '+f.name;});
const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;const mic=document.getElementById('mic');if(SpeechRecognition){const rec=new SpeechRecognition();rec.continuous=false;rec.interimResults=false;rec.lang='en-US';rec.onstart=()=>mic.textContent='●';rec.onend=()=>mic.textContent='◉';rec.onresult=e=>{input.value=e.results[0][0].transcript;send();};mic.onclick=()=>rec.start();}else{mic.onclick=()=>addMsg('assistant','Voice input is not available in this browser. Chrome or Edge usually supports browser speech recognition.');}
</script></body></html>`;

const route = async (req:IncomingMessage,res:ServerResponse) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method==='GET' && url.pathname==='/health') return json(res,200,{ok:true,persistence:process.env.DATABASE_URL?'postgres':'file'});
    if (url.pathname.startsWith('/api/') && !authorizeApiKey(req.headers.authorization)) return json(res,401,{error:'unauthorized'});
    if (req.method==='POST' && url.pathname==='/api/chat') return json(res,200,conversationalReply(await body(req) as {message:string;opportunityId?:string;attachmentText?:string;attachmentName?:string}));
    if (req.method==='GET' && url.pathname==='/api/dashboard') return json(res,200,{...engine.dashboard(),followUps:dueFollowUps([...engine.store.opportunities.values()]),traceCount:runtime.traces.events.length});
    if (req.method==='GET' && url.pathname==='/api/opportunities') return json(res,200,[...engine.store.opportunities.values()].sort((a,b)=>b.score.total-a.score.total));
    if (req.method==='GET' && url.pathname==='/api/audit') return json(res,200,engine.store.audit);
    if (req.method==='GET' && url.pathname==='/api/traces') return json(res,200,runtime.traces.events);
    if (req.method==='GET' && url.pathname==='/api/followups') return json(res,200,dueFollowUps([...engine.store.opportunities.values()]));
    if (req.method==='POST' && url.pathname==='/api/checkpoint') { await runtime.checkpoint(); return json(res,200,{ok:true}); }
    if (req.method==='POST' && url.pathname==='/api/portfolio/index') { const b=await body(req) as {owner?:string}; const owner=b.owner??process.env.GITHUB_OWNER; if(!owner) throw new Error('GitHub owner required'); const indexed=await new GitHubPortfolioIndexer(owner,process.env.GITHUB_TOKEN).index(); indexed.forEach(e=>engine.store.saveEvidence(e)); await runtime.checkpoint(); return json(res,200,{indexed:indexed.length,evidenceTotal:engine.store.evidence.size}); }
    if (req.method==='POST' && url.pathname==='/api/discover') {
      const span=runtime.traces.start('discovery.run');
      try { const result=await new DiscoveryOrchestrator(sourcesFromEnv()).run(); const ingested=[]; for (const job of result.jobs) { try { ingested.push(engine.ingest(job)); } catch (e) { if (!(e instanceof Error && /duplicate/.test(e.message))) throw e; } } await runtime.checkpoint(); span.end({discovered:result.jobs.length,ingested:ingested.length}); return json(res,200,{discovered:result.jobs.length,ingested:ingested.length,failures:result.failures}); } catch(error){ span.fail(error); throw error; }
    }
    if (req.method==='POST' && url.pathname==='/api/opportunities') { const result=engine.ingest(await body(req) as RawJob); await runtime.checkpoint(); return json(res,201,result); }
    const pkg=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/package$/); if (req.method==='GET' && pkg) return json(res,200,engine.package(pkg[1]));
    const outreach=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/outreach-request$/); if (req.method==='POST' && outreach) { const result=engine.requestOutreach(outreach[1]); await runtime.checkpoint(); return json(res,201,result); }
    const application=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/application-request$/); if (req.method==='POST' && application) { const result=engine.requestApplication(application[1]); await runtime.checkpoint(); return json(res,201,result); }
    const transition=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/transition$/); if (req.method==='POST' && transition) { const b=await body(req) as {state:PipelineState}; const result=engine.governor.transition(transition[1],b.state); await runtime.checkpoint(); return json(res,200,result); }
    const feedback=url.pathname.match(/^\/api\/opportunities\/([^/]+)\/feedback$/); if (req.method==='POST' && feedback) { const b=await body(req) as Omit<FeedbackEvent,'opportunityId'>; const result=engine.recordFeedback({...b,opportunityId:feedback[1]}); await runtime.checkpoint(); return json(res,200,result); }
    const approve=url.pathname.match(/^\/api\/approvals\/([^/]+)\/approve$/); if (req.method==='POST' && approve) { const result=engine.governor.approve(approve[1]); await runtime.checkpoint(); return json(res,200,result); }
    const execute=url.pathname.match(/^\/api\/approvals\/([^/]+)\/execute$/); if (req.method==='POST' && execute) { const payload=engine.governor.executeApproved(execute[1]); await runtime.checkpoint(); return json(res,200,{payload}); }
    if (req.method==='GET') { res.writeHead(200,{'content-type':'text/html; charset=utf-8'}); return res.end(page()); }
    return json(res,404,{error:'not found'});
  } catch (error) { return json(res,400,{error:error instanceof Error?error.message:String(error)}); }
};

const port=Number(process.env.PORT??3000); const server=createServer((req,res)=>{void route(req,res);}); server.listen(port,()=>console.log(`Hired AI listening on http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'] as const) process.on(signal,()=>{void runtime.close().finally(()=>server.close(()=>process.exit(0)));});
