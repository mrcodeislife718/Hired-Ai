import type { CandidateProfile, Evidence } from './domain.js';
import { HiredEngine } from './engine.js';
import type { PersistenceAdapter, StoreSnapshot } from './persistence.js';
import { persistenceFromEnv } from './persistence.js';
import { TraceRecorder } from './observability.js';

export class HiredRuntime {
  readonly traces=new TraceRecorder();
  private saveTimer?:NodeJS.Timeout;
  private constructor(readonly engine:HiredEngine,readonly persistence:PersistenceAdapter){}
  static async create(profile:CandidateProfile,seedEvidence:Evidence[]=[],persistence=persistenceFromEnv()){
    const snapshot=await persistence.load();
    const engine=new HiredEngine(profile,snapshot?.evidence.length?snapshot.evidence:seedEvidence,{careerTwin:snapshot?.careerTwin,careerOutcomes:snapshot?.careerOutcomes,savedOpportunities:snapshot?.savedOpportunities,opportunityWatches:snapshot?.opportunityWatches,careerState:snapshot?.careerState,careerPlans:snapshot?.careerPlans,proactiveMaya:snapshot?.proactiveMaya});
    if(snapshot){engine.store.restore(snapshot);engine.governor.restoreDeliveryEvents(snapshot.deliveryEvents??[]);}
    return new HiredRuntime(engine,persistence);
  }
  snapshot():StoreSnapshot{return {...this.engine.store.snapshot(),...this.engine.durableState(),deliveryEvents:this.engine.governor.deliveryEvents()};}
  async checkpoint(){const span=this.traces.start('persistence.checkpoint');try{await this.persistence.save(this.snapshot());span.end({opportunities:this.engine.store.opportunities.size,saved:this.engine.saved.listSaved().length,outcomes:this.engine.outcomes.all().length,deliveries:this.engine.governor.deliveryEvents().length,careerPlans:this.engine.plans.all().length,careerEvents:this.engine.careerState.events.all().length,proactiveSignals:this.engine.proactive.all().length});}catch(error){span.fail(error);throw error;}}
  startAutoCheckpoint(intervalMs=Number(process.env.HIRED_CHECKPOINT_MS??5000)){this.stopAutoCheckpoint();this.saveTimer=setInterval(()=>void this.checkpoint(),intervalMs);this.saveTimer.unref();}
  stopAutoCheckpoint(){if(this.saveTimer)clearInterval(this.saveTimer);this.saveTimer=undefined;}
  async close(){this.stopAutoCheckpoint();await this.checkpoint();await this.persistence.close?.();}
}
