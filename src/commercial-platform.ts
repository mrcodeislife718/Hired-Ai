import type { AccountRecord } from './accounts.js';
import { AccountStore } from './accounts.js';
import { DiscoveryOrchestrator, sourcesFromEnv } from './discovery.js';
import { HiredRuntime } from './runtime.js';
import { persistenceFromEnv } from './persistence.js';
import { GitHubPortfolioIndexer } from './portfolio.js';

export class CommercialPlatform {
  readonly accounts = new AccountStore();
  private readonly runtimes = new Map<string, HiredRuntime>();

  async runtimeFor(account: AccountRecord) {
    const cached = this.runtimes.get(account.id);
    if (cached) return cached;
    const runtime = await HiredRuntime.create(account.profile, [], persistenceFromEnv(`account:${account.id}`));
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

  async indexGitHubFor(account: AccountRecord, owner: string, token = process.env.GITHUB_TOKEN) {
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
      careerState: runtime.engine.store.snapshot()
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
