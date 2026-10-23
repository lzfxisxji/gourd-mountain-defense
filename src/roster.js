import {CHARACTERS} from './engine.js';

export const FUTURE_CHARACTERS={};
export const ALMANAC_CHARACTERS={...CHARACTERS,...FUTURE_CHARACTERS};
const UNLOCK_COMPLETED={fire:0,vine:1,wall:2,nezha:3,pangolin:4,tall:5,water:6,seven:7,erwa:8,six:10};
export function isCharacterUnlocked(id,completed,unlocks={}){
 if(id==='shuke')return unlocks.shuke===true;
 if(id==='beta')return unlocks.beta===true;
 if(id==='wukong')return unlocks.wukong===true;
 if(id==='blackcat')return unlocks.blackcat===true;
 return !!ALMANAC_CHARACTERS[id]&&ALMANAC_CHARACTERS[id].implemented!==false&&completed>=(UNLOCK_COMPLETED[id]??Infinity);
}
// Confirmed design mapping; no early addition to the playable cards.
export const CONFIRMED_ROLE_MAPPING={six:{name:'六娃',equivalent:'窝瓜',effect:'隐身待命，近身触发一次跃起突袭'},water:{name:'五娃',equivalent:'寒冰射手',projectile:'水弹',effect:'减速'},seven:{name:'七娃',equivalent:'食人花',effect:'用宝葫芦吸收近距离单个妖怪，再进入炼化期'}};
