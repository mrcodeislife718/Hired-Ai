import type { DecisionMakerGraph } from './decision-maker-graph.js';

export type AcquisitionRoute='warm-introduction'|'direct-hiring-manager'|'recruiter-outreach'|'internal-referral'|'strategic-application'|'develop-first'|'skip';
export interface FunnelEvidence { applications:number; recruiterResponses:number; interviews:number; offers:number; automatedRejections:number; }
export interface RouteCandidate { route:AcquisitionRoute; score:number; reasons:string[]; blockers:string[]; requiresApproval:boolean; }

const clamp=(value:number)=>Math.max(0,Math.min(1,value));

export class AcquisitionRoutePlanner {
  constructor(private readonly graph?:DecisionMakerGraph){}
  plan(input:{organizationId?:string;opportunityId?:string;candidatePersonId?:string;fitConfidence:number;evidenceStrength:number;funnel:FunnelEvidence;applicationRequired?:boolean;hardGateMissing?:boolean}){
    const candidates:RouteCandidate[]=[];
    if(input.hardGateMissing){
      candidates.push({route:'develop-first',score:0.95,reasons:['A genuine hard gate is missing; positioning cannot substitute for it.'],blockers:[],requiresApproval:false});
      return this.result(candidates,input.funnel);
    }
    if(input.fitConfidence<0.35){
      candidates.push({route:'skip',score:0.85,reasons:['Current role-fit confidence is too weak for high-cost outreach.'],blockers:[],requiresApproval:false});
    }
    const noHumanSignal=input.funnel.applications>=5&&input.funnel.recruiterResponses===0&&input.funnel.interviews===0;
    const rejectionPressure=input.funnel.applications?input.funnel.automatedRejections/input.funnel.applications:0;
    if(this.graph&&input.organizationId){
      const decisionMakers=this.graph.decisionMakers({organizationId:input.organizationId,opportunityId:input.opportunityId});
      for(const item of decisionMakers.slice(0,5)){
        const paths=input.candidatePersonId?this.graph.relationshipPaths(item.person.id,input.candidatePersonId):{direct:[],twoHop:[]};
        const hasWarm=paths.direct.some(edge=>edge.kind!=='none'&&edge.strength>=0.4)||paths.twoHop.some(([a,b])=>a.strength>=0.4&&b.strength>=0.4);
        if(hasWarm)candidates.push({route:'warm-introduction',score:clamp(0.60+item.edge.confidence*0.25+input.evidenceStrength*0.2+(noHumanSignal?0.05:0)),reasons:['A credible relationship path exists to a likely hiring authority.','Warm access is preferred over cold outreach when it can bypass an application-only bottleneck.'],blockers:[],requiresApproval:true});
        if(item.edge.kind==='hiring-manager'||item.edge.kind==='functional-leader'||item.edge.kind==='founder')candidates.push({route:'direct-hiring-manager',score:clamp(0.40+item.edge.confidence*0.3+input.evidenceStrength*0.2+(noHumanSignal?0.05:0)),reasons:['A likely decision maker is identified with provenance.','Direct evidence-rich outreach is preferred when the application funnel is not producing human review and no stronger warm path is available.'],blockers:item.edge.confidence<0.6?['Decision-maker confidence should be verified before sending.']:[],requiresApproval:true});
        if(item.edge.kind==='recruiter')candidates.push({route:'recruiter-outreach',score:clamp(0.4+item.edge.confidence*0.25+input.evidenceStrength*0.2),reasons:['A recruiter with likely relevance to the opportunity is known.'],blockers:[],requiresApproval:true});
      }
    }
    candidates.push({route:'strategic-application',score:clamp(0.45+input.fitConfidence*0.2+input.evidenceStrength*0.15-(noHumanSignal?0.2:0)-rejectionPressure*0.15+(input.applicationRequired?0.35:0)),reasons:[input.applicationRequired?'Employer process requires a formal application.':'Application remains a fallback/record route, not the acquisition objective.'],blockers:noHumanSignal&&!input.applicationRequired?['Repeated applications are not producing human evaluation.']:[],requiresApproval:true});
    return this.result(candidates,input.funnel);
  }
  private result(candidates:RouteCandidate[],funnel:FunnelEvidence){
    const sorted=candidates.sort((a,b)=>b.score-a.score);
    const applicationBottleneck=funnel.applications>=5&&funnel.interviews===0&&(funnel.automatedRejections/funnel.applications>=0.5||funnel.recruiterResponses===0);
    return {primary:sorted[0],alternatives:sorted.slice(1),applicationBottleneck,diagnosis:applicationBottleneck?'Application-first strategy is failing before or at human evaluation; change acquisition route rather than increasing blind volume.':'No strong application bottleneck established yet.'};
  }
}
