import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export interface SchemaMigration { id:string; description:string; sql:string; }

const migrations:SchemaMigration[]=[
  {
    id:'0001_accounts_sessions',
    description:'Create account and session tables',
    sql:`
      create table if not exists hired_accounts (
        id text primary key,
        email text not null unique,
        password_salt text not null,
        password_hash text not null,
        profile jsonb not null,
        subscription jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create table if not exists hired_sessions (
        token_hash text primary key,
        account_id text not null references hired_accounts(id) on delete cascade,
        created_at timestamptz not null,
        expires_at timestamptz not null
      );
      create index if not exists hired_sessions_account_id_idx on hired_sessions(account_id);
      create index if not exists hired_sessions_expires_at_idx on hired_sessions(expires_at);
    `
  },
  {
    id:'0002_career_state',
    description:'Create durable career state table',
    sql:`
      create table if not exists hired_state (
        id text primary key,
        payload jsonb not null,
        updated_at timestamptz not null default now()
      );
    `
  },
  {
    id:'0003_employer_state',
    description:'Create durable employer state table',
    sql:`
      create table if not exists hired_employer_state (
        id text primary key,
        payload jsonb not null,
        version bigint not null default 1,
        updated_at timestamptz not null default now()
      );
    `
  },
  {
    id:'0004_outbox',
    description:'Create transactional command outbox',
    sql:`
      create table if not exists hired_outbox (
        id text primary key,
        aggregate_type text not null,
        aggregate_id text not null,
        action text not null,
        idempotency_key text not null unique,
        payload jsonb not null,
        state text not null default 'pending',
        attempts integer not null default 0,
        available_at timestamptz not null default now(),
        lease_owner text,
        lease_until timestamptz,
        last_error text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index if not exists hired_outbox_ready_idx on hired_outbox(state,available_at);
      create index if not exists hired_outbox_aggregate_idx on hired_outbox(aggregate_type,aggregate_id);
    `
  },
  {
    id:'0005_distributed_rate_limits',
    description:'Create cross-instance request budget table',
    sql:`
      create table if not exists hired_rate_limits (
        namespace text not null,
        key text not null,
        window_start bigint not null,
        count integer not null,
        updated_at timestamptz not null default now(),
        primary key(namespace,key,window_start)
      );
      create index if not exists hired_rate_limits_cleanup_idx on hired_rate_limits(window_start);
    `
  }
];

const checksum=(migration:SchemaMigration)=>createHash('sha256').update(`${migration.id}\n${migration.sql}`).digest('hex');

async function ensureLedger(client:PoolClient){
  await client.query(`create table if not exists hired_schema_migrations (
    id text primary key,
    description text not null,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`);
}

export async function applySchemaMigrations(pool:Pool){
  const client=await pool.connect();
  try{
    await client.query('begin');
    await ensureLedger(client);
    const applied=await client.query<{id:string;checksum:string}>('select id,checksum from hired_schema_migrations order by id');
    const byId=new Map(applied.rows.map(row=>[row.id,row.checksum]));
    for(const migration of migrations){
      const expected=checksum(migration),prior=byId.get(migration.id);
      if(prior&&prior!==expected)throw new Error(`schema migration checksum mismatch: ${migration.id}`);
      if(prior)continue;
      await client.query(migration.sql);
      await client.query('insert into hired_schema_migrations(id,description,checksum) values($1,$2,$3)',[migration.id,migration.description,expected]);
    }
    await client.query('commit');
  }catch(error){await client.query('rollback').catch(()=>undefined);throw error;}
  finally{client.release();}
}

export function schemaMigrationManifest(){return migrations.map(migration=>({id:migration.id,description:migration.description,checksum:checksum(migration)}));}
