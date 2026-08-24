import { HiredEngine } from './engine.js';
import { demoJobs } from './demo-data.js';
import { candidate, evidence } from './seed.js';

const command = process.argv[2] ?? 'demo';
if (command !== 'demo') throw new Error(`unknown command: ${command}`);

const engine = new HiredEngine(candidate, evidence);
for (const job of demoJobs) engine.ingest(job);

const status = engine.careerStatus();
const topDecision = status.priority[0];
const top = topDecision ? engine.store.opportunities.get(topDecision.opportunityId) : undefined;

if (!top) {
  console.log(JSON.stringify(status, null, 2));
} else {
  const pkg = engine.package(top.id);
  const approval = pkg.readiness.canOccupyRole ? engine.requestApplication(top.id) : undefined;
  console.log(JSON.stringify({ careerStatus: status, topPackage: pkg, approvalBoundary: approval }, null, 2));
}
