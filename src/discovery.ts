import type { RawJob, WorkMode } from './domain.js';
import { normalize } from './utils.js';

export interface JobSource {
  name: string;
  discover(): Promise<RawJob[]>;
}

const inferMode = (location: string, text: string): WorkMode => {
  const v = normalize(`${location} ${text}`);
  if (v.includes('remote')) return 'remote';
  if (v.includes('hybrid')) return 'hybrid';
  return 'onsite';
};

const extractSkills = (text: string) => {
  const catalog = ['Python','JavaScript','TypeScript','Node.js','React','C++','Java','SQL','PostgreSQL','Docker','Kubernetes','AWS','GCP','distributed systems','AI agents','LLM','MCP','REST APIs'];
  const body = normalize(text);
  return catalog.filter(skill => body.includes(normalize(skill)));
};

export class GreenhouseSource implements JobSource {
  readonly name: string;
  constructor(private readonly boardToken: string) { this.name = `greenhouse:${boardToken}`; }
  async discover(): Promise<RawJob[]> {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(this.boardToken)}/jobs?content=true`;
    const response = await fetch(url, { headers: { 'user-agent': 'Hired-AI/0.1' } });
    if (!response.ok) throw new Error(`${this.name} returned ${response.status}`);
    const data = await response.json() as { jobs?: Array<{ id:number; title:string; absolute_url:string; updated_at:string; location?:{name?:string}; content?:string; metadata?:unknown[] }> };
    return (data.jobs ?? []).map(job => {
      const description = String(job.content ?? '').replace(/<[^>]*>/g, ' ');
      const location = job.location?.name ?? 'Unknown';
      return { source:this.name, sourceId:String(job.id), url:job.absolute_url, company:this.boardToken, title:job.title, location, workMode:inferMode(location, description), description, requirements:extractSkills(description), preferred:[], postedAt:job.updated_at };
    });
  }
}

export class LeverSource implements JobSource {
  readonly name: string;
  constructor(private readonly company: string) { this.name = `lever:${company}`; }
  async discover(): Promise<RawJob[]> {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(this.company)}?mode=json`;
    const response = await fetch(url, { headers: { 'user-agent': 'Hired-AI/0.1' } });
    if (!response.ok) throw new Error(`${this.name} returned ${response.status}`);
    const data = await response.json() as Array<{ id:string; text:string; hostedUrl:string; createdAt:number; categories?:{ location?:string; commitment?:string; team?:string }; descriptionPlain?:string; lists?:Array<{ text?:string; content?:string }> }>;
    return data.map(job => {
      const description = [job.descriptionPlain, ...(job.lists ?? []).map(x => `${x.text ?? ''} ${x.content ?? ''}`)].join(' ');
      const location = job.categories?.location ?? 'Unknown';
      return { source:this.name, sourceId:job.id, url:job.hostedUrl, company:this.company, title:job.text, location, workMode:inferMode(location, description), description, requirements:extractSkills(description), preferred:[], postedAt:new Date(job.createdAt).toISOString() };
    });
  }
}

export class JsonFeedSource implements JobSource {
  readonly name: string;
  constructor(private readonly url: string, name = 'json-feed') { this.name = name; }
  async discover(): Promise<RawJob[]> {
    const response = await fetch(this.url, { headers: { 'user-agent': 'Hired-AI/0.1' } });
    if (!response.ok) throw new Error(`${this.name} returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`${this.name} expected array response`);
    return data as RawJob[];
  }
}

export class DiscoveryOrchestrator {
  constructor(private readonly sources: JobSource[]) {}
  async run() {
    const results: RawJob[] = [];
    const failures: Array<{source:string; error:string}> = [];
    for (const source of this.sources) {
      try { results.push(...await source.discover()); }
      catch (error) { failures.push({ source:source.name, error:error instanceof Error ? error.message : String(error) }); }
    }
    return { jobs:results, failures };
  }
}

export function sourcesFromEnv(env = process.env): JobSource[] {
  const sources: JobSource[] = [];
  for (const token of (env.GREENHOUSE_BOARDS ?? '').split(',').map(x=>x.trim()).filter(Boolean)) sources.push(new GreenhouseSource(token));
  for (const company of (env.LEVER_COMPANIES ?? '').split(',').map(x=>x.trim()).filter(Boolean)) sources.push(new LeverSource(company));
  for (const item of (env.JOB_JSON_FEEDS ?? '').split(',').map(x=>x.trim()).filter(Boolean)) sources.push(new JsonFeedSource(item, `json:${item}`));
  return sources;
}
