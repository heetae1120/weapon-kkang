/* ---------------- 속성별 무기 원형 (종류 × 속성 = 20가지 형태) ----------------
   신성은 기존 형태(성검·성단검·성창·성부)를 그대로 쓰고, 나머지 속성은 여기서 만든다.
   각 빌더는 wb(배치)에 메쉬를 넣고 R에 top/bot/gripY/hitY/aura 등을 채운다. 단계가 오르면 금속·장식·발광이 늘어난다. */
const ARCH_NAME={sword:{fire:'카타나',ice:'레이피어',thunder:'쌍검',dark:'대검',holy:'성검'},dagger:{fire:'쿠나이',ice:'스틸레토',thunder:'쌍단검',dark:'크리스',holy:'성단검'},
  spear:{fire:'언월도',ice:'삼지창',thunder:'방천화극',dark:'랜스',holy:'성창'},axe:{fire:'쌍날도끼',ice:'수염도끼',thunder:'전투망치',dark:'처형도끼',holy:'성부'}};
// 손잡이 감기 끈 (마름모 무늬)
function wrapGrip(wb,y0,y1,R,lv,turns){const n=Math.max(6,Math.round((y1-y0)/.03*(turns||1)));for(const hand of[1,-1]){const p=[];for(let i=0;i<=n*8;i++){const u=i/(n*8),a=hand*u*n*PI;p.push([Math.cos(a)*R*1.06,y0+(y1-y0)*u,Math.sin(a)*R*1.06])}wb.add('cord',tube(p,R*.28,5))}}
function ringAt(wb,y,r,h,m){wb.add(m||'trim',lathe([[r*.86,y-h/2],[r,y-h*.25],[r,y+h*.25],[r*.86,y+h/2]],20))}
function glowEdge(wb,pts,r){wb.add('glow',tube(pts,r||.0026,5))}
// 칼날 한쪽 날 (카타나식): 등 쪽은 두껍고 날 쪽은 얇게. 폭 hw, 길이 L, 휨 sori
function singleEdge(L,hw,th,sori,tipL){const N=70,g=G();
  const S=t=>{const u=t>1-tipL?Math.sqrt(Math.max(0,(1-t)/tipL)):1;return u};
  const at=(t,s)=>{// s: 0 등, 1 날
    const w=hw*(1-.22*t),cx=-sori*hw*6*t*t,x=cx+(s-.35)*w*S(t)+(t>1-tipL?(1-S(t))*w*.35:0);return x};
  const sec=[[0,1],[.18,1],[.75,.35],[1,0],[.75,-.35],[.18,-1],[0,-1]];// [s, z배율]
  for(let k=0;k<sec.length;k++){const a=sec[k],b=sec[(k+1)%sec.length],base=g.p.length/3;
    for(let j=0;j<=N;j++){const t=j/N,z=th*(1-.45*t)*Math.max(.15,S(t));
      const A=[at(t,a[0]),t*L,a[1]*z],B=[at(t,b[0]),t*L,b[1]*z];const nrm=V.norm([(a[0]+b[0])/2-.5,0,(a[1]+b[1])]);
      gv(g,A,nrm,[a[0],t]);gv(g,B,nrm,[b[0],t])}
    for(let j=0;j<N;j++){const q=base+j*2;g.i.push(q,q+1,q+3,q,q+3,q+2)}}
  return g}
function tsuba(wb,r,lv,el){wb.add('trim',lathe([[r*.35,-.006],[r,-.006],[r*1.03,0],[r,.006],[r*.35,.006]],28,{hard:1}));
  if(lv>=6)for(let i=0;i<4;i++){const a=i/4*TAU+PI/4;wb.add('core',lathe([[0,-.007],[r*.16,-.007],[r*.16,.007],[0,.007]],10),M4.chain(M4.tr(Math.cos(a)*r*.68,0,Math.sin(a)*r*.68)))}
  if(lv>=10)wb.add('gem',sphere(r*.12,10,8),M4.tr(r*.68,0,0))}
/* ===== 검 ===== */
function arch_sword_fire(wb,R,lv,P){// 카타나
  const L=.86+lv*.012,hw=.026+lv*.0004,th=.008;
  wb.add('blade',singleEdge(L,hw,th,.09,.12),M4.tr(0,.03,0));
  if(lv>=5){const p=[];for(let i=0;i<=40;i++){const t=i/40*.86;p.push([-.09*hw*6*t*t+hw*.62*(1-.22*t),.03+t*L,0])}glowEdge(wb,p,.0022)}
  wb.add('trim',lathe([[0,0],[hw*.95,0],[hw*.9,.03],[0,.03]],8,{flat:1}));// 하바키
  tsuba(wb,.042+lv*.0008,lv,'fire');
  const GL=.27;wb.add('core',lathe([[0,-GL],[.015,-GL],[.0165,-GL*.5],[.0155,-.008],[0,-.008]],14));wrapGrip(wb,-GL+.01,-.012,.0155,lv,1.2);
  ringAt(wb,-.012,.018,.012);wb.add('trim',lathe([[0,-GL-.022],[.016,-GL-.016],[.018,-GL],[0,-GL]],14));
  if(lv>=8)for(let i=0;i<2;i++)wb.add('gem',sphere(.005,8,6),M4.tr(0,-GL*(.35+i*.3),.017));
  Object.assign(R,{top:.03+L,bot:-GL-.024,gripY:-.09,offH:.12,hitY:.03+L*.4,ringY:L*.45,aura:{y0:.06,y1:L*.95,w:hw},bladeW:hw})}
function arch_sword_ice(wb,R,lv,P){// 레이피어
  const L=1.0+lv*.012,hw=.012+lv*.0002;
  wb.add('blade',blade(L,t=>hw*(1-.55*t)*(t>.9?(1-t)/.1:1),t=>hw*(1-.55*t)*(t>.9?(1-t)/.1:1),t=>hw*.7*(1-.5*t)+.0006,()=>0,()=>0,50),M4.tr(0,.01,0));
  const GL=.13;wb.add('core',lathe([[0,-GL],[.0125,-GL],[.0135,-GL*.5],[.0125,0],[0,0]],12));wrapGrip(wb,-GL+.005,-.006,.0125,lv,.8);
  // 퀼론(가로대)
  wb.add('trim',tube([[-.11,.012,0],[-.05,0,0],[0,0,0],[.05,0,0],[.11,-.012,0]],.0045,8));for(const sd of[1,-1])wb.add('trim',sphere(.008,10,8),M4.tr(sd*.112,sd>0?-.012:.012,0));
  // 손등 보호대(너클 보우)
  const kb=[];for(let i=0;i<=24;i++){const u=i/24,a=u*PI;kb.push([.02+Math.sin(a)*.05,-u*(GL+.005),.0])}wb.add('trim',tube(kb,.0038,7));
  // 고리(컵) - 단계가 오르면 고리가 늘어남
  const rings=1+Math.min(3,Math.floor(lv/5));for(let k=0;k<rings;k++){const r=.032+k*.008,p=[];for(let i=0;i<=40;i++){const a=i/40*TAU;p.push([Math.cos(a)*r*.6,.006+Math.sin(a)*r*.25,Math.sin(a)*r])}wb.add('trim',tube(p,.0028,6),M4.rz(k*.35-.2))}
  if(lv>=8){const cup=[];for(let i=0;i<=10;i++){const u=i/10;cup.push([.012+u*.036,.004+u*u*.03])}wb.add('trimD',lathe(cup,24))}
  wb.add('trim',sphere(.016,14,10),M4.tr(0,-GL-.012,0));if(lv>=6){gemFace(wb,0,-GL-.012,.014,.007,1);gemFace(wb,0,-GL-.012,-.014,.007,-1)}
  if(lv>=10){const p=[];for(let i=0;i<=30;i++)p.push([0,.05+i/30*L*.85,hw*.6]);glowEdge(wb,p,.0016)}
  Object.assign(R,{top:.01+L,bot:-GL-.03,gripY:-.06,offH:0,hitY:.01+L*.35,ringY:L*.3,aura:{y0:.05,y1:L*.9,w:.014},bladeW:.014})}
function zigGuard(wb,W,lv){const o=[];const n=6;for(let i=0;i<=n;i++){const u=i/n;o.push([u*W,(i%2?.016:.005)+.004*u])}for(let i=n;i>=0;i--){const u=i/n;o.push([u*W,(i%2?-.004:-.014)-.004*u])}
  const full=o.concat(o.slice().reverse().map(p=>[-p[0],p[1]]));wb.add('trim',extrude(cleanPoly(full),{depth:.026,bevel:.003}))}
function jian(wb,lv,P,L,hw){// 쌍검 한 자루: 곧은 양날 + 번개 날밑
  wb.add('blade',blade(L,t=>hw*(1-.25*t)*(t>.86?(1-t)/.14:1),t=>hw*(1-.25*t)*(t>.86?(1-t)/.14:1),t=>hw*.24*(1-.4*t)+.0008,t=>lv>=3?tri(t*4)*hw*.12:0,t=>smooth(.03,.08,t)*(1-smooth(.5,.6,t)),70),M4.tr(0,.018,0));
  zigGuard(wb,hw*2.2+.02,lv);const GL=.15;wb.add('core',lathe([[0,-GL],[.0135,-GL],[.0145,-GL*.5],[.013,0],[0,0]],12));wrapGrip(wb,-GL+.006,-.006,.013,lv,1);
  wb.add('trim',lathe([[0,-GL-.03],[.018,-GL-.012],[.014,-GL],[0,-GL]],6,{flat:1}));
  if(lv>=5){const p=[];for(let i=0;i<=30;i++){const t=i/30*.86;p.push([tri(t*4)*hw*.12,.03+t*L,0])}glowEdge(wb,p,.0022)}
  return GL}
function arch_sword_thunder(wb,R,lv,P){const L=.66+lv*.01,hw=.026;const GL=jian(wb,lv,P,L,hw);
  Object.assign(R,{top:.018+L,bot:-GL-.03,gripY:-.07,offH:0,dual:true,hitY:.018+L*.4,ringY:L*.45,aura:{y0:.05,y1:L*.9,w:hw},bladeW:hw})}
function arch_sword_dark(wb,R,lv,P){// 대검 (양손)
  const L=1.02+lv*.016,hw=.062+lv*.0012,th=.012;
  const tip=t=>t>.88?Math.pow((1-t)/.12,.9):1,ser=t=>lv>=4&&t>.12&&t<.55?1+Math.max(0,1-fr(t*14)*2.2)*.12:1;
  wb.add('blade',blade(L,t=>hw*(1-.12*t)*tip(t)*ser(t),t=>hw*(1-.12*t)*tip(t),t=>th*(1-.4*t)+.001,()=>0,t=>smooth(.08,.14,t)*(1-smooth(.62,.7,t)),90),M4.tr(0,.06,0));
  // 리카소(날 밑 두꺼운 부분)와 뿔 같은 보조 날밑
  wb.add('trimD',box(hw*1.25,.06,th*2.6),M4.tr(0,.03,0));for(const sd of[1,-1]){const p=[];for(let i=0;i<=12;i++){const u=i/12;p.push([sd*(hw*.7+u*.03),.05+u*.05-u*u*.02,0])}wb.add('trim',tube(p,u=>.007*(1-u*.8),6))}
  // 큰 십자 날밑(아래로 굽은 뿔)
  const W=hw*2.6+.05,o=[];for(let i=0;i<=16;i++){const u=i/16;o.push([u*W,.012-u*u*.05])}for(let i=16;i>=0;i--){const u=i/16;o.push([u*W,-.012-u*u*.06-(i===16?.01:0)])}
  wb.add('trim',extrude(cleanPoly(o.concat(o.slice().reverse().map(p=>[-p[0],p[1]]))),{depth:.04,bevel:.005}));
  if(lv>=4){gemFace(wb,0,0,.022,.013,1);gemFace(wb,0,0,-.022,.013,-1)}
  const GL=.34;wb.add('core',lathe([[0,-GL],[.018,-GL],[.0195,-GL*.5],[.018,-.015],[0,-.015]],14));wrapGrip(wb,-GL+.01,-.02,.018,lv,1);ringAt(wb,-GL*.5,.022,.012);
  wb.add('trim',lathe([[0,-GL-.05],[.026,-GL-.03],[.03,-GL-.012],[.02,-GL],[0,-GL]],8,{flat:1}));
  if(lv>=7){const p=[];for(let i=0;i<=40;i++){const t=.1+i/40*.75;p.push([0,.06+t*L,th*1.05])}glowEdge(wb,p,.003)}
  Object.assign(R,{top:.06+L,bot:-GL-.05,gripY:-.12,offH:.15,hitY:.06+L*.4,ringY:L*.45,aura:{y0:.08,y1:L*.95,w:hw},bladeW:hw})}
/* ===== 단검 ===== */
function arch_dagger_fire(wb,R,lv,P){// 쿠나이
  const L=.24+lv*.005,hw=.034;
  wb.add('blade',blade(L,t=>hw*Math.sin(PI*Math.min(1,.18+t*.9))*(1-.3*t)+.003,t=>hw*Math.sin(PI*Math.min(1,.18+t*.9))*(1-.3*t)+.003,t=>.009*(1-.6*t)+.001,()=>0,()=>0,50),M4.tr(0,.004,0));
  const GL=.12;wb.add('core',lathe([[0,-GL],[.011,-GL],[.011,0],[0,0]],10));wrapGrip(wb,-GL+.004,-.004,.011,lv,1.4);
  // 고리 손잡이 끝
  const p=[];for(let i=0;i<=40;i++){const a=i/40*TAU;p.push([Math.cos(a)*.024,-GL-.026+Math.sin(a)*.024,0])}wb.add('trim',tube(p,.0045,8));
  if(lv>=6){const c=[];for(let i=0;i<=20;i++){const t=i/20;c.push([0,.01+t*L*.85,.006])}glowEdge(wb,c,.0018)}
  Object.assign(R,{top:.004+L,bot:-GL-.054,gripY:-.06,offH:0,hitY:L*.4,ringY:L*.45,aura:{y0:.02,y1:L,w:hw},bladeW:hw})}
function arch_dagger_ice(wb,R,lv,P){// 스틸레토
  const L=.36+lv*.006,hw=.011;
  wb.add('blade',lathe([[0,0],[hw,0],[hw*.8,L*.5],[hw*.35,L*.9],[0,L]],3,{flat:1}),M4.tr(0,.012,0));
  wb.add('trim',tube([[-.05,0,0],[0,.004,0],[.05,0,0]],.0042,8));for(const sd of[1,-1])wb.add('trim',sphere(.007,10,8),M4.tr(sd*.05,0,0));
  const GL=.11;wb.add('core',lathe([[0,-GL],[.011,-GL],[.0125,-GL*.5],[.011,0],[0,0]],12));wrapGrip(wb,-GL+.004,-.004,.011,lv,1);
  wb.add('trim',lathe([[0,-GL-.03],[.013,-GL-.015],[.012,-GL],[0,-GL]],6,{flat:1}));
  if(lv>=7)for(let i=0;i<3;i++)wb.add('gem',gemGeo(.006,.008),M4.chain(M4.tr(0,.05+i*.08,0)));
  Object.assign(R,{top:.012+L,bot:-GL-.03,gripY:-.055,offH:0,hitY:L*.4,ringY:L*.4,aura:{y0:.02,y1:L,w:.012},bladeW:.012})}
function arch_dagger_thunder(wb,R,lv,P){const L=.3+lv*.006,hw=.024;const GL=jian(wb,lv,P,L,hw);
  Object.assign(R,{top:.018+L,bot:-GL-.03,gripY:-.06,offH:0,dual:true,hitY:L*.4,ringY:L*.45,aura:{y0:.03,y1:L,w:hw},bladeW:hw})}
function arch_dagger_dark(wb,R,lv,P){// 크리스 (물결 날)
  const L=.34+lv*.006,hw=.024,waves=5+Math.floor(lv/5)*2;
  wb.add('blade',blade(L,t=>hw*(1-.55*t)*(t>.9?(1-t)/.1:1)+.002,t=>hw*(1-.55*t)*(t>.9?(1-t)/.1:1)+.002,t=>.006*(1-.5*t)+.001,t=>Math.sin(t*PI*waves)*hw*.55*(1-t*.3),()=>0,80),M4.tr(0,.02,0));
  // 비대칭 간자(날 밑)
  wb.add('trim',extrude([[-.016,0],[.045,0],[.05,.012],[.02,.024],[-.022,.02]],{depth:.016,bevel:.003}));
  // 굽은 손잡이
  const GL=.11,p=[];for(let i=0;i<=12;i++){const u=i/12;p.push([Math.sin(u*1.2)*.02,-u*GL,0])}wb.add('core',tube(p,u=>.012*(1+.15*Math.sin(u*PI)),10));
  wb.add('trim',sphere(.015,12,8),M4.tr(Math.sin(1.2)*.02,-GL-.006,0));if(lv>=5){gemFace(wb,.02,.012,.009,.006,1)}
  if(lv>=6){const c=[];for(let i=0;i<=40;i++){const t=i/40*.9;c.push([Math.sin(t*PI*waves)*hw*.55*(1-t*.3),.02+t*L,.0065])}glowEdge(wb,c,.0018)}
  Object.assign(R,{top:.02+L,bot:-GL-.022,gripY:-.055,offH:0,hitY:L*.4,ringY:L*.4,aura:{y0:.03,y1:L,w:hw},bladeW:hw})}
/* ===== 창 ===== */
function pole(wb,SL,lv,from){wb.add(lv<6?'wood':'trimD',lathe([[0,-SL],[.0165,-SL],[.0175,-SL*.5],[.0165,from],[0,from]],14));
  if(lv>=6)for(let y=-.32;y>-SL+.1;y-=.24)ringAt(wb,y,.02,.014);wb.add('trim',lathe([[0,-SL-.06],[.012,-SL-.02],[.019,-SL+.01],[0,-SL+.02]],12));
  if(lv>=3){const p0=-.48,p1=-.76;for(const hand of[1,-1]){const p=[];for(let i=0;i<=60;i++){const u=i/60,a=hand*u*10*TAU;p.push([Math.cos(a)*.0182,p0+(p1-p0)*u,Math.sin(a)*.0182])}wb.add('cord',tube(p,.005,5))}}}
function tassel(wb,y,lv){if(lv<2)return;for(let i=0;i<9;i++){const a=i/9*TAU,p=[];for(let k=0;k<=8;k++){const u=k/8;p.push([Math.cos(a)*.016*(1+u*1.4),y-u*(.14+lv*.003),Math.sin(a)*.016*(1+u*1.4)])}wb.add('cloth',tube(p,u=>.0045*(1-u*.4),4))}}
function arch_spear_fire(wb,R,lv,P){// 언월도: 넓게 휜 큰 칼날
  const SL=1.12+lv*.006,BL=.38+lv*.008,BW=.075+lv*.0016,o=[];
  for(let i=0;i<=24;i++){const t=i/24;o.push([-.012+BW*.25*t*t,t*BL])}// 등
  for(let i=24;i>=0;i--){const t=i/24;const w=BW*(.55+.65*Math.sin(PI*Math.min(1,t*1.05)))*(t>.85?(1-t)/.15*.7+.3:1);o.push([-.012+BW*.25*t*t+w,t*BL-(t>.97?.01:0)])}
  wb.add('blade',extrude(cleanPoly(o),{depth:.018,bevel:.003,depthFn:x=>lerp(.018,.004,smooth(0,BW,x))}),M4.tr(0,.07,0));
  // 등쪽 갈고리
  wb.add('blade',extrude([[-.012,.12],[-.045,.16],[-.04,.18],[-.012,.17]],{depth:.012,bevel:.002}),M4.tr(0,.0,0));
  // 용머리 고리
  wb.add('trim',lathe([[.02,-.02],[.03,.0],[.03,.05],[.022,.075],[0,.08]],18));wb.add('trim',sphere(.034,16,10),M4.tr(.0,.03,0));if(lv>=5){gemFace(wb,0,.03,.033,.012,1);gemFace(wb,0,.03,-.033,.012,-1)}
  if(lv>=5){const p=[];for(let i=0;i<=40;i++){const t=i/40;const w=BW*(.55+.65*Math.sin(PI*Math.min(1,t*1.05)))*(t>.85?(1-t)/.15*.7+.3:1);p.push([-.012+BW*.25*t*t+w,.07+t*BL,0])}glowEdge(wb,p,.003)}
  pole(wb,SL,lv,0);tassel(wb,-.02,lv);
  Object.assign(R,{top:.07+BL,bot:-SL-.06,gripY:-.62,offH:.32,hitY:.07+BL*.4,ringY:.16,aura:{y0:.08,y1:.07+BL*.9,w:BW*.6},bladeW:BW*.5})}
function prong(L,hw){return blade(L,t=>hw*(1-.3*t)*(t>.8?(1-t)/.2:1)+.001,t=>hw*(1-.3*t)*(t>.8?(1-t)/.2:1)+.001,t=>hw*.3+.001,()=>0,()=>0,30)}
function arch_spear_ice(wb,R,lv,P){// 삼지창
  const SL=1.1+lv*.006,L=.3+lv*.007,hw=.02;
  wb.add('blade',prong(L,hw*1.2),M4.tr(0,.06,0));
  for(const sd of[1,-1]){const p=[];for(let i=0;i<=10;i++){const u=i/10;p.push([sd*(.012+u*.06-u*u*.01),.04+u*.05,0])}wb.add('trim',tube(p,.009,8));
    wb.add('blade',prong(L*.72,hw),M4.chain(M4.tr(sd*.068,.09,0),M4.rz(-sd*.08)))}
  wb.add('trim',lathe([[.02,-.04],[.024,0],[.02,.05],[0,.06]],16));if(lv>=4){gemFace(wb,0,.02,.022,.01,1);gemFace(wb,0,.02,-.022,.01,-1)}
  if(lv>=8)for(const sd of[1,-1])wb.add('gem',gemGeo(.012,.016),M4.chain(M4.tr(sd*.035,.035,0),M4.rz(sd*.5)));
  pole(wb,SL,lv,0);
  Object.assign(R,{top:.06+L,bot:-SL-.06,gripY:-.62,offH:.32,hitY:.06+L*.4,ringY:.14,aura:{y0:.06,y1:.06+L,w:.07},bladeW:.06})}
function arch_spear_thunder(wb,R,lv,P){// 방천화극: 창날 + 초승달 날
  const SL=1.12+lv*.006,L=.3+lv*.008,hw=.034;
  wb.add('blade',blade(L,t=>hw*(1-.4*t)*(t>.75?(1-t)/.25:1)*(1+.5*Math.sin(PI*Math.min(1,t*1.3)))+.001,t=>hw*(1-.4*t)*(t>.75?(1-t)/.25:1)*(1+.5*Math.sin(PI*Math.min(1,t*1.3)))+.001,t=>.007*(1-.5*t)+.001,t=>lv>=3?tri(t*3)*hw*.15:0,t=>smooth(.05,.1,t)*(1-smooth(.5,.6,t)),60),M4.tr(0,.08,0));
  const moon=(sd,k)=>{const c=[],r0=(.085+lv*.0022)*k;for(let i=0;i<=20;i++){const a=-1.25+i/20*2.5;c.push([.018+Math.cos(a)*r0*1.25,.07+Math.sin(a)*r0])}for(let i=20;i>=0;i--){const a=-1.05+i/20*2.1;c.push([.018+Math.cos(a)*r0*.82,.07+Math.sin(a)*r0*.7])}
    wb.add('blade',extrude(cleanPoly(c),{depth:.012,bevel:.003,depthFn:x=>lerp(.014,.004,smooth(.03,.12,x))}),M4.sc(sd,1,1))};
  moon(1,1);if(lv>=8)moon(-1,.75);
  wb.add('trim',lathe([[.02,-.06],[.024,-.02],[.022,.05],[.016,.085],[0,.09]],16));
  if(lv>=5){const p=[];for(let i=0;i<=30;i++){const a=-1.25+i/30*2.5,r0=.085+lv*.0022;p.push([.018+Math.cos(a)*r0*1.25,.07+Math.sin(a)*r0,0])}glowEdge(wb,p,.0028)}
  pole(wb,SL,lv,0);tassel(wb,-.06,lv);
  Object.assign(R,{top:.08+L,bot:-SL-.06,gripY:-.62,offH:.32,hitY:.08+L*.4,ringY:.16,aura:{y0:.06,y1:.08+L,w:.08},bladeW:.06})}
function arch_spear_dark(wb,R,lv,P){// 랜스: 긴 원뿔 + 손 보호 원반
  const CL=.95+lv*.012,r0=.06+lv*.0012,GL=.32;
  const pr=[];for(let i=0;i<=20;i++){const t=i/20;pr.push([r0*(1-t)*(1-.15*Math.sin(t*PI)),t*CL])}pr.push([0,CL+.02]);
  wb.add('blade',lathe([[0,0],...pr],lv>=6?8:16,lv>=6?{flat:1}:{}));
  if(lv>=4){const n=3;for(let k=0;k<n;k++){const p=[];for(let i=0;i<=60;i++){const t=i/60,a=k/n*TAU+t*TAU*2;p.push([Math.cos(a)*r0*(1-t)*1.02,t*CL*.92,Math.sin(a)*r0*(1-t)*1.02])}wb.add(lv>=8?'glow':'trim',tube(p,.003,5))}}
  // 원반형 손 보호대(뱀플레이트)
  wb.add('trim',lathe([[0,-.01],[.03,-.01],[.11,.0],[.12,.01],[.02,.03],[0,.03]],28));
  if(lv>=6)for(let i=0;i<8;i++){const a=i/8*TAU;wb.add('trim',lathe([[.008,0],[0,.04]],6),M4.chain(M4.tr(Math.cos(a)*.1,.0,Math.sin(a)*.1),M4.rz(-Math.cos(a)*1.4),M4.rx(Math.sin(a)*1.4)))}
  wb.add('core',lathe([[0,-GL],[.018,-GL],[.02,-GL*.5],[.018,-.01],[0,-.01]],14));wrapGrip(wb,-GL+.02,-.02,.018,lv,1);
  wb.add('trim',lathe([[0,-GL-.06],[.03,-GL-.04],[.035,-GL],[0,-GL]],16));
  Object.assign(R,{top:CL+.02,bot:-GL-.06,gripY:-.12,offH:.14,hitY:CL*.4,ringY:CL*.3,aura:{y0:.05,y1:CL*.9,w:r0},bladeW:r0})}
/* ===== 도끼 ===== */
function axeHead(R0,lv,beard,crown,spike){const o=[[.022,.05],[.07,.055]],n=24;
  for(let i=0;i<=n;i++){const t=i/n,a=lerp(1.25,-1.25,t);let x=.03+Math.cos(a)*R0*.95,y=Math.sin(a)*R0*1.3*(a>0?crown:beard);o.push([x,y])}
  o.push([.07,-.055],[.022,-.05]);const xmax=.03+R0*.95;
  return extrude(cleanPoly(o),{depth:.05,bevel:.004,depthFn:x=>lerp(.05,.007,smooth(.06,xmax,x))})}
function haft(wb,AL,lv){wb.add(lv<6?'wood':'trimD',lathe([[0,-AL],[.019,-AL],[.02,-.3],[.018,.07],[0,.07]],14));
  if(lv>=3){for(const hand of[1,-1]){const p=[];for(let i=0;i<=50;i++){const u=i/50,a=hand*u*8*TAU;p.push([Math.cos(a)*.0205,-AL+.04+u*.26,Math.sin(a)*.0205])}wb.add('cord',tube(p,.0055,5))}}
  wb.add('trim',lathe([[0,-AL-.035],[.022,-AL-.02],[.025,-AL+.01],[.02,-AL+.02],[0,-AL+.02]],16))}
function arch_axe_fire(wb,R,lv,P){// 쌍날 전투도끼
  const AL=.9+lv*.004,R0=.14+lv*.006,h=axeHead(R0,lv,1.25,1.25);
  wb.add('blade',h);wb.add('blade',h,M4.sc(-1,1,1));
  wb.add('trim',lathe([[.026,-.08],[.03,-.06],[.03,.06],[.026,.08],[0,.08]],16,{hard:1}));if(lv>=4){gemFace(wb,0,0,.032,.013,1);gemFace(wb,0,0,-.032,.013,-1)}
  if(lv>=5){for(const sd of[1,-1]){const p=[];for(let i=0;i<=40;i++){const a=lerp(1.2,-1.2,i/40);p.push([sd*(.03+Math.cos(a)*R0*.96),Math.sin(a)*R0*1.3*1.24,0])}glowEdge(wb,p,.003)}}
  wb.add('blade',blade(.1+lv*.004,t=>.018*(1-t),t=>.018*(1-t),t=>.007*(1-t*.7),()=>0,()=>0,16),M4.tr(0,.08,0));
  haft(wb,AL,lv);
  Object.assign(R,{top:Math.max(.18+lv*.004,R0*1.6),bot:-AL-.035,gripY:-.7,offH:.26,hitY:0,ringY:0,aura:{y0:-R0,y1:R0,w:R0*1.2,axe:1},bladeW:.06})}
function arch_axe_ice(wb,R,lv,P){// 수염도끼: 아래로 길게 늘어진 날
  const AL=.88+lv*.004,R0=.12+lv*.005,o=[[.02,.04],[.05,.045]];const n=26;
  for(let i=0;i<=n;i++){const t=i/n;const y=lerp(.11+lv*.002,-.26-lv*.006,t),x=.05+R0*(.55+.45*Math.sin(PI*Math.min(1,t*1.15)))*(t>.85?1-(t-.85)*2.2:1);o.push([x,y])}
  o.push([.07,-.12],[.045,-.045],[.02,-.04]);
  wb.add('blade',extrude(cleanPoly(o),{depth:.04,bevel:.004,depthFn:x=>lerp(.04,.006,smooth(.05,.05+R0,x))}));
  if(lv>=4)for(let i=0;i<3+Math.floor(lv/5);i++)wb.add('gem',gemGeo(.011,.02),M4.chain(M4.tr(-.035,.06-i*.05,0),M4.rz(PI/2+.2)));
  wb.add('trim',lathe([[.024,-.07],[.028,-.05],[.028,.07],[.024,.09],[0,.09]],16,{hard:1}));
  if(lv>=5){const p=[];for(let i=0;i<=40;i++){const t=i/40;const y=lerp(.11+lv*.002,-.26-lv*.006,t),x=.05+R0*(.55+.45*Math.sin(PI*Math.min(1,t*1.15)))*(t>.85?1-(t-.85)*2.2:1);p.push([x,y,0])}glowEdge(wb,p,.003)}
  haft(wb,AL,lv);
  Object.assign(R,{top:.12+lv*.002,bot:-AL-.035,gripY:-.68,offH:.26,hitY:-.05,ringY:-.05,aura:{y0:-.25,y1:.1,w:R0,axe:1},bladeW:.06})}
function arch_axe_thunder(wb,R,lv,P){// 전투망치
  const AL=.82+lv*.004,S=.07+lv*.0018;
  const hd=box(S*2.2,S*1.25,S*1.25);wb.add('blade',hd,M4.tr(0,.03,0));
  for(const sd of[1,-1])wb.add('trim',box(.012,S*1.4,S*1.4),M4.tr(sd*S*.85,.03,0));
  wb.add('trim',box(S*.4,S*1.5,S*1.5),M4.tr(0,.03,0));
  if(lv>=4)for(const sd of[1,-1])wb.add('gem',gemGeo(S*.28,S*.3),M4.chain(M4.tr(0,.03,sd*S*.68),M4.rx(sd*PI/2)));
  if(lv>=6)wb.add('blade',lathe([[0,0],[S*.32,0],[0,S*1.1]],8,{flat:1}),M4.chain(M4.tr(-S*1.1,.03,0),M4.rz(PI/2)));// 뒤쪽 가시
  if(lv>=9)wb.add('blade',lathe([[0,0],[S*.3,0],[0,S*.9]],8,{flat:1}),M4.tr(0,.03+S*.62,0));
  if(lv>=5){for(const sd of[1,-1]){const p=[];for(let i=0;i<=24;i++){const a=i/24*TAU;p.push([sd*S*1.11,.03+Math.cos(a)*S*.5,Math.sin(a)*S*.5])}glowEdge(wb,p,.0026)}}
  haft(wb,AL,lv);
  Object.assign(R,{top:.03+S*(lv>=9?1.6:.75),bot:-AL-.035,gripY:-.64,offH:.26,hitY:.03,ringY:.03,aura:{y0:-S,y1:S,w:S*1.2,axe:1},bladeW:S*.6})}
function arch_axe_dark(wb,R,lv,P){// 처형도끼: 넓고 각진 한쪽 날
  const AL=.92+lv*.004,W=.22+lv*.006,Hh=.18+lv*.006,o=[[.02,.05],[.05,Hh*.55],[W,Hh*.62],[W+.025,0],[W,-Hh*.62],[.05,-Hh*.6],[.02,-.05]];
  const head=extrude(cleanPoly(o),{depth:.03,bevel:.004,depthFn:x=>lerp(.032,.006,smooth(W*.6,W+.02,x))});wb.add('blade',head);
  // 구멍
  for(let i=0;i<1+Math.floor(lv/7);i++)wb.add('core',lathe([[0,-.032],[.016,-.032],[.016,.032],[0,.032]],16),M4.chain(M4.tr(W*.45+i*.05,Hh*.25-i*.06,0),M4.rx(PI/2)));
  if(lv>=4)for(let i=0;i<4;i++)wb.add('trim',sphere(.007,8,6),M4.tr(.06,Hh*.45-i*Hh*.3,.018));
  if(lv>=5){const p=[[W,Hh*.62,0],[W+.025,0,0],[W,-Hh*.62,0]];glowEdge(wb,p,.0035)}
  wb.add('trim',lathe([[.024,-.08],[.028,-.06],[.028,.07],[.024,.09],[0,.09]],16,{hard:1}));
  if(lv>=7)wb.add('blade',lathe([[0,0],[.02,0],[0,.12+lv*.004]],8,{flat:1}),M4.tr(0,.09,0));
  haft(wb,AL,lv);
  Object.assign(R,{top:lv>=7?.21+lv*.004:Hh*.62,bot:-AL-.035,gripY:-.72,offH:.26,hitY:0,ringY:0,aura:{y0:-Hh*.6,y1:Hh*.6,w:W*.6,axe:1},bladeW:.06})}
const ARCH_B={sword_fire:arch_sword_fire,sword_ice:arch_sword_ice,sword_thunder:arch_sword_thunder,sword_dark:arch_sword_dark,
  dagger_fire:arch_dagger_fire,dagger_ice:arch_dagger_ice,dagger_thunder:arch_dagger_thunder,dagger_dark:arch_dagger_dark,
  spear_fire:arch_spear_fire,spear_ice:arch_spear_ice,spear_thunder:arch_spear_thunder,spear_dark:arch_spear_dark,
  axe_fire:arch_axe_fire,axe_ice:arch_axe_ice,axe_thunder:arch_axe_thunder,axe_dark:arch_axe_dark};
