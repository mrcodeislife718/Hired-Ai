import { createHash, randomUUID } from 'node:crypto';

export const id = (prefix: string) => `${prefix}_${randomUUID()}`;
export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
export const ageInDays = (iso: string, now = new Date()) => Math.max(0, (now.getTime() - new Date(iso).getTime()) / 86_400_000);
export const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ');
export const unique = <T>(items: T[]) => [...new Set(items)];
export const stableHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value, Object.keys(value as object).sort())).digest('hex');
