import { createHash, timingSafeEqual } from 'node:crypto';

const digest=(value:string)=>createHash('sha256').update(value).digest();

/**
 * Legacy service-to-service API-key authorization.
 *
 * Security invariant: production never fails open when the key is absent.
 * Local/test environments may omit the key because the customer-facing
 * server uses account/session authentication instead of this helper.
 */
export function authorizeApiKey(
  header:string|undefined,
  configured=process.env.HIRED_API_KEY,
  environment=process.env.NODE_ENV
){
  if(!configured)return environment!=='production';
  if(!header?.startsWith('Bearer '))return false;
  const supplied=header.slice(7).trim();
  if(!supplied)return false;
  const actual=digest(supplied),expected=digest(configured);
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
