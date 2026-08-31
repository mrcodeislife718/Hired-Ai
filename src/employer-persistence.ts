import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { EmployerPlatformSnapshot } from './employer-platform.js';

export interface EmployerPersistenceAdapter {
  load():Promise<EmployerPlatformSnapshot|undefined>;
  save(snapshot:EmployerPlatformSnapshot):Promise<void>;
  delete?():Promise<void>;
  close?():Promise<void>;
}

export class JsonEmployerPersistence implements EmployerPersistenceAdapter {
  constructor(private readonly path=process.env.HIRED_EMPLOYER_FILE??'.data/hired-employer.json'){}
  async load(){
    try{return JSON.parse(await readFile(this.path,'utf8')) as EmployerPlatformSnapshot;}
    catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw error;}
  }
  async save(snapshot:EmployerPlatformSnapshot){
    await mkdir(dirname(this.path),{recursive:true});
    const tmp=`${this.path}.${process.pid}.tmp`;
    await writeFile(tmp,JSON.stringify(snapshot,null,2),'utf8');
    await rename(tmp,this.path);
  }
  async delete(){await rm(this.path,{force:true});}
}

export class PostgresEmployerPersistence implements EmployerPersistenceAdapter {
  private poolPromise?:Promise<import('pg').Pool>;
  private migrated=false;
  constructor(private readonly connectionString=process.env.DATABASE_URL){if(!connectionString)throw new Error('DATABASE_URL is required');}
  private pool(){return this.poolPromise??=import('pg').then(({Pool})=>new Pool({connectionString:this.connectionString,max:Number(process.env.HIRED_DB_POOL_MAX??12)}));}
  private async migrate(){
    if(this.migrated)return;
    const pool=await this.pool();
    await pool.query(`create table if not exists hired_employer_state (
      id text primary key,
      payload jsonb not null,
      version bigint not null default 1,
      updated_at timestamptz not null default now()
    )`);
    this.migrated=true;
  }
  async load(){
    await this.migrate();
    const result=await(await this.pool()).query<{payload:EmployerPlatformSnapshot}>('select payload from hired_employer_state where id=$1',['primary']);
    return result.rows[0]?.payload;
  }
  async save(snapshot:EmployerPlatformSnapshot){
    await this.migrate();
    await(await this.pool()).query(
      `insert into hired_employer_state(id,payload,version,updated_at) values($1,$2,1,now())
       on conflict(id) do update set payload=excluded.payload,version=hired_employer_state.version+1,updated_at=now()`,
      ['primary',snapshot]
    );
  }
  async delete(){await this.migrate();await(await this.pool()).query('delete from hired_employer_state where id=$1',['primary']);}
  async close(){if(this.poolPromise)await(await this.poolPromise).end();}
}

export const employerPersistenceFromEnv=():EmployerPersistenceAdapter=>
  process.env.DATABASE_URL?new PostgresEmployerPersistence(process.env.DATABASE_URL):new JsonEmployerPersistence();
