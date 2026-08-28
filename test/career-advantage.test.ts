import test from 'node:test';
import assert from 'node:assert/strict';
import type { CandidateProfile, Opportunity } from '../src/domain.js';
import { buildCareerAdvantagePlan, buildTransitionBridge, diagnoseFunnel } from '../src/career-advantage.js';
import type { UniversalEvidence } from '../src/universal-career-intelligence.js';

const profile: CandidateProfile={id:'career-test',name:'Career Test',headline:'Patient Care Technician',skills:['patient care','vital signs','patient communication'],constraints:{targetLocations:['New York'],allowedWorkModes:['onsite'],requiresSponsorship:false,preferredTitles:['registered nurse'],excludedTerms:[]}};
const evidence:UniversalEvidence[]=[
{id:'work',label:'Hospital Work',kind:'work',capability:'patient care',claim:'Provided direct patient care, recorded vital signs, and communicated patient needs to the care team.',strength:.9,verified:true},
{id:'school',label:'Nursing Coursework',kind:'education',capability:'nursing education',claim:'Completed nursing coursework and supervised clinical learning.',strength:.8,verified:true}
];
const opportunity:Opportunity={id:'rn-role',job:{source:'hospital',sourceId:'rn',url:'https://test.invalid/rn',company:'Hospital',title:'Registered Nurse',location:'New York, NY',workMode:'onsite',description:'Provide safe nursing care and coordinate patient treatment.',requirements:['Active RN license required','Patient assessment','Care coordination'],preferred:['BSN preferred'],postedAt:new Date().toISOString()},state:'QUALIFIED',hardRejected:false,rejectionReasons:[],intelligence:{normalizedRequirements:[],likelyInterviewAreas:[],seniority:'entry',teamSignals:[]},gaps:[],evidenceIds:[],score:{technicalFit:60,compensation:70,careerUpside:90,location:100,evidenceStrength:65,competition:55,freshness:100,interviewProbability:50,total:72},humanPaths:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};

test('career transition preserves regulated hard gates instead of positioning around them',()=>{
 const bridge=buildTransitionBridge(profile,evidence,'registered nurse',[opportunity]);
 assert.ok(bridge.hardGates.some(g=>/license/i.test(g)));
 assert.ok(bridge.transferableCapabilities.some(c=>/patient/i.test(c.capability)));
});

test('career advantage supports career entry and advancement without tech assumptions',()=>{
 const start=buildCareerAdvantagePlan({profile,evidence,opportunities:[opportunity],message:'Help me start my nursing career'});
 assert.equal(start.motion,'start');
 assert.ok(start.launch.barriers.some(b=>b.kind==='credential'));
 assert.ok(start.operatingRules.some(r=>/every profession/i.test(r)));
 const advance=buildCareerAdvantagePlan({profile:{...profile,constraints:{...profile.constraints,preferredTitles:['charge nurse']}},evidence,opportunities:[],message:'Help me advance and get promoted',hasCurrentRole:true});
 assert.equal(advance.motion,'advance');
 assert.ok(advance.advancement.promotionPacket.length>0);
});

test('funnel diagnosis changes the failing stage instead of blindly increasing applications',()=>{
 const distribution=diagnoseFunnel({applications:30,screens:1,interviews:0,offers:0,warmPathApplications:1,warmPathScreens:1});
 assert.equal(distribution.primaryFailureMode,'distribution');
 assert.ok(distribution.doNotDo.some(x=>/indiscriminate/i.test(x)));
 const interview=diagnoseFunnel({applications:20,screens:10,interviews:6,offers:0});
 assert.equal(interview.primaryFailureMode,'interview');
});
