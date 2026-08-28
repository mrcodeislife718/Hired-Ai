import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type MayaMemoryKind = 'goal' | 'preference' | 'strategy' | 'commitment' | 'milestone' | 'outcome' | 'pattern';
export type MayaMemoryStatus = 'active' | 'resolved' | 'superseded' | 'forgotten';
export type MayaMemorySource = 'explicit-user' | 'verified-system';

export interface MayaLongTermMemory {
  id: string;
  accountId: string;
  kind: MayaMemoryKind;
  text: string;
  normalizedKey: string;
  source: MayaMemorySource;
  sourceMessageId?: string;
  sourceOpportunityId?: string;
  confidence: number;
  salience: number;
  status: MayaMemoryStatus;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

interface MemorySnapshot { memories: MayaLongTermMemory[]; }

export interface LongTermMemoryContext {
  memories: MayaLongTermMemory[];
  policy: {
    sourceBound: true;
    noSensitiveInference: true;
    noInventedMemory: true;
    userCanCorrectOrForget: true;
    conversationalMemoryIsNotCareerEvidence: true;
  };
}

const memoryId = () => `mem_${randomUUID()}`;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
const tokens = (value: string) => new Set(normalize(value).split(' ').filter(token => token.length > 2));

function lexicalOverlap(a: string, b: string) {
  const left = tokens(a); const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared++;
  return shared / Math.max(1, Math.min(left.size, right.size));
}

function daysSince(iso: string) {
  const elapsed = Date.now() - new Date(iso).getTime();
  return Math.max(0, elapsed / 86_400_000);
}

function candidate(kind: MayaMemoryKind, text: string, salience: number) {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 500);
  return clean ? { kind, text: clean, salience } : undefined;
}

export function extractExplicitLongTermMemories(userMessage: string) {
  const text = userMessage.trim();
  const found: Array<{kind:MayaMemoryKind;text:string;salience:number}> = [];
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(value => value.trim()).filter(Boolean);
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    let item;
    if (/\b(my goal is|i want to become|i want to move into|i want to transition|i am trying to|i'm trying to|i want my career|my target is)\b/.test(lower)) item = candidate('goal', sentence, 92);
    else if (/\b(i prefer|from now on|always .* with me|please keep|talk to me|be direct|keep it concise|keep it detailed|do not|don't)\b/.test(lower)) item = candidate('preference', sentence, 90);
    else if (/\b(my strategy is|i plan to|i'm going to|i am going to|we should focus on|i want to focus on)\b/.test(lower)) item = candidate('strategy', sentence, 78);
    else if (/\b(i will|i'll|i need to|i have to|remind me to|next i need to)\b/.test(lower)) item = candidate('commitment', sentence, 72);
    else if (/\b(got the job|got an offer|accepted the offer|started the job|promoted|got promoted|interview scheduled|made it to the final|earned|completed the certification|graduated)\b/.test(lower)) item = candidate('milestone', sentence, 95);
    else if (/\b(rejected|didn't get the job|did not get the job|ghosted|offer withdrawn|laid off|fired)\b/.test(lower)) item = candidate('outcome', sentence, 82);
    if (item) found.push(item);
  }
  return found;
}

function forgetQuery(userMessage: string) {
  const match = userMessage.match(/\b(?:forget|remove from memory|stop remembering)\s+(?:that\s+)?(.+)/i);
  return match?.[1]?.replace(/[.!?]+$/,'').trim();
}

function correctionQuery(userMessage: string) {
  const match = userMessage.match(/\b(?:that's no longer true|that is no longer true|i changed my mind about|i no longer want|not anymore)\s*:?[\s]*(.*)/i);
  return match?.[1]?.trim() || undefined;
}

export class MayaLongTermMemoryStore {
  private memories: MayaLongTermMemory[] = [];
  private loaded = false;
  private poolPromise?: Promise<import('pg').Pool>;
  private migrated = false;

  constructor(
    private readonly jsonPath = process.env.HIRED_MAYA_MEMORY_FILE ?? '.data/hired-maya-memory.json',
    private readonly connectionString = process.env.DATABASE_URL
  ) {}

  private pool() {
    if (!this.connectionString) throw new Error('DATABASE_URL is not configured');
    return this.poolPromise ??= import('pg').then(({ Pool }) => new Pool({ connectionString: this.connectionString, max: Number(process.env.HIRED_DB_POOL_MAX ?? 12) }));
  }

  private async migrate() {
    if (!this.connectionString || this.migrated) return;
    const pool = await this.pool();
    await pool.query(`
      create table if not exists hired_maya_long_term_memory (
        id text primary key,
        account_id text not null references hired_accounts(id) on delete cascade,
        kind text not null,
        text text not null,
        normalized_key text not null,
        source text not null,
        source_message_id text,
        source_opportunity_id text,
        confidence integer not null,
        salience integer not null,
        status text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null,
        last_used_at timestamptz,
        use_count integer not null default 0
      )
    `);
    await pool.query('create index if not exists hired_maya_memory_account_status_idx on hired_maya_long_term_memory(account_id,status,updated_at desc)');
    await pool.query('create unique index if not exists hired_maya_memory_account_key_idx on hired_maya_long_term_memory(account_id,normalized_key)');
    this.migrated = true;
  }

  private async loadFile() {
    if (this.loaded) return;
    try {
      const snapshot = JSON.parse(await readFile(this.jsonPath, 'utf8')) as MemorySnapshot;
      this.memories = snapshot.memories ?? [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    this.loaded = true;
  }

  private async saveFile() {
    await this.loadFile();
    await mkdir(dirname(this.jsonPath), { recursive: true });
    const tmp = `${this.jsonPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ memories: this.memories }, null, 2), 'utf8');
    await rename(tmp, this.jsonPath);
  }

  private rowToMemory(row: Record<string, unknown>): MayaLongTermMemory {
    return {
      id:String(row.id), accountId:String(row.account_id), kind:row.kind as MayaMemoryKind, text:String(row.text), normalizedKey:String(row.normalized_key),
      source:row.source as MayaMemorySource, sourceMessageId:row.source_message_id ? String(row.source_message_id) : undefined,
      sourceOpportunityId:row.source_opportunity_id ? String(row.source_opportunity_id) : undefined,
      confidence:Number(row.confidence), salience:Number(row.salience), status:row.status as MayaMemoryStatus,
      createdAt:new Date(String(row.created_at)).toISOString(), updatedAt:new Date(String(row.updated_at)).toISOString(),
      lastUsedAt:row.last_used_at ? new Date(String(row.last_used_at)).toISOString() : undefined, useCount:Number(row.use_count ?? 0)
    };
  }

  async list(accountId: string, status: MayaMemoryStatus = 'active') {
    if (this.connectionString) {
      await this.migrate(); const pool = await this.pool();
      const result = await pool.query('select * from hired_maya_long_term_memory where account_id=$1 and status=$2 order by salience desc,updated_at desc', [accountId,status]);
      return result.rows.map(row=>this.rowToMemory(row));
    }
    await this.loadFile();
    return this.memories.filter(item=>item.accountId===accountId&&item.status===status).sort((a,b)=>b.salience-a.salience||b.updatedAt.localeCompare(a.updatedAt));
  }

  async upsert(accountId: string, input: {kind:MayaMemoryKind;text:string;source?:MayaMemorySource;sourceMessageId?:string;sourceOpportunityId?:string;salience?:number;confidence?:number}) {
    const now = new Date().toISOString();
    const normalizedKey = `${input.kind}:${normalize(input.text)}`;
    const memory: MayaLongTermMemory = {id:memoryId(),accountId,kind:input.kind,text:input.text.trim().slice(0,500),normalizedKey,source:input.source??'explicit-user',sourceMessageId:input.sourceMessageId,sourceOpportunityId:input.sourceOpportunityId,confidence:clamp(input.confidence??100),salience:clamp(input.salience??75),status:'active',createdAt:now,updatedAt:now,useCount:0};
    if (this.connectionString) {
      await this.migrate(); const pool=await this.pool();
      const result=await pool.query(`insert into hired_maya_long_term_memory(id,account_id,kind,text,normalized_key,source,source_message_id,source_opportunity_id,confidence,salience,status,created_at,updated_at,use_count)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,$11,0)
        on conflict(account_id,normalized_key) do update set text=excluded.text,source=excluded.source,source_message_id=coalesce(excluded.source_message_id,hired_maya_long_term_memory.source_message_id),source_opportunity_id=coalesce(excluded.source_opportunity_id,hired_maya_long_term_memory.source_opportunity_id),confidence=greatest(hired_maya_long_term_memory.confidence,excluded.confidence),salience=greatest(hired_maya_long_term_memory.salience,excluded.salience),status='active',updated_at=excluded.updated_at returning *`,
        [memory.id,accountId,memory.kind,memory.text,normalizedKey,memory.source,memory.sourceMessageId??null,memory.sourceOpportunityId??null,memory.confidence,memory.salience,now]);
      return this.rowToMemory(result.rows[0]);
    }
    await this.loadFile();
    const existing=this.memories.find(item=>item.accountId===accountId&&item.normalizedKey===normalizedKey);
    if(existing){existing.text=memory.text;existing.status='active';existing.updatedAt=now;existing.salience=Math.max(existing.salience,memory.salience);existing.confidence=Math.max(existing.confidence,memory.confidence);existing.sourceMessageId=memory.sourceMessageId??existing.sourceMessageId;existing.sourceOpportunityId=memory.sourceOpportunityId??existing.sourceOpportunityId;await this.saveFile();return existing;}
    this.memories.push(memory); await this.saveFile(); return memory;
  }

  async observeUserMessage(accountId: string, userMessage: string, sourceMessageId?: string, opportunityId?: string) {
    const forgotten = forgetQuery(userMessage) ?? correctionQuery(userMessage);
    if (forgotten) await this.forgetMatching(accountId, forgotten);
    const candidates = extractExplicitLongTermMemories(userMessage);
    const stored: MayaLongTermMemory[] = [];
    for (const item of candidates) stored.push(await this.upsert(accountId,{...item,source:'explicit-user',sourceMessageId,sourceOpportunityId:opportunityId,confidence:100}));
    return stored;
  }

  async rememberVerifiedSystemFact(accountId:string,input:{kind:'milestone'|'outcome'|'pattern'|'strategy';text:string;salience?:number;opportunityId?:string}) {
    return this.upsert(accountId,{...input,source:'verified-system',sourceOpportunityId:input.opportunityId,confidence:100});
  }

  async forgetMatching(accountId: string, query: string) {
    const active = await this.list(accountId,'active');
    const matches=active.filter(item=>lexicalOverlap(item.text,query)>=0.2||normalize(item.text).includes(normalize(query))||normalize(query).includes(normalize(item.text)));
    const now=new Date().toISOString();
    if(this.connectionString&&matches.length){const pool=await this.pool();await pool.query("update hired_maya_long_term_memory set status='forgotten',updated_at=$2 where account_id=$1 and id=any($3::text[])",[accountId,now,matches.map(item=>item.id)]);return matches.length;}
    if(!this.connectionString){await this.loadFile();for(const memory of this.memories)if(matches.some(match=>match.id===memory.id)){memory.status='forgotten';memory.updatedAt=now;}if(matches.length)await this.saveFile();}
    return matches.length;
  }

  async retrieve(accountId: string, query: string, limit = 12): Promise<LongTermMemoryContext> {
    const active = await this.list(accountId,'active');
    const ranked = active.map(memory=>{
      const relevance=lexicalOverlap(memory.text,query);
      const recency=Math.max(0,1-Math.min(daysSince(memory.updatedAt),365)/365);
      const durable=(memory.kind==='goal'||memory.kind==='preference'||memory.kind==='milestone')?0.18:0;
      return {memory,score:relevance*0.5+(memory.salience/100)*0.3+recency*0.2+durable};
    }).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(30,limit)));
    const now=new Date().toISOString();
    const selected=ranked.map(item=>item.memory);
    if(selected.length){
      if(this.connectionString){const pool=await this.pool();await pool.query('update hired_maya_long_term_memory set last_used_at=$2,use_count=use_count+1 where account_id=$1 and id=any($3::text[])',[accountId,now,selected.map(item=>item.id)]);}
      else {await this.loadFile();for(const memory of this.memories)if(selected.some(item=>item.id===memory.id)){memory.lastUsedAt=now;memory.useCount++;}await this.saveFile();}
    }
    return {memories:selected,policy:{sourceBound:true,noSensitiveInference:true,noInventedMemory:true,userCanCorrectOrForget:true,conversationalMemoryIsNotCareerEvidence:true}};
  }

  async close(){if(this.poolPromise)await(await this.poolPromise).end();}
}
