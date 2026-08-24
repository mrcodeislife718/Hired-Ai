import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import type { CandidateProfile, WorkMode } from './domain.js';

export type SubscriptionPlan = 'none' | 'career' | 'pro' | 'concierge';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'canceled';

export interface AccountRecord {
  id: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  profile: CandidateProfile;
  subscription: {
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    customerRef?: string;
    updatedAt: string;
  };
}

interface SessionRecord {
  tokenHash: string;
  accountId: string;
  createdAt: string;
  expiresAt: string;
}

interface AccountSnapshot {
  accounts: AccountRecord[];
  sessions: SessionRecord[];
}

interface AccountRow {
  id: string;
  email: string;
  password_salt: string;
  password_hash: string;
  created_at: Date | string;
  updated_at: Date | string;
  profile: CandidateProfile;
  subscription: AccountRecord['subscription'];
}

const scryptAsync = promisify(scrypt);
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const newAccountId = () => `acct_${randomBytes(12).toString('hex')}`;
const iso = (value: Date | string) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();

async function derivePassword(password: string, salt: string) {
  const result = await scryptAsync(password, Buffer.from(salt, 'hex'), 64) as Buffer;
  return result.toString('hex');
}

function defaultProfile(id: string, email: string): CandidateProfile {
  return {
    id,
    name: email.split('@')[0],
    headline: 'Career professional',
    skills: [],
    constraints: {
      targetLocations: ['remote'],
      allowedWorkModes: ['remote', 'hybrid', 'onsite'],
      requiresSponsorship: false,
      preferredTitles: [],
      excludedTerms: []
    }
  };
}

function fromRow(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    email: row.email,
    passwordSalt: row.password_salt,
    passwordHash: row.password_hash,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    profile: row.profile,
    subscription: row.subscription
  };
}

export class AccountStore {
  private accounts = new Map<string, AccountRecord>();
  private byEmail = new Map<string, string>();
  private sessions = new Map<string, SessionRecord>();
  private loaded = false;
  private poolPromise?: Promise<import('pg').Pool>;
  private migrated = false;

  constructor(
    private readonly jsonPath = process.env.HIRED_ACCOUNTS_FILE ?? '.data/hired-accounts.json',
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
      create table if not exists hired_accounts (
        id text primary key,
        email text not null unique,
        password_salt text not null,
        password_hash text not null,
        profile jsonb not null,
        subscription jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);
    await pool.query(`
      create table if not exists hired_sessions (
        token_hash text primary key,
        account_id text not null references hired_accounts(id) on delete cascade,
        created_at timestamptz not null,
        expires_at timestamptz not null
      )
    `);
    await pool.query('create index if not exists hired_sessions_account_id_idx on hired_sessions(account_id)');
    await pool.query('create index if not exists hired_sessions_expires_at_idx on hired_sessions(expires_at)');
    this.migrated = true;
  }

  private restore(snapshot: AccountSnapshot) {
    this.accounts.clear();
    this.byEmail.clear();
    this.sessions.clear();
    for (const account of snapshot.accounts ?? []) {
      this.accounts.set(account.id, account);
      this.byEmail.set(normalizeEmail(account.email), account.id);
    }
    const now = Date.now();
    for (const session of snapshot.sessions ?? []) {
      if (Date.parse(session.expiresAt) > now && this.accounts.has(session.accountId)) this.sessions.set(session.tokenHash, session);
    }
  }

  private snapshot(): AccountSnapshot {
    return { accounts: [...this.accounts.values()], sessions: [...this.sessions.values()] };
  }

  private async loadFile() {
    if (this.loaded) return;
    try {
      this.restore(JSON.parse(await readFile(this.jsonPath, 'utf8')) as AccountSnapshot);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    this.loaded = true;
  }

  private async saveFile() {
    await this.loadFile();
    await mkdir(dirname(this.jsonPath), { recursive: true });
    const tmp = `${this.jsonPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(this.snapshot(), null, 2), 'utf8');
    await rename(tmp, this.jsonPath);
  }

  async load() {
    if (this.connectionString) return this.migrate();
    return this.loadFile();
  }

  async save() {
    if (this.connectionString) return;
    return this.saveFile();
  }

  async register(email: string, password: string) {
    const normalized = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('valid email required');
    if (password.length < 12) throw new Error('password must be at least 12 characters');
    const id = newAccountId();
    const salt = randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const account: AccountRecord = {
      id,
      email: normalized,
      passwordSalt: salt,
      passwordHash: await derivePassword(password, salt),
      createdAt: now,
      updatedAt: now,
      profile: defaultProfile(id, normalized),
      subscription: { plan: 'none', status: 'inactive', updatedAt: now }
    };

    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      try {
        await pool.query(
          'insert into hired_accounts(id,email,password_salt,password_hash,profile,subscription,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$7)',
          [account.id, account.email, account.passwordSalt, account.passwordHash, account.profile, account.subscription, now]
        );
      } catch (error) {
        if ((error as { code?: string }).code === '23505') throw new Error('account already exists');
        throw error;
      }
      return account;
    }

    await this.loadFile();
    if (this.byEmail.has(normalized)) throw new Error('account already exists');
    this.accounts.set(id, account);
    this.byEmail.set(normalized, id);
    await this.saveFile();
    return account;
  }

  async login(email: string, password: string) {
    const normalized = normalizeEmail(email);
    let account: AccountRecord | undefined;
    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      const result = await pool.query<AccountRow>('select * from hired_accounts where email=$1', [normalized]);
      account = result.rows[0] ? fromRow(result.rows[0]) : undefined;
    } else {
      await this.loadFile();
      const id = this.byEmail.get(normalized);
      account = id ? this.accounts.get(id) : undefined;
    }
    if (!account) throw new Error('invalid credentials');
    const actual = Buffer.from(await derivePassword(password, account.passwordSalt), 'hex');
    const expected = Buffer.from(account.passwordHash, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('invalid credentials');
    return this.createSession(account.id);
  }

  async changePassword(accountId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 12) throw new Error('new password must be at least 12 characters');
    const account = await this.accountById(accountId);
    if (!account) throw new Error('account not found');
    const actual = Buffer.from(await derivePassword(currentPassword, account.passwordSalt), 'hex');
    const expected = Buffer.from(account.passwordHash, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('invalid credentials');
    const salt = randomBytes(16).toString('hex');
    const hash = await derivePassword(newPassword, salt);
    const now = new Date().toISOString();

    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      await pool.query('update hired_accounts set password_salt=$2,password_hash=$3,updated_at=$4 where id=$1', [accountId, salt, hash, now]);
      await pool.query('delete from hired_sessions where account_id=$1', [accountId]);
      return;
    }

    await this.loadFile();
    account.passwordSalt = salt;
    account.passwordHash = hash;
    account.updatedAt = now;
    this.accounts.set(accountId, account);
    for (const [tokenHash, session] of this.sessions) if (session.accountId === accountId) this.sessions.delete(tokenHash);
    await this.saveFile();
  }

  async createSession(accountId: string, days = 30) {
    const account = await this.accountById(accountId);
    if (!account) throw new Error('account not found');
    const token = randomBytes(32).toString('base64url');
    const created = new Date();
    const expires = new Date(created.getTime() + days * 86_400_000);
    const tokenHash = hashToken(token);

    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      await pool.query('insert into hired_sessions(token_hash,account_id,created_at,expires_at) values($1,$2,$3,$4)', [tokenHash, accountId, created, expires]);
    } else {
      await this.loadFile();
      this.sessions.set(tokenHash, { tokenHash, accountId, createdAt: created.toISOString(), expiresAt: expires.toISOString() });
      await this.saveFile();
    }
    return { token, expiresAt: expires.toISOString() };
  }

  async accountForToken(token: string | undefined) {
    if (!token) return undefined;
    const tokenHash = hashToken(token);
    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      const result = await pool.query<AccountRow>(`
        select a.* from hired_sessions s
        join hired_accounts a on a.id=s.account_id
        where s.token_hash=$1 and s.expires_at > now()
      `, [tokenHash]);
      return result.rows[0] ? fromRow(result.rows[0]) : undefined;
    }

    await this.loadFile();
    const session = this.sessions.get(tokenHash);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      if (session) { this.sessions.delete(tokenHash); await this.saveFile(); }
      return undefined;
    }
    return this.accounts.get(session.accountId);
  }

  async accountById(accountId: string) {
    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      const result = await pool.query<AccountRow>('select * from hired_accounts where id=$1', [accountId]);
      return result.rows[0] ? fromRow(result.rows[0]) : undefined;
    }
    await this.loadFile();
    return this.accounts.get(accountId);
  }

  async logout(token: string | undefined) {
    if (!token) return;
    const tokenHash = hashToken(token);
    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      await pool.query('delete from hired_sessions where token_hash=$1', [tokenHash]);
      return;
    }
    await this.loadFile();
    this.sessions.delete(tokenHash);
    await this.saveFile();
  }

  async updateProfile(accountId: string, input: Partial<{
    name: string;
    headline: string;
    skills: string[];
    targetLocations: string[];
    allowedWorkModes: WorkMode[];
    minBaseSalary: number;
    preferredTitles: string[];
    requiresSponsorship: boolean;
  }>) {
    const account = await this.accountById(accountId);
    if (!account) throw new Error('account not found');
    const unique = (items: string[]) => [...new Set(items.map(item => String(item).trim()).filter(Boolean))];
    account.profile = {
      ...account.profile,
      name: input.name?.trim() || account.profile.name,
      headline: input.headline?.trim() || account.profile.headline,
      skills: Array.isArray(input.skills) ? unique(input.skills) : account.profile.skills,
      constraints: {
        ...account.profile.constraints,
        targetLocations: Array.isArray(input.targetLocations) && input.targetLocations.length ? unique(input.targetLocations) : account.profile.constraints.targetLocations,
        allowedWorkModes: Array.isArray(input.allowedWorkModes) && input.allowedWorkModes.length ? [...new Set(input.allowedWorkModes)] : account.profile.constraints.allowedWorkModes,
        minBaseSalary: Number.isFinite(input.minBaseSalary) ? Number(input.minBaseSalary) : account.profile.constraints.minBaseSalary,
        preferredTitles: Array.isArray(input.preferredTitles) ? unique(input.preferredTitles) : account.profile.constraints.preferredTitles,
        requiresSponsorship: typeof input.requiresSponsorship === 'boolean' ? input.requiresSponsorship : account.profile.constraints.requiresSponsorship
      }
    };
    account.updatedAt = new Date().toISOString();

    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      await pool.query('update hired_accounts set profile=$2,updated_at=$3 where id=$1', [accountId, account.profile, account.updatedAt]);
    } else {
      await this.loadFile();
      this.accounts.set(accountId, account);
      await this.saveFile();
    }
    return account;
  }

  async setSubscription(accountId: string, plan: SubscriptionPlan, status: SubscriptionStatus, customerRef?: string) {
    const account = await this.accountById(accountId);
    if (!account) throw new Error('account not found');
    account.subscription = {
      plan,
      status,
      customerRef: customerRef ?? account.subscription.customerRef,
      updatedAt: new Date().toISOString()
    };
    account.updatedAt = new Date().toISOString();

    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      await pool.query('update hired_accounts set subscription=$2,updated_at=$3 where id=$1', [accountId, account.subscription, account.updatedAt]);
    } else {
      await this.loadFile();
      this.accounts.set(accountId, account);
      await this.saveFile();
    }
    return account;
  }

  async deleteAccount(accountId: string) {
    if (this.connectionString) {
      await this.migrate();
      const pool = await this.pool();
      const result = await pool.query('delete from hired_accounts where id=$1', [accountId]);
      return result.rowCount === 1;
    }
    await this.loadFile();
    const account = this.accounts.get(accountId);
    if (!account) return false;
    this.accounts.delete(accountId);
    this.byEmail.delete(normalizeEmail(account.email));
    for (const [tokenHash, session] of this.sessions) if (session.accountId === accountId) this.sessions.delete(tokenHash);
    await this.saveFile();
    return true;
  }

  publicAccount(account: AccountRecord) {
    return {
      id: account.id,
      email: account.email,
      profile: account.profile,
      subscription: account.subscription,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    };
  }

  async close() {
    if (this.poolPromise) await (await this.poolPromise).end();
  }
}
