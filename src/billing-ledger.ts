import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { applySchemaMigrations } from './schema-migrations.js';

export class BillingEventLedger {
  private loaded = false;
  private events = new Set<string>();
  private poolPromise?: Promise<import('pg').Pool>;
  private migrated=false;

  constructor(
    private readonly jsonPath = process.env.HIRED_BILLING_LEDGER_FILE ?? '.data/hired-billing-events.json',
    private readonly connectionString = process.env.DATABASE_URL
  ) {}

  private pool() {
    if (!this.connectionString) throw new Error('DATABASE_URL is not configured');
    return this.poolPromise ??= import('pg').then(({ Pool }) => new Pool({ connectionString: this.connectionString, max: 2 }));
  }

  private async migrate() {
    if (!this.connectionString||this.migrated) return;
    await applySchemaMigrations(await this.pool());
    this.migrated=true;
  }

  private async load() {
    if (this.loaded || this.connectionString) { this.loaded = true; return; }
    try {
      const values = JSON.parse(await readFile(this.jsonPath, 'utf8')) as string[];
      this.events = new Set(values);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    this.loaded = true;
  }

  private async saveFile() {
    await mkdir(dirname(this.jsonPath), { recursive: true });
    const tmp = `${this.jsonPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify([...this.events]), 'utf8');
    await rename(tmp, this.jsonPath);
  }

  async claim(eventId: string) {
    if (!eventId) throw new Error('billing event id required');
    if (this.connectionString) {
      await this.migrate();
      const result = await (await this.pool()).query('insert into hired_billing_events(event_id) values($1) on conflict do nothing returning event_id', [eventId]);
      return result.rowCount === 1;
    }
    await this.load();
    if (this.events.has(eventId)) return false;
    this.events.add(eventId);
    await this.saveFile();
    return true;
  }

  async release(eventId: string) {
    if (!eventId) return;
    if (this.connectionString) {
      await this.migrate();
      await (await this.pool()).query('delete from hired_billing_events where event_id=$1', [eventId]);
      return;
    }
    await this.load();
    if (!this.events.delete(eventId)) return;
    await this.saveFile();
  }

  async close() { if (this.poolPromise) await (await this.poolPromise).end(); }
}
