import type { CandidateProfile, Evidence, RawJob } from '../src/domain.js';

export function testCandidate(overrides: Partial<CandidateProfile> = {}): CandidateProfile {
  const base: CandidateProfile = {
    id:'candidate-test',
    name:'Test Candidate',
    headline:'Software Engineer | AI Systems Engineer',
    skills:['Python','JavaScript','TypeScript','Node.js','React','SQL','PostgreSQL','Docker','Kubernetes','Linux','AWS','REST APIs','AI agents','distributed systems'],
    constraints:{
      targetLocations:['New York','NYC'],
      allowedWorkModes:['onsite','hybrid','remote'],
      minBaseSalary:80000,
      requiresSponsorship:false,
      preferredTitles:['software engineer','ai engineer','backend engineer'],
      excludedTerms:['active security clearance required']
    }
  };
  return {
    ...base,
    ...overrides,
    constraints:{...base.constraints,...(overrides.constraints??{})}
  };
}

export function testEvidence(): Evidence[] {
  return [
    {id:'ev-agent',skill:'AI agents',repository:'verified-agent-system',url:'https://test.invalid/verified-agent-system',claim:'Built an agent workflow with scoped tools, approval-gated writes, audit trails, and post-action verification.',verification:'repository',strength:0.95},
    {id:'ev-dist',skill:'distributed systems',repository:'persistent-runtime',url:'https://test.invalid/persistent-runtime',claim:'Built persistent execution infrastructure with protocol-driven ingestion and traceability.',verification:'repository',strength:0.9},
    {id:'ev-ts',skill:'TypeScript',repository:'typed-service',url:'https://test.invalid/typed-service',claim:'Implemented a TypeScript service with deterministic validation and CI.',verification:'ci',strength:0.9},
    {id:'ev-node',skill:'Node.js',repository:'service-runtime',url:'https://test.invalid/service-runtime',claim:'Implemented Node.js backend services and build workflows.',verification:'repository',strength:0.84},
    {id:'ev-python',skill:'Python',repository:'verified-agent-system',url:'https://test.invalid/verified-agent-system',claim:'Demonstrates Python backend and AI workflow engineering.',verification:'manual',strength:0.72},
    {id:'ev-docker',skill:'Docker',repository:'verified-agent-system',url:'https://test.invalid/verified-agent-system',claim:'Container-oriented deployment and reproducible service execution.',verification:'manual',strength:0.72},
    {id:'ev-k8s',skill:'Kubernetes',repository:'verified-agent-system',url:'https://test.invalid/verified-agent-system',claim:'Demonstrates cloud-native orchestration knowledge.',verification:'manual',strength:0.68}
  ];
}

export function testJobs(now = new Date().toISOString()): RawJob[] {
  return [
    {
      source:'test-careers-feed',sourceId:'nyc-ai-001',url:'https://test.invalid/jobs/nyc-ai-001',company:'Test Systems',title:'AI Infrastructure Engineer',location:'New York, NY',workMode:'hybrid',
      description:'Build reliable AI agent infrastructure and distributed backend systems with Python, TypeScript, Docker and Kubernetes.',
      requirements:['Python','TypeScript','Docker','Kubernetes','distributed systems','AI agents'],preferred:['React','AWS'],salaryMin:145000,salaryMax:210000,postedAt:now,applicantCount:42
    },
    {
      source:'test-careers-feed',sourceId:'sf-only-001',url:'https://test.invalid/jobs/sf-only-001',company:'Test West',title:'Software Engineer',location:'San Francisco, CA',workMode:'onsite',
      description:'Onsite engineering role.',requirements:['C++'],preferred:[],salaryMin:160000,salaryMax:200000,postedAt:now,applicantCount:120
    }
  ];
}
