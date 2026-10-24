import {Game,GRID,CHARACTERS,MONSTERS} from './engine.js';

// Challenge rosters are trial cards, independent from permanent character unlocks.
export const BOX_POOL=Object.keys(CHARACTERS).filter(id=>CHARACTERS[id].role!=='producer');
export const VASE_ROLE_COUNTS={fire:4,wall:3,erwa:2,water:3,nezha:1,pangolin:2};
export const VASE_ENEMY_COUNTS={scorpion:1,frog:6,bat:3};
const rows=[0,1,2,3,4];
export const CHALLENGES={
 boxes:{name:'随机盒子',title:'传送带 · 随机盒子',region:'趣味挑战',map:'wood',rows,cards:BOX_POOL,reward:null,cols:9,conveyor:true,wave:195,schedule:Array.from({length:25},(_,i)=>({t:35+i*7,row:[2,1,3,0,4][i%5],type:i===23?'scorpion':i>8&&i%6===4?'bat':'frog'}))},
 vases:{name:'砸罐子',title:'迷雾中的二十五罐',region:'趣味挑战',map:'cave',rows,cards:Object.keys(VASE_ROLE_COUNTS),reward:null,cols:8,wave:86400,schedule:Object.entries(VASE_ENEMY_COUNTS).flatMap(([type,count])=>Array.from({length:count},()=>({t:1000000,row:0,type})))}
};
export class ChallengeGame extends Game{
 constructor(mode,random=null){
  if(!CHALLENGES[mode])throw Error('未知挑战');
  super(10,random);this.challenge=mode;this.cfg=CHALLENGES[mode];this.battleMode=mode==='boxes'?'conveyor':'normal';this.energy=0;
  if(mode==='vases'){
   const contents=[...Object.entries(VASE_ROLE_COUNTS).flatMap(([type,count])=>Array.from({length:count},()=>({kind:'role',type}))),...Object.entries(VASE_ENEMY_COUNTS).flatMap(([type,count])=>Array.from({length:count},()=>({kind:'enemy',type})))];
   for(let i=contents.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[contents[i],contents[j]]=[contents[j],contents[i]];}
   this.vases=contents.map((content,i)=>({id:++this.nextId,row:Math.floor(i/5),col:3+i%5,...content}));
  }
 }
 get freePlacement(){return true;}
 get cards(){return this.belt;}
 equip(){throw Error('挑战使用专用卡牌');}
 supplyCard(){this.beltCursor++;return 'box';}
 consumeCard(type){const i=this.belt.indexOf(type);this.belt.splice(i,1);if(this.challenge==='boxes')this.beltPositions.splice(i,1);}
 isCellBlocked(row,col){return this.vases.some(v=>v.row===row&&v.col===col);}
 canFinish(){return this.vases.length===0;}
 openBox(index){
  if(this.status!=='playing'||this.challenge!=='boxes'||!Number.isInteger(index)||this.belt[index]!=='box')return false;
  const type=BOX_POOL[Math.floor(this.random()*BOX_POOL.length)];this.belt[index]=type;this.emit('unbox',{type});return type;
 }
 breakVase(row,col){
  if(this.status!=='playing'||this.challenge!=='vases')return false;
  const i=this.vases.findIndex(v=>v.row===row&&v.col===col);if(i<0)return false;
  const [vase]=this.vases.splice(i,1),x=GRID.x+(col+.5)*GRID.cw;
  if(vase.kind==='role')this.belt.push(vase.type);
  else{this.spawned++;this.enemies.push({id:++this.nextId,type:vase.type,row,x,hp:MONSTERS[vase.type].hp,hit:0,eating:false,damaged:false,attackClock:0,attackHasHit:false,phase:this.random()*6});}
  this.effects.push({kind:'vaseBreak',x,y:GRID.y+(row+.7)*GRID.rh,life:.5});this.emit('vase',{kind:vase.kind,type:vase.type});return vase;
 }
}
