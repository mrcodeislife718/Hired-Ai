import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ApprovalRequest, AuditEvent, Evidence, FeedbackEvent, Opportunity } from './domain.js';
import type { CareerTwinSnapshot } from './career-twin.js';
import type { CareerOutcomeEvent } from './career-outcomes.js';
import type { CareerStateCoordinatorSnapshot } from './career-state-coordinator.js';
import type { CareerPlanSnapshot } from './goal-plan-execution.js';
import type { ProactiveMayaSnapshot } from './proactive-maya.js';
import type { DeliveryEvent } from './delivery-ledger.js';
import type { OpportunityWatchRule, SavedOpportunity } from './saved-opportunities.js';

export interface StoreSnapshot {
  opportunities: Opportunity[];
  evidence: Evidence[];
  approvals: ApprovalRequest[];
  audit: AuditEvent[];
  feedback: FeedbackEvent[];
  careerTwin?: CareerTwinSnapshot;
  careerOutcomes?: CareerOutcomeEvent[];
  savedOpportunities?: SavedOpportunity[];
  opportunityWatches?: OpportunityWatchRule[];
  deliveryEvents?: DeliveryEvent[];
  careerState?: CareerStateCoordinatorSnapshot;
  careerPlans?: CareerPlanSnapshot;
  proactiveMaya?: ProactiveMayaSnapshot;
}

export interface PersistenceAdapter { load():Promise<StoreSnapshot|undefined>; save(snapshot:StoreSnapshot):Promise<void>; delete?():Promise<void>; close?():Promise<void>; }
const safeKey=(value:string)=>value.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,128)||'primary';
export class JsonFilePersistence implements PersistenceAdapter {
  private readonly path:string;
  constructor(path=process.env.HIRED_STATE_FILE,stateId='primary'){const id=safeKey(stateId);this.path=path??`.data/hired-state-${id}.json`;}
  async load(){try{return JSON.parse(await readFile(this.path,'utf8')) as StoreSnapshot;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error;}}
  async save(snapshot:StoreSnapshot){await mkdir(dirname(this.path),{recursive:true});const tmp=`${this.path}.${process.pid}.tmp`;await writeFile(tmp,JSON.stringify(snapshot,null,2),'utf8');await rename(tmp,this.path);}
  async delete(){await rm(this.path,{force:true});}
}
export class PostgresPersistence implements PersistenceAdapter {
  private poolPromise?:Promise<import('pg').Pool>;
  constructor(private readonly connectionString=process.env.DATABASE_URL,private readonly stateId='primary'){if(!connectionString)throw new Error('DATABASE_URL is required');}
  private pool(){return this.poolPromise??=import('pg').then(({Pool})=>new Pool({connectionString:this.connectionString,max:4}));}
  async migrate(){const pool=await this.pool();await pool.query('create table if not exists hired_state (id text primary key, payload jsonb not null, updated_at timestamptz not null default now())');}
  async load(){await this.migrate();const pool=await this.pool();const result=await pool.query<{payload:StoreSnapshot}>('select payload from hired_state where id=$1',[this.stateId]);return result.rows[0]?.payload;}
  async save(snapshot:StoreSnapshot){await this.migrate();const pool=await this.pool();await pool.query('insert into hired_state(id,payload,updated_at) values($1,$2,now()) on conflict(id) do update set payload=excluded.payload, updated_at=now()',[this.stateId,snapshot]);}
  async delete(){await this.migrate();const pool=await this.pool();await pool.query('delete from hired_state where id=$1',[this.stateId]);}
  async close(){if(this.poolPromise)await(await this.poolPromise).end();}
}
export const persistenceFromEnv=(stateId='primary'):PersistenceAdapter=>process.env.DATABASE_URL?new PostgresPersistence(process.env.DATABASE_URL,stateId):new JsonFilePersistence(undefined,stateId);
