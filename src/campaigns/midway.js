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
