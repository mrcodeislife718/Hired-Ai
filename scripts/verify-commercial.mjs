const required = [
  'APP_URL',
  'DATABASE_URL',
  'HIRED_COMMERCIAL_CATALOG_JSON',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_CAREER',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_CONCIERGE'
];

const planIds=['career','pro','concierge'];
const optional = ['OPENAI_API_KEY', 'GREENHOUSE_BOARDS', 'LEVER_COMPANIES', 'JOB_JSON_FEEDS', 'HIRED_TELEMETRY_ENDPOINT'];
const missing = required.filter(key => !process.env[key]?.trim());
const configuredOptional = optional.filter(key => process.env[key]?.trim());
const problems = [];

if (process.env.APP_URL && !/^https:\/\//i.test(process.env.APP_URL)) problems.push('APP_URL must use HTTPS for production');
if (process.env.STRIPE_SECRET_KEY && !/^sk_(test|live)_/.test(process.env.STRIPE_SECRET_KEY)) problems.push('STRIPE_SECRET_KEY does not look like a Stripe secret key');
if (process.env.STRIPE_WEBHOOK_SECRET && !/^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET)) problems.push('STRIPE_WEBHOOK_SECRET does not look like a Stripe webhook signing secret');
for (const key of ['STRIPE_PRICE_CAREER','STRIPE_PRICE_PRO','STRIPE_PRICE_CONCIERGE']) {
  if (process.env[key] && !/^price_/.test(process.env[key])) problems.push(`${key} does not look like a Stripe Price ID`);
}
if (process.env.HIRED_TELEMETRY_ENDPOINT && !/^https:\/\//i.test(process.env.HIRED_TELEMETRY_ENDPOINT) && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(process.env.HIRED_TELEMETRY_ENDPOINT)) problems.push('HIRED_TELEMETRY_ENDPOINT must use HTTPS outside localhost');

let commercialCatalog=null;
if(process.env.HIRED_COMMERCIAL_CATALOG_JSON?.trim()){
  try{
    const parsed=JSON.parse(process.env.HIRED_COMMERCIAL_CATALOG_JSON);
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('must be an object keyed by plan id');
    for(const key of Object.keys(parsed))if(!planIds.includes(key))throw new Error(`unknown plan ${key}`);
    for(const planId of planIds){
      const price=parsed[planId];
      if(!price||typeof price!=='object'||Array.isArray(price))throw new Error(`${planId} requires a price object`);
      if(!Number.isInteger(price.amountMinor)||price.amountMinor<=0)throw new Error(`${planId}.amountMinor must be a positive integer`);
      if(typeof price.currency!=='string'||!/^[a-z]{3}$/i.test(price.currency.trim()))throw new Error(`${planId}.currency must be a three-letter currency code`);
      if(!['month','year'].includes(price.interval))throw new Error(`${planId}.interval must be month or year`);
      if(price.intervalCount!==undefined&&(!Number.isInteger(price.intervalCount)||price.intervalCount<=0))throw new Error(`${planId}.intervalCount must be a positive integer`);
    }
    commercialCatalog=parsed;
  }catch(error){problems.push(`HIRED_COMMERCIAL_CATALOG_JSON is invalid: ${error instanceof Error?error.message:String(error)}`);}
}

let connectors=[];
if(process.env.HIRED_CONNECTORS_JSON?.trim()){
  try{
    const parsed=JSON.parse(process.env.HIRED_CONNECTORS_JSON);
    if(!Array.isArray(parsed))throw new Error('must be an array');
    connectors=parsed;
    for(const [index,entry] of parsed.entries()){
      if(!entry||typeof entry!=='object')throw new Error(`entry ${index} must be an object`);
      if(!String(entry.id??'').trim()||!String(entry.provider??'').trim()||!String(entry.endpoint??'').trim())throw new Error(`entry ${index} requires id, provider and endpoint`);
      if(!/^https:\/\//i.test(String(entry.endpoint))&&!/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(String(entry.endpoint)))throw new Error(`entry ${index} endpoint must use HTTPS outside localhost`);
      if(!Array.isArray(entry.capabilities)||!entry.capabilities.length)throw new Error(`entry ${index} requires capabilities`);
    }
  }catch(error){problems.push(`HIRED_CONNECTORS_JSON is invalid: ${error instanceof Error?error.message:String(error)}`);}
}

const sourceConfigured=Boolean(process.env.GREENHOUSE_BOARDS?.trim()||process.env.LEVER_COMPANIES?.trim()||process.env.JOB_JSON_FEEDS?.trim());
const connectorConfigured=connectors.length>0;
const telemetryConfigured=Boolean(process.env.HIRED_TELEMETRY_ENDPOINT?.trim());
const pricingConfigured=Boolean(commercialCatalog);
const coreConfigured=missing.length===0&&problems.length===0&&pricingConfigured;

const result = {
  configurationValid: coreConfigured,
  productionCoreConfigured: coreConfigured,
  pricingConfigured,
  acquisitionNetworkConfigured: coreConfigured&&sourceConfigured&&connectorConfigured,
  operationsConfigured: coreConfigured&&telemetryConfigured,
  missing,
  problems,
  configuredOptional,
  evidenceGates: {
    pricingConfigured,
    sourceConfigured,
    connectorConfigured,
    telemetryConfigured,
    requiresStripeCatalogParityVerification:true,
    requiresLiveStripeRoundTrip:true,
    requiresDeploymentHealthCheck:true,
    requiresDatabaseRecoveryDrill:true,
    requiresProviderReceiptVerification:true
  },
  note: 'Configuration shape is not production evidence. Launch qualification still requires green CI, deployed health, intentional catalog-to-Stripe price parity, real Stripe test checkout/webhook/cancellation, database backup/restore, telemetry receipt, and a provider-backed governed action with verified receipt.'
};

console.log(JSON.stringify(result, null, 2));
if (!result.configurationValid) process.exitCode = 1;
