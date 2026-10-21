const rows=[0,1,2,3,4];
const sequence=[2,1,3,0,4,2,0,3,1,4];
const waves=(count,start,gap,lastWave)=>[
 ...Array.from({length:count},(_,i)=>({t:Math.round((start+i*gap)*10)/10,row:sequence[i%sequence.length]})),
 ...rows.map((row,i)=>({t:lastWave+i*.8,row}))
];
const lateCards=['vine','fire','wall','nezha','pangolin','tall','water'];
export const LEVELS={
 1:{name:'1-1',title:'初遇青蛙精',rows:[2],cards:['fire'],reward:'vine',schedule:[{t:18,row:2},{t:32,row:2},{t:44,row:2},{t:56,row:2},{t:68,row:2},{t:78,row:2},{t:79,row:2}],wave:68},
 2:{name:'1-2',title:'葫芦藤的力量',rows:[1,2,3],cards:['vine','fire'],reward:'wall',schedule:[{t:22,row:2},{t:34,row:1},{t:46,row:3},{t:58,row:2},{t:69,row:1},{t:79,row:3},{t:88,row:2},{t:96,row:1},{t:104,row:3},{t:105,row:2},{t:106,row:1},{t:107,row:3}],wave:96},
 3:{name:'1-3',title:'铜头铁臂守藤园',rows:[...rows],cards:['vine','fire','wall'],reward:'nezha',schedule:waves(16,25,6.6,139),wave:139},
 4:{name:'1-4',title:'三昧真火破妖阵',rows:[...rows],cards:['vine','fire','wall','nezha'],reward:'pangolin',schedule:waves(21,24,5.8,154),wave:154},
 5:{name:'1-5',title:'地下伏兵',rows:[...rows],cards:['vine','fire','wall','nezha','pangolin'],reward:'tall',schedule:waves(27,25,4.8,164),wave:164},
 6:{name:'1-6',title:'巨力守关',rows:[...rows],cards:['vine','fire','wall','nezha','pangolin','tall'],reward:'water',schedule:waves(32,28,4.5,181),wave:181},
 7:{name:'1-7',title:'碧水退妖潮',rows:[...rows],cards:['vine','fire','wall','nezha','pangolin','tall','water'],reward:'seven',schedule:waves(38,29,4.1,191),wave:191},
 8:{name:'1-8',title:'空陆夹击',rows:[...rows],cards:[...lateCards,'seven'],reward:'erwa',schedule:waves(42,30,4,211),wave:211},
 9:{name:'1-9',title:'妖洞前哨',rows:[...rows],cards:[...lateCards,'seven','erwa'],reward:null,schedule:waves(46,30,3.9,226),wave:226},
 10:{name:'1-10',title:'决战蛇精',rows:[...rows],cards:[...lateCards,'seven','erwa'],reward:'six',schedule:[...waves(45,32,4,222),{t:205,row:2,type:'snake'}].sort((a,b)=>a.t-b.t),wave:205}
};
// Preserve authored timing and total counts; introduce flyers among later waves.
for(const level of [6,7,8,9,10])LEVELS[level].schedule=LEVELS[level].schedule.map((spawn,i)=>({...spawn,...(!spawn.type&&i>5&&i%(level===6?9:level>=8?6:7)===5?{type:'bat'}:{})}));
export const LAST_LEVEL=Math.max(...Object.keys(LEVELS).map(Number));
// Replace late ground spawns, keeping wave timing and total counts stable.
for(const [level,indices] of [[9,[27,44]],[10,[24,40]]])for(const i of indices)LEVELS[level].schedule[i].type='scorpion';
export function adventureLevel(save){
 if(save?.battle&&LEVELS[save.battle.level])return save.battle.level;
 return Math.min(LAST_LEVEL,Math.max(1,(save?.completed||0)+1));
}

for(const [level,indices] of [[8,[20,36]],[9,[18,36]],[10,[16,34]]])for(const i of indices)LEVELS[level].schedule[i].type='centipede';
