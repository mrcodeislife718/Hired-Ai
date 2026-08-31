import { createHash, randomUUID } from 'node:crypto';

export type AuthorityKind='recruiter'|'hiring-manager'|'functional-leader'|'founder'|'internal-advocate'|'unknown';
export type RelationshipKind='worked-with'|'referred-by'|'knows'|'followed-by'|'mutual-connection'|'prior-contact'|'none';

export interface SourceRef { provider:string; sourceId?:string; url?:string; observedAt:string; expiresAt?:string; }
export interface PersonNode { id:string; name:string; organizationId?:string; title?:string; emails?:string[]; source:SourceRef[]; confidence:number; }
export interface OrganizationNode { id:string; name:string; domains:string[]; source:SourceRef[]; confidence:number; }
export interface HiringAuthorityEdge { id:string; personId:string; organizationId:string; opportunityId?:string; kind:AuthorityKind; observed:boolean; confidence:number; rationale:string; source:SourceRef[]; }
export interface RelationshipEdge { id:string; fromPersonId:string; toPersonId:string; kind:RelationshipKind; strength:number; observed:boolean; source:SourceRef[]; }

const clone=<T>(value:T):T=>structuredClone(value);
const norm=(value:string)=>value.trim().toLowerCase();
const stableId=(prefix:string,parts:string[])=>`${prefix}_${createHash('sha256').update(parts.map(norm).join('|')).digest('hex').slice(0,20)}`;
const active=(source:SourceRef,at=Date.now())=>!source.expiresAt||Date.parse(source.expiresAt)>at;

export class DecisionMakerGraph {
  private people=new Map<string,PersonNode>();
  private organizations=new Map<string,OrganizationNode>();
  private authority=new Map<string,HiringAuthorityEdge>();
  private relationships=new Map<string,RelationshipEdge>();

  upsertOrganization(input:Omit<OrganizationNode,'id'> & {id?:string}){
    const id=input.id??stableId('org',[input.name,...input.domains]);
    const prior=this.organizations.get(id);
    const next:OrganizationNode={id,name:input.name.trim(),domains:[...new Set(input.domains.map(norm).filter(Boolean))],source:[...(prior?.source??[]),...clone(input.source)],confidence:Math.max(prior?.confidence??0,input.confidence)};
    this.organizations.set(id,next);return clone(next);
  }
  upsertPerson(input:Omit<PersonNode,'id'> & {id?:string}){
    const identity=[input.name,input.organizationId??'',input.title??'',...(input.emails??[])];
    const id=input.id??stableId('person',identity);
    const prior=this.people.get(id);
    const next:PersonNode={id,name:input.name.trim(),organizationId:input.organizationId??prior?.organizationId,title:input.title??prior?.title,emails:[...new Set([...(prior?.emails??[]),...(input.emails??[])].map(norm).filter(Boolean))],source:[...(prior?.source??[]),...clone(input.source)],confidence:Math.max(prior?.confidence??0,input.confidence)};
    this.people.set(id,next);return clone(next);
  }
  connectAuthority(input:Omit<HiringAuthorityEdge,'id'> & {id?:string}){
    if(!this.people.has(input.personId)||!this.organizations.has(input.organizationId))throw new Error('authority edge requires known person and organization');
    const id=input.id??`authority_${randomUUID()}`;const next={...clone(input),id};this.authority.set(id,next);return clone(next);
  }
  connectRelationship(input:Omit<RelationshipEdge,'id'> & {id?:string}){
    if(!this.people.has(input.fromPersonId)||!this.people.has(input.toPersonId))throw new Error('relationship requires known people');
    const id=input.id??`relationship_${randomUUID()}`;const next={...clone(input),id};this.relationships.set(id,next);return clone(next);
  }
  decisionMakers(input:{organizationId:string;opportunityId?:string;at?:Date}){
    const at=input.at?.getTime()??Date.now();
    return [...this.authority.values()]
      .filter(edge=>edge.organizationId===input.organizationId&&(!edge.opportunityId||!input.opportunityId||edge.opportunityId===input.opportunityId)&&edge.source.some(source=>active(source,at)))
      .map(edge=>({edge:clone(edge),person:clone(this.people.get(edge.personId)!)}))
      .filter(item=>item.person)
      .sort((a,b)=>this.scoreAuthority(b.edge)-this.scoreAuthority(a.edge));
  }
  relationshipPaths(targetPersonId:string,candidatePersonId:string){
    const direct=[...this.relationships.values()].filter(edge=>edge.toPersonId===targetPersonId&&edge.fromPersonId===candidatePersonId);
    const twoHop:[RelationshipEdge,RelationshipEdge][]=[];
    for(const first of this.relationships.values())if(first.fromPersonId===candidatePersonId)for(const second of this.relationships.values())if(second.fromPersonId===first.toPersonId&&second.toPersonId===targetPersonId)twoHop.push([clone(first),clone(second)]);
    return {direct:direct.map(clone).sort((a,b)=>b.strength-a.strength),twoHop:twoHop.sort((a,b)=>(b[0].strength+b[1].strength)-(a[0].strength+a[1].strength))};
  }
  stale(at=new Date()){
    const time=at.getTime();
    return {people:[...this.people.values()].filter(person=>person.source.length>0&&!person.source.some(source=>active(source,time))).map(clone),authority:[...this.authority.values()].filter(edge=>edge.source.length>0&&!edge.source.some(source=>active(source,time))).map(clone)};
  }
  snapshot(){return{people:[...this.people.values()].map(clone),organizations:[...this.organizations.values()].map(clone),authority:[...this.authority.values()].map(clone),relationships:[...this.relationships.values()].map(clone)};}
  restore(snapshot:ReturnType<DecisionMakerGraph['snapshot']>){this.people.clear();this.organizations.clear();this.authority.clear();this.relationships.clear();for(const item of snapshot.people)this.people.set(item.id,clone(item));for(const item of snapshot.organizations)this.organizations.set(item.id,clone(item));for(const item of snapshot.authority)this.authority.set(item.id,clone(item));for(const item of snapshot.relationships)this.relationships.set(item.id,clone(item));}
  private scoreAuthority(edge:HiringAuthorityEdge){const kind:{[K in AuthorityKind]:number}={"hiring-manager":1,"functional-leader":0.9,founder:0.85,recruiter:0.8,"internal-advocate":0.7,unknown:0.2};return edge.confidence*0.7+kind[edge.kind]*0.3+(edge.observed?0.1:0);}
}
