import { createServer } from 'node:http';
import { HiredEngine } from './engine.js';
import { demoJobs } from './demo-data.js';
import { candidate, evidence } from './seed.js';

const engine = new HiredEngine(candidate, evidence); demoJobs.forEach(j => engine.ingest(j));
const escape = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const page = () => {
  const d = engine.dashboard();
  const cards = d.priority.map(o => `<article><div class="score">${o.score.total}</div><h3>${escape(o.job.title)}</h3><p>${escape(o.job.company)} · ${escape(o.job.location)} · ${escape(o.job.workMode)}</p><p>${escape(o.gaps.filter(g=>g.strength==='strong').map(g=>g.skill).join(', '))}</p><small>${escape(o.state)}</small></article>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Hired AI</title><style>body{font-family:system-ui;background:#0b0d10;color:#f5f7fa;margin:0}main{max-width:1100px;margin:auto;padding:32px}.hero{display:flex;justify-content:space-between;align-items:end;gap:20px}.muted{color:#9ba3af}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:28px 0}.metric,article{background:#151922;border:1px solid #252b36;border-radius:16px;padding:18px}.metric b{font-size:28px;display:block}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.score{float:right;font-size:28px;font-weight:800;color:#7ee787}h1{font-size:42px;margin:0}small{color:#7ee787}</style></head><body><main><div class="hero"><div><h1>Hired AI</h1><p class="muted">NYC job acquisition command center · verified evidence · governed actions</p></div><div>${d.pendingApprovals.length} approvals pending</div></div><section class="metrics"><div class="metric"><b>${engine.store.opportunities.size}</b>discovered</div><div class="metric"><b>${d.counts.QUALIFIED??0}</b>qualified</div><div class="metric"><b>${d.counts.RECRUITER_SCREEN??0}</b>recruiter screens</div><div class="metric"><b>${d.counts.TECHNICAL??0}</b>technical</div><div class="metric"><b>${d.counts.OFFER??0}</b>offers</div></section><h2>Priority opportunities</h2><section class="grid">${cards}</section></main></body></html>`;
};

const server = createServer((req,res) => {
  if (req.url === '/api/dashboard') { res.writeHead(200, {'content-type':'application/json'}); return res.end(JSON.stringify(engine.dashboard())); }
  if (req.url === '/health') { res.writeHead(200, {'content-type':'application/json'}); return res.end(JSON.stringify({ok:true})); }
  res.writeHead(200, {'content-type':'text/html; charset=utf-8'}); res.end(page());
});
const port = Number(process.env.PORT ?? 3000); server.listen(port, () => console.log(`Hired AI listening on http://localhost:${port}`));
