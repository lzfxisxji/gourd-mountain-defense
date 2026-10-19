// Separate drawn poses share a ground anchor. Coordinates are source-image pixels.
export const WORLD_SCALE={nezha:1,pangolin:1,tall:1,water:1.18,fire:1.18,vine:1.18,wall:1.12,frog:1.12};
export const POSES={
 batFlyA:{file:'bat-poses',rect:[0,0,768,1024],pivot:[430,850],scale:.19},
 batFlyB:{file:'bat-poses',rect:[768,0,768,1024],pivot:[1198,850],scale:.19},
 nezhaIdle:{file:'nezha-poses',rect:[25,20,485,810],pivot:[270,815],scale:.17},
 nezhaReady:{file:'nezha-poses',rect:[470,210,650,620],pivot:[850,815],scale:.17},
 nezhaCast:{file:'nezha-poses',rect:[1085,230,680,600],pivot:[1440,815],scale:.17},
 pangolinBuried:{file:'pangolin-tall-poses',rect:[40,245,455,145],pivot:[265,379],scale:.24},
 pangolinReady:{file:'pangolin-tall-poses',rect:[520,200,480,215],pivot:[770,409],scale:.24},
 pangolinTrigger:{file:'pangolin-tall-poses',rect:[1010,60,485,380],pivot:[1260,433],scale:.24},
 tallIdle:{file:'pangolin-tall-poses',rect:[65,400,380,580],pivot:[260,970],scale:.29},
 tallDefend:{file:'pangolin-tall-poses',rect:[510,435,510,540],pivot:[765,970],scale:.29},
 tallHurt:{file:'pangolin-tall-poses',rect:[1030,480,475,495],pivot:[1270,970],scale:.29},
 waterIdle:{file:'water-poses',rect:[65,85,395,725],pivot:[265,800],scale:.165},
 waterPrepare:{file:'water-poses',rect:[550,140,530,670],pivot:[825,800],scale:.165},
 waterRelease:{file:'water-poses',rect:[1120,175,645,640],pivot:[1400,800],scale:.165},
 sevenIdle:{file:'seven-poses',rect:[80,90,400,725],pivot:[280,805],scale:.165},
 sevenAbsorb:{file:'seven-poses',rect:[535,145,675,670],pivot:[820,805],scale:.165},
 sevenRefine:{file:'seven-poses',rect:[1330,220,410,600],pivot:[1520,805],scale:.165},
 fireIdle:{file:'fire-poses',rect:[60,85,445,722],pivot:[280,798],scale:.165},
 firePrepare:{file:'fire-poses',rect:[555,132,510,675],pivot:[822,798],scale:.165},
 fireRelease:{file:'fire-poses',rect:[1105,155,660,652],pivot:[1382,798],scale:.165},
 vineIdle:{file:'support-poses',rect:[120,85,325,420],pivot:[282,501],scale:.25},
 vineProduce:{file:'support-poses',rect:[560,30,408,477],pivot:[755,501],scale:.25},
 vineHurt:{file:'support-poses',rect:[1098,135,348,373],pivot:[1260,502],scale:.25},
 wallIdle:{file:'support-poses',rect:[123,513,320,482],pivot:[282,990],scale:.25},
 wallDefend:{file:'support-poses',rect:[550,513,440,482],pivot:[770,990],scale:.25},
 wallHurt:{file:'support-poses',rect:[1115,580,385,416],pivot:[1317,990],scale:.25},
 frogWalkA:{file:'frog-poses',rect:[50,8,468,500],pivot:[255,500],scale:.29},
 frogWalkB:{file:'frog-walk-b',rect:[140,15,1095,1220],pivot:[650,1225],scale:.117},
 frogAttack:{file:'frog-attack',rect:[15,150,1498,740],pivot:[1010,881],scale:.145},
 frogHurtA:{file:'frog-poses',rect:[65,550,455,420],pivot:[265,960],scale:.29},
 frogHurtB:{file:'frog-poses',rect:[550,580,438,390],pivot:[765,960],scale:.29},
 frogBite:{file:'frog-poses',rect:[1045,605,485,365],pivot:[1280,958],scale:.29},
 corpse:{file:'frog-parts',rect:[65,48,646,675],pivot:[385,715],scale:.15},
 head:{file:'frog-parts',rect:[790,105,655,530],pivot:[1115,620],scale:.13},
 arm:{file:'frog-parts',rect:[1690,0,340,723],pivot:[1850,712],scale:.16}
};
export function plantPose(p){
 if(p.type==='nezha')return p.spent||p.action>0?'nezhaCast':p.aiming?'nezhaReady':'nezhaIdle';
 if(p.type==='pangolin')return p.spent?'pangolinTrigger':p.armed?'pangolinReady':'pangolinBuried';
 if(p.type==='tall')return p.hit>0||p.hp<2800?'tallHurt':p.defending?'tallDefend':'tallIdle';
 if(p.type==='water')return p.hit>0||p.windup>0?'waterPrepare':p.action>0?'waterRelease':'waterIdle';
 if(p.type==='fire')return p.hit>0?'firePrepare':p.windup>0?'firePrepare':p.action>0?'fireRelease':'fireIdle';
 if(p.type==='vine')return p.hit>0?'vineHurt':p.action>0||p.timer<.7?'vineProduce':p.hp<150?'vineHurt':'vineIdle';
 return p.hit>0||p.hp<1400?'wallHurt':p.defending?'wallDefend':'wallIdle';
}
export function enemyPose(e,time){
 if(e.type==='bat')return Math.floor(time*5+(e.phase||0))%2?'batFlyB':'batFlyA';
 if(e.eating&&e.attackClock>=.25&&e.attackClock<.64)return e.damaged?'frogBite':'frogAttack';
 const stride=Math.floor(time*3+(e.phase||0))%2;
 return e.damaged?(stride?'frogHurtB':'frogHurtA'):(stride?'frogWalkB':'frogWalkA');
}
