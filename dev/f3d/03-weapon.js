
/* ---------------- 무기 (절차적 판타지 무기) ---------------- */
function mat(o){return Object.assign({orm:0,emRGB:0,nor:null,rgh:null,norS:1,col:[.5,.5,.5],met:0,rou:.5,emi:[0,0,0],emGrad:0,edge:0,edgeCol:[0,0,0],emT:null,emTCol:[0,0,0],alb:null,rep:[1,1],envI:1,alpha:1,fog:1},o)}
const TRIM={fire:'#e0a050',ice:'#d6e8f4',thunder:'#ecc84e',dark:'#5a4a70',holy:'#f4d890'};
const CORD={fire:'#8e1f2a',ice:'#1f3f7a',thunder:'#2c2a70',dark:'#1a1020',holy:'#efe9da'};
const bump=(t,c,w)=>Math.max(0,1-Math.abs(t-c)/w);
const tri=x=>2*Math.abs(2*(x-Math.floor(x+.5)))-1;
const fr=x=>x-Math.floor(x);
function palette(el,lv){
  const E=H.ELS[el],M=H.METALS[clamp(lv,1,20)-1],tE=lv<5?0:Math.min(.42,(lv-4)/26);
  const c=lin(E.c),l=lin(E.l);
  let blade=cmix(lin(M[2]),l,tE),bm=1,br=lv<=1?.62:lv<=2?.5:Math.max(.1,.36-lv*.012);
  if(el==='dark'&&lv>=8){blade=cmix(lin('#3a3046'),blade,.25);br=.13}
  if(el==='ice'&&lv>=12){blade=lin('#cbeeff');bm=.35;br=.05}
  if(el==='holy'&&lv>=12){blade=lin('#fff4d8');br=.08}
  if(el==='fire'&&lv>=10)blade=cmix(blade,lin('#c8603a'),.35);
  const trimBase=lv<4?cmix(lin(M[1]),lin('#7a7f88'),.5):cmix(lin('#a8834e'),lin(TRIM[el]),clamp((lv-4)/7,0,1));
  const trim=lv>=15?cmix(trimBase,lin('#fff6e0'),.35):trimBase;
  const gemI=lv>=4?.7+lv*.2:0;
  return{
    blade:mat({nor:PT.steel_n,norS:.18,rgh:PT.steel_r,rep:[1,5],col:blade,met:bm,rou:br,edge:lv>=5?(lv-4)*.24:0,edgeCol:c,emT:lv>=7?((el==='dark'||el==='fire')&&lv>=9?TEX.crack:TEX.rune):null,emTCol:V.sc(c,lv>=7?(lv-6)*.55:0),emi:el==='ice'&&lv>=12?V.sc(c,.25):[0,0,0]}),
    trim:mat({col:trim,met:1,rou:lv<4?.45:.22}),
    trimD:mat({col:V.sc(trim,.45),met:1,rou:.35,rgh:PT.steel_r,rep:[1,4]}),
    core:mat({col:lin('#16121c'),met:.2,rou:.6}),
    cord:mat({alb:PT.leather_d,nor:PT.leather_n,rep:[1,2],col:lv<3?[1,1,1]:V.sc(lin(CORD[el]),2.2),met:0,rou:.75}),
    gem:mat({col:c,met:0,rou:.04,emi:V.sc(c,gemI)}),
    glow:mat({col:[0,0,0],met:0,rou:1,emi:V.sc(c,2.5+lv*.25)}),
    wood:mat({col:[1,1,1],alb:PT.planks_d,nor:PT.planks_n,rep:[1,6],met:0,rou:.7}),
    cloth:mat({col:lv<10?lin('#8e1f2a'):cmix(lin('#8e1f2a'),c,.5),met:0,rou:.85,emi:lv>=12?V.sc(c,.4):[0,0,0],emGrad:1})}
}
function Batches(){const B={};return{B,add(k,g,m){if(!B[k])B[k]=G();merge(B[k],g,m||null)}}}
const gemGeo=(r,h)=>lathe([[0,-h],[r,0],[r*.62,h*.45],[0,h*.45]],8,{flat:1,phase:PI/8});
function gemFace(wb,x,y,z,r,dir){wb.add('gem',gemGeo(r,r*1.1),M4.chain(M4.tr(x,y,z),M4.rx(dir>0?PI/2:-PI/2)))}
/* 칼날 형상 */
function swordBlade(type,el,lv,F){
  const dag=type==='dagger',tp=F.taper??.22,L=(dag?.42+lv*.006:.76+lv*.0145)*(F.lenM||1),hw=(dag?.052:.041)*F.wm*(1+lv*.01),th=hw*.26;
  const tl=F.tip==='l'?.32:F.tip==='c'?.15:.21;
  const tip=t=>{if(t<=1-tl)return 1;const u=(1-t)/tl;switch(F.tip){case'c':return Math.sqrt(u);case'l':return Math.pow(u,1.5);case's':return u<.5?u*1.3:.65+(u-.5)*.7;case'f':return u*(1+.45*Math.sin(PI*u));default:return u}};
  const base=t=>(dag?1-(.3+tp*.6)*t:1-tp*t)*(1+F.leaf*1.5*Math.sin(PI*Math.pow(t,1.15)))*(el==='holy'?1+.38*Math.exp(-t*13):1)*tip(t);
  const k=clamp((lv-2)/6,0,1);
  const side=(t,s)=>{let m=1;
    if(el==='ice'&&lv>=5&&t>.12&&t<.82)m+=Math.max(0,1-fr(t*(5+lv*.25))*3)*.32;
    if(el==='dark'&&lv>=4&&s<0&&t>.1&&t<.75)m+=Math.pow(Math.max(0,1-fr(t*(6+lv*.2))*2.4),2)*.55;
    if(el==='thunder'&&lv>=6&&t>.1&&t<.85)m+=Math.max(0,tri(t*9))*.18;
    if(F.serr&&s<0&&t>.08&&t<.6)m+=Math.max(0,1-fr(t*26)*2)*.2;
    for(let i=0;i<F.spikes;i++)m+=bump(t,.1+i*.09,.03)*.55;
    if(F.notch&&s>0)m-=bump(t,.14,.05)*.35;
    return Math.max(.05,m)};
  const xc=t=>{let x=(F.curve||0)*hw*5*t*t;if(el==='fire'&&lv>=3)x+=Math.sin(t*PI*(3+lv*.22))*hw*.16*k*(1-t*.5);if(el==='thunder'&&lv>=3)x+=tri(t*(2.5+lv*.12))*hw*.2*k;if(el==='dark'&&dag)x+=t*t*hw*1.4;if(dag&&el==='fire')x+=Math.sin(t*PI*5)*hw*.18;return x};
  const ful=lv>=3&&!(el==='ice'&&lv>=12);
  const g=blade(L,t=>hw*base(t)*side(t,-1),t=>hw*base(t)*side(t,1),t=>Math.max(.0012,th*(1-.5*t)*Math.min(1,tip(t)*2.5)),xc,t=>ful?smooth(.02,.07,t)*(1-smooth(.5,.62,t)):0,dag?60:90);
  return{g,L,hw,th}}
/* 날밑 외곽선 */
function guardOutline(W,Hh,el,lv){const n=26,T=[],Bt=[];
  for(let i=0;i<=n;i++){const u=i/n,x=u*W;let c=0,h=Hh*(1-.3*u);
    if(el==='holy'){c=Hh*2.4*u*u;h*=1+.7*smooth(.55,.95,u)}
    else if(el==='fire'){c=Hh*1.6*u*u+Math.sin(u*PI*2.6)*Hh*.45*u;h*=1-.75*smooth(.72,1,u)}
    else if(el==='ice'){h*=1+1.5*bump(u,.84,.14)}
    else if(el==='thunder'){c=tri(u*3)*Hh*.8*u}
    else{c=-Hh*2.2*u*u;h*=1+.9*bump(u,.55,.12)}
    if(i===n)h=el==='holy'?h*.6:Hh*.08;
    T.push([x,c+h]);Bt.push([x,c-h])}
  const o=[];for(let i=0;i<=n;i++)o.push(T[i]);for(let i=n;i>=0;i--)o.push(Bt[i]);for(let i=1;i<=n;i++)o.push([-Bt[i][0],Bt[i][1]]);for(let i=n;i>=1;i--)o.push([-T[i][0],T[i][1]]);
  return{o,tip:[W,(T[n][1]+Bt[n][1])/2]}}
function spiral(cx,cy,z,r0,turns,dir){const p=[];for(let i=0;i<=40;i++){const t=i/40,a=t*turns*TAU,r=r0*(1-t*.82);p.push([cx+Math.cos(a*dir)*r*dir,cy+Math.sin(a*dir)*r,z])}return p}
function hilt(wb,el,lv,F,hw,th,dag){
  const g=F.g,W=hw*(2.1+g*.2)+.028,Hh=.0105+g*.0011,dep=.036+g*.0012;
  // 날밑
  const go=guardOutline(W,Hh,el,lv);wb.add('trim',extrude(go.o,{depth:dep,bevel:.0045}));
  // 가운데 문장
  const ch=Hh*(2+g*.12),cw=Hh*(1.5+g*.08);const emb=[];const k=g>=6?8:4;for(let i=0;i<k;i++){const a=i/k*TAU+PI/2;emb.push([Math.cos(a)*cw*(i%2&&k===8?.75:1),Math.sin(a)*ch*(Math.sin(a)<0?1.25:1)])}
  wb.add('trim',extrude(emb,{depth:dep*1.45,bevel:.004}));
  if(lv>=4){gemFace(wb,0,0,dep*.72,cw*.48,1);gemFace(wb,0,0,-dep*.72,cw*.48,-1)}
  if(g>=4)for(const sd of[1,-1])for(const zz of[1,-1]){const p=spiral(sd*W*.46,el==='holy'?Hh*.9:0,zz*(dep/2+.002),Hh*1.25,1.6,sd);wb.add('trim',tube(p,t=>.0024*(1-t*.5),5))}
  if(g>=6&&el!=='fire'&&el!=='dark')for(const sd of[1,-1])wb.add('trim',sphere(Hh*.95,12,8),M4.tr(sd*go.tip[0],go.tip[1],0));
  if(lv>=9)for(const sd of[1,-1])gemFace(wb,sd*W*.62,el==='holy'?Hh*1.4*.6:el==='dark'?-Hh*.8:0,dep*.5,Hh*.55,1);
  // 하바키
  wb.add('trim',extrude([[-hw*1.08,0],[hw*1.08,0],[hw*.98,.03],[-hw*.98,.03]],{depth:th*2.6+.008,bevel:.002}),M4.tr(0,Hh*.6,0));
  // 손잡이
  const GL=dag?.12:.2+lv*.002,R=dag?.0145:.0165;
  const pr=[];for(let i=0;i<=10;i++){const u=i/10;pr.push([R*(1+.09*Math.sin(PI*u)),-GL+u*GL])}
  wb.add('core',lathe([[0,-GL],...pr,[0,0]],16));
  if(lv>=3){const turns=GL/.034;for(const hand of[1,-1])for(const ph of[0,PI]){const p=[];for(let i=0;i<=60;i++){const u=i/60,a=ph+hand*u*turns*TAU,r=R*(1+.09*Math.sin(PI*u))*1.05;p.push([Math.cos(a)*r,-GL+u*GL,Math.sin(a)*r])}wb.add('cord',tube(p,R*.3,5))}}
  else{const rb=[];for(let i=0;i<=24;i++){const u=i/24;rb.push([R*1.06*(1+.05*Math.abs(Math.sin(u*PI*12))),-GL+u*GL])}wb.add('cord',lathe(rb,14))}
  const ring=(y,h,r)=>wb.add('trim',lathe([[r*.9,y-h/2],[r,y-h*.3],[r,y+h*.3],[r*.9,y+h/2]],18),null);
  ring(-.005,.014,R*1.32);ring(-GL+.006,.014,R*1.32);if(lv>=8)ring(-GL/2,.01,R*1.22);
  if(lv>=10){for(let i=0;i<3;i++)wb.add('glow',sphere(.0035,8,6),M4.tr(0,-GL*(.25+i*.25),R*1.25))}
  // 폼멜
  const py=-GL-.006,v=lv<2?0:(F.pom??lv%4),pr2=dag?.02:.024;
  if(v===0)wb.add('trim',sphere(pr2,18,12),M4.tr(0,py-pr2*.8,0));
  else if(v===1)wb.add('trim',lathe([[0,py-pr2*2.2],[pr2,py-pr2*1.1],[pr2*.75,py-pr2*.2],[0,py]],8,{flat:1}));
  else if(v===2)wb.add('trim',lathe([[0,py-pr2*.9],[pr2*1.25,py-pr2*.7],[pr2*1.3,py-pr2*.35],[pr2*.6,py],[0,py]],20,{hard:1}));
  else{wb.add('trim',sphere(pr2*.85,16,10),M4.tr(0,py-pr2*.8,0));wb.add('trim',lathe([[pr2*.5,py-pr2*1.4],[0,py-pr2*3]],10),null)}
  if(lv>=6){gemFace(wb,0,py-pr2*.85,pr2*.75,pr2*.45,1);gemFace(wb,0,py-pr2*.85,-pr2*.75,pr2*.45,-1)}
  if(lv>=12)for(let i=0;i<6;i++){const a=i/6*TAU;wb.add('trim',lathe([[pr2*.3,0],[0,pr2*1.4]],6),M4.chain(M4.tr(Math.cos(a)*pr2*.7,py-pr2*.8,Math.sin(a)*pr2*.7),M4.rz(-Math.cos(a)*1.2),M4.rx(Math.sin(a)*1.2)))}
  return{GL,bot:py-pr2*2.4,guardW:W,dep}}
/* 깃털 날개 */
function featherOutline(len,wid,st){const o=[],n=12;
  for(let i=0;i<=n;i++){const t=i/n;let w=wid*Math.sin(PI*Math.pow(t,.62))*(1-.15*t);if(st==='ice')w=wid*(t<.7?t/.7:(1-t)/.3)*.9;if(st==='dark')w*=1+.35*Math.max(0,tri(t*4));if(st==='fire')w*=1+.2*Math.sin(t*PI*4);o.push([w,t*len])}
  for(let i=n-1;i>0;i--){const t=i/n;let w=wid*.55*Math.sin(PI*Math.pow(t,.62))*(1-.15*t);if(st==='ice')w=wid*.5*(t<.7?t/.7:(1-t)/.3);o.push([-w,t*len])}
  return o}
function wingGeo(el,lv){const g=G(),n=7+Math.floor((lv-10)/1.4),span=.4+(lv-10)*.03;
  for(const sd of[1,-1])for(let row=0;row<3;row++){const m=row===0?n:row===1?n-1:n-2;
    for(let i=0;i<m;i++){const u=Math.min(1,(i+(row?.5:0))/(n-1)),ax=.03+span*u*.95,ay=.03+span*.5*Math.sin(Math.min(1,u*1.08)*PI*.78);
      const a0=lerp(-1.7,-.22,Math.pow(u,1.15))+(el==='dark'?-.15:el==='holy'?.08:0),ang=a0+row*.28,len=span*lerp(.34,.98,Math.pow(u,.85))*(row===0?1:row===1?.6:.34),wid=len*(el==='ice'?.13:.16);
      const f=extrude(featherOutline(len,wid,el),{depth:.006,bevel:.0016});
      merge(g,f,M4.chain(M4.sc(sd,1,1),M4.tr(ax,ay,-.045+row*.008-i*.0015),M4.rz(ang-PI/2)))}
    }
  for(const sd of[1,-1]){const p=[];for(let i=0;i<=20;i++){const u=i/20;p.push([sd*(.03+span*u*.95),.03+span*.5*Math.sin(Math.min(1,u*1.08)*PI*.78),-.035])}merge(g,tube(p,u=>.012*(1-u*.7),6))}
  return g}
function wingMat(el,lv){const k=1+(lv-10)*.13,c=lin(H.ELS[el].c);
  return{holy:mat({col:lin('#f6e3b0'),met:1,rou:.22,emi:V.sc(lin('#ffd98a'),.55*k),emGrad:1}),fire:mat({col:lin('#5a160a'),met:.6,rou:.3,emi:V.sc(c,2*k),emGrad:1}),
    ice:mat({col:lin('#d4f0ff'),met:.35,rou:.06,emi:V.sc(c,.8*k),emGrad:1}),thunder:mat({col:lin('#e8c860'),met:1,rou:.2,emi:V.sc(c,1.2*k),emGrad:1}),
    dark:mat({col:lin('#1a1322'),met:.9,rou:.16,emi:V.sc(c,1.4*k),emGrad:1})}[el]}
/* ---- Codex 에셋 팩 무기 ----
   28개 메쉬(7종×4단계)를 쓰고, 속성은 팔레트 색조와 발광으로 표현한다.
   팩이 아직 안 받아졌거나 꺼져 있으면 null을 돌려주고 기존 절차 생성으로 넘어간다. */
const PACK_TYPES={sword:1,dagger:1,spear:1,axe:1,saber:1,shinai:1,scythe:1};
const packTier=lv=>lv<=5?1:lv<=10?2:lv<=15?3:4;
function packWeaponName(type,lv){return PACK_TYPES[type]?type+'-t'+packTier(Math.max(1,lv)):null}
// 속성별 색조 (팔레트 기본은 강철+청동이라, 날은 속성색 쪽으로 물들이고 발광도 속성색)
function packTint(el,lv,hidden,type){
  if(hidden){const c=type==='saber'?lin(H.SABER_C[lv]||'#fff'):type==='shinai'?lin(H.SHINAI_P[lv][1]):lin(H.SCYTHE_C[lv]||'#9aa');
    return{col:V.mix([1,1,1],c,.5),emi:V.sc(c,1.4+lv*.12)}}
  const E=H.ELS[el]||H.ELS.fire,c=lin(E.c),l=lin(E.l),k=(packTier(lv)-1)/3;// 단계 구간 단위로 묶어 썸네일 재사용
  // 팔레트 기본이 짙은 강철이라 약하게 섞으면 속성이 안 보인다. 밝은 속성색으로 세게 곱하고 발광을 올린다.
  const tint=V.sc(V.mix(c,l,.45),1.5+k*.7);
  return{col:V.mix([.55,.55,.55],tint,.85),emi:V.sc(c,1.2+k*3.4)}
}
function buildPackWeapon(w){
  const type=w.type,lv=Math.max(1,w.lv||1),nm=packWeaponName(type,lv);if(!nm)return null;
  const K=packReady(nm);if(!K){loadPack(nm);return null}
  const hidden=type==='saber'||type==='shinai'||type==='scythe';
  const B=K.bounds,top=B[1][1],bot=B[0][1],xr=Math.max(Math.abs(B[0][0]),Math.abs(B[1][0]),Math.abs(B[0][2]),Math.abs(B[1][2]));
  const T=packTint(w.el,lv,hidden,type);
  const m=Object.assign({},K.mat,{col:T.col,emTCol:T.emi});
  const R={type,lv,el:w.el,hidden,pack:nm,
    batches:K.parts.map(p=>({m:{vao:K.vao,n:p.count,off:p.start},mat:m})),
    mats:{},top,bot,gripY:0,hitY:top*.42,wingY:0,ringY:top*.45,
    aura:{y0:Math.max(.04,top*.08),y1:top*.95,w:Math.max(.02,xr*.5)},
    bladeW:Math.max(.02,xr*.45),xr,
    offH:{spear:.3,axe:.26,scythe:.32,shinai:.12,sword:0,dagger:0,saber:0}[type]||0};
  R.len=R.top-R.bot;R.mid=(R.top+R.bot)/2;
  return R}
/* 무기 생성 */
function buildWeapon(w){
  if(H.usePack&&H.usePack()&&w&&w.type&&w.type!=='blank'){const P=buildPackWeapon(w);if(P)return P}
  if(H.usePack&&H.usePack()&&w&&(!w.type||w.type==='blank')){const K=packReady('iron-ingot-0');
    if(K){const B=K.bounds,top=B[1][1],bot=B[0][1];
      const R={type:'blank',lv:0,el:w&&w.el||'fire',hidden:false,pack:'iron-ingot-0',
        batches:K.parts.map(p=>({m:{vao:K.vao,n:p.count,off:p.start},mat:Object.assign({},K.mat,{emTCol:[2.2,.7,.12]})})),
        mats:{},top,bot,gripY:0,hitY:(top+bot)/2,wingY:0,ringY:0,aura:null,bladeW:.04,offH:0};
      R.len=R.top-R.bot;R.mid=(R.top+R.bot)/2;return R}
    loadPack('iron-ingot-0')}
  return buildWeapon0(w)}
function buildWeapon0(w){
  const type=w.type||'blank',lv=w.lv||0,el=w.el||'fire';const wb=Batches();let R={type,lv,el,hidden:type==='saber'||type==='shinai'||type==='scythe'};
  if(type==='blank'){
    const o=[];for(let i=0;i<24;i++){const a=i/24*TAU,cx=Math.cos(a)>0?.13:-.13,cy=Math.sin(a)>0?.012:-.012;o.push([cx+Math.cos(a)*.05,cy+Math.sin(a)*.026])}
    wb.add('ingot',extrude(o,{depth:.12,bevel:.016}),M4.rz(PI/2));
    R.mats={ingot:mat({col:lin('#3a302c'),met:.5,rou:.6,emi:lin('#ff6a1a')})};Object.assign(R,{top:.2,bot:-.2,hitY:0,wingY:0,ringY:0,aura:null});
  }
  else if(ARCH_B[type+'_'+el]&&(type==='sword'||type==='dagger'||type==='spear'||type==='axe')){const P=palette(el,lv);ARCH_B[type+'_'+el](wb,R,lv,P);R.mats=P;R.arch=type+'_'+el}
  else if(type==='sword'||type==='dagger'){
    const F=H.formOf(type,el,lv),P=palette(el,lv),b=swordBlade(type,el,lv,F);
    wb.add('blade',b.g,M4.tr(0,.022,0));
    if(F.holes)for(let i=0;i<F.holes;i++){const y=.022+b.L*(.12+i*.1);gemFace(wb,0,y,b.th*1.1,b.hw*.24,1);gemFace(wb,0,y,-b.th*1.1,b.hw*.24,-1)}
    const h=hilt(wb,el,lv,F,b.hw,b.th,type==='dagger');
    R.mats=P;Object.assign(R,{top:.022+b.L,bot:h.bot,hitY:.022+b.L*.42,wingY:0,ringY:b.L*.45,aura:{y0:.05,y1:b.L*.95,w:b.hw},bladeW:b.hw});
  }
  else if(type==='spear'){
    const F=H.formOf('spear',el,lv),P=palette(el,lv),SL=1.08+lv*.006;
    const F2=Object.assign({},F,{leaf:F.leaf+.22,spikes:Math.min(F.spikes,2)});
    const hb=(function(){const L=(.24+lv*.0075)*(F.lenM||1),hw=.042*F.wm,tb=hw*.26;const tl=.3;const tip=t=>t<1-tl?1:Math.pow((1-t)/tl,F.tip==='l'?1.4:1);
      const base=t=>(1-(.15+(F.taper||0)*.5)*t)*(1+F2.leaf*1.4*Math.sin(PI*Math.pow(t,1.3)))*tip(t);
      return{g:blade(L,t=>hw*base(t)*(1+(el==='ice'&&lv>=5?Math.max(0,1-fr(t*7)*3)*.3:0)),t=>hw*base(t)*(1+(el==='dark'&&lv>=4?Math.max(0,1-fr(t*6)*2.5)*.4:0)),t=>Math.max(.001,tb*(1-.5*t)*Math.min(1,tip(t)*2.5)),t=>(F.curve||0)*hw*1.2*t*t+(el==='fire'&&lv>=3?Math.sin(t*PI*4)*hw*.14:0)+(el==='thunder'&&lv>=3?tri(t*3)*hw*.18:0),t=>lv>=3?smooth(.05,.1,t)*(1-smooth(.5,.6,t)):0,60),L,hw,tb}})();
    wb.add('blade',hb.g,M4.tr(0,.05,0));
    wb.add('trim',lathe([[.019,-.1],[.022,-.06],[.02,-.02],[.016,.03],[.012,.06],[0,.065]],18));
    const shaftMat=lv<6?'wood':'trimD';wb.add(shaftMat,lathe([[0,-SL],[.0165,-SL],[.0165,-.09],[0,-.09]],14));
    if(lv>=6)for(let y=-.3;y>-SL+.1;y-=.22)wb.add('trim',lathe([[.019,y-.008],[.021,y],[.019,y+.008]],16));
    if(lv>=4){const p0=-.5,p1=-.78;for(const hand of[1,-1])for(const ph of[0,PI]){const p=[];for(let i=0;i<=50;i++){const u=i/50,a=ph+hand*u*9*TAU;p.push([Math.cos(a)*.0175,p0+(p1-p0)*u,Math.sin(a)*.0175])}wb.add('cord',tube(p,.005,5))}}
    if(lv>=4){const go=guardOutline(.055+lv*.0028,.009,el,lv);wb.add('trim',extrude(go.o,{depth:.026,bevel:.003}),M4.tr(0,.02,0));gemFace(wb,0,.02,.016,.008,1);gemFace(wb,0,.02,-.016,.008,-1)}
    if(lv>=10)for(const sd of[1,-1]){const c=[],r0=.05+lv*.002;for(let i=0;i<=14;i++){const a=-1.1+i/14*2.2;c.push([.02+Math.cos(a)*r0*1.4,.06+Math.sin(a)*r0])}for(let i=14;i>=0;i--){const a=-1+i/14*2;c.push([.02+Math.cos(a)*r0*.95,.06+Math.sin(a)*r0*.75])}
      wb.add('blade',extrude(c,{depth:.012,bevel:.003,depthFn:(x)=>lerp(.016,.004,smooth(.03,.09,x))}),M4.sc(sd,1,1))}
    if(lv>=7){for(let i=0;i<7;i++){const a=i/7*TAU,p=[];for(let k=0;k<=8;k++){const u=k/8;p.push([Math.cos(a)*.016*(1+u*1.2),-.08-u*.13,Math.sin(a)*.016*(1+u*1.2)])}wb.add('cloth',tube(p,u=>.004*(1-u*.4),4))}}
    wb.add('trim',lathe([[0,-SL-.07],[.012,-SL-.02],[.018,-SL+.01],[.016,-SL+.03],[0,-SL+.03]],14));
    R.mats=P;Object.assign(R,{top:.05+hb.L,bot:-SL-.07,hitY:.05+hb.L*.4,wingY:0,ringY:.15,aura:{y0:.06,y1:.05+hb.L*.9,w:hb.hw},bladeW:hb.hw});
  }
  else if(type==='axe'){
    const F=H.formOf('axe',el,lv),P=palette(el,lv),AL=.86+lv*.004,Rh=(.13+lv*.0055)*(.9+F.wm*.08),beard=1+F.leaf*.9-F.taper*.7,crown=1+Math.max(0,F.curve)*.9;
    const o=[[.022,.05],[.07,.055]];const n=24;
    for(let i=0;i<=n;i++){const t=i/n,a=lerp(1.25,-1.25,t);let rr=Rh;
      if(el==='thunder'&&lv>=4)rr*=1-.12*bump(t,.5,.08);if(el==='ice'&&lv>=4&&i%3===1)rr*=1.06;if(el==='fire'&&lv>=4)rr*=1+.04*Math.sin(t*PI*6);
      let x=.03+Math.cos(a)*rr*.95,y=Math.sin(a)*rr*1.3*(a>0?crown:beard);if(el==='dark'&&t>.75)y-=(t-.75)*Rh*.9,x-=(t-.75)*Rh*.25;if(el==='holy'&&t<.25)y+=(.25-t)*Rh*.7;o.push([x,y])}
    o.push([.07,-.055],[.022,-.05]);
    const xmax=.03+Rh*.95;const head=extrude(o,{depth:.05,bevel:.004,depthFn:x=>lerp(.05,.007,smooth(.06,xmax,x))});
    wb.add('blade',head);if(lv>=9)wb.add('blade',head,M4.sc(-.9,.9,1));
    else if(lv>=4)wb.add('blade',extrude([[-.02,.03],[-.02,-.03],[-.1-lv*.004,0]],{depth:.03,bevel:.003,depthFn:x=>lerp(.03,.004,smooth(-.02,-.1,x))}));
    if(lv>=5){const p=[];for(let i=0;i<=40;i++){const t=i/40,a=lerp(1.2,-1.2,t);p.push([.03+Math.cos(a)*Rh*.96,Math.sin(a)*Rh*1.3*.985*(a>0?crown:beard),0])}wb.add('glow',tube(p,.0028,5));if(lv>=9)wb.add('glow',tube(p,.0028,5),M4.sc(-.9,.9,1))}
    wb.add('trim',lathe([[.024,-.075],[.028,-.06],[.028,.06],[.024,.075],[0,.075]],16,{hard:1}));
    if(lv>=4){gemFace(wb,0,0,.03,.012,1);gemFace(wb,0,0,-.03,.012,-1)}
    if(lv>=3){const tb=blade(.1+lv*.005,t=>.016*(1-t),t=>.016*(1-t),t=>.006*(1-t*.7),()=>0,()=>0,20);wb.add('blade',tb,M4.tr(0,.075,0))}
    wb.add(lv<6?'wood':'trimD',lathe([[0,-AL],[.019,-AL],[.02,-.3],[.018,.07],[0,.07]],14));
    if(lv>=3){for(const hand of[1,-1])for(const ph of[0,PI]){const p=[];for(let i=0;i<=50;i++){const u=i/50,a=ph+hand*u*8*TAU;p.push([Math.cos(a)*.0205,-AL+.04+u*.24,Math.sin(a)*.0205])}wb.add('cord',tube(p,.0055,5))}}
    wb.add('trim',lathe([[0,-AL-.035],[.022,-AL-.02],[.025,-AL+.01],[.02,-AL+.02],[0,-AL+.02]],16));
    if(lv>=6)gemFace(wb,0,-AL-.012,.024,.009,1);
    R.mats=P;Object.assign(R,{top:Math.max(.075+(lv>=3?.1+lv*.005:0),Rh*1.3),bot:-AL-.035,hitY:0,wingY:-.06,ringY:0,aura:{y0:-Rh,y1:Rh,w:Rh,axe:1},bladeW:.05});
  }
  else if(type==='saber'){
    const col=H.SABER_C[lv]||'#ffffff',HL=.26;
    const P={trim:mat({col:lin(lv>=12?'#2a2a30':'#c8ccd4'),met:1,rou:.25}),trimD:mat({col:lin('#1a1a1e'),met:.8,rou:.4}),gem:mat({col:lin(col),emi:V.sc(lin(col),3)}),glow:mat({col:[0,0,0],emi:[6,6,6]})};
    const pr=[[0,-HL],[.022,-HL],[.022,-HL+.02],[.019,-HL+.03]];for(let i=0;i<7;i++){const y=-HL+.05+i*.022;pr.push([.019,y],[.0215,y+.004],[.0215,y+.014],[.019,y+.018])}pr.push([.019,-.05],[.024,-.03],[.026,0],[.016,.01],[0,.01]);
    wb.add('trim',lathe(pr,20));wb.add('trimD',box(.012,.05,.012),M4.tr(0,-.06,.022));wb.add('gem',box(.008,.012,.006),M4.tr(0,-.06,.029));
    if(lv>=7)for(const sd of[1,-1])wb.add('trim',lathe([[0,0],[.01,0],[.01,.05],[0,.05]],10),M4.chain(M4.tr(sd*.024,-.012,0),M4.rz(-sd*PI/2)));
    const BL=lv===0?0:.34+lv*.034,dbl=lv>=11;
    if(BL>0){const cap=[[0,0],[.011,.0],[.011,BL-.01],[.007,BL-.002],[0,BL]];wb.add('glow',lathe(cap,10),M4.tr(0,.01,0));if(dbl)wb.add('glow',lathe(cap,10),M4.chain(M4.tr(0,-HL,0),M4.sc(1,-1,1)))}
    R.mats=P;Object.assign(R,{top:.01+BL,bot:dbl?-HL-BL:-HL,hitY:BL>0?BL*.4:0,wingY:0,ringY:BL*.45,aura:BL>0?{y0:.02,y1:BL,w:.012}:null,saber:{BL,col,dbl,HL},bladeW:.02});
  }
  else if(type==='shinai'){
    const p=H.SHINAI_P[lv]||['#c9b27a','#e8d6a0'],b=lin(p[0]),l=lin(p[1]),BL=.86,GL=.27;
    const P={bamboo:mat({col:b,met:0,rou:.45,emi:lv>=10?V.sc(l,(lv-9)*.12):[0,0,0],emGrad:.6}),leather:mat({col:lin('#efe6d6'),met:0,rou:.75}),tsuba:mat({col:lin(lv>=12?'#d9b25a':'#1a1612'),met:lv>=12?1:0,rou:.4}),string:mat({col:lin(lv>=12?'#d9b25a':'#e8e0cc'),rou:.8}),gem:mat({col:l,emi:V.sc(l,lv>=8?2:0)})};
    wb.add('bamboo',lathe([[0,0],[.0165,0],[.0158,BL*.6],[.0135,BL],[0,BL]],8,{flat:1,phase:PI/8}));
    for(let i=1;i<4;i++){const y=BL*i/4;wb.add('bamboo',lathe([[.0158,y-.004],[.0175,y],[.0158,y+.004]],8,{phase:PI/8}))}
    wb.add('leather',lathe([[0,BL-.05],[.0145,BL-.05],[.0148,BL+.01],[.012,BL+.025],[0,BL+.028]],14));
    wb.add('leather',lathe([[.0172,BL*.6-.015],[.0172,BL*.6+.015]],14));
    wb.add('string',tube([[0,BL-.04,.0155],[0,BL*.6,.017],[0,.05,.0172]],.0018,4));
    wb.add('tsuba',lathe([[.012,-.006],[.05,-.006],[.052,0],[.05,.006],[.012,.006]],24,{hard:1}));
    wb.add('leather',lathe([[0,-GL],[.016,-GL],[.0175,-GL+.02],[.0175,-.02],[.016,-.008],[0,-.008]],14));
    if(lv>=8)gemFace(wb,0,0,.008,.008,1);
    R.mats=P;Object.assign(R,{top:BL+.028,bot:-GL,hitY:BL*.45,wingY:0,ringY:BL*.45,aura:lv>=5?{y0:.05,y1:BL,w:.02}:null,bladeW:.02});
  }
  else if(type==='scythe'){
    const c=lin(H.SCYTHE_C[lv]||'#9aa0aa'),M=H.METALS[clamp(lv,1,20)-1],SL=1.22+lv*.008,R0=.3+lv*.009;
    const P={blade:mat({col:cmix(lin(M[2]),c,lv>=6?.35:.08),met:1,rou:Math.max(.1,.42-lv*.016),edge:lv>=5?(lv-4)*.25:0,edgeCol:c,emT:lv>=7?TEX.crack:null,emTCol:V.sc(c,lv>=7?(lv-6)*.5:0)}),
      wood:mat({col:[1,1,1],alb:TEX.wood,rep:[1,5],rou:.7}),trim:mat({col:lv<6?lin('#7a7a80'):cmix(lin('#d9b25a'),c,.25),met:1,rou:.25}),trimD:mat({col:lin('#1a1620'),met:.8,rou:.35}),
      cord:mat({col:cmix(lin('#2a1a24'),c,.3),rou:.8}),gem:mat({col:c,rou:.04,emi:V.sc(c,lv>=8?2+lv*.15:0)}),glow:mat({col:[0,0,0],emi:V.sc(c,3+lv*.2)})};
    wb.add(lv<6?'wood':'trimD',lathe([[0,-SL],[.018,-SL],[.019,-SL*.5],[.017,0],[0,0]],14));
    for(const y of[-.02,-SL*.45,-SL+.04])wb.add('trim',lathe([[.021,y-.012],[.024,y],[.021,y+.012]],16));
    if(lv>=4){for(const hand of[1,-1])for(const ph of[0,PI]){const p=[];for(let i=0;i<=50;i++){const u=i/50,a=ph+hand*u*8*TAU;p.push([Math.cos(a)*.0195,-SL*.62+u*.26,Math.sin(a)*.0195])}wb.add('cord',tube(p,.005,5))}}
    const ys=t=>.03+.12*R0*Math.sin(PI*t)-.55*R0*Math.pow(t,2.2),wd=t=>R0*.3*Math.pow(1-t,.8)+.004;
    const o=[];const n=30;for(let i=0;i<=n;i++){const t=i/n;o.push([t*R0*1.25,ys(t)])}for(let i=n;i>=0;i--){const t=i/n;o.push([t*R0*1.25,ys(t)-wd(t)])}
    const bl=extrude(o,{depth:.024,bevel:.004,depthFn:(x,y)=>lerp(.026,.008,smooth(0,R0*1.2,x))});
    wb.add('blade',bl);if(lv>=12)wb.add('blade',bl,M4.sc(-.6,.6,1));
    if(lv>=5){const e=[];for(let i=0;i<=40;i++){const t=i/40;e.push([t*R0*1.25,ys(t)-wd(t),0])}wb.add('glow',tube(e,.003,5));if(lv>=12)wb.add('glow',tube(e,.003,5),M4.sc(-.6,.6,1))}
    wb.add('trim',sphere(.04,16,10),M4.tr(0,.0,0));wb.add('trim',lathe([[.026,-.06],[.03,-.03],[.03,.03],[.0,.05]],16));
    if(lv>=8){gemFace(wb,0,0,.04,.016,1);gemFace(wb,0,0,-.04,.016,-1)}
    if(lv>=10)for(let i=0;i<4;i++){const a=i/4*TAU+PI/4;wb.add('trim',lathe([[.012,0],[0,.07]],8),M4.chain(M4.tr(Math.cos(a)*.03,.02,Math.sin(a)*.03),M4.rz(-Math.cos(a)*.8),M4.rx(Math.sin(a)*.8)))}
    wb.add('trim',lathe([[0,-SL-.09],[.016,-SL-.02],[.02,-SL+.01],[0,-SL+.01]],12));
    R.mats=P;Object.assign(R,{top:.08,bot:-SL-.09,hitY:-.02,wingY:-.05,ringY:-.25,aura:{y0:-.05,y1:.1,w:R0,axe:1},bladeW:.03,scyEl:'dark'});
  }
  let xr=0;for(const g of Object.values(wb.B))for(let i=0;i<g.p.length;i+=3)xr=Math.max(xr,Math.abs(g.p[i]),Math.abs(g.p[i+2]));R.xr=xr;
  R.batches=Object.entries(wb.B).map(([k,g])=>({m:mesh(g),mat:R.mats[k]||mat({})}));
  if(!R.hidden&&type!=='blank'&&lv>=10&&!R.arch){R.wings={m:mesh(wingGeo(el,lv)),mat:wingMat(el,lv)}}
  if(type==='scythe'&&lv>=16){R.wings={m:mesh(wingGeo('dark',lv)),mat:wingMat('dark',lv)}}
  R.len=R.top-R.bot;R.mid=(R.top+R.bot)/2;
  return R}
function freeWeapon(R){if(!R)return;if(R.pack)return;// 팩 무기는 공유 VAO라 지우면 안 됨
  R.batches.forEach(b=>freeMesh(b.m));if(R.wings)freeMesh(R.wings.m)}
