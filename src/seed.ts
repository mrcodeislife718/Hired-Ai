import type { CandidateProfile, Evidence } from './domain.js';

export const candidate: CandidateProfile = {
  id: 'candidate_charles',
  name: 'Charles Castillo',
  headline: 'Software Engineer | AI Systems Engineer | Systems Architect | Product Engineering',
  skills: ['Python','JavaScript','TypeScript','Node.js','React','SQL','PostgreSQL','Docker','Kubernetes','Linux','AWS','GCP','REST APIs','AI agents','distributed systems'],
  constraints: {
    targetLocations: ['New York','NYC','Manhattan','Bronx','Brooklyn','Queens'],
    allowedWorkModes: ['onsite','hybrid','remote'],
    minBaseSalary: 80_000,
    requiresSponsorship: false,
    preferredTitles: ['software engineer','ai engineer','backend engineer','full stack engineer','forward deployed engineer'],
    excludedTerms: ['active security clearance required']
  }
};

export const evidence: Evidence[] = [
  { id:'ev_erp', skill:'AI agents', repository:'applied-ai-erp-agent', url:'https://github.com/mrcodeislife718/applied-ai-erp-agent', claim:'Built a typed ERP agent with scoped tools, approval-gated writes, fault injection, audit trails, MCP transport, and post-action verification.', verification:'repository', strength:0.95 },
  { id:'ev_sessions', skill:'distributed systems', repository:'Sessions-', url:'https://github.com/mrcodeislife718/Sessions-', claim:'Built persistent engineering memory and execution infrastructure with protocol-driven ingestion and traceability.', verification:'repository', strength:0.9 },
  { id:'ev_gaia', skill:'AI agents', repository:'G.A.I.A', url:'https://github.com/mrcodeislife718/G.A.I.A', claim:'Implemented governed runtime boundaries covering authority, evidence, verification, state, and causal execution records.', verification:'repository', strength:0.9 },
  { id:'ev_jarvis', skill:'distributed systems', repository:'J.A.R.V.I.S', url:'https://github.com/mrcodeislife718/J.A.R.V.I.S', claim:'Implemented an interoperability fabric with protocol enforcement, causal parentage, and structured failures.', verification:'repository', strength:0.9 },
  { id:'ev_cognified', skill:'TypeScript', repository:'Cognified', url:'https://github.com/mrcodeislife718/Cognified', claim:'Implemented a TypeScript learning engine with deterministic validation, persistent skill packages, runtime evidence and CI.', verification:'ci', strength:0.9 },
  { id:'ev_scout', skill:'Node.js', repository:'Scout', url:'https://github.com/mrcodeislife718/Scout', claim:'Implemented developer tooling and build workflows in the Scout platform.', verification:'repository', strength:0.82 },
  { id:'ev_python', skill:'Python', repository:'applied-ai-erp-agent', url:'https://github.com/mrcodeislife718/applied-ai-erp-agent', claim:'Demonstrates applied AI/backend architecture and Python-aligned workflow engineering.', verification:'manual', strength:0.7 },
  { id:'ev_docker', skill:'Docker', repository:'applied-ai-erp-agent', url:'https://github.com/mrcodeislife718/applied-ai-erp-agent', claim:'Container-oriented deployment and reproducible service execution patterns.', verification:'manual', strength:0.72 },
  { id:'ev_k8s', skill:'Kubernetes', repository:'applied-ai-erp-agent', url:'https://github.com/mrcodeislife718/applied-ai-erp-agent', claim:'Cloud-native orchestration knowledge used in scalable systems work.', verification:'manual', strength:0.68 }
];
