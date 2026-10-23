// Seven cumulative claims. Missing a day never resets progress; dates use China time.
export const DAILY_REWARDS=[
 {coins:3000,label:'3,000 金币'},
 {character:'beta',label:'贝塔 · 坦克支援'},
 {coins:4000,label:'4,000 金币'},
 {character:'shuke',label:'舒克 · 直升机支援'},
 {coins:6000,label:'6,000 金币'},
 {coins:8000,label:'8,000 金币'},
 {coins:10000,label:'10,000 金币'}
];
export function chinaDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=type=>parts.find(p=>p.type===type).value;
 return `${value('year')}-${value('month')}-${value('day')}`;
}
export function canClaimDaily(save,now=new Date()){
 const state=save.checkin??{claimed:0,lastDate:null};
 return state.claimed<DAILY_REWARDS.length&&(!state.lastDate||chinaDay(now)>state.lastDate);
}
export function claimDaily(save,now=new Date()){
 if(!canClaimDaily(save,now))return false;
 const claimed=save.checkin?.claimed??0,reward=DAILY_REWARDS[claimed];
 if(reward.coins)save.coins=Math.min(1000000000,save.coins+reward.coins);
 if(reward.character)save.unlocks={...save.unlocks,[reward.character]:true};
 save.checkin={claimed:claimed+1,lastDate:chinaDay(now)};
 return reward;
}
