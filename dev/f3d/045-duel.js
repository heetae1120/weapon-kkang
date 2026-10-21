
/* ---------------- 결투 장면 (캐릭터 + 모션) ---------------- */
const WCACHE=new Map();
function getWeapon(w){const key=(w.type||'blank')+'|'+(w.el||'')+'|'+w.lv;let R=WCACHE.get(key);
  if(!R){R=buildWeapon(w);R.key=key;R.gripY={sword:-.1,dagger:-.06,spear:-.55,axe:-.62,saber:-.13,shinai:-.14,scythe:-.7,blank:-.12}[R.type];WCACHE.set(key,R);
    if(WCACHE.size>6){const k=WCACHE.keys().next().value;freeWeapon(WCACHE.get(k));WCACHE.delete(k)}}
  return R}
const CHAR_IDS=['paladin','smith','guard','orc','erika','ninja','kachujin'];
function duelCfg(DQ){const pc=CHAR_IDS.includes(DQ.pch)?DQ.pch:'paladin',oc=CHAR_IDS.includes(DQ.och)?DQ.och:'guard';return{p:{ch:pc,an:'paladin',tint:null},o:{ch:oc,an:'paladin',tint:pc===oc?[1.25,.62,.55]:null}}}
let GRIP=[0,.075,.02, PI/2,0,0];// 손 뼈 기준 위치(x,y,z)와 회전(rx,ry,rz)
const DS={clock:0,last:null,p:null,o:null,mark:'',sparkDone:false};
function charReady(k){return CH[k]&&CH[k]!=='loading'}
function duelReady(DQ){const c=DQ?duelCfg(DQ):{p:{ch:'paladin'},o:{ch:'paladin'}};return charReady(c.p.ch)&&charReady(c.o.ch)&&ANIM.paladin&&ANIM.paladin!=='loading'}
function preloadDuel(list){loadAnims('paladin','paladin_anim');for(const k of(list||['paladin']))if(CHAR_IDS.includes(k))loadChar(k,k)}
function newActor(side){return{side,x:side==='p'?-2.6:2.6,cur:{name:'idle',t0:0,rate:1,loop:true,off:0,root:false},prev:null,bt0:0,bdur:.2}}
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
  const B=K.bones,W=new Array(B.length);
  for(let i=0;i<B.length;i++){const b=B[i],qq=q[b.name];let L;
    if(qq){L=qToM(qq);if(b.name==='Hips'&&hp){const hs=(clips.__hsc||K.sc)*(clips.__hrest?b.local[13]/clips.__hrest:1);L[12]=hp[0]*hs;L[13]=hp[1]*hs;L[14]=hp[2]*hs}else{L[12]=b.local[12];L[13]=b.local[13];L[14]=b.local[14]}}
    else L=b.local;
    W[i]=b.parent>=0?M4.mul(W[b.parent],L):L}
  return W}
function drawSkin(K,Root,W,tint){const u=P_SKIN.u;gl.useProgram(P_SKIN.p);const B=K.bones,mats=new Float32Array(24*16);
  for(let i=0;i<B.length&&i<24;i++)mats.set(M4.chain(Root,W[i],B[i].inv),i*16);gl.uniformMatrix4fv(u.uB,false,mats);gl.bindVertexArray(K.vao);
  for(const m of K.meshes){const c0=m.mat.col;if(tint)m.mat.col=[c0[0]*tint[0],c0[1]*tint[1],c0[2]*tint[2]];setMat(u,m.mat,M4.id());m.mat.col=c0;if(K.ib)gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,m.start*4);else gl.drawArrays(gl.TRIANGLES,m.start,m.count)}gl.useProgram(P_PBR.p)}
function gripMatrix(R){const s=Math.min(1,1.15/R.len);return M4.chain(M4.tr(GRIP[0],GRIP[1],GRIP[2]),M4.rz(GRIP[5]),M4.ry(GRIP[4]),M4.rx(GRIP[3]),M4.sc(s),M4.tr(0,-R.gripY,0))}
/* 연출: 게임 결투 상태를 읽어 동작을 고름 */
function choreo(DQ,now){
  const ph=DQ.phase,t=(now-DQ.ph0)/1000,P=DS.p,O=DS.o,st=1.05;
  const mark=ph+'|'+DQ.round+'|'+(DQ.clash?DQ.clash.t0:0);
  const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  if(ph==='intro'){const k=ease(clamp((t-.1)/.8,0,1));P.x=lerp(-2.8,-st,k);O.x=lerp(2.8,st,k);if(DS.mark!==mark){setClip(P,'idle',{loop:true});setClip(O,'idle',{loop:true,off:.7})}}
  else if(ph==='ready'||ph==='qte'){P.x+=(-st-P.x)*.15;O.x+=(st-O.x)*.15;if(DS.mark!==mark){setClip(P,'idle',{loop:true,blend:.3});setClip(O,'idle',{loop:true,off:.7,blend:.3})}}
  else if(ph==='clash'&&DQ.clash){const c=(now-DQ.clash.t0)/1000,Wn=DQ.clash.w,cl=.5;
    if(DS.mark!==mark){DS.sub='';DS.sparkDone=false}
    if(c<.32){const k=(c/.32)**2;P.x=lerp(-st,-cl,k);O.x=lerp(st,cl,k);if(DS.sub!=='rush'){DS.sub='rush';setClip(P,'slash',{off:.2,rate:1.3,blend:.08});setClip(O,'slash',{off:.2,rate:1.3,blend:.08})}}
    else if(c<.85){const j=Math.sin(c*95)*.012;P.x=-cl+j;O.x=cl+j;if(DS.sub!=='lock'){DS.sub='lock';P.cur.rate=.06;O.cur.rate=.06}}
    else if(c<1.45){const k=1-Math.pow(1-(c-.85)/.6,3);
      if(DS.sub!=='res'){DS.sub='res';
        if(Wn==='p'){setClip(P,'power',{off:.35,rate:1.25,blend:.1});setClip(O,'hit',{blend:.06,rate:.9})}
        else if(Wn==='o'){setClip(O,'power',{off:.35,rate:1.25,blend:.1});setClip(P,'hit',{blend:.06,rate:.9})}
        else{setClip(P,'blockidle',{blend:.08});setClip(O,'blockidle',{blend:.08})}}
      if(Wn==='p'){P.x=lerp(-cl,-.3,k);O.x=lerp(cl,1.45,k)}else if(Wn==='o'){O.x=lerp(cl,.3,k);P.x=lerp(-cl,-1.45,k)}else{P.x=lerp(-cl,-.9,k);O.x=lerp(cl,.9,k)}}
    else{const k=clamp((c-1.45)/.45,0,1);P.x+=(-st-P.x)*k*.3;O.x+=(st-O.x)*k*.3;if(DS.sub!=='back'){DS.sub='back';setClip(P,'idle',{loop:true,blend:.35});setClip(O,'idle',{loop:true,off:.7,blend:.35})}}
    if(DQ.clash.ev&&DQ.clash.ev.imp&&!DS.sparkDone){DS.sparkDone=true;duelSparks()}}
  else if(ph==='result'&&DQ.res){if(DS.mark!==mark){const win=DQ.res.win;setClip(win?P:O,'victory',{blend:.3});setClip(win?O:P,'death',{root:true,blend:.15})}}
  DS.mark=mark}
function duelSparks(){const T=[0,1.25,0];for(let i=0;i<70;i++){const d=V.norm([rnd(-1,1),rnd(-.3,1.3),rnd(-.6,.9)]);emit({p:[...T],v:V.sc(d,rnd(1.6,5)),g:6,st:.03,life:rnd(.3,.8),s0:.012,s1:.007,c0:[7,4.8,1.8],c1:[3,1,.2],sh:1,a0:1,a1:.2})}
  emit({p:[...T],life:.16,s0:.9,s1:.2,c0:[9,7,4],sh:0,a0:1,a1:0});emit({p:[...T],life:.35,s0:.05,s1:1.6,c0:[3,2.5,1.6],sh:2,a0:1,a1:0})}
function duelFrame(now,dt){
  const DQ=H.getDuel&&H.getDuel();if(!DQ)return false;const CFG=duelCfg(DQ);if(!duelReady(DQ)){preloadDuel([CFG.p.ch,CFG.o.ch]);return false}
  const fr=prepFrame(now);if(!fr)return true;const{w,h,cw,ch}=fr,t=now/1000;
  const frozen=now<(DQ.inv||0);DS.clock+=dt*1000*(frozen?.04:1);
  if(!DS.p||DS.duelId!==DQ.id){DS.p=newActor('p');DS.o=newActor('o');DS.mark='';DS.duelId=DQ.id;parts.length=0}
  choreo(DQ,now);
  // 카메라
  const asp=cw/ch,fov=34*PI/180,tn=Math.tan(fov/2),tgt=[0,1.05,0];
  let dist=Math.max(1.05/tn,2.15/(tn*asp));if(DQ.phase==='intro'){const k=clamp((now-DQ.ph0)/1000/1.6,0,1);dist*=1+.45*(1-k*k*(3-2*k))}
  if(DQ.phase==='clash'&&DQ.clash){const c=(now-DQ.clash.t0)/1000;if(c>.25&&c<1.1)dist*=.86}
  const sh=(DQ.shake||0)*.002,jit=[rnd(-1,1)*sh,rnd(-1,1)*sh,0];
  const eye=V.add(V.add(tgt,V.sc(V.norm([Math.sin(t*.13)*.08,.16,1]),dist)),jit);
  cam.V=M4.look(eye,V.add(tgt,jit),[0,1,0]);cam.P=M4.persp(fov,asp,.05,60);cam.VP=M4.mul(cam.P,cam.V);cam.eye=eye;
  const PW=getWeapon(DQ.pw),OW=getWeapon(DQ.ow);
  const EP=EW(DQ.pw),EO=EW(DQ.ow);
  const lights=[[[-3,2.6,1.4],V.sc(EP.c,2.2),.05],[[3,2.6,1.4],V.sc(EO.c,2.2),.05],[[0,4,3],[1.1,1.05,1],.02],[[-4.5,1.8,-2.5],V.sc([3,1.3,.4],.85+.15*Math.sin(t*9)),.25],[[4.5,1.8,-2.5],V.sc([3,1.3,.4],.85+.15*Math.sin(t*8+1)),.25],[[0,1.3,.6],[0,0,0],1]];
  if(DQ.phase==='clash'&&DQ.clash){const c=(now-DQ.clash.t0)/1000;if(c>.32&&c<1)lights[5][1]=V.sc([6,4.5,2.5],Math.max(0,1-(c-.32)/.6))}
  beginScene(w,h,eye,lights,dist+3,[1.1,.9,.75]);
  const I=M4.id();
  drawPBR(MS.floor,SC.floorM,M4.sc(1.3,1,1.3));drawPBR(MS.wall,SC.wallM,M4.chain(M4.tr(0,0,-4),M4.sc(1.4,1.1,1)));
  for(const sx of[-3.6,3.6]){drawPBR(MS.box,SC.forgeM,M4.chain(M4.tr(sx,1.6,-2.6),M4.sc(.55,3.2,.55)));drawPBR(MS.box,SC.ironM,M4.chain(M4.tr(sx,1.85,-2.25),M4.sc(.1,.35,.1)))}
  // 캐릭터 + 무기
  const actors=[[DS.p,'p',PW,DQ.pw,EP],[DS.o,'o',OW,DQ.ow,EO]];const wmats=[];
  for(const[a,side,R,wd,E]of actors){const cfg=CFG[side],K=CH[cfg.ch],clips=ANIM[cfg.an];
    const Root=M4.chain(M4.tr(a.x,0,0),M4.ry(side==='p'?PI/2:-PI/2));const W=actorWorld(a,K,clips);
    drawSkin(K,Root,W,cfg.tint);
    const hi=K.idx.RightHand;if(hi!=null&&!(DQ.phase==='result'&&DQ.res&&!DQ.res.win&&side==='p'&&DQ.res.broken)){const Mw=M4.chain(Root,W[hi],gripMatrix(R));wmats.push([R,Mw,E]);
      for(const b of R.batches)drawPBR(b.m,b.mat,Mw)}}
  // 데칼·스프라이트
  gl.enable(gl.BLEND);gl.depthMask(false);gl.useProgram(P_DEC.p);gl.uniformMatrix4fv(P_DEC.u.uVP,false,cam.VP);gl.uniform1i(P_DEC.u.uT,0);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);for(const a of[DS.p,DS.o])drawDecal(M4.chain(M4.tr(a.x,.004,0),M4.rx(-PI/2),M4.sc(.45,.3,1)),null,[0,0,0],.65,1);
  gl.blendFunc(gl.ONE,gl.ONE);
  drawDecal(M4.chain(M4.tr(-1.3,.006,.1),M4.rx(-PI/2),M4.sc(1.4,1,1)),null,V.sc(EP.c,.45),.6,2);drawDecal(M4.chain(M4.tr(1.3,.006,.1),M4.rx(-PI/2),M4.sc(1.4,1,1)),null,V.sc(EO.c,.45),.6,2);
  drawDecal(M4.chain(M4.tr(0,.008,0),M4.rx(-PI/2),M4.rz(t*.2),M4.sc(1.6)),TEX.circle,[.5,.42,.35],.5,0);
  sprN=0;
  for(const[R,Mw,E]of wmats){spawnAuraFor(R,Mw,dt,.4);weaponFX(R,Mw,E,t,eye,.45)}
  stepParts(frozen?0:dt);partsToSpr();
  endScene(w,h,{shake:DQ.shake||0,fz:0,t});
  return true}
function EW(wd){if(!wd||!wd.type)return{c:[3,1.2,.3],l:[4,2.6,1.2],d:[.5,.2,.05]};
  if(wd.type==='saber'){const c=lin(H.SABER_C[wd.lv]||'#fff');return{c,l:V.mix(c,[1,1,1],.6),d:V.sc(c,.3)}}
  if(wd.type==='shinai'){const c=lin(H.SHINAI_P[wd.lv][1]);return{c,l:V.mix(c,[1,1,1],.6),d:V.sc(c,.3)}}
  if(wd.type==='scythe'){const c=lin(H.SCYTHE_C[wd.lv]||'#9aa');return{c,l:V.mix(c,[1,1,1],.55),d:V.sc(c,.3)}}
  const E=H.ELS[wd.el];return{c:lin(E.c),l:lin(E.l),d:lin(E.d)}}
