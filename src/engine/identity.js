export const CAREERS = {
 diplomat:{label:"外交系统见习官",en:"Junior Diplomatic Attaché",track:"外交与谈判",enTrack:"Diplomacy & Negotiation",skills:["交涉","礼仪","语言"],enSkills:["Negotiation","Protocol","Languages"],intro:"你进入外交系统，负责整理电报、准备会谈纪要，并在不同国家的官员之间建立可信赖的联系。"},
 journalist:{label:"国际新闻记者",en:"Foreign Correspondent",track:"调查与舆论",enTrack:"Investigation & Press",skills:["采访","观察","写作"],enSkills:["Interviewing","Observation","Writing"],intro:"你是一名年轻的国际记者。你的采访通行证让你接近外交官、军官和政治圈，但每条消息都需要核实。"},
 analyst:{label:"情报分析员",en:"Intelligence Analyst",track:"密码与情报",enTrack:"Signals & Intelligence",skills:["分析","密码","交叉验证"],enSkills:["Analysis","Cipher","Corroboration"],intro:"你被招入一个政府情报分析部门，从公开资料、外交报告和零散线索中辨认正在形成的威胁。"},
 officer:{label:"军方联络军官",en:"Military Liaison Officer",track:"军事与组织",enTrack:"Military & Operations",skills:["组织","地图判读","指挥协同"],enSkills:["Organization","Map Reading","Coordination"],intro:"你从基层军官做起，负责联络、报告和跨部门协调，逐渐接触国家安全决策。"},
 industrialist:{label:"工业与航运顾问",en:"Industry & Shipping Adviser",track:"工业与供应链",enTrack:"Industry & Logistics",skills:["供应链","财务","风险判断"],enSkills:["Supply Chains","Finance","Risk"],intro:"你在工业与航运网络中工作，掌握原材料、船运、工厂和贸易的现实约束。"}
};
export function createIdentity({name="Alex",career="analyst",nation="United Kingdom",city="London"}={}) {
 const c=CAREERS[career]||CAREERS.analyst;
 return {id:"player-"+Date.now(),name:String(name).slice(0,48),career,nation,city,year:1919,rank:0,codename:null,experience:0,trust:10,skills:[...(c.skills||[])],contacts:[],missions:[],memory:[],relationships:{},trainingCompleted:[],createdAt:new Date().toISOString()};
}
export function advanceIdentity(identity,{experience=0,trust=0,contact=null,mission=null,figureId=null,relationshipDelta=0}={}) {
 const next={...identity,relationships:{...(identity.relationships||{})},trainingCompleted:[...(identity.trainingCompleted||[])],experience:Math.max(0,(identity.experience||0)+experience),trust:Math.max(0,Math.min(100,(identity.trust||0)+trust)),memory:[...(identity.memory||[])].slice(-11)};
 if(contact&&!next.contacts.includes(contact))next.contacts=[...next.contacts,contact].slice(-20);
 if(figureId)next.relationships[figureId]=Math.max(-10,Math.min(100,(next.relationships[figureId]||0)+trust));
 if(mission)next.missions=[...(next.missions||[]),mission].slice(-20);
 const rank=next.experience>=120?4:next.experience>=70?3:next.experience>=35?2:next.experience>=12?1:0;
 next.rank=rank;
 const names=["见习联络员","初级联络官","情报官","特别行动官","战略行动负责人"];
 const en=["Probationary Liaison","Junior Liaison","Intelligence Officer","Special Operations Officer","Strategic Operations Lead"];
 next.title=names[rank];next.titleEn=en[rank];
 if(rank>=2&&!next.codename)next.codename=["CIPHER","NORTH","FALCON","ORCHID","RAVEN"][Math.floor(Math.random()*5)];
 return next;
}
export function addIdentityMemory(identity,text){return {...identity,memory:[String(text).slice(0,700),...(identity.memory||[])].slice(0,12)};}
