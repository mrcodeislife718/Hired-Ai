import { createHash, timingSafeEqual } from 'node:crypto';
const digest=(value:string)=>createHash('sha256').update(value).digest();
export function authorizeApiKey(header:string|undefined,configured=process.env.HIRED_API_KEY){if(!configured)return true;if(!header?.startsWith('Bearer '))return false;return timingSafeEqual(digest(header.slice(7)),digest(configured));}
