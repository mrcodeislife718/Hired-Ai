import { randomUUID } from 'node:crypto';
import { applySchemaMigrations } from './schema-migrations.js';

export type OutboxState='pending'|'leased'|'delivered'|'dead-letter';
export interface OutboxCommand {
  id:string;
  aggregateType:string;
  aggregateId:string;
  action:string;
  idempotencyKey:string;
  payload:Record<string,unknown>;
  state:OutboxState;
  attempts:number;
  availableAt:string;
  leaseOwner?:string;
  leaseUntil?:string;
  lastError?:string;
  createdAt:string;
  updatedAt:string;
}

export interface ActionOutbox {
  enqueue(input:{aggregateType:string;aggregateId:string;action:string;idempotencyKey:string;payload:Record<string,unknown>;availableAt?:Date}):Promise<OutboxCommand>;
  claimById(id:string,workerId:string,leaseMs?:number,now?:Date):Promise<OutboxCommand>;
  byIdempotencyKey(key:string):Promise<OutboxCommand|undefined>;
  delivered(id:string,workerId:string,now?:Date):Promise<OutboxCommand>;
  retry(id:string,workerId:string,error:string,delayMs:number,maxAttempts?:number,now?:Date):Promise<OutboxCommand>;
  pending():Promise<OutboxCommand[]>;
  close?():Promise<void>;
}

const clone=<T>(value:T):T=>structuredClone(value);

export class MemoryActionOutbox implements ActionOutbox {
  private readonly commands=new Map<string,OutboxCommand>();
  private readonly byKey=new Map<string,string>();

  async enqueue(input:{aggregateType:string;aggregateId:string;action:string;idempotencyKey:string;payload:Record<string,unknown>;availableAt?:Date}){
    const existingId=this.byKey.get(input.idempotencyKey);if(existingId)return clone(this.commands.get(existingId)!);
    const at=input.availableAt??new Date(),command:OutboxCommand={id:`outbox_${randomUUID()}`,aggregateType:input.aggregateType,aggregateId:input.aggregateId,action:input.action,idempotencyKey:input.idempotencyKey,payload:clone(input.payload),state:'pending',attempts:0,availableAt:at.toISOString(),createdAt:at.toISOString(),updatedAt:at.toISOString()};
    this.commands.set(command.id,command);this.byKey.set(command.idempotencyKey,command.id);return clone(command);
  }

  async claimById(id:string,workerId:string,leaseMs=30_000,now=new Date()){
    const command=this.commands.get(id);if(!command)throw new Error('outbox command not found');
    if(command.state==='delivered')return clone(command);
    if(command.state==='dead-letter')throw new Error('outbox command is dead-lettered');
    if(Date.parse(command.availableAt)>now.getTime())throw new Error('outbox command is not due');
    if(command.state==='leased'&&command.leaseUntil&&Date.parse(command.leaseUntil)>now.getTime()&&command.leaseOwner!==workerId)throw new Error('outbox command is already leased');
    const next={...command,state:'leased' as const,attempts:command.attempts+1,leaseOwner:workerId,leaseUntil:new Date(now.getTime()+leaseMs).toISOString(),updatedAt:now.toISOString()};
    this.commands.set(id,next);return clone(next);
  }

  async byIdempotencyKey(key:string){const id=this.byKey.get(key);return id?clone(this.commands.get(id)!):undefined;}
  async delivered(id:string,workerId:string,now=new Date()){const command=this.commands.get(id);if(!command||command.leaseOwner!==workerId)throw new Error('outbox lease lost');const next={...command,state:'delivered' as const,leaseOwner:undefined,leaseUntil:undefined,lastError:undefined,updatedAt:now.toISOString()};this.commands.set(id,next);return clone(next);}
  async retry(id:string,workerId:string,error:string,delayMs:number,maxAttempts=5,now=new Date()){const command=this.commands.get(id);if(!command||command.leaseOwner!==workerId)throw new Error('outbox lease lost');const dead=command.attempts>=maxAttempts;const next={...command,state:(dead?'dead-letter':'pending') as OutboxState,availableAt:new Date(now.getTime()+Math.max(1000,delayMs)).toISOString(),leaseOwner:undefined,leaseUntil:undefined,lastError:error.slice(0,2000),updatedAt:now.toISOString()};this.commands.set(id,next);return clone(next);}
  async pending(){return [...this.commands.values()].filter(command=>command.state!=='delivered').map(clone);}
}

export class PostgresActionOutbox implements ActionOutbox {
  private poolPromise?:Promise<import('pg').Pool>;
  private migrated=false;
  constructor(private readonly connectionString=process.env.DATABASE_URL){if(!connectionString)throw new Error('DATABASE_URL is required');}
  private pool(){return this.poolPromise??=import('pg').then(({Pool})=>new Pool({connectionString:this.connectionString,max:Number(process.env.HIRED_DB_POOL_MAX??12)}));}
  private async migrate(){if(this.migrated)return;await applySchemaMigrations(await this.pool());this.migrated=true;}
  async enqueue(input:{aggregateType:string;aggregateId:string;action:string;idempotencyKey:string;payload:Record<string,unknown>;availableAt?:Date}){
    await this.migrate();
    const id=`outbox_${randomUUID()}`,at=input.availableAt??new Date();
    const result=await(await this.pool()).query(`insert into hired_outbox(id,aggregate_type,aggregate_id,action,idempotency_key,payload,state,attempts,available_at,created_at,updated_at) values($1,$2,$3,$4,$5,$6,'pending',0,$7,$7,$7) on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning *`,[id,input.aggregateType,input.aggregateId,input.action,input.idempotencyKey,input.payload,at]);
    return this.fromRow(result.rows[0]);
  }
  async claimById(id:string,workerId:string,leaseMs=30_000,now=new Date()){
    await this.migrate();const until=new Date(now.getTime()+leaseMs);
    const result=await(await this.pool()).query(`update hired_outbox set state='leased',lease_owner=$2,lease_until=$3,attempts=attempts+1,updated_at=$4 where id=$1 and state in ('pending','leased') and available_at <= $4 and (lease_until is null or lease_until <= $4 or lease_owner=$2) returning *`,[id,workerId,until,now]);
    if(result.rows[0])return this.fromRow(result.rows[0]);
    const current=await(await this.pool()).query('select * from hired_outbox where id=$1',[id]);
    if(!current.rows[0])throw new Error('outbox command not found');
    const command=this.fromRow(current.rows[0]);if(command.state==='delivered')return command;if(command.state==='dead-letter')throw new Error('outbox command is dead-lettered');throw new Error('outbox command is not claimable');
  }
  async byIdempotencyKey(key:string){await this.migrate();const result=await(await this.pool()).query('select * from hired_outbox where idempotency_key=$1',[key]);return result.rows[0]?this.fromRow(result.rows[0]):undefined;}
  async delivered(id:string,workerId:string,now=new Date()){await this.migrate();const result=await(await this.pool()).query(`update hired_outbox set state='delivered',lease_owner=null,lease_until=null,last_error=null,updated_at=$3 where id=$1 and lease_owner=$2 returning *`,[id,workerId,now]);if(!result.rows[0])throw new Error('outbox lease lost');return this.fromRow(result.rows[0]);}
  async retry(id:string,workerId:string,error:string,delayMs:number,maxAttempts=5,now=new Date()){
    await this.migrate();const current=await(await this.pool()).query<{attempts:number}>('select attempts from hired_outbox where id=$1 and lease_owner=$2',[id,workerId]);const attempts=Number(current.rows[0]?.attempts??0);if(!attempts)throw new Error('outbox lease lost');
    const dead=attempts>=maxAttempts,state:OutboxState=dead?'dead-letter':'pending',availableAt=new Date(now.getTime()+Math.max(1000,delayMs));
    const result=await(await this.pool()).query(`update hired_outbox set state=$3,available_at=$4,lease_owner=null,lease_until=null,last_error=$5,updated_at=$6 where id=$1 and lease_owner=$2 returning *`,[id,workerId,state,availableAt,error.slice(0,2000),now]);if(!result.rows[0])throw new Error('outbox lease lost');return this.fromRow(result.rows[0]);
  }
  async pending(){await this.migrate();const result=await(await this.pool()).query(`select * from hired_outbox where state in ('pending','leased','dead-letter') order by created_at`);return result.rows.map(row=>this.fromRow(row));}
  private fromRow(row:any):OutboxCommand{return{id:String(row.id),aggregateType:String(row.aggregate_type),aggregateId:String(row.aggregate_id),action:String(row.action),idempotencyKey:String(row.idempotency_key),payload:row.payload??{},state:row.state as OutboxState,attempts:Number(row.attempts??0),availableAt:new Date(row.available_at).toISOString(),leaseOwner:row.lease_owner??undefined,leaseUntil:row.lease_until?new Date(row.lease_until).toISOString():undefined,lastError:row.last_error??undefined,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()};}
  async close(){if(this.poolPromise)await(await this.poolPromise).end();}
}

export const actionOutboxFromEnv=():ActionOutbox=>process.env.DATABASE_URL?new PostgresActionOutbox(process.env.DATABASE_URL):new MemoryActionOutbox();
