import {missionById} from "../../shared/missions.js";
const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,n=1400)=>String(v??"").replace(/[<>]/g,"").slice(0,n);
function contentOf(message){const v=message?.content||message?.reasoning_content||message?.output_text||"";return Array.isArray(v)?v.map(x=>typeof x==="string"?x:x?.text||"").join(" "):typeof v==="string"?v:JSON.stringify(v)}
function parseObject(text){const s=String(text||"").trim();try{return JSON.parse(s)}catch{}const match=s.match(/\{[\s\S]*\}/);if(match){try{return JSON.parse(match[0])}catch{}}return null}
function fallbackEvaluation(mission,plan,lang,player){
 const text=String(plan||"");
 const checks=[
  /(安全|军事|军备|边界|法国|德国|security|military|arms|border)/i.test(text),
  /(经济|贸易|赔偿|债务|工业|通货|economic|trade|reparations|debt|industry)/i.test(text),
  /(政治|民族|民意|政权|联盟|政治|political|national|public opinion|league)/i.test(text),
  /(核实|查证|交叉|独立来源|档案|使馆|报纸|访问|询问|verify|corroborat|source|archive|embassy|interview)/i.test(text),
  /(下一步|随后|计划|行动|联系|调查|比较|确认|next step|then|plan|contact|investigate|compare)/i.test(text)
 ];
 const score=checks.filter(Boolean).length;
 const strong=score>=4;
 const moderate=score>=2;
 const zh=lang==="zh";
 const assessment=zh
  ? (strong
    ? "模型响应超时，以下为系统保守兜底评估：报告已提出多个风险维度，并包含来源核查或后续行动，方向基本符合任务要求。但尚未经过模型逐项审阅，不能视为完整评估。"
    : moderate
      ? "模型响应超时，以下为系统保守兜底评估：报告包含部分风险或调查思路，但对安全、经济、政治风险的覆盖，以及独立来源、可核查对象和具体行动仍不充分。"
      : "模型响应超时，以下为系统保守兜底评估：目前报告主要表达了谨慎态度或初步立场，尚未形成可执行的分析。仅说自己刚进入联络系统，不能替代对任务本身的判断。")
  : (strong
    ? "The model timed out. This conservative fallback finds several risk dimensions and verification or follow-up actions, but this is not a full model review."
    : moderate
      ? "The model timed out. The report contains some risk or investigative thinking, but coverage, independent sourcing and concrete actions remain incomplete."
      : "The model timed out. The report states an initial position but does not yet provide an actionable assessment. A cautious attitude alone does not answer the assignment.");
 const outcome=zh
  ? "已保存为“部分完成（系统兜底评估）”。本次没有获得 MiniMax 的完整评估，因此不把推测当作事实，也不授予完整任务经验。"
  : "Filed as partial using the system fallback. MiniMax did not complete its review, so no unsupported claims are treated as facts and full mission XP is not awarded.";
 const nextLead=zh
  ? "补充三类风险：法国的安全保障与德国军力限制、赔偿与欧洲经济恢复、民族自决与新边界争议。每类至少列出一个1919年可接触的独立信息来源、一项需要核实的事实，以及下一步联系或调查行动。"
  : "Address security guarantees and German military limits; reparations and European recovery; and self-determination and disputed borders. For each, name an independent source available in 1919, a fact to verify and a concrete next action.";
 return {assessment,outcome,status:"partial",experience:strong?2:moderate?1:0,trustDelta:0,memory:zh?"任务提交成功；因模型超时，系统以保守规则完成部分评估，仍需补充风险分析、独立来源与具体行动。":"Assignment submitted; model timed out, so a conservative fallback recorded a partial assessment.",nextLead,model:"fallback-rule-evaluator",evaluationMode:"timeout_fallback"};
}
export async function onRequestPost({request,env}){
 let x;try{const raw=await request.text();if(raw.length>10000)return json({error:"REQUEST_TOO_LARGE"},413);x=JSON.parse(raw)}catch{return json({error:"INVALID_JSON"},400)}
 const mission=missionById(clean(x.missionId,60));if(!mission)return json({error:"UNKNOWN_MISSION"},404);
 const plan=clean(x.plan,1800);if(!plan.trim())return json({error:"EMPTY_PLAN"},400);
 const lang=x.lang==="en"?"en":"zh",p=x.player||{};
 // A direct factual query about the 1923 Munich putsch is a valid field inquiry,
 // not a failed investigation plan. Answer and archive it without depending on model availability.
 if(mission.id==="munich-report-1923"&&/(死了多少|多少人死亡|死亡人数|伤亡人数|多少人遇难|how many (people )?(were )?killed|death toll|casualties)/i.test(plan)){
  const zh=lang==="zh";
  return json({ok:true,missionId:mission.id,year:mission.year,status:"partial",experience:3,trustDelta:1,evaluationMode:"verified_fact_answer",
   assessment:zh?"这次慕尼黑啤酒馆政变通常统计为20人死亡。较细的史料记载：市中心冲突现场有13名政变参与者、1名旁观平民和4名巴伐利亚警察死亡，另有2名政变参与者在国防军总部附近死亡。常见的“16名纳粹、4名警察”说法涉及纳粹后来将那名平民也纳入“16名殉难者”的宣传纪念口径，因此不同资料的分类略有差异。":"The Beer Hall Putsch is commonly reported to have caused 20 deaths. A detailed account records 13 putschists, 1 civilian bystander and 4 Bavarian police killed in the city-center clash, plus 2 putschists killed near the Reichswehr headquarters. The familiar summary of “16 Nazis and 4 police” reflects the later Nazi commemorative category, which included the civilian bystander among its sixteen “martyrs”; sources therefore differ slightly in classification.",
   outcome:zh?"问题已回答并归档。这是对事件规模的有效核查问题，因此获得少量调查经验；但它尚未完成整项任务要求的组织能力与政治影响评估。不同资料对旁观平民的归类略有差异，故应同时保留总数与统计口径。":"Question answered and filed. This is a valid inquiry into the scale of the event and earns limited investigation XP, but it does not complete the broader assessment of organization and political impact. Sources classify the civilian bystander differently, so preserve both the total and the counting method.",
   memory:zh?"核实1923年慕尼黑啤酒馆政变伤亡：通常统计20人死亡；需注意不同史料对旁观平民的分类口径。":"Verified the 1923 Beer Hall Putsch death toll: commonly 20; sources differ in how they classify the civilian bystander.",
   nextLead:zh?"继续调查政变组织者如何计划夺取巴伐利亚权力、为何未能获得警察与军方支持，以及失败后纳粹运动如何调整策略。":"Investigate how the plotters planned to seize power in Bavaria, why police and military support failed to materialize, and how the movement adapted after the failed coup."});
 }
 if(!env.MINIMAX_API_KEY)return json({error:"MODEL_NOT_CONFIGURED"},503);
 const careerFocus={
 diplomat:"Focus on diplomatic channels, negotiation, official statements and political relationships.",
 journalist:"Focus on source verification, interviews, public reporting and distinguishing propaganda from evidence.",
 analyst:"Focus on evidence assessment, uncertainty, alternative hypotheses and intelligence gaps.",
 officer:"Focus on military organization, logistics, mobilization and realistic command authority.",
 industrialist:"Focus on trade, finance, industrial capacity, shipping and material constraints."
 };
 const focus=careerFocus[clean(p.career,40)]||careerFocus.analyst;
 const system=lang==="zh"
 ?"【语言硬性要求】所有面向玩家的字段 assessment、outcome、memory、nextLead 必须使用简体中文；即使玩家输入很短，也不得改用英文。你是严谨的历史职业任务裁决官。玩家是虚构的历史参与者，正在完成一项真实历史背景中的职业任务。只允许使用任务年份及之前能够获得的信息；严格遵守人物当时的职位、技术、通信、交通、权限和情报条件。玩家不能改变公开历史事件、条约或战争结果，只能改变自己的报告质量、人脉、声誉与职业成长。必须评估证据质量、行动可行性、风险意识和历史认知边界。不得凭空制造机密文件、现代设备或未来知识。输出JSON：{assessment:评估, outcome:任务结果, status:success|partial|failed, experience:0到12整数, trustDelta:-2到3整数, memory:个人履历记忆, nextLead:下一条调查线索}。"
 :"You adjudicate a historical career assignment for a fictional participant. Use only information available in the mission year or earlier. Respect the historical offices, technology, communications, travel, authority and intelligence limits of the period. The player cannot change public historical events, treaties or war outcomes; only their report quality, contacts, reputation and career may change. Evaluate evidence quality, feasibility, risk awareness and historical discipline. Never invent secret files, modern tools or future knowledge. Return JSON {assessment,outcome,status:success|partial|failed,experience:0..12 integer,trustDelta:-2..3 integer,memory,nextLead}.";
 const context={mission:{id:mission.id,year:mission.year,title:mission.title[lang],place:mission.place,briefing:mission.briefing[lang],objective:mission.objective[lang],constraints:mission.constraints[lang],knownFacts:mission.facts},player:{name:clean(p.name,48),career:clean(p.career,50),nation:clean(p.nation,80),city:clean(p.city,80),rank:clean(p.title,60),experience:Number(p.experience)||0,trust:Number(p.trust)||0},careerFocus:focus,plan};
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);
 try{
  const r=await fetch(env.MINIMAX_BASE_URL||"https://api.minimaxi.com/v1/chat/completions",{method:"POST",signal:ctl.signal,headers:{"Authorization":"Bearer "+env.MINIMAX_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash",messages:[{role:"system",content:system+"\nReturn one valid JSON object only."},{role:"user",content:JSON.stringify(context)}],temperature:.25,max_completion_tokens:2400})});
  if(!r.ok){const body=await r.text();let detail=body.slice(0,320);try{const parsed=JSON.parse(body);detail=parsed.base_resp?.status_msg||parsed.error?.message||parsed.message||detail}catch{}return json({error:"MODEL_UPSTREAM_ERROR",upstreamStatus:r.status,detail},502)}
  const d=await r.json();
  if(d.base_resp&&Number(d.base_resp.status_code)!==0)return json({error:"MODEL_PROVIDER_ERROR",providerCode:d.base_resp.status_code,detail:clean(d.base_resp.status_msg,220)},502);
  const raw=contentOf(d.choices?.[0]?.message||d);
  let out=parseObject(raw);
  if(!out){
   const plain=clean(raw,2200).trim();
   if(plain.length<20)return json({error:"EMPTY_MODEL_OUTPUT",detail:"MiniMax returned no usable message content.",finishReason:clean(d.choices?.[0]?.finish_reason||"unknown",60)},502);
   const detailCount=(plan.match(/[，,。；;：:\n]/g)||[]).length;
   const hasAction=/(核实|查证|交叉|来源|档案|接触|访问|询问|比较|条款|赔偿|军备|联盟|贸易|经济|安全|外交|证据|报告|报纸|使馆)/.test(plan);
   const weak=plan.length<45||(!hasAction&&detailCount<2);
   out={assessment:plain,outcome:weak?"这份答复表达了谨慎态度，但尚未形成可执行的评估方案。缺少具体风险判断、核查对象、信息来源和下一步行动。":"报告内容已记录，但模型未能提供完整结构化评分。系统暂按部分完成处理，不把未明确证明的判断视为事实。",status:"partial",experience:weak?0:2,trustDelta:0,memory:"提交了1919年战后秩序评估；本次按保守规则记录，仍需补充可核查的调查步骤。",nextLead:"分别列出安全、经济和政治风险，并为每项风险指定1919年可接触的独立来源与核查步骤。"};
  }
  return json({ok:true,missionId:mission.id,year:mission.year,assessment:clean(out.assessment,900),outcome:clean(out.outcome,1200),status:["success","partial","failed"].includes(out.status)?out.status:"partial",experience:Math.max(0,Math.min(12,Math.floor(Number(out.experience)||0))),trustDelta:Math.max(-2,Math.min(3,Number(out.trustDelta)||0)),memory:clean(out.memory,700),nextLead:clean(out.nextLead,700),model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash"});
 }catch(e){
  if(e?.name==="AbortError"){
   console.error("MISSION_MODEL_TIMEOUT",JSON.stringify({missionId:mission.id,model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash"}));
   const fallback=fallbackEvaluation(mission,plan,lang,p);
   return json({ok:true,missionId:mission.id,year:mission.year,...fallback,model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash",warning:"MODEL_TIMEOUT_FALLBACK"});
  }
  console.error("MISSION_MODEL_UNAVAILABLE",clean(e?.message||"Unknown model error",220));
  return json({error:"MODEL_UNAVAILABLE",detail:clean(e?.message||"Unknown model error",220)},502);
 }finally{clearTimeout(timer)}
}
