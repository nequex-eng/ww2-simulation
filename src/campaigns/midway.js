export function resolveMidwayEnemyAction(action,state,lang="zh") {
  const s={...state};
  const patch={};
  let narrative="";
  let scoreDelta=0;
  if(action==="recon"){
    patch.enemyAwareness=Math.min(100,(s.enemyAwareness||0)+14);
    patch.contact=Math.max(5,(s.contact||0)-3);
    narrative=lang==="zh"?"敌方侦察活动增加，我方接触判断受到干扰。":"Enemy reconnaissance increased; our contact picture is less certain.";
  } else if(action==="prepare"){
    patch.enemyReadiness=Math.min(100,(s.enemyReadiness||0)+16);
    narrative=lang==="zh"?"敌方舰载航空队正在准备下一轮行动。":"Enemy air groups are preparing for another operation.";
  } else if(action==="strike"){
    const hitChance=(0.06+(s.enemyReadiness||0)*0.002)*(s.defenseReady?0.35:1);
    const roll=((s.turn*41+s.day*13+s.hour*11)%101)/101;
    const loss=roll<hitChance?1:0;
    if(loss){patch.carriers=Math.max(0,s.carriers-1);patch.aircraft=Math.max(0,s.aircraft-12);}
    scoreDelta=loss?-7:1;
    narrative=lang==="zh"?(loss?"敌方发动空袭，我方防空准备不足，舰队遭受损失。":"敌方发动空袭，我方战斗空中巡逻拦截了主要威胁。"):(loss?"Enemy aircraft strike; inadequate defensive readiness costs the force.":"Enemy aircraft attack; combat air patrol intercepts the main threat.");
  } else if(action==="defend"){
    patch.enemyReadiness=Math.min(100,(s.enemyReadiness||0)+7);
    narrative=lang==="zh"?"敌方加强舰队防空，攻击窗口缩小。":"Enemy fleet strengthens its air defence, narrowing the strike window.";
  } else if(action==="maneuver"){
    patch.contact=Math.max(5,(s.contact||0)-10);
    narrative=lang==="zh"?"敌方改变航向，原有接触报告逐渐失效。":"Enemy force changes course; earlier contact reports are becoming stale.";
  } else if(action==="withdraw"){
    patch.enemyWithdrawing=true;
    patch.contact=Math.max(5,(s.contact||0)-14);
    scoreDelta=2;
    narrative=lang==="zh"?"敌方编队开始脱离当前战区。":"Enemy force begins disengaging from the immediate area.";
  }
  return {patch,narrative,scoreDelta};
}

export function resolveMidwayStrike({contact,enemyReadiness,turn,day,hour}) {
  const chance=Math.max(.04,Math.min(.42,(contact/100)*.48*(1-enemyReadiness/170)));
  const roll1=((turn*31+day*17+hour*13)%97)/97;
  const roll2=((turn*47+day*7+hour*19)%89)/89;
  const hits=(roll1<chance?1:0)+(roll2<chance*.32?1:0);
  return {chance,hits};
}

export function resolveMidwayPlayerOrder(id,state,side="us",lang="zh") {
  const s={...state,sectorCoverage:[...(state.sectorCoverage||[18,18,18,18])]};
  const patch={};
  let message="";
  let scoreDelta=0;
  if(id==="search"){
    const gain=Math.max(12,Math.floor(((s.crew||0)+(s.fuel||0))/10));
    s.sectorCoverage[s.searchSector]=Math.min(100,s.sectorCoverage[s.searchSector]+gain);
    patch.sectorCoverage=s.sectorCoverage;
    patch.search=Math.round(s.sectorCoverage.reduce((x,y)=>x+y,0)/4);
    const onBearing=s.searchSector===(side==="us"?0:1);
    patch.contact=Math.min(96,(s.contact||0)+(onBearing?Math.floor(s.sectorCoverage[s.searchSector]/9)+Math.floor(gain/2):1));
    patch.fuel=Math.max(0,(s.fuel||0)-7);
    patch.crew=Math.max(0,(s.crew||0)-3);
    message=lang==="zh"?(onBearing?"重点扇区巡逻取得更完整接触线索，但目标身份仍待确认。":"巡逻机扩大了搜索范围，但当前扇区并非主要预判方向，尚无可靠接触。"):(onBearing?"Patrols in the priority sector improve the contact picture, though target identity remains unconfirmed.":"Search coverage expands, but this is not the priority bearing; no reliable contact yet.");
  } else if(id==="concentrate"){
    patch.fuel=Math.max(0,(s.fuel||0)-4);patch.crew=Math.min(100,(s.crew||0)+4);patch.deckCycle=Math.max(s.deckCycle||0,1);scoreDelta=5;
    message=lang==="zh"?"攻击编队开始协调，灵活性有所下降。":"Strike groups are coordinating; flexibility is reduced.";
  } else if(id==="strike"){
    patch.strikeLaunched=true;
    const launched=Math.min(s.aircraft||0,Math.max(18,Math.floor((s.aircraft||0)*((s.contact||0)>=65?.34:.22))));
    patch.aircraft=Math.max(0,(s.aircraft||0)-launched);patch.airborne=(s.airborne||0)+launched;patch.sorties=(s.sorties||0)+1;patch.deckCycle=3;patch.fuel=Math.max(0,(s.fuel||0)-12);
    const {hits}=resolveMidwayStrike({contact:s.contact||0,enemyReadiness:s.enemyReadiness||0,turn:s.turn||0,day:s.day||0,hour:s.hour||0});
    patch.enemyCarriers=Math.max(0,(s.enemyCarriers||0)-hits);scoreDelta=hits>0?hits*9:-5;patch.contact=Math.max(10,(s.contact||0)-24);
    message=lang==="zh"?"攻击机群已经出动，效果取决于情报准确性与敌方防御。":"Strike aircraft launched; results depend on contact accuracy and enemy readiness.";
  } else if(id==="hold"){
    patch.search=Math.min(100,(s.search||0)+10);scoreDelta=3;
    message=lang==="zh"?"舰队暂缓行动，等待更可靠报告。":"Fleet holds while awaiting stronger reports.";
  } else if(id==="defend"){
    patch.defenseReady=true;patch.crew=Math.min(100,(s.crew||0)+8);patch.deckCycle=Math.max(s.deckCycle||0,1);patch.fuel=Math.max(0,(s.fuel||0)-5);
    message=lang==="zh"?"战斗空中巡逻加强，舰队防御改善。":"Combat air patrol strengthened; fleet defence improves.";
  } else if(id==="island"){
    const launched=Math.min(s.aircraft||0,Math.max(12,Math.floor((s.aircraft||0)*.12)));
    patch.aircraft=Math.max(0,(s.aircraft||0)-launched);patch.airborne=(s.airborne||0)+launched;patch.sorties=(s.sorties||0)+1;patch.deckCycle=2;patch.fuel=Math.max(0,(s.fuel||0)-10);
    message=lang==="zh"?"继续攻击中途岛，舰队防空力量暂时减少。":"Attack on Midway continues; carrier defence is temporarily reduced.";
  } else if(id==="rearm"){
    patch.deckVulnerable=true;patch.deckCycle=3;patch.fuel=Math.max(0,(s.fuel||0)-8);scoreDelta=2;
    message=lang==="zh"?"飞机重新挂弹与加油，甲板调度期间较为脆弱。":"Aircraft rearming and refuelling; deck cycle creates vulnerability.";
  } else if(id==="reserve"){
    patch.deckVulnerable=false;patch.deckCycle=Math.max(s.deckCycle||0,1);patch.crew=Math.min(100,(s.crew||0)+2);scoreDelta=4;
    message=lang==="zh"?"保留攻击预备队，等待更明确的接触报告。":"Reserve strike retained while awaiting clearer reports.";
  } else if(id==="withdraw"){
    patch.done=true;scoreDelta=-3;
    message=lang==="zh"?"舰队向西脱离接触，放弃眼前目标。":"Force disengages west, abandoning the immediate objective.";
  }
  return {patch,message,scoreDelta};
}
