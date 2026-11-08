import {missionById} from "../../shared/missions.js";
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,n=1400)=>String(v??"").replace(/[<>]/g,"").slice(0,n);
export async function onRequestPost({request,env}){
 if(!env.MINIMAX_API_KEY)return json({error:"MODEL_NOT_CONFIGURED"},503);
 let x;try{const raw=await request.text();if(raw.length>10000)return json({error:"REQUEST_TOO_LARGE"},413);x=JSON.parse(raw)}catch{return json({error:"INVALID_JSON"},400)}
 const mission=missionById(clean(x.missionId,60));if(!mission)return json({error:"UNKNOWN_MISSION"},404);
 const plan=clean(x.plan,1800);if(!plan.trim())return json({error:"EMPTY_PLAN"},400);
 const lang=x.lang==="en"?"en":"zh",p=x.player||{};
 const careerFocus={
 diplomat:"Focus on diplomatic channels, negotiation, official statements and political relationships.",
 journalist:"Focus on source verification, interviews, public reporting and distinguishing propaganda from evidence.",
 analyst:"Focus on evidence assessment, uncertainty, alternative hypotheses and intelligence gaps.",
 officer:"Focus on military organization, logistics, mobilization and realistic command authority.",
 industrialist:"Focus on trade, finance, industrial capacity, shipping and material constraints."
 };
 const focus=careerFocus[clean(p.career,40)]||careerFocus.analyst;
 const system=lang==="zh"
 ?"你是严谨的历史职业任务裁决官。玩家是虚构的历史参与者，正在完成一项真实历史背景中的职业任务。只允许使用任务年份及之前能够获得的信息；严格遵守人物当时的职位、技术、通信、交通、权限和情报条件。玩家不能改变公开历史事件、条约或战争结果，只能改变自己的报告质量、人脉、声誉与职业成长。必须评估证据质量、行动可行性、风险意识和历史认知边界。不得凭空制造机密文件、现代设备或未来知识。输出JSON：{assessment:评估, outcome:任务结果, status:success|partial|failed, experience:0到12整数, trustDelta:-2到3整数, memory:个人履历记忆, nextLead:下一条调查线索}。"
 :"You adjudicate a historical career assignment for a fictional participant. Use only information available in the mission year or earlier. Respect the historical offices, technology, communications, travel, authority and intelligence limits of the period. The player cannot change public historical events, treaties or war outcomes; only their report quality, contacts, reputation and career may change. Evaluate evidence quality, feasibility, risk awareness and historical discipline. Never invent secret files, modern tools or future knowledge. Return JSON {assessment,outcome,status:success|partial|failed,experience:0..12 integer,trustDelta:-2..3 integer,memory,nextLead}.";
 const context={mission:{id:mission.id,year:mission.year,title:mission.title[lang],place:mission.place,briefing:mission.briefing[lang],objective:mission.objective[lang],constraints:mission.constraints[lang],knownFacts:mission.facts},player:{name:clean(p.name,48),career:clean(p.career,50),nation:clean(p.nation,80),city:clean(p.city,80),rank:clean(p.title,60),experience:Number(p.experience)||0,trust:Number(p.trust)||0},careerFocus:focus,plan};
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
 try{
  const r=await fetch(env.MINIMAX_BASE_URL||"https://api.minimaxi.com/v1/chat/completions",{method:"POST",signal:ctl.signal,headers:{"Authorization":"Bearer "+env.MINIMAX_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash",messages:[{role:"system",content:system+"\nReturn one valid JSON object only."},{role:"user",content:JSON.stringify(context)}],temperature:.25,max_completion_tokens:2400})});
  if(!r.ok){const body=await r.text();let detail=body.slice(0,320);try{const parsed=JSON.parse(body);detail=parsed.base_resp?.status_msg||parsed.error?.message||parsed.message||detail}catch{}return json({error:"MODEL_UPSTREAM_ERROR",upstreamStatus:r.status,detail},502)}
  const d=await r.json();
  if(d.base_resp&&Number(d.base_resp.status_code)!==0)return json({error:"MODEL_PROVIDER_ERROR",providerCode:d.base_resp.status_code,detail:clean(d.base_resp.status_msg,220)},502);
  const raw=d.choices?.[0]?.message?.content;
  const text=Array.isArray(raw)?raw.map(v=>v.text||"").join(""):String(raw||"");
  const cleaned=text.replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"").trim();
  const start=cleaned.indexOf("{"),end=cleaned.lastIndexOf("}");
  if(start<0||end<=start)return json({error:"INVALID_MODEL_OUTPUT",detail:clean(cleaned.slice(0,240),240)},502);
  let out;try{out=JSON.parse(cleaned.slice(start,end+1))}catch{return json({error:"INVALID_MODEL_JSON",detail:clean(cleaned.slice(0,240),240)},502)}
  return json({ok:true,missionId:mission.id,year:mission.year,assessment:clean(out.assessment,900),outcome:clean(out.outcome,1200),status:["success","partial","failed"].includes(out.status)?out.status:"partial",experience:Math.max(0,Math.min(12,Math.floor(Number(out.experience)||0))),trustDelta:Math.max(-2,Math.min(3,Number(out.trustDelta)||0)),memory:clean(out.memory,700),nextLead:clean(out.nextLead,700),model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash"});
 }catch(e){return json({error:e?.name==="AbortError"?"MODEL_TIMEOUT":"MODEL_UNAVAILABLE",detail:clean(e?.message||"Unknown model error",220)},502)}finally{clearTimeout(timer)}
}
