/* ---------------- 결투 장면 (캐릭터 + 모션) ---------------- */
const WCACHE=new Map();
const GRIPY={sword:-.1,dagger:-.06,spear:-.55,axe:-.62,saber:-.13,shinai:-.14,scythe:-.7,blank:-.12};
const OFFH={sword:.09,dagger:0,spear:.3,axe:.26,saber:.1,shinai:.12,scythe:.32,blank:0};// 왼손이 잡는 간격(0이면 한손)
const KAMAE={sword:[.34,1.02,.72],dagger:[.36,1.08,.45],spear:[.3,1.0,.32],axe:[.3,1.0,.95],saber:[.34,1.02,.72],shinai:[.34,1.02,.62],scythe:[.28,1.0,1.05],blank:[.34,1.0,.6]};// 앞으로 거리, 손 높이, 각도
const CONTACT_K={sword:.72,dagger:.8,spear:.86,axe:.82,saber:.72,shinai:.74,scythe:.86,blank:.7};// 칼끼리 닿는 지점(손잡이 끝→끝 비율)
function getWeapon(w){const key=(w.type||'blank')+'|'+(w.el||'')+'|'+w.lv;let R=WCACHE.get(key);
  if(!R){R=buildWeapon(w);R.key=key;R.gripY=GRIPY[R.type];WCACHE.set(key,R);
    if(WCACHE.size>6){const k=WCACHE.keys().next().value;freeWeapon(WCACHE.get(k));WCACHE.delete(k)}}
  return R}
const CHAR_IDS=['paladin','smith','guard','orc','erika','ninja','kachujin'];
function duelCfg(DQ){const pc=CHAR_IDS.includes(DQ.pch)?DQ.pch:'paladin',oc=CHAR_IDS.includes(DQ.och)?DQ.och:'guard';return{p:{ch:pc,an:'paladin',tint:null},o:{ch:oc,an:'paladin',tint:pc===oc?[1.25,.62,.55]:null}}}
// 칼 맞대기 타임라인(초) — index.html의 CLASH와 같은 값
const CLASH_T={imp:.3,brk:1.3,cut:1.62,back:2.05,end:2.5};
const DS={clock:0,last:null,p:null,o:null,mark:'',sub:'',ev:{},ghosts:[],C:null,cpx:null,cam:null};
function charReady(k){return CH[k]&&CH[k]!=='loading'}
function duelReady(DQ){const c=DQ?duelCfg(DQ):{p:{ch:'paladin'},o:{ch:'paladin'}};return charReady(c.p.ch)&&charReady(c.o.ch)&&ANIM.paladin&&ANIM.paladin!=='loading'}
function preloadDuel(list){loadAnims('paladin','paladin_anim');for(const k of(list||['paladin']))if(CHAR_IDS.includes(k))loadChar(k,k)}
function newActor(side){return{side,sg:side==='p'?1:-1,x:side==='p'?-2.6:2.6,cur:{name:'idle',t0:0,rate:1,loop:true,off:0,root:false},prev:null,bt0:0,bdur:.2,
  wp:null,trail:[],trailOn:false,aura:.5,auraAcc:0,ghostT:0,lean:0,hidden:false}}
function setClip(a,name,o={}){const c=a.cur;if(c.name===name&&!o.force)return;a.prev={...c};a.bt0=DS.clock;a.bdur=o.blend??.18;
  a.cur={name,t0:DS.clock,rate:o.rate??1,loop:!!o.loop,off:o.off||0,root:!!o.root}}
function sampleLocal(clips,c){const clip=clips[c.name]||clips.idle;const t=c.off+(DS.clock-c.t0)/1000*c.rate,n=clip.n;let x=t*clip.fps;
  if(c.loop)x=((x%(n-1))+(n-1))%(n-1);else x=clamp(x,0,n-1);const i=Math.floor(x),j=Math.min(n-1,i+1),a=x-i;
  const q={};for(const bn in clip.q){const A=clip.q[bn],o1=i*4,o2=j*4;q[bn]=qSlerp([A[o1],A[o1+1],A[o1+2],A[o1+3]],[A[o2],A[o2+1],A[o2+2],A[o2+3]],a)}
  let hp=null;const h=clip.hips;if(h.length){hp=V.mix([h[i*3],h[i*3+1],h[i*3+2]],[h[j*3],h[j*3+1],h[j*3+2]],a);if(!c.root){hp[0]-=h[0];hp[2]-=h[2]}}
  return{q,hp}}
function actorWorld(a,K,clips){
  const cur=sampleLocal(clips,a.cur);let q=cur.q,hp=cur.hp;
  if(a.prev){const k=clamp((DS.clock-a.bt0)/1000/a.bdur,0,1);if(k>=1)a.prev=null;else{const pv=sampleLocal(clips,a.prev),e=k*k*(3-2*k);const q2={};for(const bn in q)q2[bn]=pv.q[bn]?qSlerp(pv.q[bn],q[bn],e):q[bn];q=q2;if(pv.hp&&hp)hp=V.mix(pv.hp,hp,e)}}
  const B=K.bones,W=new Array(B.length),L=new Array(B.length);
  for(let i=0;i<B.length;i++){const b=B[i],qq=q[b.name];let Lm;
    if(qq){Lm=qToM(qq);if(b.name==='Hips'&&hp){const hs=(clips.__hsc||K.sc)*(clips.__hrest?b.local[13]/clips.__hrest:1);Lm[12]=hp[0]*hs;Lm[13]=hp[1]*hs;Lm[14]=hp[2]*hs}else{Lm[12]=b.local[12];Lm[13]=b.local[13];Lm[14]=b.local[14]}}
    else Lm=b.local;
    L[i]=Lm;W[i]=b.parent>=0?M4.mul(W[b.parent],Lm):Lm}
  return{W,L}}
function drawSkin(K,Root,W,tint){const u=P_SKIN.u;gl.useProgram(P_SKIN.p);const B=K.bones,mats=new Float32Array(24*16);
  for(let i=0;i<B.length&&i<24;i++)mats.set(M4.chain(Root,W[i],B[i].inv),i*16);gl.uniformMatrix4fv(u.uB,false,mats);gl.bindVertexArray(K.vao);
  for(const m of K.meshes){const c0=m.mat.col;if(tint)m.mat.col=[c0[0]*tint[0],c0[1]*tint[1],c0[2]*tint[2]];setMat(u,m.mat,M4.id());m.mat.col=c0;if(K.ib)gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,m.start*4);else gl.drawArrays(gl.TRIANGLES,m.start,m.count)}gl.useProgram(P_PBR.p)}
/* 뼈 회전 후 자식 뼈 다시 계산 */
function isDesc(K,j,i){let p=K.bones[j].parent;while(p>=0){if(p===i)return true;p=K.bones[p].parent}return false}
function refreshBelow(K,W,L,i){const B=K.bones;for(let j=i+1;j<B.length;j++)if(isDesc(K,j,i))W[j]=M4.mul(W[B[j].parent],L[j])}
function rotBone(W,i,R){const p=M4.pos(W[i]);W[i]=M4.chain(M4.tr(p[0],p[1],p[2]),R,M4.tr(-p[0],-p[1],-p[2]),W[i])}
function aimBone(K,W,L,i,ci,target){const p=M4.pos(W[i]),c=M4.pos(M4.mul(W[i],L[ci]));rotBone(W,i,M4.rotFromTo(V.sub(c,p),V.sub(target,p)))}
/* 팔을 목표 지점(모델 공간)으로: 어깨-팔꿈치-손목 2관절 IK */
/* 쥔 손: 손 뼈 기준 '쥔 구멍' 정보 (dev/fist.py가 기록) */
function handGrip(K,s){const g=K&&K.J&&K.J.grip&&K.J.grip[s];return g||{p:[0,.09,.03],r:.022,th:s==='R'?1:-1}}
// 쥔 구멍이 hole(월드)에 오고, 엄지 쪽이 dir(무기 날 방향)을 향하고, 손가락 뿌리가 fdir 쪽인 손 뼈 월드 행렬
function handFrame(g,hole,dir,fdir){const X=V.sc(V.norm(dir),g.th);let Y=V.sub(fdir,V.sc(X,V.dot(fdir,X)));if(V.len(Y)<1e-4)Y=Math.abs(X[1])<.9?[0,1,0]:[1,0,0];Y=V.norm(V.sub(Y,V.sc(X,V.dot(Y,X))));const Z=V.cross(X,Y);
  return M4.basis(X,Y,Z,V.sub(hole,V.add(V.add(V.sc(X,g.p[0]),V.sc(Y,g.p[1])),V.sc(Z,g.p[2]))))}
function armIK(K,W,L,arm,fa,hd,target,pole,Hm){
  const S=M4.pos(W[arm]),la=V.len([L[fa][12],L[fa][13],L[fa][14]]),lb=V.len([L[hd][12],L[hd][13],L[hd][14]]);
  const A=ik(S,target,la,lb,pole);
  aimBone(K,W,L,arm,fa,A.E);W[fa]=M4.mul(W[arm],L[fa]);aimBone(K,W,L,fa,hd,A.H);W[hd]=M4.mul(W[fa],L[hd]);
  // 손목은 아래팔과 일직선
  const hy=V.norm(M4.dir(W[hd],[0,1,0])),fy=V.norm(V.sub(A.H,A.E)),p=M4.pos(W[hd]);
  W[hd]=M4.chain(M4.tr(p[0],p[1],p[2]),M4.rotFromTo(hy,fy),M4.tr(-p[0],-p[1],-p[2]),W[hd]);if(Hm)W[hd]=Hm;return A}
/* 무기 자세: 손잡이 위치(월드) + 각도(수평 기준, 앞쪽 +) */
function wDir(sg,ang){return[sg*Math.cos(ang),Math.sin(ang),0]}
function wMat(R,grip,d,zf){const s=Math.min(1,1.15/R.len);let Z=[0,0,zf||1];const X=V.norm(V.cross(d,Z));Z=V.cross(X,d);
  return M4.chain(M4.basis(X,d,Z,grip),M4.sc(s),M4.tr(0,-R.gripY,0))}
function contactY(R){return lerp(R.bot,R.top,CONTACT_K[R.type]||.72)}
function gripFromContact(R,C,d){const s=Math.min(1,1.15/R.len);return V.madd(C,d,-(contactY(R)-R.gripY)*s)}
function gripMatrix(R,K){const s=Math.min(1,1.15/R.len),g=handGrip(K,'R');// 손잡이가 쥔 구멍을 지나고 날은 엄지 쪽으로
  return M4.chain(M4.basis([0,1,0],[g.th,0,0],[0,0,-g.th],g.p),M4.sc(s),M4.tr(0,-R.gripY,0))}
const ease={io:x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2,in:x=>x*x*x,out:x=>1-Math.pow(1-x,3),back:x=>{const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)}};
/* 연출: 게임 결투 상태를 읽어 동작과 무기 자세를 고름 */
function choreo(DQ,now,PW,OW){
  const ph=DQ.phase,t=(now-DQ.ph0)/1000,P=DS.p,O=DS.o,st=1.05,T=Object.assign({},CLASH_T,H.CLASH||{});
  const mark=ph+'|'+DQ.round+'|'+(DQ.clash?DQ.clash.t0:0);
  const cam=DS.camT={tgt:[0,1.05,0],dk:1,roll:0,cut:false};
  if(DS.mark!==mark){DS.sub='';DS.ev={};P.wp=null;O.wp=null;P.hidden=O.hidden=false}
  P.trailOn=O.trailOn=false;
  const kamae=(a,R,ph0)=>{const br=Math.sin(DS.clock/1000*2.1+ph0),A=KAMAE[R.type]||KAMAE.sword;a.wp={g:[a.x+a.sg*A[0],A[1]+br*.012,.1],d:wDir(a.sg,A[2]+br*.03)}};
  if(ph==='intro'){const k=ease.io(clamp((t-.1)/.8,0,1));P.x=lerp(-2.8,-st,k);O.x=lerp(2.8,st,k);P.aura=O.aura=.3+.7*k;kamae(P,PW,0);kamae(O,OW,1.3);if(DS.mark!==mark){setClip(P,'idle',{loop:true});setClip(O,'idle',{loop:true,off:.7})}}
  else if(ph==='ready'||ph==='qte'){P.x+=(-st-P.x)*.15;O.x+=(st-O.x)*.15;P.aura=O.aura=ph==='qte'?.8:.6;kamae(P,PW,0);kamae(O,OW,1.3);if(DS.mark!==mark){setClip(P,'idle',{loop:true,blend:.3});setClip(O,'idle',{loop:true,off:.7,blend:.3})}}
  else if(ph==='clash'&&DQ.clash){const c=(now-DQ.clash.t0)/1000,Wn=DQ.clash.w;
    const win=Wn==='p'?P:Wn==='o'?O:null,lose=Wn==='p'?O:Wn==='o'?P:null,RW=Wn==='p'?PW:OW,RL=Wn==='p'?OW:PW;
    // 맞대는 지점: 이긴 쪽이 조금씩 밀어붙임
    const bk=clamp((c-T.imp)/(T.brk-T.imp),0,1),push=win?win.sg*.12*ease.io(bk):0,trem=c>T.imp&&c<T.brk?1:0;
    const C=[push+Math.sin(c*61)*.008*trem,1.42+Math.sin(c*47)*.01*trem,.02];DS.C=C;
    const BA=.55;// 맞댄 칼 각도
    const bind=(a,R)=>{const d=wDir(a.sg,BA+(a===win?.04:a===lose?-.05:0)*bk),Cz=[C[0],C[1],C[2]+a.sg*.03],g=gripFromContact(R,Cz,d);return{g,d}};
    const BP=bind(P,PW),BO=bind(O,OW);const bx={p:BP.g[0]-.4,o:BO.g[0]+.4};
    if(c<T.imp){// 돌진하며 내려베기
      const k=clamp(c/T.imp,0,1),e=ease.in(k);if(DS.sub!=='rush'){DS.sub='rush';setClip(P,'slash',{off:.2,rate:1.3,blend:.08});setClip(O,'slash',{off:.2,rate:1.3,blend:.08})}
      P.x=lerp(-st,bx.p,ease.io(k));O.x=lerp(st,bx.o,ease.io(k));
      for(const[a,B,R]of[[P,BP,PW],[O,BO,OW]]){const A=KAMAE[R.type]||KAMAE.sword,gk=[a.x+a.sg*A[0],A[1],.1],g0=[a.x+a.sg*.04,1.62,0],r=.38;
        if(k<r){const u=ease.out(k/r);a.wp={g:V.mix(gk,g0,u),d:wDir(a.sg,lerp(A[2],2.3,u))}}// 치켜들기
        else{const u=ease.in((k-r)/(1-r));a.wp={g:V.mix(g0,B.g,u),d:wDir(a.sg,lerp(2.3,BA,u))};a.trailOn=u>.15}// 내려베기
        a.aura=1.1}
      cam.dk=lerp(1,.9,k);cam.tgt=[0,1.15,0]}
    else if(c<T.brk){// 칼날 맞대기 (츠바제리아이)
      if(DS.sub!=='lock'){DS.sub='lock';P.cur.rate=.05;O.cur.rate=.05}
      P.x=bx.p;O.x=bx.o;P.wp=BP;O.wp=BO;P.lean=O.lean=.16;P.aura=O.aura=1.5+bk*.6;
      cam.dk=lerp(.78,.7,bk);cam.tgt=[C[0]*.6,1.32,0];cam.roll=-.07*(win?win.sg:1)*ease.io(Math.min(1,bk*3))}
    else if(win){// 이긴 쪽이 밀쳐내고 스쳐 지나가며 벤다
      const x0w=win===P?bx.p:bx.o,x0l=lose===P?bx.p:bx.o,xEnd=x0l+win.sg*1.15;
      const d1=T.brk+.13;
      if(DS.sub!=='brk'){DS.sub='brk';setClip(win,'power',{off:.42,rate:1.6,blend:.06});setClip(lose,'blockidle',{blend:.1,rate:.4});DS.ghosts.length=0;win.ghostT=0}
      if(c<d1){const k=ease.out((c-T.brk)/.13);win.x=lerp(x0w,xEnd,k);win.wp={g:[win.x+win.sg*.42,lerp(1.18,1.0,k),.08],d:wDir(win.sg,lerp(BA,-.75,k))};win.trailOn=true;win.ghostOn=true;win.aura=2}
      else{win.x=xEnd;win.wp={g:[xEnd+win.sg*.46,1.0,.08],d:wDir(win.sg,-.75)};win.ghostOn=false;win.aura=c<T.cut?1.4:1.8;
        if(c>T.back){// 순간이동으로 제자리 복귀
          if(DS.sub!=='home'){DS.sub='home';ghostSnap(win,true);setClip(win,'idle',{loop:true,blend:.2})}win.x=win===P?-st:st;win.wp=null;win.aura=1}}
      const lk=clamp((c-T.brk)/.18,0,1);
      if(c<T.cut){lose.x=x0l-lose.sg*.08*ease.out(lk);lose.wp={g:[lose.x+lose.sg*lerp(.4,.22,ease.out(lk)),lerp(1.15,1.3,ease.out(lk)),0],d:wDir(lose.sg,lerp(BA,1.75,ease.back(lk)))};lose.aura=1}
      else{if(!DS.ev.cut){DS.ev.cut=1;setClip(lose,'hit',{blend:.05,rate:.85});cutFX(lose,RW,RL)}
        const kk=ease.out(clamp((c-T.cut)/.45,0,1));lose.x=x0l-lose.sg*(.08+.55*kk);lose.wp=null;lose.aura=.35;
        if(c>T.back+.15&&!DS.ev.lrec){DS.ev.lrec=1;setClip(lose,'idle',{loop:true,blend:.4})}
        if(c>T.back){const k2=clamp((c-T.back)/(T.end-T.back),0,1);lose.x=lerp(x0l-lose.sg*.63,lose===P?-st:st,ease.io(k2))}}
      // 카메라: 돌파 순간 이긴 쪽 따라가기 → 정적 → 베인 순간 흔들림
      if(c<d1+.05){cam.tgt=[win.x*.55,1.2,0];cam.dk=.82;cam.roll=.09*win.sg}
      else if(c<T.cut){cam.tgt=[(win.x+lose.x)*.5,1.1,0];cam.dk=.92;cam.roll=.04*win.sg}
      else if(c<T.back){cam.tgt=[(win.x+lose.x)*.5,1.1,0];cam.dk=.98}
      else{cam.dk=1}
      if(c>=T.brk&&!DS.ev.brk){DS.ev.brk=1;burstAt(C,EW(DQ[win===P?'pw':'ow']),1.2);cam.cut=true}}
    else{// 상쇄: 서로 튕겨남
      if(DS.sub!=='rep'){DS.sub='rep';setClip(P,'blockidle',{blend:.1});setClip(O,'blockidle',{blend:.1});burstAt(C,EW(DQ.pw),1);burstAt(C,EW(DQ.ow),.6)}
      const k=ease.out(clamp((c-T.brk)/.35,0,1));
      if(c<T.cut){for(const[a,B]of[[P,BP],[O,BO]]){a.x=lerp(B.g[0]-a.sg*.4,a.sg*-(st+.12),k);a.wp={g:[a.x+a.sg*.36,lerp(1.15,1.25,k),0],d:wDir(a.sg,lerp(BA,1.35,k))};a.aura=1.2}}
      else{if(!DS.ev.ri){DS.ev.ri=1;setClip(P,'idle',{loop:true,blend:.35});setClip(O,'idle',{loop:true,off:.7,blend:.35})}P.wp=O.wp=null;P.x+=(-st-P.x)*.08;O.x+=(st-O.x)*.08;P.aura=O.aura=.8}
      cam.dk=lerp(.75,1,k)}
    if(c>=T.imp&&!DS.ev.imp){DS.ev.imp=1;impactFX(C,EW(DQ.pw),EW(DQ.ow))}
    if(c>=T.imp&&c<T.brk)bindSparks(C,now)}
  else if(ph==='result'&&DQ.res){if(DS.mark!==mark){const win=DQ.res.win;setClip(win?P:O,'victory',{blend:.3});setClip(win?O:P,'death',{root:true,blend:.15})}
    const wa=DQ.res.win?P:O,la=DQ.res.win?O:P;wa.aura=2;la.aura=.15;cam.tgt=[wa.x*.4,1.1,0]}
  DS.mark=mark}
/* ---- 이펙트 ---- */
function spark(p,dir,sp,col,life,sz){emit({p:[...p],v:V.sc(V.norm(dir),sp),g:7,drag:1.2,st:.028,life,s0:sz||.011,s1:.004,c0:col,c1:[3,.9,.15],sh:1,a0:1,a1:.15})}
function impactFX(C,EP,EO){for(let i=0;i<110;i++){const d=[rnd(-1,1),rnd(-.4,1.3),rnd(-.5,1)];spark(C,d,rnd(2,7),[8,6,2.6],rnd(.3,.85))}
  for(let i=0;i<24;i++){const d=V.norm([rnd(-1,1),rnd(-1,1),rnd(-.3,.3)]);emit({p:[...C],v:V.sc(d,rnd(1,3)),drag:3,life:rnd(.25,.5),s0:.05,s1:.01,c0:V.sc(i%2?EP.l:EO.l,4),sh:1,st:.05,a0:1,a1:0})}
  emit({p:[...C],life:.16,s0:.8,s1:.15,c0:[8,6.4,4],sh:0,a0:1,a1:0});emit({p:[...C],life:.3,s0:.05,s1:1.8,c0:[2.6,2.2,1.6],sh:2,a0:1,a1:0});emit({p:[...C],life:.32,s0:.05,s1:1.4,c0:V.sc(EP.c,3),sh:2,a0:1,a1:0})}
let bindAcc=0,bindPulse=0;
function bindSparks(C,now){const dt=DS.dt||.016;bindAcc+=dt*220;
  while(bindAcc>1){bindAcc--;const p=V.add(C,[rnd(-.03,.03),rnd(-.03,.03),.04]);const d=[rnd(-1,1),rnd(-.1,1.4),rnd(-.2,1)];spark(p,d,rnd(1.2,4.2),Math.random()<.5?[9,7,3]:[6,3.2,.8],rnd(.2,.6),rnd(.007,.014))}
  if(now>bindPulse){bindPulse=now+rnd(90,180);for(let i=0;i<26;i++)spark(V.add(C,[0,0,.04]),[rnd(-1,1),rnd(0,1.3),rnd(-.3,1)],rnd(2.5,6),[9,8,4],rnd(.25,.55),.016);emit({p:V.add(C,[0,0,.05]),life:.1,s0:.3,s1:.08,c0:[6,4.6,2.4],sh:0,a0:1,a1:0})}
  // 맞닿은 점의 상시 섬광
  pushSpr(V.add(C,[0,0,.05]),null,.12+Math.random()*.07,0,[3.2,2.4,1.1],1);pushSpr(V.add(C,[0,0,.05]),null,.035,1,[10,9,6],1)}
function burstAt(C,E,k){for(let i=0;i<Math.round(70*k);i++)spark(C,[rnd(-1,1),rnd(-.3,1.2),rnd(-.4,1)],rnd(2,7.5),i%3?[9,7,3]:V.sc(E.l,5),rnd(.3,.8),.014);
  emit({p:[...C],life:.12,s0:.5*k,s1:.1,c0:[8,6.5,4.5],sh:0,a0:1,a1:0});emit({p:[...C],life:.35,s0:.05,s1:1.3*k,c0:V.sc(E.c,2.2),sh:2,a0:1,a1:0})}
function cutFX(lose,RW,RL){const E=EW(lose===DS.p?DS.pwd:DS.owd),Ew=EW(lose===DS.p?DS.owd:DS.pwd);const c=[lose.x,1.15,0];
  for(let i=0;i<120;i++){const d=[rnd(-1,1)-lose.sg*.6,rnd(-.4,1.2),rnd(-.6,1)];spark(V.add(c,[rnd(-.15,.15),rnd(-.3,.3),0]),d,rnd(1.5,6),i%2?V.sc(Ew.l,5):[9,7,3],rnd(.3,.9),.013)}
  emit({p:[...c],life:.45,s0:.1,s1:1.8,c0:V.sc(Ew.c,2.4),sh:2,a0:1,a1:0});emit({p:[...c],life:.16,s0:.7,s1:.15,c0:V.sc(Ew.l,3),sh:0,a0:1,a1:0});
  DS.cutLine={c,t0:DS.clock,sg:-lose.sg,E:Ew}}
/* 오오라: 뽑기 화면처럼 몸 전체를 감싸는 기운 */
const AURA_B=['Hips','Spine1','Spine2','Head','LeftArm','RightArm','LeftForeArm','RightForeArm','LeftUpLeg','RightUpLeg','LeftLeg','RightLeg'];
function auraCol(E,wd,t){if(wd&&H.isHidden&&H.isHidden(wd)){const h=lin(hsv((t*90+Math.random()*120)%360));return{c:h,l:V.mix(h,[1,1,1],.5),d:V.sc(h,.3)}}return E}
function bodyAura(a,K,W,Root,wd,dt,t){const lv=wd&&wd.type?wd.lv:0,hid=wd&&H.isHidden&&H.isHidden(wd),E0=EW(wd),inten=a.aura*(.45+lv/20*.75+(hid?.4:0));if(inten<=.05||a.hidden)return;
  const el=hid?'hid':(wd&&wd.el)||'fire',pos=n=>{const i=K.idx[n];return i==null?[a.x,1,0]:M4.pt(Root,M4.pos(W[i]))};
  a.auraAcc+=dt*(30+lv*11)*inten;
  while(a.auraAcc>1){a.auraAcc--;const E=auraCol(E0,wd,t),b=AURA_B[Math.floor(Math.random()*AURA_B.length)],p=V.add(pos(b),[rnd(-.16,.16),rnd(-.1,.1),rnd(-.16,.16)]);
    if(el==='ice'){emit({p,v:[rnd(-.1,.1),rnd(.05,.35),rnd(-.1,.1)],life:rnd(.6,1.1),s0:.02,s1:.005,c0:V.sc(E.l,5),sh:1,a0:1,a1:0});if(Math.random()<.4)emit({p,v:[0,rnd(.2,.5),0],life:rnd(.6,1),s0:.07,s1:.16,c0:V.sc(E.c,.5),sh:0,a0:.5,a1:0,fadeIn:.2})}
    else if(el==='thunder'){emit({p,v:[rnd(-1.2,1.2),rnd(-.4,1.4),rnd(-1.2,1.2)],life:rnd(.08,.2),s0:.014,s1:.006,c0:V.sc(E.l,7),sh:1,st:.04,a0:1,a1:0});if(Math.random()<.5)emit({p,v:[0,rnd(.5,1),0],st:.1,life:rnd(.3,.5),s0:.05,s1:.09,c0:V.sc(E.c,1),sh:3,a0:.7,a1:0})}
    else if(el==='dark')emit({p,v:[rnd(-.08,.08),rnd(.4,.9),rnd(-.08,.08)],st:.12,life:rnd(.5,.9),s0:.06,s1:.12,c0:V.sc(E.c,1.6),c1:V.sc(E.d||E.c,.5),sh:3,a0:.75,a1:0,fadeIn:.15});
    else if(el==='holy'){emit({p,v:[rnd(-.06,.06),rnd(.3,.7),rnd(-.06,.06)],life:rnd(.6,1.1),s0:.018,s1:.006,c0:V.sc(E.l,5),sh:1,a0:1,a1:0,fadeIn:.15});if(Math.random()<.5)emit({p,v:[0,rnd(.4,.8),0],st:.12,life:rnd(.4,.7),s0:.05,s1:.1,c0:V.sc(E.c,.9),sh:3,a0:.6,a1:0})}
    else{emit({p,v:[rnd(-.1,.1),rnd(.7,1.5),rnd(-.1,.1)],st:.09,life:rnd(.3,.55),s0:.045,s1:.085,c0:V.sc(E.l,2.2),c1:V.sc(E.d||E.c,.9),sh:3,a0:.8,a1:0});if(Math.random()<.3)emit({p,v:[rnd(-.2,.2),rnd(.8,1.6),rnd(-.2,.2)],life:rnd(.4,.8),s0:.012,s1:.004,c0:V.sc(E.l,6),sh:1,a0:1,a1:0})}}
  // 몸을 감싸는 은은한 빛 + 발밑 고리 + 등 뒤 광선 (뽑기 화면 느낌)
  const E=auraCol(E0,wd,t),ch=pos('Spine1'),pul=.85+.15*Math.sin(t*6+a.sg);
  pushSpr(ch,null,1.1*Math.min(1.6,inten),0,V.sc(E.c,.35*Math.min(1.5,inten)*pul),1);pushSpr(pos('Hips'),[0,.9,0],.55*Math.min(1.6,inten),3,V.sc(E.c,.3*Math.min(1.5,inten)),1);
  a._auraDec={E,inten,ch,lv,hid}}
function drawAuraDecals(a,t,eye){const A=a._auraDec;if(!A||a.hidden)return;const{E,inten,ch,lv,hid}=A,k=Math.min(1.6,inten);
  drawDecal(M4.chain(M4.tr(a.x,.01,0),M4.rx(-PI/2),M4.rz(t*a.sg*.9),M4.sc(.55+lv*.02)),TEX.ring,V.sc(E.c,1.4*k),Math.min(1,.3+lv/14),0);
  if(lv>=6||hid){const fw=V.norm(V.sub(eye,ch)),rt=V.norm(V.cross([0,1,0],fw)),up=V.cross(fw,rt),s=(.75+lv*.035)*(.92+.08*Math.sin(t*2.4));
    drawDecal(M4.basis(V.sc(rt,s),V.sc(up,s),fw,V.madd(ch,fw,-.35)),TEX.halo,V.sc(E.c,.5*k),Math.min(1,.25+lv/20),0)}}
/* 잔상 */
function ghostSnap(a,strong){const g=a._last;if(!g)return;DS.ghosts.push({...g,t0:DS.clock,life:strong?260:340,k:strong?1:.7});if(DS.ghosts.length>14)DS.ghosts.shift()}
function drawGhosts(){if(!DS.ghosts.length)return;const u=P_SKIN.u;gl.useProgram(P_SKIN.p);gl.enable(gl.BLEND);gl.depthMask(false);gl.blendFunc(gl.CONSTANT_ALPHA,gl.ONE);
  for(let i=DS.ghosts.length-1;i>=0;i--){const g=DS.ghosts[i],age=(DS.clock-g.t0)/g.life;if(age>=1){DS.ghosts.splice(i,1);continue}
    gl.blendColor(0,0,0,(1-age)*.24*g.k);gl.uniformMatrix4fv(u.uB,false,g.mats);gl.bindVertexArray(g.K.vao);
    for(const m of g.K.meshes){const c0=m.mat.col,e0=m.mat.emi;m.mat.col=[0,0,0];m.mat.emi=V.sc(g.E.c,.9);setMat(u,m.mat,M4.id());m.mat.col=c0;m.mat.emi=e0;if(g.K.ib)gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,m.start*4);else gl.drawArrays(gl.TRIANGLES,m.start,m.count)}
    gl.useProgram(P_PBR.p);gl.blendColor(0,0,0,(1-age)*.3*g.k);for(const b of g.R.batches){const e0=b.mat.emi;b.mat.emi=V.sc(g.E.c,.8);drawPBR(b.m,b.mat,g.Mw);b.mat.emi=e0}gl.useProgram(P_SKIN.p)}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.useProgram(P_PBR.p)}
/* 칼 궤적 */
function recTrail(a,R,Mw){const now=DS.clock;if(a.trailOn&&Mw){const tip=M4.pt(Mw,[0,R.top,0]),mid=M4.pt(Mw,[0,lerp(R.bot,R.top,.62),0]);a.trail.push({tip,mid,t:now})}
  while(a.trail.length&&now-a.trail[0].t>230)a.trail.shift()}
function drawTrail(a,E){const T=a.trail,n=T.length;if(n<2)return;const now=DS.clock;
  for(let i=1;i<n;i++){const A=T[i-1],B=T[i],k=1-(now-B.t)/230;if(k<=0)continue;
    for(let s=0;s<3;s++){const u0=s/3,u1=(s+1)/3,p0=V.mix(A.tip,B.tip,u0),p1=V.mix(A.tip,B.tip,u1),m0=V.mix(A.mid,B.mid,u0),m1=V.mix(A.mid,B.mid,u1);
      pushSpr(V.mix(p0,p1,.5),V.sub(p1,p0),.035*k+.01,1,V.sc([1,1,1],7*k),k);
      for(const f of[.25,.5,.75]){const q0=V.mix(m0,p0,f),q1=V.mix(m1,p1,f);pushSpr(V.mix(q0,q1,.5),V.sub(q1,q0),.07*k,0,V.sc(E.l,2.2*k*f),k)}
      pushSpr(V.mix(m0,m1,.5),V.sub(m1,m0),.05*k,0,V.sc(E.c,1.5*k),k)}}}
function drawCutLine(){const L=DS.cutLine;if(!L)return;const age=(DS.clock-L.t0)/500;if(age>=1){DS.cutLine=null;return}
  const k=1-age,len=lerp(.4,1.4,ease.out(Math.min(1,age*4))),d=V.norm([L.sg*.9,-.55,.15]),c=L.c;
  pushSpr(c,V.sc(d,len),.06*k,1,[14,14,14],1);pushSpr(c,V.sc(d,len*1.05),.22*k,0,V.sc(L.E.c,3*k),1)}
function duelFrame(now,dt){
  const DQ=H.getDuel&&H.getDuel();if(!DQ)return false;const CFG=duelCfg(DQ);if(!duelReady(DQ)){preloadDuel([CFG.p.ch,CFG.o.ch]);return false}
  const fr=prepFrame(now);if(!fr)return true;const{w,h,cw,ch}=fr,t=now/1000;
  const frozen=now<(DQ.inv||0),sdt=frozen?dt*.04:dt;DS.clock+=sdt*1000;DS.dt=sdt;sprN=0;
  if(!DS.p||DS.duelId!==DQ.id){DS.p=newActor('p');DS.o=newActor('o');DS.mark='';DS.duelId=DQ.id;parts.length=0;DS.ghosts.length=0;DS.cutLine=null;DS.cam=null}
  DS.pwd=DQ.pw;DS.owd=DQ.ow;
  const PW=getWeapon(DQ.pw),OW=getWeapon(DQ.ow);
  choreo(DQ,now,PW,OW);
  // 카메라 (애니 연출: 줌·기울기·컷)
  const CT=DS.camT;if(!DS.cam||CT.cut)DS.cam={tgt:[...CT.tgt],dk:CT.dk,roll:CT.roll};else{const f=1-Math.exp(-dt*9);DS.cam.tgt=V.mix(DS.cam.tgt,CT.tgt,f);DS.cam.dk=lerp(DS.cam.dk,CT.dk,f);DS.cam.roll=lerp(DS.cam.roll,CT.roll,f)}
  const asp=cw/ch,fov=34*PI/180,tn=Math.tan(fov/2),tgt=DS.cam.tgt;
  let dist=Math.max(1.05/tn,2.15/(tn*asp));if(DQ.phase==='intro'){const k=clamp((now-DQ.ph0)/1000/1.6,0,1);dist*=1+.45*(1-k*k*(3-2*k))}
  dist*=DS.cam.dk;
  const sh=(DQ.shake||0)*.002,jit=[rnd(-1,1)*sh,rnd(-1,1)*sh,0],rl=DS.cam.roll;
  const eye=V.add(V.add(tgt,V.sc(V.norm([Math.sin(t*.13)*.08,.16,1]),dist)),jit);
  cam.V=M4.look(eye,V.add(tgt,jit),[Math.sin(rl),Math.cos(rl),0]);cam.P=M4.persp(fov,asp,.05,60);cam.VP=M4.mul(cam.P,cam.V);cam.eye=eye;
  const EP=EW(DQ.pw),EO=EW(DQ.ow);
  const lights=[[[-3,2.6,1.4],V.sc(EP.c,2.2),.05],[[3,2.6,1.4],V.sc(EO.c,2.2),.05],[[0,4,3],[1.1,1.05,1],.02],[[-4.5,1.8,-2.5],V.sc([3,1.3,.4],.85+.15*Math.sin(t*9)),.25],[[4.5,1.8,-2.5],V.sc([3,1.3,.4],.85+.15*Math.sin(t*8+1)),.25],[[0,1.3,.6],[0,0,0],1]];
  if(DQ.phase==='clash'&&DQ.clash&&DS.C){const c=(now-DQ.clash.t0)/1000,T=Object.assign({},CLASH_T,H.CLASH||{});
    if(c>T.imp&&c<T.brk+.2){lights[5][0]=V.add(DS.C,[0,0,.25]);lights[5][1]=V.sc([6,4.5,2.5],c<T.imp+.5?Math.max(.5,1.6-(c-T.imp)*2):.55+.35*Math.random())}}
  beginScene(w,h,eye,lights,dist+3,[1.1,.9,.75]);
  drawPBR(MS.floor,SC.floorM,M4.sc(1.3,1,1.3));drawPBR(MS.wall,SC.wallM,M4.chain(M4.tr(0,0,-4),M4.sc(1.4,1.1,1)));
  for(const sx of[-3.6,3.6]){drawPBR(MS.box,SC.forgeM,M4.chain(M4.tr(sx,1.6,-2.6),M4.sc(.55,3.2,.55)));drawPBR(MS.box,SC.ironM,M4.chain(M4.tr(sx,1.85,-2.25),M4.sc(.1,.35,.1)))}
  // 캐릭터 + 무기
  const actors=[[DS.p,'p',PW,DQ.pw,EP],[DS.o,'o',OW,DQ.ow,EO]];const wmats=[];
  for(const[a,side,R,wd,E]of actors){const cfg=CFG[side],K=CH[cfg.ch],clips=ANIM[cfg.an];
    const Root=M4.chain(M4.tr(a.x,0,0),M4.ry(side==='p'?PI/2:-PI/2)),Ri=M4.inv(Root);const{W,L}=actorWorld(a,K,clips);const ix=K.idx;
    let Mw=null;
    if(a.wp){// 손을 무기 손잡이로 (IK)
      if(a.lean&&ix.Spine1!=null){rotBone(W,ix.Spine1,M4.rx(a.lean));refreshBelow(K,W,L,ix.Spine1)}
      Mw=wMat(R,a.wp.g,a.wp.d,1);
      const fwd=[a.sg,0,0],toL=p=>M4.pt(Ri,p);
      const pole=(arm)=>{const s=M4.pt(Root,M4.pos(W[ix[arm]])),c=M4.pt(Root,M4.pos(W[ix.Spine2]));return toL(V.add(s,V.add(V.sc(V.norm(V.sub(s,c)),1),[0,-1.1,0])))};
      const hold=(arm,fa,hd,s,g)=>{const shW=M4.pt(Root,M4.pos(W[ix[arm]])),Hw=handFrame(handGrip(K,s),g,a.wp.d,V.norm(V.sub(g,shW)));armIK(K,W,L,ix[arm],ix[fa],ix[hd],toL(M4.pos(Hw)),pole(arm),M4.mul(Ri,Hw))};
      if(ix.RightArm!=null)hold('RightArm','RightForeArm','RightHand','R',a.wp.g);
      const off=OFFH[R.type]||0;
      if(off&&ix.LeftArm!=null){const s=Math.min(1,1.15/R.len);hold('LeftArm','LeftForeArm','LeftHand','L',V.madd(a.wp.g,a.wp.d,-off*s))}}
    drawSkin(K,Root,W,cfg.tint);
    const hi=ix.RightHand;const broken=DQ.phase==='result'&&DQ.res&&!DQ.res.win&&side==='p'&&DQ.res.broken;
    if(!Mw&&hi!=null)Mw=M4.chain(Root,W[hi],gripMatrix(R,K));
    if(Mw&&!broken){wmats.push([R,Mw,E,a,wd]);for(const b of R.batches)drawPBR(b.m,b.mat,Mw)}
    // 잔상용 스냅샷
    const B=K.bones,mats=new Float32Array(24*16);for(let i=0;i<B.length&&i<24;i++)mats.set(M4.chain(Root,W[i],B[i].inv),i*16);
    a._last={K,mats,Mw,R,E:auraCol(E,wd,t)};
    if(a.ghostOn){a.ghostT-=dt;if(a.ghostT<=0){a.ghostT=.045;ghostSnap(a,false)}}
    bodyAura(a,K,W,Root,wd,frozen?0:dt,t);recTrail(a,R,Mw)}
  if(P_SKIN)drawGhosts();
  // 데칼·스프라이트
  gl.enable(gl.BLEND);gl.depthMask(false);gl.useProgram(P_DEC.p);gl.uniformMatrix4fv(P_DEC.u.uVP,false,cam.VP);gl.uniform1i(P_DEC.u.uT,0);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);for(const a of[DS.p,DS.o])drawDecal(M4.chain(M4.tr(a.x,.004,0),M4.rx(-PI/2),M4.sc(.45,.3,1)),null,[0,0,0],.65,1);
  gl.blendFunc(gl.ONE,gl.ONE);
  drawDecal(M4.chain(M4.tr(-1.3,.006,.1),M4.rx(-PI/2),M4.sc(1.4,1,1)),null,V.sc(EP.c,.45),.6,2);drawDecal(M4.chain(M4.tr(1.3,.006,.1),M4.rx(-PI/2),M4.sc(1.4,1,1)),null,V.sc(EO.c,.45),.6,2);
  drawDecal(M4.chain(M4.tr(0,.008,0),M4.rx(-PI/2),M4.rz(t*.2),M4.sc(1.6)),TEX.circle,[.5,.42,.35],.5,0);
  for(const a of[DS.p,DS.o])drawAuraDecals(a,t,eye);
  for(const[R,Mw,E,a,wd]of wmats){const lv=wd&&wd.type?wd.lv:0,k=Math.min(1.6,a.aura);
    spawnAuraFor(R,Mw,frozen?0:dt,1);weaponFX(R,Mw,E,t,eye,.8);
    if(R.type!=='blank'){const b0=M4.pt(Mw,[0,Math.max(R.bot*.2,0),0]),b1=M4.pt(Mw,[0,R.top,0]),Ea=auraCol(E,wd,t);pushSpr(V.mix(b0,b1,.5),V.sub(b1,b0),.06+lv*.003,0,V.sc(Ea.c,(.15+lv*.03)*k),1)}
    drawTrail(a,auraCol(E,wd,t))}
  drawCutLine();
  stepParts(frozen?0:dt);partsToSpr();
  if(DS.C){const p=project(DS.C);DS.cpx=p}
  endScene(w,h,{shake:DQ.shake||0,fz:0,t,inv:frozen&&DQ.phase==='clash'});
  return true}
function EW(wd){if(!wd||!wd.type)return{c:[3,1.2,.3],l:[4,2.6,1.2],d:[.5,.2,.05]};
  if(wd.type==='saber'){const c=lin(H.SABER_C[wd.lv]||'#fff');return{c,l:V.mix(c,[1,1,1],.6),d:V.sc(c,.3)}}
  if(wd.type==='shinai'){const c=lin(H.SHINAI_P[wd.lv][1]);return{c,l:V.mix(c,[1,1,1],.6),d:V.sc(c,.3)}}
  if(wd.type==='scythe'){const c=lin(H.SCYTHE_C[wd.lv]||'#9aa');return{c,l:V.mix(c,[1,1,1],.55),d:V.sc(c,.3)}}
  const E=H.ELS[wd.el];return{c:lin(E.c),l:lin(E.l),d:lin(E.d)}}
function duelPt(){return DS.cpx}
function duelActorPt(side){const a=side==='p'?DS.p:DS.o;if(!a||!cam.VP)return null;return project([a.x,1.15,0])}
