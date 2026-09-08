import { createHash } from 'node:crypto';

export interface ApplicationLineageSnapshot {
  id: string;
  candidateId: string;
  opportunityId: string;
  careerTwinVersion: number;
  careerDocumentationVersion: number;
  documentIds: string[];
  evidenceIds: string[];
  packageDigest: string;
  approvalId?: string;
  submittedAt?: string;
  outcomeIds: string[];
  createdAt: string;
}

export interface ApplicationLineageState {
  candidateId: string;
  applications: ApplicationLineageSnapshot[];
}

const clone=<T>(value:T):T=>structuredClone(value);
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class ApplicationLineageStore {
  private readonly applications=new Map<string,ApplicationLineageSnapshot>();
  constructor(readonly candidateId:string,state?:ApplicationLineageState){
    if(state&&state.candidateId!==candidateId)throw new Error('application lineage candidate mismatch');
    for(const item of state?.applications??[]){
      if(item.candidateId!==candidateId)throw new Error('application lineage restored candidate mismatch');
      this.applications.set(item.id,clone(item));
    }
  }

  freeze(input:{opportunityId:string;careerTwinVersion:number;careerDocumentationVersion:number;documentIds:string[];evidenceIds:string[];applicationPackage:unknown;approvalId?:string;createdAt?:string}){
    const createdAt=input.createdAt??new Date().toISOString();
    const canonical={candidateId:this.candidateId,opportunityId:input.opportunityId,careerTwinVersion:input.careerTwinVersion,careerDocumentationVersion:input.careerDocumentationVersion,documentIds:[...new Set(input.documentIds)].sort(),evidenceIds:[...new Set(input.evidenceIds)].sort(),packageDigest:digest(input.applicationPackage),approvalId:input.approvalId,createdAt};
    const id=`application_${digest(canonical).slice(0,24)}`;
    const existing=this.applications.get(id);
    if(existing)return clone(existing);
    const snapshot:ApplicationLineageSnapshot={id,...canonical,outcomeIds:[]};
    this.applications.set(id,snapshot);
    return clone(snapshot);
  }

  markSubmitted(id:string,submittedAt=new Date().toISOString()){
    const item=this.required(id);
    const next={...item,submittedAt};this.applications.set(id,next);return clone(next);
  }

  linkOutcome(id:string,outcomeId:string){
    if(!outcomeId)throw new Error('outcome id required');
    const item=this.required(id);const next={...item,outcomeIds:[...new Set([...item.outcomeIds,outcomeId])]};this.applications.set(id,next);return clone(next);
  }

  forOpportunity(opportunityId:string){return clone([...this.applications.values()].filter(item=>item.opportunityId===opportunityId).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)));}
  all(){return clone([...this.applications.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)));}
  state():ApplicationLineageState{return {candidateId:this.candidateId,applications:this.all()};}
  private required(id:string){const item=this.applications.get(id);if(!item)throw new Error('application lineage snapshot not found');return item;}
}
