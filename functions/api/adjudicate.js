const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const clean=(v,n=500)=>String(v??"").replace(/[<>]/g,"").slice(0,n);
export async function onRequestGet({env}){return json({provider:"MiniMax",ready:Boolean(env.MINIMAX_API_KEY),model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash",
        reasoning_effort:"low",purpose:"campaign-adjudication"});}
export async function onRequestPost({request,env}){
  if(!env.MINIMAX_API_KEY)return json({error:"MODEL_NOT_CONFIGURED",message:"AI model key is not available to this deployment."},503);
  let input;
  try{
    const raw=await request.text();
    if(raw.length>12000)return json({error:"REQUEST_TOO_LARGE"},413);
    input=JSON.parse(raw);
  }catch{return json({error:"INVALID_JSON"},400);}
  const lang=input.lang==="en"?"en":"zh";
  const side=input.side==="jp"?"jp":"us";
  const allowed={us:["search","concentrate","strike","hold","defend"],jp:["search","island","rearm","reserve","withdraw"]};
  const id=String(input.command?.id||"");
  if(!allowed[side].includes(id))return json({error:"INVALID_COMMAND"},400);
  const state=input.state&&typeof input.state==="object"?input.state:{};
  const bounded={
    time:clean(input.time,40),
    friendlyCarriers:Math.max(0,Math.min(4,Number(state.friendlyCarriers)||0)),
    enemyCarriers:Math.max(0,Math.min(4,Number(state.enemyCarriers)||0)),
    aircraft:Math.max(0,Math.min(500,Number(state.aircraft)||0)),
    fuel:Math.max(0,Math.min(100,Number(state.fuel)||0)),
    crew:Math.max(0,Math.min(100,Number(state.crew)||0)),
    search:Math.max(0,Math.min(100,Number(state.search)||0)),
    score:Math.max(-100,Math.min(100,Number(state.score)||0)),
    turn:Math.max(0,Math.min(100,Number(state.turn)||0))
  };
  const command={id,label:clean(input.command?.label,100),description:clean(input.command?.description,260)};
  const events=Array.isArray(input.recentEvents)?input.recentEvents.slice(0,4).map(x=>clean(x,180)):[];
  const system=lang==="zh"
    ?"你是《中途岛海战》历史决策模拟器的战区参谋。用简体中文写一段简短、沉浸式、符合1942年海战语境的战场反馈，并给出一条新的情报线索。严格遵守：游戏状态数字由程序决定，你绝不能更改、推断或宣称任何舰艇已沉没/受损，除非输入状态或历史节点明确说明；不要虚构精确坐标、舰艇位置、飞机数量或真实电报原文；区分已知事实、估计与不确定情报；不提供现代现实军事行动建议。输出只能是JSON对象：{\"narrative\":\"80至140个汉字的战场反馈\",\"intel\":{\"title\":\"不超过22字\",\"body\":\"40至90个汉字的新情报，明确可信度和不确定性\",\"confidence\":\"高/中/低\"}}。"
    :"You are the operations staff narrator for an educational Battle of Midway decision simulation. Write concise, immersive period-appropriate feedback and one new intelligence lead. Strict rules: program state owns all numbers; never alter it or claim a ship was sunk/damaged unless the input state or historical milestone explicitly says so. Do not invent exact coordinates, ship positions, aircraft counts, or authentic-looking intercepted messages. Distinguish confirmed facts, estimates and uncertainty. Do not provide modern real-world military advice. Output only JSON: {\"narrative\":\"80-140 words of campaign feedback\",\"intel\":{\"title\":\"under 8 words\",\"body\":\"40-90 words of new intelligence with explicit uncertainty\",\"confidence\":\"HIGH/MEDIUM/LOW\"}}.";
  const user=JSON.stringify({campaign:"Battle of Midway, 3–7 June 1942",side:side==="us"?"United States Navy":"Imperial Japanese Navy",time:bounded.time,command,state:bounded,recentHistoricalContext:events});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),18000);
  try{
    const response=await fetch(env.MINIMAX_BASE_URL||"https://api.minimax.io/v1/chat/completions",{
      method:"POST",signal:controller.signal,
      headers:{"Authorization":"Bearer "+env.MINIMAX_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:env.MINIMAX_MODEL||"MiniMax-M3.1-Flash",
        messages:[{role:"system",content:system},{role:"user",content:user}],
        temperature:0.65,max_completion_tokens:420
      })
    });
    if(!response.ok)return json({error:"MODEL_UPSTREAM_ERROR",status:response.status,message:"The model provider did not complete this request."},502);
    const data=await response.json();
    const raw=data.choices?.[0]?.message?.content;
    if(typeof raw!=="string")return json({error:"EMPTY_MODEL_RESPONSE"},502);
    const match=raw.match(/\{[\s\S]*\}/);
    if(!match)return json({error:"INVALID_MODEL_OUTPUT"},502);
    let result;
    try{result=JSON.parse(match[0]);}catch{return json({error:"INVALID_MODEL_JSON"},502);}
    if(typeof result.narrative!=="string"||typeof result.intel?.title!=="string"||typeof result.intel?.body!=="string")return json({error:"INVALID_MODEL_SCHEMA"},502);
    return json({
      narrative:clean(result.narrative,lang==="zh"?500:900),
      intel:{title:clean(result.intel.title,80),body:clean(result.intel.body,500),confidence:clean(result.intel.confidence,20)},
      model:env.MINIMAX_MODEL||"MiniMax-M3"
    });
  }catch(error){
    return json({error:error?.name==="AbortError"?"MODEL_TIMEOUT":"MODEL_CONNECTION_FAILED",message:"The model request could not be completed."},502);
  }finally{clearTimeout(timeout);}
}
