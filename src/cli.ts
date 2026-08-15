import { HiredEngine } from './engine.js';
import { demoJobs } from './demo-data.js';
import { candidate, evidence } from './seed.js';

const command = process.argv[2] ?? 'demo';
if (command !== 'demo') throw new Error(`unknown command: ${command}`);
const engine = new HiredEngine(candidate, evidence);
for (const job of demoJobs) engine.ingest(job);
const dashboard = engine.dashboard();
const top = dashboard.priority[0];
if (top) {
  const pkg = engine.package(top.id);
  const approval = engine.requestApplication(top.id);
  console.log(JSON.stringify({ dashboard, topPackage: pkg, approvalBoundary: approval }, null, 2));
} else console.log(JSON.stringify(dashboard, null, 2));
