import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { DiscoveryOrchestrator, sourcesFromEnv } from './discovery.js';
import { demoJobs } from './demo-data.js';
import { candidate, evidence } from './seed.js';
import type { FeedbackEvent, PipelineState, RawJob } from './domain.js';
import { HiredRuntime } from './runtime.js';
import { authorizeApiKey } from './auth.js';
import { GitHubPortfolioIndexer } from './portfolio.js';
import { dueFollowUps } from './scheduler.js';

const runtime = await HiredRuntime.create(candidate, evidence);
const engine = runtime.engine;
runtime.startAutoCheckpoint();
if (process.env.HIRED_DEMO !== 'false' && engine.store.opportunities.size === 0) demoJobs.forEach(j => { try { engine.ingest(j); } catch {} });

const json = (res:ServerResponse, status:number, body:unknown) => { res.writeHead(status, {'content-type':'application/json'}); res.end(JSON.stringify(body)); };
const body = async (req:IncomingMessage) => { const chunks:Buffer[]=[]; for await (const chunk of req) chunks.push(Buffer.from(chunk)); const raw=Buffer.concat(chunks).toString('utf8'); return raw ? JSON.parse(raw) : {}; };
const esc = (v:unknown) => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const page = () => { const d=engine.dashboard(); const cards=d.priority.map(o=>`<article><div class="score">${o.score.total}</div><h3>${esc(o.job.title)}</h3><p>${esc(o.job.company)} · ${esc(o.job.location)} · ${esc(o.job.workMode)}</p><p>${esc(o.gaps.filter(g=>g.strength==='strong').map(g=>g.skill).join(', '))}</p><small>${esc(o.state)}</small></article>`).join(''); const followups=dueFollowUps([...engine.store.opportunities.values()]); return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Hired AI</title><style>body{font-family:system-ui;background:#0b0d10;color:#f5f7fa;margin:0}main{max-width:1100px;margin:auto;padding:32px}.hero{display:flex;justify-content:space-between;align-items:end;gap:20px}.muted{color:#9ba3af}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:28px 0}.metric,article{background:#151922;border:1px solid #252b36;border-radius:16px;padding:18px}.metric b{font-size:28px;display:block}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.score{float:right;font-size:28px;font-weight:800;color:#7ee787}h1{font-size:42px;margin:0}small{color:#7ee787}</style></head><body><main><div class="hero"><div><h1>Hired AI</h1><p class="muted">NYC job acquisition command center · verified evidence · governed actions</p></div><div>${d.pendingApprovals.length} approvals · ${followups.length} follow-ups due</div></div><section class="metrics"><div class="metric"><b>${engine.store.opportunities.size}</b>discovered</div><div class="metric"><b>${d.counts.QUALIFIED??0}</b>qualified</div><div class="metric"><b>${d.counts.RECRUITER_SCREEN??0}</b>recruiter screens</div><div class="metric"><b>${d.counts.TECHNICAL??0}</b>technical</div><div class="metric"><b>${d.counts.OFFER??0}</b>offers</div></section><h2>Priority opportunities</h2><section class="grid">${cards}</section></main></body></html>`; };

const route = async (req:IncomingMessage,res:ServerResponse) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method==='GET' && url.pathname==='/health') return json(res,200,{ok:true,persistence:process.env.DATABASE_URL?'postgres':'file'});
    if (url.pathname.startsWith('/api/') && !authorizeApiKey(req.headers.authorization)) return json(res,401,{error:'unauthorized'});
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
