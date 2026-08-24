import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
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

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const newAccountId = () => `acct_${randomBytes(12).toString('hex')}`;
const derivePassword = (password: string, salt: string) => scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex');

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

export class AccountStore {
  private accounts = new Map<string, AccountRecord>();
  private byEmail = new Map<string, string>();
  private sessions = new Map<string, SessionRecord>();
  private loaded = false;
  private poolPromise?: Promise<import('pg').Pool>;

  constructor(
    private readonly jsonPath = process.env.HIRED_ACCOUNTS_FILE ?? '.data/hired-accounts.json',
    private readonly connectionString = process.env.DATABASE_URL
  ) {}

  private pool() {
    if (!this.connectionString) throw new Error('DATABASE_URL is not configured');
    return this.poolPromise ??= import('pg').then(({ Pool }) => new Pool({ connectionString: this.connectionString, max: 4 }));
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

  async load() {
    if (this.loaded) return;
    if (this.connectionString) {
      const pool = await this.pool();
      await pool.query('create table if not exists hired_accounts_state (id text primary key, payload jsonb not null, updated_at timestamptz not null default now())');
      const result = await pool.query<{ payload: AccountSnapshot }>('select payload from hired_accounts_state where id=$1', ['primary']);
      if (result.rows[0]?.payload) this.restore(result.rows[0].payload);
    } else {
      try {
        this.restore(JSON.parse(await readFile(this.jsonPath, 'utf8')) as AccountSnapshot);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    this.loaded = true;
  }

  async save() {
    await this.load();
    const snapshot = this.snapshot();
    if (this.connectionString) {
      const pool = await this.pool();
      await pool.query(
        'insert into hired_accounts_state(id,payload,updated_at) values($1,$2,now()) on conflict(id) do update set payload=excluded.payload, updated_at=now()',
        ['primary', snapshot]
      );
      return;
    }
    await mkdir(dirname(this.jsonPath), { recursive: true });
    const tmp = `${this.jsonPath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(snapshot, null, 2), 'utf8');
    await rename(tmp, this.jsonPath);
  }

  async register(email: string, password: string) {
    await this.load();
    const normalized = normalizeEmail(email);
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error('valid email required');
    if (password.length < 12) throw new Error('password must be at least 12 characters');
    if (this.byEmail.has(normalized)) throw new Error('account already exists');
    const id = newAccountId();
    const salt = randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const account: AccountRecord = {
      id,
      email: normalized,
      passwordSalt: salt,
      passwordHash: derivePassword(password, salt),
      createdAt: now,
      updatedAt: now,
      profile: defaultProfile(id, normalized),
      subscription: { plan: 'none', status: 'inactive', updatedAt: now }
    };
    this.accounts.set(id, account);
    this.byEmail.set(normalized, id);
    await this.save();
    return account;
  }

  async login(email: string, password: string) {
    await this.load();
    const id = this.byEmail.get(normalizeEmail(email));
    const account = id ? this.accounts.get(id) : undefined;
    if (!account) throw new Error('invalid credentials');
    const actual = Buffer.from(derivePassword(password, account.passwordSalt), 'hex');
    const expected = Buffer.from(account.passwordHash, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('invalid credentials');
    return this.createSession(account.id);
  }

  async changePassword(accountId: string, currentPassword: string, newPassword: string) {
    await this.load();
    if (newPassword.length < 12) throw new Error('new password must be at least 12 characters');
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('account not found');
    const actual = Buffer.from(derivePassword(currentPassword, account.passwordSalt), 'hex');
    const expected = Buffer.from(account.passwordHash, 'hex');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('invalid credentials');
    const salt = randomBytes(16).toString('hex');
    account.passwordSalt = salt;
    account.passwordHash = derivePassword(newPassword, salt);
    account.updatedAt = new Date().toISOString();
    for (const [tokenHash, session] of this.sessions) if (session.accountId === accountId) this.sessions.delete(tokenHash);
    await this.save();
  }

  async createSession(accountId: string, days = 30) {
    await this.load();
    if (!this.accounts.has(accountId)) throw new Error('account not found');
    const token = randomBytes(32).toString('base64url');
    const created = new Date();
    const expires = new Date(created.getTime() + days * 86_400_000);
    const tokenHash = hashToken(token);
    this.sessions.set(tokenHash, { tokenHash, accountId, createdAt: created.toISOString(), expiresAt: expires.toISOString() });
    await this.save();
    return { token, expiresAt: expires.toISOString() };
  }

  async accountForToken(token: string | undefined) {
    await this.load();
    if (!token) return undefined;
    const tokenHash = hashToken(token);
    const session = this.sessions.get(tokenHash);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      if (session) { this.sessions.delete(tokenHash); await this.save(); }
      return undefined;
    }
    return this.accounts.get(session.accountId);
  }

  async accountById(accountId: string) {
    await this.load();
    return this.accounts.get(accountId);
  }

  async logout(token: string | undefined) {
    await this.load();
    if (token) this.sessions.delete(hashToken(token));
    await this.save();
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
    await this.load();
    const account = this.accounts.get(accountId);
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
    await this.save();
    return account;
  }

  async setSubscription(accountId: string, plan: SubscriptionPlan, status: SubscriptionStatus, customerRef?: string) {
    await this.load();
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('account not found');
    account.subscription = { plan, status, customerRef: customerRef ?? account.subscription.customerRef, updatedAt: new Date().toISOString() };
    account.updatedAt = new Date().toISOString();
    await this.save();
    return account;
  }

  async deleteAccount(accountId: string) {
    await this.load();
    const account = this.accounts.get(accountId);
    if (!account) return false;
    this.accounts.delete(accountId);
    this.byEmail.delete(normalizeEmail(account.email));
    for (const [tokenHash, session] of this.sessions) if (session.accountId === accountId) this.sessions.delete(tokenHash);
    await this.save();
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
