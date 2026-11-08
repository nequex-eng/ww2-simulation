export const ORDER_TYPES = ["recon","prepare","strike","defend","maneuver","wait","withdraw"];

export function createWorldState({campaignId="midway",side="us",clock={day:3,hour:4},forces={},resources={}}={}) {
  return {
    schemaVersion:1,
    campaignId,
    phase:"active",
    clock:{day:Number(clock.day)||1,hour:Number(clock.hour)||0},
    turn:0,
    playerSide:side,
    forces:structuredClone(forces),
    resources:structuredClone(resources),
    intelligence:{known:[],confidence:"low"},
    commandHistory:[],
    events:[],
    agentMemory:{playerCommander:[],staff:[],enemyCommander:[]},
    lastUpdatedAt:null
  };
}

export function validateOrder(order, allowed=ORDER_TYPES) {
  if(!order || typeof order!=="object") return {ok:false,reason:"missing_order"};
  const type=String(order.type||"");
  if(!allowed.includes(type)) return {ok:false,reason:"unsupported_order"};
  return {ok:true,order:{type,objective:String(order.objective||"").slice(0,240),priority:["low","normal","high","urgent"].includes(order.priority)?order.priority:"normal"}};
}

export function recordCommand(world, {order,source="player",result="",at=null}={}) {
  const checked=validateOrder(order);
  if(!checked.ok) return world;
  const next=structuredClone(world);
  next.turn+=1;
  next.commandHistory.unshift({turn:next.turn,source,order:checked.order,result:String(result).slice(0,500),at:at||null});
  next.commandHistory=next.commandHistory.slice(0,40);
  next.lastUpdatedAt=new Date().toISOString();
  return next;
}

export function advanceWorldClock(world,hours=1) {
  const next=structuredClone(world);
  let total=Math.max(0,Math.min(24,Math.floor(Number(hours)||0)))+next.clock.hour;
  next.clock.day+=Math.floor(total/24);
  next.clock.hour=total%24;
  return next;
}

export function rememberAgent(world,agent,message,limit=12) {
  const next=structuredClone(world);
  if(!next.agentMemory[agent]) next.agentMemory[agent]=[];
  next.agentMemory[agent].unshift(String(message).slice(0,700));
  next.agentMemory[agent]=next.agentMemory[agent].slice(0,limit);
  return next;
}

export function addWorldEvent(world,event) {
  const next=structuredClone(world);
  next.events.unshift({id:event.id||`event-${next.turn}-${next.events.length}`,kind:event.kind||"report",text:String(event.text||"").slice(0,1000),at:event.at||null});
  next.events=next.events.slice(0,80);
  return next;
}

export function worldSnapshot(world) {
  return {
    schemaVersion:world.schemaVersion,campaignId:world.campaignId,phase:world.phase,
    clock:{...world.clock},turn:world.turn,playerSide:world.playerSide,
    forces:structuredClone(world.forces),resources:structuredClone(world.resources),
    intelligence:structuredClone(world.intelligence),
    commandHistory:world.commandHistory.slice(0,8),
    events:world.events.slice(0,10)
  };
}
