const required = [
  'APP_URL',
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_CAREER',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_CONCIERGE'
];

const optional = ['OPENAI_API_KEY', 'GREENHOUSE_BOARDS', 'LEVER_COMPANIES', 'JOB_JSON_FEEDS'];
const missing = required.filter(key => !process.env[key]?.trim());
const configuredOptional = optional.filter(key => process.env[key]?.trim());
const problems = [];

if (process.env.APP_URL && !/^https:\/\//i.test(process.env.APP_URL)) problems.push('APP_URL must use HTTPS for production');
if (process.env.STRIPE_SECRET_KEY && !/^sk_(test|live)_/.test(process.env.STRIPE_SECRET_KEY)) problems.push('STRIPE_SECRET_KEY does not look like a Stripe secret key');
if (process.env.STRIPE_WEBHOOK_SECRET && !/^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET)) problems.push('STRIPE_WEBHOOK_SECRET does not look like a Stripe webhook signing secret');
for (const key of ['STRIPE_PRICE_CAREER','STRIPE_PRICE_PRO','STRIPE_PRICE_CONCIERGE']) {
  if (process.env[key] && !/^price_/.test(process.env[key])) problems.push(`${key} does not look like a Stripe Price ID`);
}

const result = {
  productionReady: missing.length === 0 && problems.length === 0,
  missing,
  problems,
  configuredOptional,
  note: 'This verifier checks configuration shape. Production launch still requires a successful build/test run, deployment health check, and real Stripe test checkout/webhook round trip.'
};

console.log(JSON.stringify(result, null, 2));
if (!result.productionReady) process.exitCode = 1;
