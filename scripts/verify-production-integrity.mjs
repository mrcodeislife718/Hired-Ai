import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root=process.cwd();
const src=join(root,'src');
const failures=[];
const forbiddenFiles=new Set(['src/demo-data.ts','src/seed.ts','src/cli.ts']);
const forbiddenImplementationPatterns=[
  [/\bTODO\b/i,'TODO marker'],
  [/\bFIXME\b/i,'FIXME marker'],
  [/\bplaceholder\s*=/i,'placeholder UI attribute'],
  [/\bplaceholder (?:implementation|logic|data|value|response|result|content)\b/i,'placeholder implementation marker'],
  [/\bmock data\b/i,'mock-data marker'],
  [/\bnot implemented\b/i,'not-implemented marker'],
  [/\bcoming soon\b/i,'unfinished-surface marker'],
  [/candidate_charles/i,'hard-coded candidate identity'],
  [/demoJobs/i,'production demo dataset reference']
];

async function files(dir){
  const out=[];
  for(const name of await readdir(dir)){
    const p=join(dir,name); const s=await stat(p);
    if(s.isDirectory()) out.push(...await files(p)); else out.push(p);
  }
  return out;
}

for(const p of await files(src)){
  const rel=relative(root,p).replaceAll('\\','/');
  if(forbiddenFiles.has(rel)) failures.push(`${rel}: production-only source must not contain demo/seed/CLI fixture files`);
  if(!/\.(ts|js|mjs|json|md|html|css)$/.test(p)) continue;
  const text=await readFile(p,'utf8');
  for(const [pattern,label] of forbiddenImplementationPatterns){ if(pattern.test(text)) failures.push(`${rel}: ${label}`); }
}

const ui=await readFile(join(src,'web-ui.ts'),'utf8');
const requiredUiSignals=[
  {label:'Maya chat endpoint',patterns:[/\/api\/maya\/chat/]},
  {label:'conversation composer',patterns:[/Message Maya/i]},
  {label:'new conversation action',patterns:[/New conversation/i]},
  {label:'career transition entry point',patterns:[/Help me change careers/i,/career transition plan/i,/change careers/i]},
  {label:'career advancement entry point',patterns:[/Help me advance/i,/advancement plan/i]},
  {label:'guided onboarding',patterns:[/guided onboarding/i,/Onboard me conversationally/i]},
  {label:'explicit voice input control',patterns:[/toggleListening/,/Talk to Maya/i]},
  {label:'optional spoken replies',patterns:[/toggleVoiceOutput/,/spoken replies/i]},
  {label:'explicit microphone consent copy',patterns:[/only listens after you press the microphone/i]}
];
for(const requirement of requiredUiSignals){
  if(!requirement.patterns.some(pattern=>pattern.test(ui))) failures.push(`src/web-ui.ts: missing conversational capability ${requirement.label}`);
}
for(const forbidden of ['panelGrid','employer-dashboard','career dashboard','dashboard()']){
  if(ui.includes(forbidden)) failures.push(`src/web-ui.ts: non-conversational surface token ${forbidden}`);
}

const service=await readFile(join(src,'maya-service.ts'),'utf8');
for(const required of ['career-advantage.js','maya-universal-engine-adapter.js','maya-workflows.js','career-transition','career-advancement','career-reentry']){
  if(!service.includes(required)) failures.push(`src/maya-service.ts: missing universal career capability ${required}`);
}
const universalAdapter=await readFile(join(src,'maya-universal-engine-adapter.ts'),'utf8');
for(const required of ['analyzeCompetitiveApplication','competitiveSelection','applicantCount','buildCareerDocumentation','careerDocumentation']){
  if(!universalAdapter.includes(required)) failures.push(`src/maya-universal-engine-adapter.ts: missing dynamic role/documentation wiring ${required}`);
}
const careerOs=await readFile(join(src,'career-os.ts'),'utf8');
for(const required of ['competitiveSelectionForResume','CompetitiveApplicationAnalysis','applicantCount']){
  if(!careerOs.includes(required)) failures.push(`src/career-os.ts: missing conversational competitive-selection wiring ${required}`);
}
const documentation=await readFile(join(src,'career-documentation.ts'),'utf8');
for(const required of ['master-resume','target-resume','professional-profile','evidence-index','accomplishment-bank','interview-story-bank','gap-plan','sourceFingerprint','CareerDocumentationStore']){
  if(!documentation.includes(required)) failures.push(`src/career-documentation.ts: missing canonical career documentation capability ${required}`);
}
const voice=await readFile(join(src,'maya-voice.ts'),'utf8');
for(const required of ['documentationDoctrine','master resume','update existing career documents','inventing missing employment history']){
  if(!voice.includes(required)) failures.push(`src/maya-voice.ts: missing onboarding documentation doctrine ${required}`);
}
const twoSided=await readFile(join(src,'two-sided-capabilities.ts'),'utf8');
for(const required of ['candidate-master-docs','employer-role-calibration','employer-basic-pipeline','employer-consented-preview','trustCritical','competitiveDesignControls','ranking-firewall','owned-employer-system']){
  if(!twoSided.includes(required)) failures.push(`src/two-sided-capabilities.ts: missing two-sided capability architecture ${required}`);
}
const employerHiring=await readFile(join(src,'employer-hiring-os.ts'),'utf8');
for(const required of ['calibrateEmployerRole','buildEmployerHiringPlan','consented','must-have','structured capability interview','human decisions','protected traits']){
  if(!employerHiring.includes(required)) failures.push(`src/employer-hiring-os.ts: missing employer Hiring OS capability ${required}`);
}
const employerMaya=await readFile(join(src,'maya-employer-service.ts'),'utf8');
for(const required of ['deterministicEmployerMayaReply','employer-welcome','employer-role-calibration','employer-hiring-plan','employer-interview-plan','owned hiring']){
  if(!employerMaya.includes(required)) failures.push(`src/maya-employer-service.ts: missing conversational employer Maya capability ${required}`);
}

const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
if(pkg.scripts?.demo) failures.push('package.json: demo script must not ship in production');
if(!String(pkg.scripts?.check??'').includes('integrity:check')) failures.push('package.json: check must include production integrity gate');

if(failures.length){
  console.error('Production integrity check failed:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log('Production integrity check passed.');
