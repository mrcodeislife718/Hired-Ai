import type { RawJob } from './domain.js';

export const demoJobs: RawJob[] = [
  {
    source:'demo-company-careers', sourceId:'nyc-ai-001', url:'https://example.com/jobs/nyc-ai-001', company:'Example Systems', title:'AI Infrastructure Engineer', location:'New York, NY', workMode:'hybrid',
    description:'Build reliable AI agent infrastructure and distributed backend systems with Python, TypeScript, Docker and Kubernetes.',
    requirements:['Python','TypeScript','Docker','Kubernetes','distributed systems','AI agents'], preferred:['React','AWS'], salaryMin:145000, salaryMax:210000, postedAt:new Date().toISOString(), applicantCount:42
  },
  {
    source:'demo-company-careers', sourceId:'sf-only-001', url:'https://example.com/jobs/sf-only-001', company:'West Coast Only', title:'Software Engineer', location:'San Francisco, CA', workMode:'onsite',
    description:'Onsite San Francisco engineering role.', requirements:['C++'], preferred:[], salaryMin:160000, salaryMax:200000, postedAt:new Date().toISOString(), applicantCount:120
  }
];
