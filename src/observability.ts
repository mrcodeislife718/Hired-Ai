import { randomUUID } from 'node:crypto';

export interface TraceEvent {
  traceId:string;
  spanId:string;
  parentSpanId?:string;
  name:string;
  at:string;
  durationMs?:number;
  status:'started'|'ok'|'error';
  detail?:Record<string,unknown>;
}

export interface MetricEvent { name:string; value:number; at:string; attributes?:Record<string,string|number|boolean>; }
export interface TelemetryExporter { exportTrace?(event:TraceEvent):void|Promise<void>; exportMetric?(event:MetricEvent):void|Promise<void>; close?():void|Promise<void>; }

const SENSITIVE_KEY=/resume|message|body|password|secret|token|authorization|cookie|email|phone|address|raw|payload/i;
export function sanitizeTelemetry(value:unknown,depth=0):unknown{
  if(depth>3)return '[depth-limited]';
  if(value===null||value===undefined||typeof value==='number'||typeof value==='boolean')return value;
  if(typeof value==='string')return value.length>256?`${value.slice(0,256)}…`:value;
  if(Array.isArray(value))return value.slice(0,20).map(item=>sanitizeTelemetry(item,depth+1));
  if(typeof value==='object'){
    const out:Record<string,unknown>={};
    for(const [key,item] of Object.entries(value as Record<string,unknown>).slice(0,40))out[key]=SENSITIVE_KEY.test(key)?'[redacted]':sanitizeTelemetry(item,depth+1);
    return out;
  }
  return String(value);
}

/**
 * Provider-neutral JSON telemetry sink. A collector/bridge can translate these
 * envelopes into OpenTelemetry, Datadog, Honeycomb, Grafana, or another backend.
 * Export is deliberately best-effort so telemetry failure cannot break hiring flows.
 */
export class HttpTelemetryExporter implements TelemetryExporter {
  private readonly endpoint:URL;
  private readonly timeoutMs:number;
  private readonly bearerToken?:string;
  constructor(endpoint:string,bearerToken=process.env.HIRED_TELEMETRY_TOKEN,timeoutMs=Number(process.env.HIRED_TELEMETRY_TIMEOUT_MS??3000)){
    this.endpoint=new URL(endpoint);this.bearerToken=bearerToken?.trim()||undefined;this.timeoutMs=Math.max(500,Math.min(10_000,timeoutMs));
    if(this.endpoint.protocol!=='https:'&&this.endpoint.hostname!=='localhost'&&this.endpoint.hostname!=='127.0.0.1')throw new Error('telemetry endpoint must use HTTPS outside localhost');
  }
  exportTrace(event:TraceEvent){return this.send('trace',event);}
  exportMetric(event:MetricEvent){return this.send('metric',event);}
  private async send(kind:'trace'|'metric',event:TraceEvent|MetricEvent){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const response=await fetch(this.endpoint,{method:'POST',headers:{'content-type':'application/json',...(this.bearerToken?{authorization:`Bearer ${this.bearerToken}`}:{})},body:JSON.stringify({service:'hired-ai',kind,event:sanitizeTelemetry(event)}),signal:controller.signal});
      if(!response.ok)throw new Error(`telemetry exporter returned ${response.status}`);
    }finally{clearTimeout(timer);}
  }
}

export function telemetryExporterFromEnv():TelemetryExporter|undefined{
  const endpoint=process.env.HIRED_TELEMETRY_ENDPOINT?.trim();
  return endpoint?new HttpTelemetryExporter(endpoint):undefined;
}

export class TraceRecorder {
  readonly events:TraceEvent[]=[];
  readonly metrics:MetricEvent[]=[];
  constructor(private readonly exporter?:TelemetryExporter,private readonly maxEvents=Number(process.env.HIRED_TRACE_BUFFER_MAX??2000)){}
  private retain<T>(target:T[],event:T){target.push(event);if(target.length>this.maxEvents)target.splice(0,target.length-this.maxEvents);}
  private dispatch(value:void|Promise<void>|undefined){if(value&&typeof (value as Promise<void>).catch==='function')void (value as Promise<void>).catch(()=>undefined);}
  private emitTrace(event:TraceEvent){this.retain(this.events,event);this.dispatch(this.exporter?.exportTrace?.(event));}
  private emitMetric(event:MetricEvent){this.retain(this.metrics,event);this.dispatch(this.exporter?.exportMetric?.(event));}
  metric(name:string,value:number,attributes?:MetricEvent['attributes']){const event={name,value,at:new Date().toISOString(),attributes};this.emitMetric(event);return event;}
  start(name:string,traceId=randomUUID(),parentSpanId?:string){
    const spanId=randomUUID(),started=Date.now();
    this.emitTrace({traceId,spanId,parentSpanId,name,at:new Date(started).toISOString(),status:'started'});
    return{
      traceId,spanId,
      end:(detail?:Record<string,unknown>)=>this.emitTrace({traceId,spanId,parentSpanId,name,at:new Date().toISOString(),durationMs:Date.now()-started,status:'ok',detail:sanitizeTelemetry(detail) as Record<string,unknown>|undefined}),
      fail:(error:unknown)=>this.emitTrace({traceId,spanId,parentSpanId,name,at:new Date().toISOString(),durationMs:Date.now()-started,status:'error',detail:{error:sanitizeTelemetry(error instanceof Error?error.message:String(error))}})
    };
  }
  async close(){await this.exporter?.close?.();}
}
