export const CAMPAIGNS = {
  midway: {
    id:"midway",
    name:"Battle of Midway",
    theater:"Central Pacific",
    period:"3–7 June 1942",
    historicalContext:"Carrier warfare, reconnaissance uncertainty, flight-deck cycles, and the Midway invasion operation.",
    sides:{us:"United States Navy",jp:"Imperial Japanese Navy"},
    orders:{us:["search","concentrate","strike","hold","defend"],jp:["search","island","rearm","reserve","withdraw"]},
    enemyOrders:["recon","prepare","strike","defend","maneuver","withdraw"]
  }
};

export function getCampaign(id="midway") {
  return CAMPAIGNS[id] || null;
}
