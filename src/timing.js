// Substeps keep projectile collision and attack timing stable when speed increases.
export function advanceBattle(game,realSeconds,speed=1){
 let remaining=realSeconds*speed;
 while(remaining>1e-9&&game.status==='playing'){
  const dt=Math.min(.05,remaining);game.step(dt);remaining-=dt;
 }
}
