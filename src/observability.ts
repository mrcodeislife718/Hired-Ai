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
export interface TelemetryExporter { exportTrace?(event:TraceEvent):void|Promise<void>; exportMetric?(event:MetricEvent):void|Promise<void>; }

const SENSITIVE_KEY=/resume|message|body|password|secret|token|authorization|cookie|email|phone|address|raw|payload/i;
function sanitize(value:unknown,depth=0):unknown{
  if(depth>3)return '[depth-limited]';
  if(value===null||value===undefined||typeof value==='number'||typeof value==='boolean')return value;
  if(typeof value==='string')return value.length>256?`${value.slice(0,256)}…`:value;
  if(Array.isArray(value))return value.slice(0,20).map(item=>sanitize(item,depth+1));
  if(typeof value==='object'){
    const out:Record<string,unknown>={};
    for(const [key,item] of Object.entries(value as Record<string,unknown>).slice(0,40))out[key]=SENSITIVE_KEY.test(key)?'[redacted]':sanitize(item,depth+1);
    return out;
  }
  return String(value);
}

export class TraceRecorder {
  readonly events:TraceEvent[]=[];
  readonly metrics:MetricEvent[]=[];
  constructor(private readonly exporter?:TelemetryExporter,private readonly maxEvents=Number(process.env.HIRED_TRACE_BUFFER_MAX??2000)){}
  private retain<T>(target:T[],event:T){target.push(event);if(target.length>this.maxEvents)target.splice(0,target.length-this.maxEvents);}
  private emitTrace(event:TraceEvent){this.retain(this.events,event);void this.exporter?.exportTrace?.(event);}
  private emitMetric(event:MetricEvent){this.retain(this.metrics,event);void this.exporter?.exportMetric?.(event);}
  metric(name:string,value:number,attributes?:MetricEvent['attributes']){const event={name,value,at:new Date().toISOString(),attributes};this.emitMetric(event);return event;}
  start(name:string,traceId=randomUUID(),parentSpanId?:string){
    const spanId=randomUUID(),started=Date.now();
    this.emitTrace({traceId,spanId,parentSpanId,name,at:new Date(started).toISOString(),status:'started'});
    return{
      traceId,spanId,
      end:(detail?:Record<string,unknown>)=>this.emitTrace({traceId,spanId,parentSpanId,name,at:new Date().toISOString(),durationMs:Date.now()-started,status:'ok',detail:sanitize(detail) as Record<string,unknown>|undefined}),
      fail:(error:unknown)=>this.emitTrace({traceId,spanId,parentSpanId,name,at:new Date().toISOString(),durationMs:Date.now()-started,status:'error',detail:{error:sanitize(error instanceof Error?error.message:String(error))}})
    };
  }
}
