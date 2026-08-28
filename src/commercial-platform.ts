import type { AccountRecord } from './accounts.js';
import { AccountStore } from './accounts.js';
import { DiscoveryOrchestrator, sourcesFromEnv } from './discovery.js';
import { HttpJsonConnector, type ConnectorCapability, type HttpJsonConnectorOptions } from './connector-fabric.js';
import { HiredRuntime } from './runtime.js';
import { persistenceFromEnv } from './persistence.js';
import { GitHubPortfolioIndexer } from './portfolio.js';

const CONNECTOR_CAPABILITIES = new Set<ConnectorCapability>(['submit-application','send-outreach','send-email','create-calendar-event','read-opportunities','read-employer-intelligence','read-compensation','verify-credential']);

function connectorsFromEnv():HttpJsonConnector[] {
  const raw=process.env.HIRED_CONNECTORS_JSON?.trim();if(!raw)return[];
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw new Error('HIRED_CONNECTORS_JSON must be valid JSON');}
  if(!Array.isArray(parsed))throw new Error('HIRED_CONNECTORS_JSON must be an array');
  return parsed.map((entry,index)=>{
    if(!entry||typeof entry!=='object')throw new Error(`connector configuration ${index} must be an object`);
    const value=entry as Record<string,unknown>;const capabilities=Array.isArray(value.capabilities)?value.capabilities.map(String):[];
    if(!capabilities.length||capabilities.some(capability=>!CONNECTOR_CAPABILITIES.has(capability as ConnectorCapability)))throw new Error(`connector configuration ${index} contains unsupported capabilities`);
    const options:HttpJsonConnectorOptions={id:String(value.id??''),provider:String(value.provider??''),endpoint:String(value.endpoint??''),capabilities:capabilities as ConnectorCapability[],bearerToken:typeof value.bearerToken==='string'?value.bearerToken:undefined,timeoutMs:typeof value.timeoutMs==='number'?value.timeoutMs:undefined};
    if(!options.id.trim()||!options.provider.trim()||!options.endpoint.trim())throw new Error(`connector configuration ${index} requires id, provider and endpoint`);
    return new HttpJsonConnector(options);
  });
}

export class CommercialPlatform {
  readonly accounts = new AccountStore();
  private readonly runtimes = new Map<string, HiredRuntime>();

  async runtimeFor(account: AccountRecord) {
    const cached = this.runtimes.get(account.id);
    if (cached) return cached;
    const runtime = await HiredRuntime.create(account.profile, [], persistenceFromEnv(`account:${account.id}`));
    for(const connector of connectorsFromEnv())runtime.registerConnector(connector);
    runtime.startAutoCheckpoint();
    this.runtimes.set(account.id, runtime);
    return runtime;
  }

  async refreshRuntime(account: AccountRecord) {
    const current = this.runtimes.get(account.id);
    if (current) await current.close();
    this.runtimes.delete(account.id);
    return this.runtimeFor(account);
  }

  async discoverFor(account: AccountRecord) {
    const runtime = await this.runtimeFor(account);
    const discovery = await new DiscoveryOrchestrator(sourcesFromEnv()).run();
    let ingested = 0;
    let duplicates = 0;
    let rejected = 0;
    for (const job of discovery.jobs) {
      try {
        const opportunity = runtime.engine.ingest(job);
        ingested += 1;
        if (opportunity.hardRejected) rejected += 1;
      } catch (error) {
        if (error instanceof Error && /duplicate/i.test(error.message)) duplicates += 1;
        else throw error;
      }
    }
    await runtime.checkpoint();
    return { discovered: discovery.jobs.length, ingested, duplicates, rejected, failures: discovery.failures };
  }

  async indexGitHubFor(account: AccountRecord, owner: string, token?: string) {
    const runtime = await this.runtimeFor(account);
    const indexer = new GitHubPortfolioIndexer(owner, token);
    const indexed = await indexer.index();
    for (const item of indexed) runtime.engine.store.saveEvidence(item);
    await runtime.checkpoint();
    return { owner, evidenceAdded: indexed.length, evidence: indexed };
  }

  async exportAccount(account: AccountRecord) {
    const runtime = await this.runtimeFor(account);
    return {
      exportedAt: new Date().toISOString(),
      account: this.accounts.publicAccount(account),
      careerState: runtime.engine.store.snapshot(),
      connectorOperations: runtime.connectors.all()
    };
  }

  async purgeAccount(account: AccountRecord) {
    const runtime = this.runtimes.get(account.id) ?? await this.runtimeFor(account);
    runtime.stopAutoCheckpoint();
    await runtime.persistence.delete?.();
    await runtime.persistence.close?.();
    this.runtimes.delete(account.id);
    await this.accounts.deleteAccount(account.id);
  }

  async close() {
    for (const runtime of this.runtimes.values()) await runtime.close();
    this.runtimes.clear();
    await this.accounts.close();
  }
}
