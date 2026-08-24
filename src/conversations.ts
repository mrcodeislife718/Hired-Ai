import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type ConversationRole = 'user' | 'assistant';

export interface ConversationMessage {
  id: string;
  accountId: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface ConversationSnapshot { messages: ConversationMessage[]; }

const messageId = () => `msg_${crypto.randomUUID()}`;

export class ConversationStore {
  private messages: ConversationMessage[] = [];
  private loaded = false;
  private poolPromise?: Promise<import('pg').Pool>;
  private migrated = false;

  constructor(
    private readonly jsonPath = process.env.HIRED_CONVERSATIONS_FILE ?? '.data/hired-conversations.json',
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
      create table if not exists hired_conversation_messages (
        id text primary key,
        account_id text not null references hired_accounts(id) on delete cascade,
        role text not null check(role in ('user','assistant')),
        content text not null,
        metadata jsonb,
        created_at timestamptz not null default now()
      )
    `);
    await pool.query('create index if not exists hired_conversation_account_created_idx on hired_conversation_messages(account_id,created_at desc)');
    this.migrated = true;
  }

  private async loadFile() {
    if (this.loaded) return;
    try {
      const snapshot = JSON.parse(await readFile(this.jsonPath, 'utf8')) as ConversationSnapshot;
      this.messages = snapshot.messages ?? [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    this.loaded = true;
  }

  private async saveFile() {
    await this.loadFile();
    await mkdir(dirname(this.jsonPath), { recursive: true });
    const tmp = `${this.jsonPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify({ messages: this.messages }, null, 2), 'utf8');
    await rename(tmp, this.jsonPath);
  }

  async append(accountId: string, role: ConversationRole, content: string, metadata?: Record<string, unknown>) {
    const message: ConversationMessage = {
      id: messageId(), accountId, role, content: content.slice(0, 50_000), createdAt: new Date().toISOString(), metadata
    };
    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      await pool.query(
        'insert into hired_conversation_messages(id,account_id,role,content,metadata,created_at) values($1,$2,$3,$4,$5,$6)',
        [message.id, accountId, role, message.content, metadata ?? null, message.createdAt]
      );
      return message;
    }
    await this.loadFile();
    this.messages.push(message);
    if (this.messages.length > 50_000) this.messages = this.messages.slice(-40_000);
    await this.saveFile();
    return message;
  }

  async recent(accountId: string, limit = 30) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      const result = await pool.query<{
        id: string; account_id: string; role: ConversationRole; content: string; metadata?: Record<string, unknown>; created_at: Date | string;
      }>('select id,account_id,role,content,metadata,created_at from hired_conversation_messages where account_id=$1 order by created_at desc limit $2', [accountId, safeLimit]);
      return result.rows.reverse().map(row => ({
        id: row.id, accountId: row.account_id, role: row.role, content: row.content,
        metadata: row.metadata, createdAt: new Date(row.created_at).toISOString()
      }));
    }
    await this.loadFile();
    return this.messages.filter(message => message.accountId === accountId).slice(-safeLimit);
  }

  async clear(accountId: string) {
    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      await pool.query('delete from hired_conversation_messages where account_id=$1', [accountId]);
      return;
    }
    await this.loadFile();
    this.messages = this.messages.filter(message => message.accountId !== accountId);
    await this.saveFile();
  }

  async close() { if (this.poolPromise) await (await this.poolPromise).end(); }
}
