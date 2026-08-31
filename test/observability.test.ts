import test from 'node:test';
import assert from 'node:assert/strict';
import { TraceRecorder, sanitizeTelemetry, type TelemetryExporter } from '../src/observability.js';

test('telemetry sanitizer redacts sensitive fields and bounds nested data',()=>{
  const sanitized=sanitizeTelemetry({email:'candidate@example.com',token:'secret',safe:'ok',nested:{resumeText:'private',count:2}}) as Record<string,unknown>;
  assert.equal(sanitized.email,'[redacted]');
  assert.equal(sanitized.token,'[redacted]');
  assert.equal(sanitized.safe,'ok');
  assert.deepEqual(sanitized.nested,{resumeText:'[redacted]',count:2});
});

test('trace recorder bounds memory and telemetry exporter failure never breaks product flow',async()=>{
  const exporter:TelemetryExporter={async exportTrace(){throw new Error('collector unavailable');},async exportMetric(){throw new Error('collector unavailable');}};
  const traces=new TraceRecorder(exporter,3);
  for(let i=0;i<4;i++){const span=traces.start(`work-${i}`);span.end({message:'sensitive',index:i});}
  traces.metric('test.metric',1,{ok:true});
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.ok(traces.events.length<=3);
  assert.ok(traces.metrics.length<=3);
  assert.equal(traces.events.at(-1)?.detail?.message,'[redacted]');
});
