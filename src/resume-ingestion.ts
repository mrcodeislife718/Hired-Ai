import { readFile } from 'node:fs/promises';
export interface ResumeProfile { rawText:string; skills:string[]; emails:string[]; urls:string[]; }
const known=['python','javascript','typescript','react','node.js','node','docker','kubernetes','postgresql','sql','mongodb','redis','aws','gcp','java','c++','php','linux','github','rest api'];
export function parseResumeText(rawText:string):ResumeProfile{const lower=rawText.toLowerCase();return{rawText,skills:known.filter(s=>lower.includes(s)),emails:[...rawText.matchAll(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g)].map(m=>m[0]),urls:[...rawText.matchAll(/https?:\/\/[^\s)]+/g)].map(m=>m[0])};}
export async function ingestResumeFile(path:string){return parseResumeText(await readFile(path,'utf8'));}
