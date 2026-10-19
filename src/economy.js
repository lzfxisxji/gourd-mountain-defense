export const SLOT_PRICES={7:750,8:5000,9:20000,10:80000};
export function buySlot(save){
 const next=save.slots+1,price=SLOT_PRICES[next];
 if(!price||save.coins<price)return false;
 save.coins-=price;save.slots=next;return true;
}
export function victoryCoins(game){return 250+game.mowers.filter(m=>game.cfg.rows.includes(m.row)&&!m.used).length*50+game.coins.reduce((sum,c)=>sum+c.value,0);}
