(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const startScreen = document.getElementById('startScreen');
  const endScreen = document.getElementById('endScreen');
  const keys = new Set();
  const touchDirs = new Set();
  const $ = id => document.getElementById(id);
  let W = 0, H = 0, dpr = 1, last = 0, running = false, soundOn = false;
  let player, enemies = [], particles = [], slashes = [], flowers = [], trees = [];
  let kills = 0, wave = 1, waveLeft = 0, spawnTimer = 0, qCooldown = 0, dashCooldown = 0, toastTimer = 0, shake = 0, audioCtx;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a,b) => a + Math.random()*(b-a);
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function resize(){
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
    if(player){ player.x = clamp(player.x,70,W-70); player.y = clamp(player.y,190,H-100); }
    makeDecor();
  }
  function makeDecor(){
    flowers=[];trees=[];
    for(let i=0;i<110;i++) flowers.push({x:rand(20,W-20),y:rand(150,H-5),s:rand(1,3),a:rand(.16,.55),c:Math.random()<.5?'#b43c67':'#ebc1c5'});
    for(let i=0;i<24;i++){
      const side=i%4, x=side===0?rand(-50,W+50):side===1?rand(-50,W+50):side===2?rand(-70,40):rand(W-40,W+70), y=side===0?rand(110,230):side===1?rand(H-180,H+60):rand(120,H-80);
      trees.push({x,y,r:rand(26,66),a:rand(.55,.95),seed:rand(0,20)});
    }
  }
  function init(){
    kills=0;wave=1;waveLeft=2;spawnTimer=.45;qCooldown=0;dashCooldown=0;particles=[];slashes=[];enemies=[];
    player={x:W*.5,y:H*.59,r:17,hp:100,face:0,speed:225,attack:0,attackCd:0,invuln:0,dashing:0,dx:0,dy:0,anim:0};
    for(let i=0;i<2;i++)spawnEnemy(); updateHud();
  }
  function start(){init();running=true;startScreen.classList.add('hidden');endScreen.classList.add('hidden');$('controlsHint').style.opacity='';$('objective').innerHTML='<span class="objective-icon">✦</span><span><b>OBJETIVO</b> <small>Elimina a los Grimm que acechan el bosque</small></span>';last=performance.now(); requestAnimationFrame(loop);}
  function end(win){running=false;$('endKicker').textContent=win?'MISIÓN COMPLETADA':'MISIÓN FALLIDA';$('endTitle').textContent=win?'¡VALE ESTÁ A SALVO!':'¡LA NOCHE TE VENCIÓ!';$('endCopy').textContent=win?'Los Grimm han sido derrotados. Buen trabajo, cazadora.':'Tu aura se ha agotado. Las cazadoras nunca se rinden.';$('finalKills').textContent=String(kills).padStart(2,'0');endScreen.classList.remove('hidden');}
  function showToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');toastTimer=.75;}
  function updateHud(){ $('healthText').textContent=Math.ceil(player.hp);$('healthFill').style.width=player.hp+'%';$('killText').textContent=String(kills).padStart(2,'0');$('waveText').innerHTML=String(wave).padStart(2,'0')+' <i>/ 03</i>';document.querySelectorAll('.wave-dots span').forEach((el,i)=>el.classList.toggle('active',i<wave));$('qCd').textContent=qCooldown>0?qCooldown.toFixed(1)+'s':'LISTO';$('eCd').textContent=dashCooldown>0?dashCooldown.toFixed(1)+'s':'LISTO';}
  function spawnEnemy(){
    if(!player)return; const angle=rand(0,Math.PI*2), edge=rand(.38,.47), x=clamp(player.x+Math.cos(angle)*W*edge,35,W-35),y=clamp(player.y+Math.sin(angle)*H*edge,190,H-35);
    const boss=wave===3&&waveLeft===1;
    enemies.push({x,y,r:boss?31:17,hp:boss?9:(wave===1?2:3),maxHp:boss?9:(wave===1?2:3),speed:boss?63:rand(65,91)+(wave-1)*12,attack:0,hit:0,phase:rand(0,8),boss,dead:false});
  }
  function burst(x,y,color,n=8,power=150){for(let i=0;i<n;i++){let a=rand(0,Math.PI*2),s=rand(power*.25,power);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.22,.62),max:.62,size:rand(1.5,4),color});}}
  function sound(freq=220,dur=.07,type='sawtooth'){if(!soundOn)return;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}catch{}}
  function attack(){if(!running||player.attackCd>0)return;player.attack=.24;player.attackCd=.34;const nearest=enemies.filter(e=>!e.dead).sort((a,b)=>dist(player,a)-dist(player,b))[0];if(nearest&&dist(player,nearest)<260)player.face=Math.atan2(nearest.y-player.y,nearest.x-player.x);slashes.push({x:player.x,y:player.y,a:player.face,life:.22,max:.22,r:70,wide:.95});burst(player.x+Math.cos(player.face)*39,player.y+Math.sin(player.face)*39,'#ff4965',5,85);sound(270,.09,'triangle');
    for(const e of enemies){if(e.dead)continue;const d=dist(player,e),a=Math.atan2(e.y-player.y,e.x-player.x),diff=Math.atan2(Math.sin(a-player.face),Math.cos(a-player.face));if(d<(e.boss?104:88)&&Math.abs(diff)<1.25){hitEnemy(e,1,player.face);}}
  }
  function hitEnemy(e,damage,angle){e.hp-=damage;e.hit=.18;e.x+=Math.cos(angle)*12;e.y+=Math.sin(angle)*12;burst(e.x,e.y,e.boss?'#ff3656':'#c6d9db',7,125);sound(135,.08,'square');if(e.hp<=0){e.dead=true;kills++;burst(e.x,e.y,'#e93452',17,205);updateHud();if(kills===4)showToast('¡PRIMERA OLEADA SUPERADA!');if(kills===9)showToast('¡EL ALFA HA LLEGADO!');}}
  function special(){if(!running||qCooldown>0)return;qCooldown=7;player.attack=.55;player.invuln=.45;slashes.push({x:player.x,y:player.y,a:0,life:.55,max:.55,r:205,wide:Math.PI*2});burst(player.x,player.y,'#f93659',28,260);shake=10;sound(490,.26,'sawtooth');showToast('SEMBLANTE: PETAL BURST');for(const e of enemies){if(!e.dead&&dist(player,e)<205)hitEnemy(e,e.boss?3:2,Math.atan2(e.y-player.y,e.x-player.x));}}
  function dash(){if(!running||dashCooldown>0)return;dashCooldown=2.2;let x=(keys.has('d')||keys.has('arrowright')||touchDirs.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||touchDirs.has('left')?1:0),y=(keys.has('s')||keys.has('arrowdown')||touchDirs.has('down')?1:0)-(keys.has('w')||keys.has('arrowup')||touchDirs.has('up')?1:0);if(!x&&!y){x=Math.cos(player.face);y=Math.sin(player.face)}let l=Math.hypot(x,y)||1;player.dx=x/l;player.dy=y/l;player.dashing=.2;player.invuln=.35;for(let i=0;i<10;i++)particles.push({x:player.x+rand(-9,9),y:player.y+rand(-12,12),vx:-player.dx*rand(70,180),vy:-player.dy*rand(70,180),life:rand(.2,.48),max:.48,size:rand(3,8),color:'#e83354'});sound(620,.12,'triangle');}
  function hurt(dmg){if(player.invuln>0)return;player.hp=Math.max(0,player.hp-dmg);player.invuln=.85;shake=7;burst(player.x,player.y,'#ff5267',12,130);updateHud();sound(90,.2,'sawtooth');if(player.hp<=0)end(false);}
  function update(dt){
    if(!running)return;dt=Math.min(dt,.035);player.anim+=dt;player.attackCd=Math.max(0,player.attackCd-dt);player.attack=Math.max(0,player.attack-dt);player.invuln=Math.max(0,player.invuln-dt);player.dashing=Math.max(0,player.dashing-dt);qCooldown=Math.max(0,qCooldown-dt);dashCooldown=Math.max(0,dashCooldown-dt);toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');
    let vx=(keys.has('d')||keys.has('arrowright')||touchDirs.has('right')?1:0)-(keys.has('a')||keys.has('arrowleft')||touchDirs.has('left')?1:0),vy=(keys.has('s')||keys.has('arrowdown')||touchDirs.has('down')?1:0)-(keys.has('w')||keys.has('arrowup')||touchDirs.has('up')?1:0),len=Math.hypot(vx,vy);
    if(len){vx/=len;vy/=len;player.face=Math.atan2(vy,vx);}
    if(player.dashing){player.x+=player.dx*790*dt;player.y+=player.dy*790*dt;}else{player.x+=vx*player.speed*dt;player.y+=vy*player.speed*dt;}
    player.x=clamp(player.x,35,W-35);player.y=clamp(player.y,182,H-39);
    spawnTimer-=dt;if(spawnTimer<=0&&waveLeft>0){spawnEnemy();waveLeft--;spawnTimer=wave===1?1.4:1.15;}
    for(const e of enemies){if(e.dead)continue;e.phase+=dt*4;e.hit=Math.max(0,e.hit-dt);const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;if(d>(e.r+player.r+7)){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;}else{e.attack-=dt;if(e.attack<=0){e.attack=e.boss?1.05:1.35;hurt(e.boss?13:8);}}}
    enemies=enemies.filter(e=>!e.dead);
    if(waveLeft===0&&enemies.length===0){if(wave<3){wave++;waveLeft=wave===2?5:5;spawnTimer=.7;updateHud();$('objective').innerHTML='<span class="objective-icon">✦</span><span><b>ALERTA · OLEADA '+String(wave).padStart(2,'0')+'</b> <small>¡Más Grimm se aproximan!</small></span>';showToast(wave===3?'¡CUIDADO CON EL GRIMM ALFA!':'¡NUEVA OLEADA!');}else{end(true);}}
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.08,dt);p.vy*=Math.pow(.08,dt);p.life-=dt;}particles=particles.filter(p=>p.life>0);
    for(const s of slashes)s.life-=dt;slashes=slashes.filter(s=>s.life>0);shake=Math.max(0,shake-dt*28);updateHud();
  }
  function drawBackground(t){
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1b1524');bg.addColorStop(.38,'#27202d');bg.addColorStop(1,'#181720');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    // moonlit clearing
    const glow=ctx.createRadialGradient(W*.5,H*.48,5,W*.5,H*.48,Math.max(W,H)*.65);glow.addColorStop(0,'rgba(118,79,103,.25)');glow.addColorStop(.48,'rgba(82,60,83,.13)');glow.addColorStop(1,'rgba(8,9,16,.47)');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    // distant forest silhouettes
    for(let layer=0;layer<2;layer++){ctx.fillStyle=layer?'#171420':'#1c1724';const base=layer?H*.28:H*.2;for(let x=-30;x<W+60;x+=layer?78:105){let h=(layer?100:150)+Math.sin(x*.027+layer*2)*30;ctx.beginPath();ctx.moveTo(x-60,base+50);ctx.lineTo(x,base-h);ctx.lineTo(x+65,base+50);ctx.fill();}}
    // circular sigil / clearing markings
    ctx.save();ctx.translate(W*.5,H*.53);ctx.strokeStyle='rgba(201,157,174,.075)';ctx.lineWidth=1;for(let r of [95,145,220,300]){ctx.beginPath();ctx.ellipse(0,0,r,r*.49,0,0,Math.PI*2);ctx.stroke()}ctx.setLineDash([4,15]);ctx.beginPath();ctx.ellipse(0,0,265,131,0,0,Math.PI*2);ctx.stroke();ctx.restore();ctx.setLineDash([]);
    // trees frame the arena
    for(const tr of trees){ctx.globalAlpha=tr.a;ctx.fillStyle='#100f19';ctx.beginPath();ctx.ellipse(tr.x,tr.y+tr.r*.55,tr.r*.42,tr.r*1.35,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#201522';ctx.beginPath();ctx.arc(tr.x,tr.y,tr.r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#311a2a';ctx.beginPath();ctx.arc(tr.x-tr.r*.2,tr.y-tr.r*.16,tr.r*.66,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    for(const f of flowers){ctx.globalAlpha=f.a*(.8+Math.sin(t*1.3+f.x)*.2);ctx.fillStyle=f.c;ctx.beginPath();ctx.arc(f.x,f.y,f.s,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
    // drifting fireflies
    for(let i=0;i<14;i++){const x=(i*173+t*(5+i%4)*8)%(W+40)-20,y=230+((i*97+Math.sin(t*.6+i)*28)%(H-240));ctx.globalAlpha=.35+.4*Math.sin(t*2+i);ctx.fillStyle=i%3?'#f2c487':'#fa6380';ctx.shadowBlur=9;ctx.shadowColor=ctx.fillStyle;ctx.fillRect(x,y,2,2)}ctx.shadowBlur=0;ctx.globalAlpha=1;
  }
  function drawRuby(t){const p=player;ctx.save();ctx.translate(p.x,p.y+Math.sin(t*8)*1.5);ctx.rotate(p.face+Math.PI/2);if(p.invuln>0&&Math.floor(t*22)%2===0)ctx.globalAlpha=.45;
    // shadow
    ctx.fillStyle='#09080e99';ctx.beginPath();ctx.ellipse(0,12,24,10,0,0,Math.PI*2);ctx.fill();
    // flowing red cloak
    ctx.fillStyle='#8c1d36';ctx.beginPath();ctx.moveTo(-9,-7);ctx.quadraticCurveTo(-23,3,-27,25);ctx.quadraticCurveTo(0,36,26,23);ctx.quadraticCurveTo(19,5,9,-7);ctx.closePath();ctx.fill();ctx.fillStyle='#e32d4d';ctx.beginPath();ctx.moveTo(-5,-6);ctx.quadraticCurveTo(-9,12,-18,27);ctx.quadraticCurveTo(0,30,7,30);ctx.quadraticCurveTo(4,8,7,-5);ctx.closePath();ctx.fill();
    // legs + boots
    ctx.strokeStyle='#28232e';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-6,7);ctx.lineTo(-8,21);ctx.moveTo(6,7);ctx.lineTo(9,20);ctx.stroke();ctx.strokeStyle='#e7dce0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,21);ctx.lineTo(-12,22);ctx.moveTo(9,20);ctx.lineTo(13,21);ctx.stroke();
    // body
    ctx.fillStyle='#24212d';ctx.beginPath();ctx.roundRect(-10,-13,20,24,5);ctx.fill();ctx.fillStyle='#ded5dc';ctx.beginPath();ctx.moveTo(-7,-11);ctx.lineTo(0,2);ctx.lineTo(8,-11);ctx.fill();ctx.fillStyle='#9f233b';ctx.fillRect(-2,-5,4,11);
    // arms
    ctx.strokeStyle='#26212d';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-8,-9);ctx.lineTo(-14,-1);ctx.moveTo(8,-9);ctx.lineTo(11,-1);ctx.stroke();
    // head and hood
    ctx.fillStyle='#e8c2bd';ctx.beginPath();ctx.arc(0,-18,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3a2733';ctx.beginPath();ctx.arc(0,-21,9,Math.PI,Math.PI*2);ctx.lineTo(9,-14);ctx.quadraticCurveTo(0,-18,-9,-14);ctx.fill();
    // hair accents
    ctx.fillStyle='#6d253e';ctx.beginPath();ctx.moveTo(-7,-20);ctx.lineTo(-11,-31);ctx.lineTo(-1,-26);ctx.lineTo(2,-34);ctx.lineTo(7,-24);ctx.fill();
    // scythe and crescent
    ctx.save();ctx.rotate(.7);ctx.strokeStyle='#d5c9d2';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(12,-5);ctx.lineTo(15,27);ctx.stroke();ctx.strokeStyle='#ed3c57';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(13,8);ctx.lineTo(15,26);ctx.stroke();ctx.fillStyle='#e9dfe4';ctx.beginPath();ctx.moveTo(11,-5);ctx.quadraticCurveTo(0,-19,7,-31);ctx.quadraticCurveTo(6,-18,17,-16);ctx.quadraticCurveTo(13,-11,11,-5);ctx.fill();ctx.fillStyle='#e83351';ctx.beginPath();ctx.moveTo(11,-7);ctx.quadraticCurveTo(5,-16,9,-24);ctx.quadraticCurveTo(8,-14,14,-13);ctx.fill();ctx.restore();
    if(p.attack>0){ctx.strokeStyle='#ffd9df';ctx.lineWidth=4;ctx.shadowBlur=16;ctx.shadowColor='#fb294e';ctx.beginPath();ctx.arc(0,0,50,-1.15,1.15);ctx.stroke();ctx.shadowBlur=0;}
    ctx.restore();
  }
  function drawEnemy(e,t){ctx.save();ctx.translate(e.x,e.y+Math.sin(t*6+e.phase)*2);const scale=e.boss?1.5:1;ctx.scale(scale,scale);ctx.globalAlpha=e.hit>0?.56:1;
    ctx.fillStyle='#09090f88';ctx.beginPath();ctx.ellipse(0,10,25,11,0,0,Math.PI*2);ctx.fill();
    // Grimm wolf silhouette
    ctx.fillStyle=e.boss?'#19151e':'#17151d';ctx.beginPath();ctx.ellipse(0,0,20,13,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(11,-5);ctx.lineTo(24,-11);ctx.lineTo(28,-6);ctx.lineTo(19,1);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-12,-7);ctx.lineTo(-19,-20);ctx.lineTo(-7,-13);ctx.fill();ctx.beginPath();ctx.moveTo(1,-9);ctx.lineTo(4,-22);ctx.lineTo(12,-11);ctx.fill();
    ctx.strokeStyle='#14121a';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-10,7);ctx.lineTo(-13,19);ctx.moveTo(4,7);ctx.lineTo(7,18);ctx.moveTo(14,3);ctx.lineTo(17,14);ctx.stroke();ctx.strokeStyle='#1b1721';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-16,-1);ctx.quadraticCurveTo(-27,4,-21,12);ctx.stroke();
    // pale Grimm mask plates
    ctx.fillStyle=e.boss?'#ddd4d5':'#c7c2c7';ctx.beginPath();ctx.moveTo(15,-9);ctx.lineTo(27,-11);ctx.lineTo(25,-4);ctx.lineTo(18,1);ctx.lineTo(12,-3);ctx.closePath();ctx.fill();ctx.fillStyle='#ed2947';ctx.shadowBlur=8;ctx.shadowColor='#f32748';ctx.fillRect(22,-8,3,2);ctx.shadowBlur=0;
    if(e.boss){ctx.fillStyle='#dbd2d3';ctx.beginPath();ctx.moveTo(-2,-14);ctx.lineTo(-8,-28);ctx.lineTo(4,-18);ctx.lineTo(13,-29);ctx.lineTo(13,-12);ctx.fill();ctx.strokeStyle='#ef3a54';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,31,0,Math.PI*2);ctx.stroke();}
    if(e.hp<e.maxHp){ctx.fillStyle='#09080dcc';ctx.fillRect(-17,-31,34,3);ctx.fillStyle=e.boss?'#fb405a':'#d85263';ctx.fillRect(-17,-31,34*Math.max(0,e.hp/e.maxHp),3)}ctx.restore();
  }
  function draw(t){drawBackground(t);ctx.save();if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));const entities=[...enemies.filter(e=>!e.dead).map(e=>({y:e.y,fn:()=>drawEnemy(e,t)})),{y:player.y,fn:()=>drawRuby(t)}].sort((a,b)=>a.y-b.y);entities.forEach(a=>a.fn());
    for(const s of slashes){const progress=1-s.life/s.max;ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=Math.min(1,s.life/s.max)*.85;ctx.strokeStyle='#ff6076';ctx.lineWidth=s.wide===Math.PI*2?6:5;ctx.shadowBlur=18;ctx.shadowColor='#ff2449';ctx.beginPath();ctx.arc(0,0,s.r*(.55+progress*.45),s.a-s.wide/2+progress*.7,s.a+s.wide/2+progress*.7);ctx.stroke();ctx.strokeStyle='#ffe2e6';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,s.r*(.52+progress*.45),s.a-s.wide/2+progress*.7,s.a+s.wide/2+progress*.7);ctx.stroke();ctx.restore();}
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.shadowBlur=7;ctx.shadowColor=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*Math.max(.2,p.life/p.max),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.restore();
  }
  function loop(now){if(!running)return;const dt=(now-last)/1000;last=now;update(dt);draw(now/1000);if(running)requestAnimationFrame(loop);}
  window.addEventListener('resize',resize);resize();drawBackground(0);
  $('playBtn').addEventListener('click',start);$('againBtn').addEventListener('click',start);
  $('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundIcon').textContent=soundOn?'♫':'♩';$('soundBtn').style.borderColor=soundOn?'#f14b63':'';if(soundOn)sound(440,.1,'sine');});
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();const k=e.key.toLowerCase();keys.add(k);if(k===' '||k==='j')attack();if(k==='q')special();if(k==='shift'||k==='e')dash();if(k==='escape'&&running){running=false;startScreen.classList.remove('hidden');}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  canvas.addEventListener('pointerdown',e=>{if(running){const rect=canvas.getBoundingClientRect();player.face=Math.atan2(e.clientY-rect.top-player.y,e.clientX-rect.left-player.x);attack();}});
  document.querySelectorAll('.dpad button').forEach(b=>{const dir=b.dataset.dir;b.addEventListener('pointerdown',e=>{e.preventDefault();touchDirs.add(dir);b.setPointerCapture(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>touchDirs.delete(dir)));});
  document.querySelectorAll('[data-action]').forEach(b=>{const act=()=>{if(b.dataset.action==='attack')attack();if(b.dataset.action==='dash')dash();if(b.dataset.action==='special')special()};b.addEventListener('pointerdown',e=>{e.preventDefault();act()});});
})();
