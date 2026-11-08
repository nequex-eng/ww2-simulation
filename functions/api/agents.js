const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,n=800)=>String(v??"").replace(/[<>]/g,"").slice(0,n);
import {getCampaign} from "../../shared/campaigns.js";
const schemas={
 interpreter:{action:"one allowed command id",objective:"short objective",confidence:"high|medium|low",clarification:"empty or one short clarification"},
 staff:{assessment:"what is known and unknown",recommendation:"a concise recommendation",risk:"main risk",question:"one question the commander should consider"},
 enemy:{action:"recon|prepare|strike|defend|maneuver|withdraw",intent:"short intent",confidence:"high|medium|low"}
};
async function ask(env,role,system,context){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),18000);
 try{
  const r=await fetch(env.MINIMAX_BASE_URL||"https://api.minimax.io/v1/chat/completions",{method:"POST",signal:controller.signal,headers:{"Authorization":"Bearer "+env.MINIMAX_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash",reasoning_effort:"low",messages:[{role:"system",content:system+"\nReturn only one valid JSON object. No markdown."},{role:"user",content:JSON.stringify(context)}],temperature:0.45,max_completion_tokens:360})});
  if(!r.ok)throw new Error("upstream_"+r.status);
  const d=await r.json();const raw=d.choices?.[0]?.message?.content;if(typeof raw!=="string")throw new Error("empty_output");
  const m=raw.match(/\{[\s\S]*\}/);if(!m)throw new Error("invalid_json");return JSON.parse(m[0]);
 }finally{clearTimeout(timer);}
}
export async function onRequestGet({env}){return json({ready:Boolean(env.MINIMAX_API_KEY),provider:"MiniMax",architecture:"three-agent-command-cycle",agents:["order_interpreter","friendly_staff","enemy_commander"]});}
export async function onRequestPost({request,env}){
 if(!env.MINIMAX_API_KEY)return json({error:"MODEL_NOT_CONFIGURED"},503);
 let input;try{const raw=await request.text();if(raw.length>18000)return json({error:"REQUEST_TOO_LARGE"},413);input=JSON.parse(raw);}catch{return json({error:"INVALID_JSON"},400);}
 const lang=input.lang==="en"?"en":"zh",side=input.side==="jp"?"jp":"us",enemy=side==="us"?"jp":"us";
 const campaign=getCampaign(clean(input.campaignId,40)||"midway");if(!campaign)return json({error:"UNKNOWN_CAMPAIGN"},404);const sides=campaign.sides,orders=campaign.orders;
 const mode=input.mode==="tick"?"tick":"command";const message=clean(input.message,1200);if(mode==="command"&&!message.trim())return json({error:"EMPTY_ORDER"},400);
 const state=input.state&&typeof input.state==="object"?input.state:{};
 const knownReports=Array.isArray(input.knownReports)?input.knownReports.slice(0,8).map(x=>({title:clean(x.title,100),body:clean(x.body,350),confidence:clean(x.confidence,20)})):[];
 const history=Array.isArray(input.history)?input.history.slice(0,8).map(x=>({side:clean(x.side,20),order:clean(x.order,120),result:clean(x.result,220)})):[];
 const memory=input.agentMemory&&typeof input.agentMemory==="object"?input.agentMemory:{};
 const ownState={clock:state.clock,friendlyCarriers:state.friendlyCarriers,aircraft:state.aircraft,fuel:state.fuel,crew:state.crew,contact:state.contact,deckCycle:state.deckCycle,airborne:state.airborne,sorties:state.sorties,search:state.search,standingOrder:clean(state.standingOrder,500)};
 const langRule=lang==="zh"?"使用简体中文。":"Use concise English.";
 const results=await Promise.allSettled([
  mode==="tick"?Promise.resolve({action:"hold",objective:"Continue the current standing orders",confidence:"medium",clarification:""}):ask(env,"interpreter","You are the order interpreter for a historical strategy simulation. Convert the player's natural-language intent into exactly one legal command id from: "+orders[side].join(", ")+". Never invent an action. If the intent is ambiguous, choose the safest matching action and ask one concise clarification. JSON schema: "+JSON.stringify(schemas.interpreter)+". "+langRule,{campaign:campaign.name,theater:campaign.theater,period:campaign.period,historicalContext:campaign.historicalContext,side:sides[side],legalOrders:orders[side],playerMessage:message,clock:state.clock,ownKnownState:ownState,memory:memory.playerCommander||[],knownReports}),
  ask(env,"friendly_staff","You are the player's independent operations staff. You do not control the enemy and must not invent facts. Assess uncertainty, challenge weak assumptions, and advise the commander. JSON schema: "+JSON.stringify(schemas.staff)+". "+langRule,{campaign:campaign.name,theater:campaign.theater,period:campaign.period,side:sides[side],clock:state.clock,ownKnownState:ownState,memory:memory.staff||[],knownReports,playerOrder:message,history}),
  ask(env,"enemy_commander","You are the opposing commander in an educational historical war simulation. You have your own limited view; you do NOT know the player's hidden resources, unreported plans, or private staff advice. Choose one plausible response: recon, prepare, strike, defend, maneuver, withdraw. Do not narrate omniscient knowledge. JSON schema: "+JSON.stringify(schemas.enemy)+". "+langRule,{campaign:campaign.name,theater:campaign.theater,period:campaign.period,historicalContext:campaign.historicalContext,yourSide:sides[enemy],opposingSide:sides[side],clock:state.clock,ownForce:state.enemyView||{},memory:memory.enemyCommander||[],observedPlayerActivity:history.map(x=>({order:x.order,result:x.result})),publicSituation:state.publicSituation||{},knownEnemyReports:state.enemyReports||[]})
 ]);
 const degraded=results.some(x=>x.status!=="fulfilled");
 const interpreted=results[0].status==="fulfilled"?results[0].value:{action:orders[side][0],objective:"Fallback: safest available order",confidence:"low",clarification:"One agent did not respond."};
 const staff=results[1].status==="fulfilled"?results[1].value:{assessment:"Staff assessment unavailable.",recommendation:"Use the current known situation and avoid overcommitting.",risk:"Model response unavailable.",question:"What information would reduce uncertainty?"};
 const opponent=results[2].status==="fulfilled"?results[2].value:{action:"defend",intent:"Fallback defensive posture",confidence:"low"};
 const action=orders[side].includes(interpreted.action)?interpreted.action:orders[side][0];
 const enemyActions=campaign.enemyOrders||["recon","prepare","strike","defend","maneuver","withdraw"];
 return json({ok:true,degraded,agents:{interpreter:{action,objective:clean(interpreted.objective,240),confidence:clean(interpreted.confidence,20),clarification:clean(interpreted.clarification,240)},staff:{assessment:clean(staff.assessment,700),recommendation:clean(staff.recommendation,500),risk:clean(staff.risk,300),question:clean(staff.question,240)},enemy:{action:enemyActions.includes(opponent.action)?opponent.action:"defend",intent:clean(opponent.intent,500),confidence:clean(opponent.confidence,20)}},model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash"});
}
