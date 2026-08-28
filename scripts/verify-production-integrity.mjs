import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root=process.cwd();
const src=join(root,'src');
const failures=[];
const forbiddenFiles=new Set(['src/demo-data.ts','src/seed.ts','src/cli.ts']);
const forbiddenImplementationPatterns=[
  [/\bTODO\b/i,'TODO marker'],
  [/\bFIXME\b/i,'FIXME marker'],
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
for(const required of ['/api/maya/chat','Message Maya','New conversation','Help me change careers','Help me advance']){
  if(!ui.includes(required)) failures.push(`src/web-ui.ts: missing conversational requirement ${required}`);
}
for(const forbidden of ['panelGrid','employer-dashboard','career dashboard','dashboard()']){
  if(ui.includes(forbidden)) failures.push(`src/web-ui.ts: non-conversational surface token ${forbidden}`);
}
const service=await readFile(join(src,'maya-service.ts'),'utf8');
for(const required of ['career-advantage.js','maya-universal-engine-adapter.js','career-transition','career-advancement','career-reentry']){
  if(!service.includes(required)) failures.push(`src/maya-service.ts: missing universal career capability ${required}`);
}
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
if(pkg.scripts?.demo) failures.push('package.json: demo script must not ship in production');
if(!String(pkg.scripts?.check??'').includes('integrity:check')) failures.push('package.json: check must include production integrity gate');

if(failures.length){
  console.error('Production integrity check failed:\n- '+failures.join('\n- '));
  process.exit(1);
}
console.log('Production integrity check passed.');
