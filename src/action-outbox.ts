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

export class PostgresActionOutbox {
  private poolPromise?:Promise<import('pg').Pool>;
  private migrated=false;
  constructor(private readonly connectionString=process.env.DATABASE_URL){if(!connectionString)throw new Error('DATABASE_URL is required');}
  private pool(){return this.poolPromise??=import('pg').then(({Pool})=>new Pool({connectionString:this.connectionString,max:Number(process.env.HIRED_DB_POOL_MAX??12)}));}
  private async migrate(){if(this.migrated)return;await applySchemaMigrations(await this.pool());this.migrated=true;}
  async enqueue(input:{aggregateType:string;aggregateId:string;action:string;idempotencyKey:string;payload:Record<string,unknown>;availableAt?:Date}){
    await this.migrate();
    const id=`outbox_${randomUUID()}`,at=input.availableAt??new Date();
    const result=await(await this.pool()).query(`insert into hired_outbox(id,aggregate_type,aggregate_id,action,idempotency_key,payload,state,attempts,available_at,created_at,updated_at) values($1,$2,$3,$4,$5,$6,'pending',0,$7,now(),now()) on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning *`,[id,input.aggregateType,input.aggregateId,input.action,input.idempotencyKey,input.payload,at]);
    return this.fromRow(result.rows[0]);
  }
  async claim(workerId:string,limit=20,leaseMs=30_000,now=new Date()){
    await this.migrate();
    const until=new Date(now.getTime()+leaseMs);
    const result=await(await this.pool()).query(`with picked as (
      select id from hired_outbox
      where state='pending' and available_at <= $1 and (lease_until is null or lease_until <= $1)
      order by created_at
      for update skip locked
      limit $2
    )
    update hired_outbox o set state='leased',lease_owner=$3,lease_until=$4,attempts=o.attempts+1,updated_at=now()
    from picked where o.id=picked.id returning o.*`,[now,limit,workerId,until]);
    return result.rows.map(row=>this.fromRow(row));
  }
  async delivered(id:string,workerId:string){await this.migrate();const result=await(await this.pool()).query(`update hired_outbox set state='delivered',lease_owner=null,lease_until=null,last_error=null,updated_at=now() where id=$1 and lease_owner=$2 returning *`,[id,workerId]);if(!result.rows[0])throw new Error('outbox lease lost');return this.fromRow(result.rows[0]);}
  async retry(id:string,workerId:string,error:string,delayMs:number,maxAttempts=5){
    await this.migrate();
    const current=await(await this.pool()).query<{attempts:number}>('select attempts from hired_outbox where id=$1 and lease_owner=$2',[id,workerId]);
    const attempts=Number(current.rows[0]?.attempts??0);if(!attempts)throw new Error('outbox lease lost');
    const dead=attempts>=maxAttempts,state:OutboxState=dead?'dead-letter':'pending',availableAt=new Date(Date.now()+Math.max(1000,delayMs));
    const result=await(await this.pool()).query(`update hired_outbox set state=$3,available_at=$4,lease_owner=null,lease_until=null,last_error=$5,updated_at=now() where id=$1 and lease_owner=$2 returning *`,[id,workerId,state,availableAt,error.slice(0,2000)]);
    if(!result.rows[0])throw new Error('outbox lease lost');return this.fromRow(result.rows[0]);
  }
  async pending(){await this.migrate();const result=await(await this.pool()).query(`select * from hired_outbox where state in ('pending','leased','dead-letter') order by created_at`);return result.rows.map(row=>this.fromRow(row));}
  private fromRow(row:any):OutboxCommand{return{id:String(row.id),aggregateType:String(row.aggregate_type),aggregateId:String(row.aggregate_id),action:String(row.action),idempotencyKey:String(row.idempotency_key),payload:row.payload??{},state:row.state as OutboxState,attempts:Number(row.attempts??0),availableAt:new Date(row.available_at).toISOString(),leaseOwner:row.lease_owner??undefined,leaseUntil:row.lease_until?new Date(row.lease_until).toISOString():undefined,lastError:row.last_error??undefined,createdAt:new Date(row.created_at).toISOString(),updatedAt:new Date(row.updated_at).toISOString()};}
  async close(){if(this.poolPromise)await(await this.poolPromise).end();}
}
