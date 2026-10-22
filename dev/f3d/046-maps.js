/* ---------------- 결투 맵: 지하 투기장(기존) · 늪지대 · 성꼭대기 · 용의 둥지 ---------------- */
const MAP_IDS=['dungeon','swamp','castle','dragon'];
const MAPS={};
function plane2(w,h){const g=G();quad(g,[-w/2,0,h/2],[w/2,0,h/2],[w/2,0,-h/2],[-w/2,0,-h/2],[0,0],[w/4,0],[w/4,h/4],[0,h/4],[0,1,0]);return g}
function skyQuad(){const g=G();quad(g,[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0],[0,1],[1,1],[1,0],[0,0],[0,0,1]);return g}
// 배경 하늘·먼 풍경 (2D로 그려 텍스처로)
function paintSky(kind){const[c,x]=cvs(1024,512),r=rng(kind.length*97+3);
  const grad=(stops)=>{const g=x.createLinearGradient(0,0,0,512);stops.forEach(([o,col])=>g.addColorStop(o,col));x.fillStyle=g;x.fillRect(0,0,1024,512)};
  const glow=(cx,cy,R,col,a)=>{const g=x.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,col.replace('A',a));g.addColorStop(1,col.replace('A',0));x.fillStyle=g;x.fillRect(cx-R,cy-R,R*2,R*2)};
  if(kind==='swamp'){grad([[0,'#05100e'],[.45,'#0d2620'],[.7,'#1d3b2c'],[1,'#0a1410']]);glow(760,150,170,'rgba(190,230,200,A)',.35);x.fillStyle='rgba(220,240,225,.85)';x.beginPath();x.arc(760,150,34,0,7);x.fill();
    for(let k=0;k<7;k++){x.fillStyle=`rgba(${20+k*4},${40+k*5},${34+k*4},${.5+k*.06})`;x.beginPath();x.moveTo(0,512);for(let i=0;i<=40;i++){const px=i/40*1024;x.lineTo(px,330+k*14+Math.sin(i*.7+k)*10+r()*12)}x.lineTo(1024,512);x.fill()}
    for(let k=0;k<5;k++){const bx=r()*1024;x.strokeStyle='rgba(6,14,10,.9)';x.lineWidth=6+r()*6;x.beginPath();x.moveTo(bx,512);x.lineTo(bx+(r()-.5)*20,250+r()*60);x.stroke();for(let j=0;j<4;j++){x.lineWidth=2+r()*2;x.beginPath();const y=280+r()*80;x.moveTo(bx,y);x.lineTo(bx+(r()-.5)*120,y-30-r()*40);x.stroke()}}
    glow(512,420,520,'rgba(120,170,140,A)',.18)}
  else if(kind==='castle'){grad([[0,'#02040c'],[.5,'#0a1430'],[.78,'#1e2c55'],[1,'#2a2f4a']]);
    for(let k=0;k<420;k++){const a=r();x.fillStyle=`rgba(255,255,255,${a*a*.9})`;x.fillRect(r()*1024,r()*330,a>.92?2:1,a>.92?2:1)}
    glow(260,120,200,'rgba(170,190,255,A)',.45);x.fillStyle='#eef2ff';x.beginPath();x.arc(260,120,52,0,7);x.fill();x.fillStyle='rgba(150,160,200,.35)';for(let k=0;k<6;k++){x.beginPath();x.arc(240+r()*40,100+r()*40,6+r()*10,0,7);x.fill()}
    for(let k=0;k<3;k++){x.fillStyle=`rgba(${14+k*8},${18+k*9},${40+k*12},1)`;x.beginPath();x.moveTo(0,512);let y=360+k*30;for(let i=0;i<=24;i++){const px=i/24*1024;y=Math.max(250+k*40,Math.min(460,y+(r()-.5)*70));x.lineTo(px,y-(i%3===1?40:0))}x.lineTo(1024,512);x.fill()}
    for(let k=0;k<5;k++){x.fillStyle='rgba(120,140,190,.08)';x.beginPath();x.ellipse(r()*1024,180+r()*120,160+r()*120,18+r()*14,0,0,7);x.fill()}}
  else if(kind==='dragon'){grad([[0,'#050101'],[.45,'#1a0604'],[.75,'#4a1206'],[1,'#7a2a08']]);
    for(let k=0;k<5;k++){x.fillStyle=`rgba(${10+k*6},${4+k*2},${3+k*2},1)`;x.beginPath();x.moveTo(0,512);for(let i=0;i<=30;i++){const px=i/30*1024;x.lineTo(px,280+k*35+(i%2?-60:20)*r())}x.lineTo(1024,512);x.fill()}
    for(let k=0;k<26;k++){const sx=r()*1024;x.fillStyle='rgba(8,3,2,1)';x.beginPath();x.moveTo(sx-20-r()*20,0);x.lineTo(sx+r()*10,60+r()*120);x.lineTo(sx+20+r()*20,0);x.fill()}
    glow(512,470,560,'rgba(255,90,20,A)',.32);
    // 어둠 속의 두 눈
    for(const ex of[470,560]){glow(ex,170,46,'rgba(255,170,40,A)',.7);x.fillStyle='#ffe08a';x.beginPath();x.ellipse(ex,170,14,6,ex<512?.15:-.15,0,7);x.fill();x.fillStyle='#200800';x.fillRect(ex-1.5,164,3,12)}}
  return texFrom(c,{srgb:1,clamp:1})}
function lavaTex(){const[c,x]=cvs(512,512),r=rng(51);x.fillStyle='#000';x.fillRect(0,0,512,512);x.strokeStyle='#fff';x.shadowColor='#fff';x.shadowBlur=8;x.lineCap='round';
  for(let k=0;k<26;k++){let px=256+(r()-.5)*80,py=256+(r()-.5)*80,a=r()*TAU;x.lineWidth=2+r()*5;x.beginPath();x.moveTo(px,py);for(let s=0;s<9;s++){a+=(r()-.5)*1.1;px+=Math.cos(a)*28;py+=Math.sin(a)*28;x.lineTo(px,py)}x.stroke()}
  return texFrom(c,{clamp:1})}
function buildMap(id){if(MAPS[id])return MAPS[id];const parts=[],M={};
  const put=(g,mt,T)=>parts.push({m:mesh(g),mat:mt,M:T||M4.id()});
  const stone=(col,rep)=>mat({col,alb:PT.wall_d,nor:PT.wall_n,rgh:PT.wall_r,rep:rep||[2,1],rou:.95});
  const ground=(col,rep)=>mat({col,alb:PT.floor_d,nor:PT.floor_n,rgh:PT.floor_r,rep:rep||[5,3.3],rou:.85});
  const bark=mat({col:[.38,.36,.3],alb:PT.bark_d,nor:PT.bark_n,rep:[2,3],rou:.9});
  if(id==='swamp'){
    M.sky=paintSky('swamp');
    put(plane2(40,12),mat({col:lin('#0a1a13'),met:0,rou:.92,emi:lin('#03100a')}),M4.tr(0,-.06,-3));
    put(lathe([[0,0],[3.1,0],[3.25,-.05],[3.0,-.12],[0,-.12]],40),ground([.4,.48,.3],[6,6]),M4.sc(1,1,.62));
    for(let i=0;i<9;i++){const a=i/9*TAU,R=2.8+Math.random()*.4;put(sphere(1,12,8),mat({col:lin('#31502a'),rou:.95}),M4.chain(M4.tr(Math.cos(a)*R,.0,Math.sin(a)*R*.6),M4.sc(.35+Math.random()*.25,.06,.25)))}
    const tree=(x,z,h,s)=>{put(lathe([[.28*s,0],[.22*s,.3],[.13*s,h*.7],[.07*s,h],[0,h+.05]],12),bark,M4.tr(x,-.05,z));
      for(let k=0;k<5;k++){const y=h*(.45+k*.1),a=k*2.1+x,p=[];for(let i=0;i<=8;i++){const u=i/8;p.push([x+Math.cos(a)*u*1.1*s,y+u*(.5+Math.sin(k)*.3)*s-u*u*.3,z+Math.sin(a)*u*.6*s])}put(tube(p,u=>.06*s*(1-u*.8),6),bark);
        for(let j=0;j<3;j++){const q=p[3+j*2],m=[];for(let i=0;i<=6;i++)m.push([q[0]+Math.sin(i)*.02,q[1]-i/6*(.5+j*.2),q[2]]);put(tube(m,u=>.018*(1-u*.7),4),mat({col:lin('#55704a'),rou:.95,emi:lin('#0a140a')}))}}};
    tree(-3.4,-2.2,3.2,1);tree(3.6,-2.7,3.6,1.1);tree(-1.4,-5.2,2.8,.9);tree(2.0,-5.8,3.3,1);tree(-5.6,-4.5,3.8,1.2);tree(5.8,-4.8,3,1);
    for(let k=0;k<26;k++){const a=Math.random()*TAU,R=3.1+Math.random()*.6,x=Math.cos(a)*R,z=Math.sin(a)*R*.62;if(z>1.2)continue;for(let j=0;j<4;j++){const h=.4+Math.random()*.5;put(tube([[x+j*.04,-.05,z],[x+j*.04+.05,h*.6,z],[x+j*.04+.1,h,z+.03]],.008,4),mat({col:lin('#58703a'),rou:.9}))}}
    for(let k=0;k<10;k++){const x=(Math.random()-.5)*9,z=-2.6-Math.random()*3;put(lathe([[0,0],[.25,0],[.25,.01],[0,.01]],14),mat({col:lin('#2e5a2a'),rou:.7}),M4.tr(x,-.04,z))}
    M.mush=[];for(let k=0;k<7;k++){const a=Math.random()*TAU,R=2.4+Math.random()*.6,x=Math.cos(a)*R,z=Math.min(.6,Math.sin(a)*R*.6);M.mush.push([x,.1,z]);put(lathe([[0,0],[.03,0],[.025,.12],[.09,.13],[.07,.17],[0,.19]],10),mat({col:lin('#1a3a40'),rou:.4,emi:lin('#2affc8')}),M4.tr(x,0,z))}
    M.lights=t=>[[[ -4,5,-6],[.6,.85,.8],.004],[[4,3,3],[.45,.7,.55],.02],[[0,1.2,2],[.3,.5,.4],.04],[[M.mush[0][0],.4,M.mush[0][2]],[.2,1.2,.9],1.2],[[M.mush[1][0],.4,M.mush[1][2]],[.2,1.2,.9],1.2],[[0,1.3,.6],[0,0,0],1]];
    M.tint=[.75,1,.85];M.circle=[.3,.6,.45];
    M.fx=(dt,t)=>{M.acc=(M.acc||0)+dt*6;while(M.acc>1){M.acc--;emit({p:[rnd(-4,4),rnd(.2,1.8),rnd(-3,1)],v:[rnd(-.15,.15),rnd(-.05,.1),rnd(-.1,.1)],life:rnd(2,4),s0:.014,s1:.01,c0:[3,4,1],sh:1,a0:1,a1:0,fadeIn:.3})}
      M.acc2=(M.acc2||0)+dt*2;while(M.acc2>1){M.acc2--;emit({p:[rnd(-6,6),.15,rnd(-6,-2.5)],v:[rnd(.05,.15),0,0],life:rnd(4,6),s0:.8,s1:1.4,c0:[.05,.09,.07],sh:0,a0:.45,a1:0,fadeIn:.4})}}}
  else if(id==='castle'){
    M.sky=paintSky('castle');
    const wallS=stone([.62,.6,.66],[3,1]);
    put(box(12,.3,6),ground([.6,.6,.64],[6,3]),M4.tr(0,-.15,-.5));
    put(box(12,.9,.5),wallS,M4.tr(0,.45,-3.1));for(let i=-9;i<=9;i++)put(box(.42,.5,.5),wallS,M4.tr(i*.62,1.15,-3.1));
    for(const sx of[-1,1]){put(box(.5,.9,4),wallS,M4.tr(sx*5.6,.45,-1.2));for(let i=0;i<5;i++)put(box(.5,.5,.42),wallS,M4.tr(sx*5.6,1.15,-2.8+i*.8))}
    for(const sx of[-1,1]){const tx=sx*4.3,tz=-4.2;put(lathe([[1,0],[1,5.2],[1.12,5.25],[1.12,5.7],[0,5.7]],24),stone([.58,.56,.62],[4,3]),M4.tr(tx,0,tz));
      for(let i=0;i<10;i++){const a=i/10*TAU;put(box(.28,.4,.28),stone([.58,.56,.62]),M4.chain(M4.tr(tx+Math.cos(a)*1.02,5.9,tz+Math.sin(a)*1.02)))}
      put(lathe([[1.25,0],[.02,2.2],[0,2.2]],20),mat({col:lin('#2a3a6a'),rou:.55,met:.2}),M4.tr(tx,6.1,tz));put(lathe([[.03,0],[.03,1]],6),SC.ironM,M4.tr(tx,8.2,tz));
      put(box(.7,.42,.02),mat({col:lin(sx<0?'#a8202a':'#1f3f9a'),rou:.8,emi:lin(sx<0?'#300406':'#060c30')}),M4.tr(tx+.38,8.9,tz))}
    // 깃발 (벽에 걸린 휘장)
    for(const bx of[-2.4,2.4]){put(box(.9,1.8,.04),mat({col:lin(bx<0?'#9a1c26':'#1d3a90'),rou:.85,emi:lin(bx<0?'#200306':'#040a24')}),M4.tr(bx,.3,-2.8));put(box(1,.06,.06),SC.gold,M4.tr(bx,1.2,-2.79));
      put(extrude([[0,.3],[.22,0],[0,-.3],[-.22,0]],{depth:.02,bevel:.005}),SC.gold,M4.tr(bx,.45,-2.76))}
    M.braz=[];for(const bx of[-3.6,3.6]){M.braz.push([bx,1.05,-2.3]);put(lathe([[0,0],[.08,0],[.06,.7],[.25,.85],[.3,1.0],[.28,1.02],[0,.92]],16),SC.ironM,M4.tr(bx,0,-2.3))}
    M.lights=t=>[[[-6,8,-8],[.7,.8,1.3],.0015],[[M.braz[0][0],1.4,M.braz[0][2]],V.sc([3,1.4,.45],.9+.1*Math.sin(t*9)),.4],[[M.braz[1][0],1.4,M.braz[1][2]],V.sc([3,1.4,.45],.9+.1*Math.sin(t*8+1)),.4],[[0,4,4],[.6,.65,.85],.015],[[3,2,2],[.3,.35,.55],.03],[[0,1.3,.6],[0,0,0],1]];
    M.tint=[.85,.9,1.15];M.circle=[.45,.5,.7];
    M.fx=(dt,t)=>{for(const b of M.braz){M['f'+b[0]]=(M['f'+b[0]]||0)+dt*40;while(M['f'+b[0]]>1){M['f'+b[0]]--;emit({p:[b[0]+rnd(-.15,.15),b[1],b[2]+rnd(-.12,.12)],v:[rnd(-.05,.05),rnd(.6,1.2),rnd(-.05,.05)],life:rnd(.3,.6),s0:.1,s1:.18,c0:[4,1.6,.4],c1:[1,.2,.05],sh:3,a0:.9,a1:0})}}
      M.acc=(M.acc||0)+dt*3;while(M.acc>1){M.acc--;emit({p:[rnd(-6,6),rnd(2,4),rnd(-3,1)],v:[rnd(.2,.5),rnd(-.05,.05),0],life:rnd(3,5),s0:.01,s1:.01,c0:[1.5,1.6,2],sh:1,a0:.5,a1:0,fadeIn:.3})}}}
  else if(id==='dragon'){
    M.sky=paintSky('dragon');M.lava=lavaTex();
    const rock=stone([.32,.22,.2],[2,2]);
    put(lathe([[0,0],[4.2,0],[4.4,-.1],[0,-.1]],40),ground([.36,.26,.24],[7,7]),M4.sc(1.2,1,.62));
    put(plane2(40,30),mat({col:lin('#1a100c'),alb:PT.floor_d,nor:PT.floor_n,rep:[8,6],rou:.95}),M4.tr(0,-.03,-3));put(plane2(40,2.2),mat({col:[0,0,0],rou:1,emi:V.sc(lin('#ff5a14'),.8)}),M4.tr(0,-.02,-5.4));
    for(let k=0;k<22;k++){const x=(Math.random()-.5)*14,z=-3.2-Math.random()*4,h=1+Math.random()*3.2,r=.2+Math.random()*.45;if(Math.abs(x)<1.2&&z>-4)continue;put(lathe([[r,0],[r*.7,h*.4],[r*.3,h*.85],[0,h]],9),rock,M4.tr(x,-.2,z))}
    for(const sx of[-1,1])for(let k=0;k<4;k++){const x=sx*(4.6+k*.5),z=-1.5+k*.6,h=1.5+Math.random()*2;put(lathe([[.4,0],[.28,h*.5],[0,h]],9),rock,M4.tr(x,0,z))}
    const boneM=mat({col:lin('#8a7c66'),rou:.75});
    for(let i=0;i<7;i++){const x=-4.4+i*.42,p=[];for(let j=0;j<=12;j++){const a=j/12*PI;p.push([x,Math.sin(a)*1.6,-2.6+Math.cos(a)*1.1])}put(tube(p,u=>.06*(1-Math.abs(u-.5)*.6),6),boneM)}
    put(tube([[-4.6,.1,-2.6],[-1.6,.15,-2.6]],.09,8),boneM);put(sphere(.55,16,12),boneM,M4.chain(M4.tr(-5.1,.4,-2.2),M4.sc(1.3,.8,1)));
    for(const sx of[-1,1])put(tube([[-5.3,.6,-2.2+sx*.3],[-5.7,1.2,-2.2+sx*.5],[-5.5,1.7,-2.2+sx*.7]],u=>.08*(1-u*.8),6),boneM);
    const twig=mat({col:lin('#3a2416'),alb:PT.bark_d,rep:[1,2],rou:.9});
    for(let k=0;k<40;k++){const a=Math.random()*TAU,p=[];for(let i=0;i<=4;i++)p.push([3.6+Math.cos(a+i*.25)*(.9+Math.random()*.15),.1+i*.05+Math.random()*.1,-2.4+Math.sin(a+i*.25)*(.6+Math.random()*.1)]);put(tube(p,.03,4),twig)}
    M.eggs=[[3.4,.42,-2.4],[3.85,.4,-2.25],[3.65,.38,-2.7]];for(const e of M.eggs)put(sphere(.26,16,12),mat({col:lin('#5a1612'),met:.3,rou:.3,emT:TEX.crack,emTCol:[3,.9,.2]}),M4.chain(M4.tr(e[0],e[1],e[2]),M4.sc(1,1.35,1)));
    put(lathe([[0,0],[1.4,0],[1.0,.35],[.4,.6],[0,.68]],24),mat({col:lin('#e8b040'),met:1,rou:.3,emi:lin('#301800')}),M4.chain(M4.tr(-2.8,-.05,-3.6),M4.sc(1,1,.6)));
    M.lights=t=>[[[0,-.2,-5],V.sc([6,2,.5],.85+.15*Math.sin(t*1.7)),.03],[[3.6,.9,-2.4],[2.4,.7,.15],.6],[[-3,3,3],[.55,.35,.3],.02],[[3,2.5,2],[.6,.3,.2],.03],[[0,1.3,.6],[0,0,0],1]];
    M.tint=[1.25,.8,.6];M.circle=[.7,.35,.2];
    M.fx=(dt,t)=>{M.acc=(M.acc||0)+dt*18;while(M.acc>1){M.acc--;emit({p:[rnd(-6,6),rnd(-.1,.3),rnd(-6,1)],v:[rnd(-.1,.1),rnd(.3,.9),rnd(-.05,.05)],life:rnd(1.5,3),s0:.016,s1:.006,c0:[5,1.6,.3],sh:1,a0:1,a1:0})}
      M.acc2=(M.acc2||0)+dt*1.5;while(M.acc2>1){M.acc2--;emit({p:[rnd(-5,5),.2,rnd(-5,-2)],v:[rnd(-.05,.05),rnd(.2,.4),0],life:rnd(4,6),s0:.6,s1:1.8,c0:[.08,.04,.03],sh:0,a0:.5,a1:0,fadeIn:.3})}}}
  M.parts=parts;MAPS[id]=M;return M}
// 맵 그리기 (불투명 지형). 기존 지하 투기장은 duelFrame이 그대로 그림
function drawMap(id,t){const M=buildMap(id),X=window.__F3X;M.parts.forEach((p,i)=>{if(X&&X.keep&&(i<X.keep[0]||i>=X.keep[1]))return;drawPBR(p.m,p.mat,p.M)})}
function drawMapSky(id,t){const M=MAPS[id];if(!M||!M.sky||(window.__F3X&&window.__F3X.nosky))return;drawDecal(M4.chain(M4.tr(0,3,-10),M4.sc(16,8,1)),M.sky,[1,1,1],1,3);
  if(M.lava){drawDecal(M4.chain(M4.tr(0,.004,-.6),M4.rx(-PI/2),M4.rz(.3),M4.sc(3.2,1.6,1)),M.lava,V.sc([2.2,.6,.1],.3+.1*Math.sin(t*2)),1,0)}}
