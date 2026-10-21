
/* ---------------- 대장간 장면 ---------------- */
const AT=.935;// 모루 윗면 높이
const FLX=-.3;// 공중 전시 위치 x
const SC={};let WPN=null,WKEY='',pose={p:0,q:null},lastHitT=-9999,smithT=0,cam={VP:null,eye:[0,0,0],P:null,V:null},quality=1,ftAvg=16,lastNow=0,arcT=0,auraAcc=0,fireAcc=0,emberAcc=0;
const L3={thI:0,thW:2.75,thR:.55,thIdle:1.15,T:{x:0,y:0},Tw:[0,AT,0]};
const MS={};
function buildScene(){
  const plane=(w,h)=>{const g=G();quad(g,[-w/2,0,h/2],[w/2,0,h/2],[w/2,0,-h/2],[-w/2,0,-h/2],[0,0],[1,0],[1,1],[0,1],[0,1,0]);return g};
  const wallG=G();quad(wallG,[-5,0,0],[5,0,0],[5,4.5,0],[-5,4.5,0],[0,0],[1,0],[1,1],[0,1],[0,0,1]);
  MS.floor=mesh(plane(12,8));MS.wall=mesh(wallG);
  const stone=mat({col:[.46,.42,.4],alb:PT.wall_d,nor:PT.wall_n,rgh:PT.wall_r,rep:[4,1.8],rou:.95});
  SC.floorM=mat({col:[.62,.56,.52],alb:PT.floor_d,nor:PT.floor_n,rgh:PT.floor_r,rep:[5,3.3],rou:.8,met:0});SC.wallM=stone;
  // 그루터기 + 모루
  MS.stump=mesh(lathe([[0,0],[.34,0],[.31,.04],[.3,.28],[.27,.3],[0,.3]],22,{hard:1}));SC.woodM=mat({col:[.9,.85,.8],alb:PT.bark_d,nor:PT.bark_n,rep:[3,1],rou:.8});SC.plankM=mat({col:[.9,.85,.8],alb:PT.planks_d,nor:PT.planks_n,rep:[1,1],rou:.7});
  const anv=G();
  merge(anv,extrude([[-.36,0],[.36,0],[.34,.07],[.2,.12],[.14,.34],[.2,.46],[.34,.5],[.38,.56],[.38,.62],[-.38,.62],[-.38,.55],[-.26,.5],[-.16,.44],[-.13,.34],[-.2,.12],[-.34,.07]],{depth:.27,bevel:.02}),M4.tr(0,.3,0));
  merge(anv,lathe([[.115,0],[.1,.1],[.075,.2],[.045,.3],[.016,.38],[0,.4]],18,{sz:.8}),M4.chain(M4.tr(-.37,.3+.505,0),M4.rz(PI/2)));
  merge(anv,extrude([[-.42,0],[.42,0],[.4,.05],[-.4,.05]],{depth:.4,bevel:.012}),M4.tr(0,.3,0));
  MS.anvil=mesh(anv);SC.anvM=mat({col:lin('#3c3f46'),rgh:PT.rust_r,rep:[2,2],met:.92,rou:.55});
  MS.anvTop=mesh(extrude([[-.38,0],[.38,0],[.38,.014],[-.38,.014]],{depth:.27,bevel:.004}));SC.anvTopM=mat({col:lin('#a9aeb6'),rgh:PT.rust_r,rep:[2,1],met:1,rou:.3});
  // 화로
  const fz=-.72,fx=-1.78;SC.fx=fx;SC.fz=fz;
  const fg=G();merge(fg,box(1.05,.3,.85),M4.tr(fx,.15,fz));merge(fg,box(.25,.32,.85),M4.tr(fx-.4,.46,fz));merge(fg,box(.25,.32,.85),M4.tr(fx+.4,.46,fz));merge(fg,box(1.05,.1,.85),M4.tr(fx,.67,fz));
  merge(fg,extrude([[-.55,0],[.55,0],[.25,.65],[-.25,.65]],{depth:.8,bevel:.02}),M4.tr(fx,.72,fz-.04));merge(fg,box(.46,3,.5),M4.tr(fx,2.8,fz-.12));
  MS.forge=mesh(fg);SC.forgeM=mat({col:[.42,.36,.33],alb:PT.wall_d,nor:PT.wall_n,rgh:PT.wall_r,rep:[1.2,1],rou:.95});
  MS.coal=mesh(box(.56,.06,.6));SC.coalM=mat({col:lin('#0c0806'),rou:.9,emT:TEX.coal,emTCol:[6,1.6,.3]});
  MS.inner=mesh(box(.56,.32,.02));SC.innerM=mat({col:[0,0,0],rou:1,emi:[.25,.05,0]});
  // 소품
  const pr=G();merge(pr,lathe([[0,0],[.2,0],[.23,.2],[.24,.35],[.23,.5],[.2,.7],[0,.7]],18),M4.tr(1.7,0,-.95));
  merge(pr,lathe([[0,0],[.16,0],[.18,.32],[0,.32]],16),M4.tr(-.95,0,-.5));
  MS.props=mesh(pr);
  const rack=G();merge(rack,box(1.1,.05,.06),M4.tr(1.25,1.95,-1.36));for(let i=0;i<4;i++){merge(rack,box(.03,.5+i*.06,.02),M4.tr(.85+i*.25,1.68-i*.03,-1.33));merge(rack,box(.12,.035,.035),M4.tr(.85+i*.25,1.92,-1.33))}
  merge(rack,box(.05,.05,.03),M4.tr(.85,1.4,-1.33));MS.rack=mesh(rack);SC.ironM=mat({col:lin('#3a3a40'),met:.9,rou:.5});
  MS.window=mesh(box(.62,.85,.02));SC.winM=mat({col:[0,0,0],emi:[.35,.5,.9]});
  MS.winFrame=mesh((()=>{const g=G();merge(g,box(.7,.05,.05),M4.tr(0,.45,0));merge(g,box(.7,.05,.05),M4.tr(0,-.45,0));merge(g,box(.05,.95,.05),M4.tr(-.33,0,0));merge(g,box(.05,.95,.05),M4.tr(.33,0,0));merge(g,box(.03,.9,.04),M4.tr(0,0,0));merge(g,box(.66,.03,.04),M4.tr(0,0,0));return g})());
  // 대장장이 부품
  MS.cyl=mesh(lathe([[1,0],[1,1]],14));MS.sph=mesh(sphere(1,18,12));MS.cone=mesh(lathe([[1,0],[0,1]],10));
  MS.torso=mesh(lathe([[0,-.02],[.16,0],[.165,.1],[.19,.24],[.225,.37],[.215,.46],[.15,.52],[.06,.56],[0,.56]],22,{sz:.66}));
  MS.apron=mesh(extrude([[-.15,.36],[.15,.36],[.2,-.5],[.16,-.55],[-.16,-.55],[-.2,-.5]],{depth:.018,bevel:.005}));
  MS.box=mesh(box(1,1,1));
  const ring=(r)=>{const p=[];for(let i=0;i<=32;i++){const a=i/32*TAU;p.push([Math.cos(a)*r,0,Math.sin(a)*r])}return p};
  MS.band=mesh(tube(ring(.108),.013,6));MS.belt=mesh(tube(ring(1),.022,6));
  SC.skin=mat({col:lin('#c0825a'),rou:.55});SC.pants=mat({col:lin('#2a2430'),rou:.9});SC.leather=mat({col:[1,.9,.85],alb:PT.leather_d,nor:PT.leather_n,rep:[1,1],rou:.6,met:.05});SC.hair=mat({col:lin('#16101a'),rou:.45});
  SC.bandM=mat({col:lin('#b01e2a'),rou:.6});SC.boot=mat({col:lin('#1a1412'),rou:.5,met:.1});SC.eye=mat({col:lin('#120a08'),rou:.3});SC.eyeFz=mat({col:[0,0,0],emi:[8,1,.3]});
  SC.hamHead=mat({col:lin('#8a8f99'),alb:PT.rust_d,rgh:PT.rust_r,rep:[1,1],met:.85,rou:.45});SC.hamFace=mat({col:lin('#c8ced8'),met:1,rou:.15});SC.gold=mat({col:lin('#d9b25a'),met:1,rou:.25});
}
function drawPBR(m,mt,M){const u=P_PBR.u;setMat(u,mt,M);gl.bindVertexArray(m.vao);gl.drawElements(gl.TRIANGLES,m.n,gl.UNSIGNED_INT,0)}
function setMat(u,mt,M){
  gl.uniformMatrix4fv(u.uM,false,M);gl.uniformMatrix3fv(u.uNM,false,M4.nm3(M));gl.uniform3fv(u.uCol,mt.col);gl.uniform1f(u.uMet,mt.met);gl.uniform1f(u.uRou,mt.rou);
  gl.uniform3fv(u.uEmi,mt.emi);gl.uniform1f(u.uEmGrad,mt.emGrad);gl.uniform1f(u.uEdge,mt.edge);gl.uniform3fv(u.uEdgeCol,mt.edgeCol);gl.uniform1f(u.uAlpha,mt.alpha);gl.uniform1f(u.uFogK,mt.fog);
  if(mt.alb){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,mt.alb);gl.uniform1i(u.uUseAlb,1);gl.uniform2fv(u.uRep,mt.rep)}else gl.uniform1i(u.uUseAlb,0);
  if(mt.nor){gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,mt.nor);gl.uniform1i(u.uUseNor,1);gl.uniform1f(u.uNorS,mt.norS)}else gl.uniform1i(u.uUseNor,0);
  if(mt.rgh){gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,mt.rgh);gl.uniform1i(u.uUseRgh,1)}else gl.uniform1i(u.uUseRgh,0);
  if(mt.alb||mt.nor||mt.rgh)gl.uniform2fv(u.uRep,mt.rep);
  if(mt.emT){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mt.emT);gl.uniform1i(u.uUseEm,1);gl.uniform3fv(u.uEmTCol,mt.emTCol)}else gl.uniform1i(u.uUseEm,0);
}
function seg(m,mt,a,b,r){const d=V.sub(b,a),l=V.len(d)||1e-5,y=V.sc(d,1/l);let x=V.norm(V.cross(y,Math.abs(y[1])<.95?[0,1,0]:[1,0,0]));const z=V.cross(x,y);drawPBR(MS.cyl,mt,M4.basis(V.sc(x,r),d,V.sc(z,r),a))}
function ball(mt,p,r,sx=1,sy=1,sz=1){drawPBR(MS.sph,mt,M4.chain(M4.tr(p[0],p[1],p[2]),M4.sc(r*sx,r*sy,r*sz)))}
function ik(S,Hd,a,b,pole){let d=V.sub(Hd,S);let L=V.len(d);const dir=V.sc(d,1/(L||1));L=clamp(L,.05,a+b-.002);const ca=clamp((a*a+L*L-b*b)/(2*a*L),-1,1),sa=Math.sqrt(1-ca*ca);
  let pp=V.sub(pole,V.sc(dir,V.dot(pole,dir)));pp=V.norm(pp);return{E:V.add(S,V.add(V.sc(dir,a*ca),V.sc(pp,a*sa))),H:V.add(S,V.sc(dir,L))}}
/* 무기 포즈 */
function lieRot(blank){const sb=blank?0:.62,cb=Math.sqrt(1-sb*sb);return M4.basis([0,cb,-sb],[-1,0,0],[0,sb,cb],[0,0,0])}
function weaponMatrix(now,t){
  const R=WPN,blank=R.type==='blank',sL=Math.min(1,1.3/R.len),sF=Math.min(1.12,1.28/R.len)*(1+(H.FX.raise>0?.08:0));
  const Rl=R.flipLie?M4.mul(M4.ry(PI),lieRot(blank)):lieRot(blank),bw=(R.bladeW||.04)*sL;// 자루가 긴 무기는 자루가 대장장이 반대쪽(모루 뿔 쪽)으로
  const lieY=AT+(blank?.031:bw*.8+.006);const Tl=[-.04,lieY,.02];
  const posL=V.sub(Tl,V.sc(M4.dir(Rl,[0,R.hitY,0]),sL));
  const spin=Math.sin(t*.55)*.55+(H.FX.raise>0?(now-H.FX.raiseT)/1300*TAU:0);
  const Rf=M4.chain(M4.ry(spin),M4.rz(.05+Math.sin(t*.8)*.03));
  const Fy=Math.max(1.6,AT+.14+R.len*sF/2)+Math.sin(t*1.3)*.025;
  const posF=V.sub([FLX,Fy,.06],V.sc(M4.dir(Rf,[0,R.mid,0]),sF));L3.wcY=Fy;L3.wHalf=R.len*sF/2+(R.wings?.08:0);
  const p=pose.p,e=p*p*(3-2*p);
  const q=qSlerp(qFromM(Rl),qFromM(Rf),e),Rm=qToM(q),s=lerp(sL,sF,e)*(H.FX.appear?appearK(now):1);
  const pos=V.mix(posL,posF,e);pos[1]+=H.FX.kick*.012*(1-e);
  L3.Tw=[Tl[0],lieY+(blank?.03:.012),Tl[2]];
  return M4.chain(M4.tr(pos[0],pos[1],pos[2]),Rm,M4.sc(s))}
function appearK(now){const t=clamp((now-H.FX.appear)/450,0,1);if(t>=1)return 1;const c1=1.7,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)}
/* 대장장이 */
function drawSmith(now,t,a,pow,fz,Mw,wVis){
  const P=[.74,0,-.44],Tw=L3.Tw;let f=V.norm([Tw[0]-P[0],0,Tw[2]-P[2]]);const yaw=Math.atan2(f[0],f[2]);
  const Ms=M4.chain(M4.tr(P[0],P[1],P[2]),M4.ry(yaw));
  const lean=.1+Math.max(0,pow)*.16-Math.max(0,-pow)*.06-(H.FX.flinch||0)*.15,breath=Math.sin(t*1.8)*.006;
  const Mc=M4.chain(Ms,M4.tr(0,.95,0),M4.rx(lean),M4.ry(pow*.12));
  const pt=(M,p)=>M4.pt(M,p);
  // 다리
  for(const sd of[1,-1]){const hip=pt(Ms,[sd*.1,.95,0]),knee=pt(Ms,[sd*.14,.5,.06]),ank=pt(Ms,[sd*.16,.09,0]);
    seg(MS.cyl,SC.pants,hip,knee,.085);seg(MS.cyl,SC.pants,knee,ank,.07);ball(SC.pants,knee,.075);
    drawPBR(MS.box,SC.boot,M4.chain(Ms,M4.tr(sd*.16,.05,.05),M4.sc(.12,.1,.26)))}
  ball(SC.pants,pt(Ms,[0,.95,0]),1,.17,.11,.12);
  // 몸통
  drawPBR(MS.torso,SC.skin,M4.chain(Mc,M4.tr(0,0,0),M4.sc(1,1+breath,1)));
  drawPBR(MS.belt,SC.leather,M4.chain(Mc,M4.tr(0,.02,0),M4.sc(.168,1,.115)));
  drawPBR(MS.box,SC.gold,M4.chain(Mc,M4.tr(0,.02,.112),M4.sc(.05,.04,.012)));
  drawPBR(MS.apron,SC.leather,M4.chain(Mc,M4.tr(0,0,.14),M4.rx(-.05)));
  for(const sd of[1,-1])seg(MS.cyl,SC.leather,pt(Mc,[sd*.14,.35,.14]),pt(Mc,[sd*.16,.5,.02]),.012);
  // 머리
  const Mh=M4.chain(Mc,M4.tr(0,.6,.01),M4.rx(-lean*.6+pow*.08));
  ball(SC.skin,pt(Mc,[0,.56,0]),.06);
  drawPBR(MS.sph,SC.skin,M4.chain(Mh,M4.tr(0,.08,0),M4.sc(.1,.112,.105)));
  drawPBR(MS.sph,SC.hair,M4.chain(Mh,M4.tr(0,.025,.045),M4.sc(.085,.075,.07)));
  drawPBR(MS.cone,SC.skin,M4.chain(Mh,M4.tr(0,.085,.098),M4.rx(PI/2),M4.sc(.016,.03,.016)));
  const shout=H.FX.shout&&now-H.FX.shout.t0<450;
  drawPBR(MS.sph,SC.eye,M4.chain(Mh,M4.tr(0,.035,.09),M4.sc(.03,shout?.022:.006,.01)));
  for(const sd of[1,-1]){drawPBR(MS.sph,fz?SC.eyeFz:SC.eye,M4.chain(Mh,M4.tr(sd*.036,.105,.093),M4.sc(.012,.009,.008)));
    drawPBR(MS.box,SC.hair,M4.chain(Mh,M4.tr(sd*.038,.128,.096),M4.rz(sd*-.3),M4.sc(.05,.012,.012)))}
  for(let i=0;i<10;i++){const az=-PI*.15+i/10*PI*1.3,el=.5+((i*7)%3)*.25,d=[Math.sin(az)*Math.cos(el)*.8,Math.sin(el)+.2,-Math.cos(az)*Math.cos(el)];
    const b=V.add([0,.1,-.01],V.sc(V.norm(d),.075)),tp=V.add(b,V.sc(V.norm(V.add(d,[0,.6,-.4])),.11+(i%3)*.02));
    const y=V.sub(tp,b),l=V.len(y),yn=V.sc(y,1/l),x=V.norm(V.cross(yn,[1,0,0])),z=V.cross(x,yn);drawPBR(MS.cone,SC.hair,M4.chain(Mh,M4.basis(V.sc(x,.04),y,V.sc(z,.04),b)))}
  drawPBR(MS.band,SC.bandM,M4.chain(Mh,M4.tr(0,.125,0),M4.sc(1,1,1.04)));
  for(const sd of[1,-1]){let p=pt(Mh,[sd*.02,.125,-.11]);const back=M4.dir(Mh,[0,0,-1]);for(let k=0;k<3;k++){const w=Math.sin(t*(fz?14:7)+k*1.3+sd)*.03;const q=V.add(p,V.add(V.sc(back,.07),[sd*.015+w,-.025-k*.01,0]));seg(MS.cyl,SC.bandM,p,q,.01);p=q}}
  // 망치 팔 (카메라 쪽)
  const S=pt(Mc,[.235,.45,0]),Tc=[Tw[0],Tw[1],Tw[2]];const D=V.sub(Tc,S),fs=V.norm([D[0],0,D[2]]),up=[0,1,0];
  const hh=V.dot(D,fs),vv=D[1],hl=.085,RR=Math.sqrt(Math.max(.01,V.dot(D,D)-hl*hl)),phc=Math.atan2(hh,-vv)+Math.atan2(hl,RR),ph=phc+a;
  const d=V.add(V.sc(fs,Math.sin(ph)),V.sc(up,-Math.cos(ph))),tg=V.add(V.sc(fs,Math.cos(ph)),V.sc(up,Math.sin(ph)));
  const head=V.madd(S,d,RR),hand=V.madd(S,d,.44),out=V.norm(V.sub(S,pt(Mc,[0,.35,0])));
  const A=ik(S,hand,.3,.28,V.add(out,[0,-.7,0]));
  seg(MS.cyl,SC.skin,S,A.E,.06);ball(SC.skin,S,.072);ball(SC.skin,V.mix(S,A.E,.45),1,.07,.07,.07);seg(MS.cyl,SC.skin,A.E,A.H,.05);ball(SC.skin,A.E,.055);
  seg(MS.cyl,SC.woodM,V.madd(hand,d,-.06),head,.016);ball(SC.skin,hand,.052);
  const zz=V.norm(V.cross(d,tg));drawPBR(MS.box,SC.hamHead,M4.basis(V.sc(d,.075),V.sc(tg,.17),V.sc(zz,.075),head));
  drawPBR(MS.box,SC.hamFace,M4.basis(V.sc(d,.082),V.sc(tg,.025),V.sc(zz,.082),V.madd(head,tg,-.085)));
  drawPBR(MS.box,SC.hamFace,M4.basis(V.sc(d,.082),V.sc(tg,.025),V.sc(zz,.082),V.madd(head,tg,.085)));
  // 집게 팔
  const S2=pt(Mc,[-.235,.45,0]);let gripW,hand2;
  if(wVis&&pose.p<.5&&Mw){gripW=M4.pt(Mw,[0,WPN.tongY??WPN.gripY,0]);const dd=V.sub(S2,gripW);hand2=V.madd(gripW,V.norm(dd),.32)}
  else{hand2=pt(Mc,[-.3,-.02,.14]);gripW=V.add(hand2,[0,-.28,.06])}
  const B=ik(S2,hand2,.3,.28,V.add(V.norm(V.sub(S2,pt(Mc,[0,.35,0]))),[0,-.7,0]));
  seg(MS.cyl,SC.skin,S2,B.E,.06);ball(SC.skin,S2,.072);seg(MS.cyl,SC.skin,B.E,B.H,.05);ball(SC.skin,B.E,.055);ball(SC.skin,B.H,.05);
  const side=V.norm(V.cross(V.sub(gripW,B.H),[0,1,0]));for(const sd of[1,-1])seg(MS.cyl,SC.ironM,V.madd(B.H,side,sd*.012),V.madd(gripW,side,sd*.006),.007);
  const hs=project(pt(Mh,[0,.24,0]));L3.head=hs;
  return{S,head,hand}}
/* 실제 캐릭터(스킨 메쉬) 대장장이 */
function drawSmithSkinned(now,t,a,pow,fz,Mw,wVis){
  const K=SMITH,B=K.bones,ix=K.idx,n=B.length,W=new Array(n);
  const P=[.86,0,-.52],Tw=L3.Tw;let f=V.norm([Tw[0]-P[0],0,Tw[2]-P[2]]);const yaw=Math.atan2(f[0],f[2]);
  const Ms=M4.chain(M4.tr(P[0],P[1],P[2]),M4.ry(yaw)),Mi=M4.inv(Ms);
  const lean=.12+Math.max(0,pow)*.18-Math.max(0,-pow)*.08-(H.FX.flinch||0)*.15;
  const rotAbout=(M,pivot,R)=>M4.chain(M4.tr(pivot[0],pivot[1],pivot[2]),R,M4.tr(-pivot[0],-pivot[1],-pivot[2]),M);
  // 몸은 자연스러운 서 있는 모션(숨쉬기·체중 이동), 팔은 아래에서 IK로 망치·집게를 쥠
  const AN=ANIM.ual&&ANIM.ual!=='loading'&&ANIM.ual.stand?ANIM.ual:null;let BL=null;
  if(AN){const c=AN.stand,x=((now/1000*c.fps)%(c.n-1)),i0=Math.floor(x),i1=Math.min(c.n-1,i0+1),f=x-i0,q={};for(const bn in c.q){const A=c.q[bn];q[bn]=qSlerp([A[i0*4],A[i0*4+1],A[i0*4+2],A[i0*4+3]],[A[i1*4],A[i1*4+1],A[i1*4+2],A[i1*4+3]],f)}
    const h=c.hips;BL=worldPose(K,q,[0,h[i0*3+1]+(h[i1*3+1]-h[i0*3+1])*f,0]).L}
  const calc=i=>{const b=B[i],l=BL?BL[i]:b.local;W[i]=b.parent>=0?M4.mul(W[b.parent],l):l};
  const child=(i,ci)=>M4.pos(M4.mul(W[i],B[ci].local));
  const align=(i,ci,target)=>{const p=M4.pos(W[i]),c=child(i,ci);W[i]=rotAbout(W[i],p,M4.rotFromTo(V.sub(c,p),V.sub(target,p)))};
  // 모델 공간 목표 (월드→캐릭터 로컬)
  const toL=p=>M4.pt(Mi,p),toW=p=>M4.pt(Ms,p);
  let S=null,head=null,hand=null,gripW=null,hand2=null;const handM={};
  const done=new Set();
  for(let i=0;i<n;i++){
    if(done.has(i))continue;calc(i);const nm=B[i].name;
    if(nm==='Spine1'){const p=M4.pos(W[i]);W[i]=rotAbout(W[i],p,M4.chain(M4.rx(lean*.6),M4.ry(pow*.1)))}
    if(nm==='Spine2'){const p=M4.pos(W[i]);W[i]=rotAbout(W[i],p,M4.rx(lean*.4+Math.sin(t*1.8)*.01))}
    if(nm==='Head'){const p=M4.pos(W[i]);W[i]=rotAbout(W[i],p,M4.rx(-lean*.5+pow*.1))}
    // 망치 팔 (왼팔 = 카메라 쪽)
    if(nm==='LeftArm'&&ix.LeftForeArm!=null&&ix.LeftHand!=null){
      const Sl=M4.pos(W[i]);S=toW(Sl);const fa=ix.LeftForeArm,hd=ix.LeftHand;
      const la=V.len(B[fa].local.slice(12,15)),lb=V.len(B[hd].local.slice(12,15));
      const Tc=[...Tw],D=V.sub(Tc,S),fs=V.norm([D[0],0,D[2]]),up=[0,1,0];
      const hh=V.dot(D,fs),vv=D[1],hl=.085,RR=Math.sqrt(Math.max(.01,V.dot(D,D)-hl*hl)),phc=Math.atan2(hh,-vv)+Math.atan2(hl,RR),ph=phc+a;
      const d=V.add(V.sc(fs,Math.sin(ph)),V.sc(up,-Math.cos(ph))),tg=V.add(V.sc(fs,Math.cos(ph)),V.sc(up,Math.sin(ph)));
      head=V.madd(S,d,RR);hand=V.madd(S,d,Math.min(RR-.24,(la+lb)*.8));// 손잡이는 어깨→망치머리 선, 주먹은 휘두르는 방향으로
      const HwL=handFrame(handGrip(K,'L'),hand,d,tg),wr=M4.pos(HwL);
      const out=V.norm(V.sub(S,toW([0,1.2,0])));const A=ik(S,wr,la,lb,V.add(out,[0,-.7,0]));
      align(i,fa,toL(A.E));W[fa]=M4.mul(W[i],B[fa].local);align(fa,hd,toL(A.H));done.add(fa);handM.L=M4.mul(Mi,HwL);SC._ham={d,tg,head,hand};
    }
    // 집게 팔 (오른팔)
    if(nm==='RightArm'&&ix.RightForeArm!=null&&ix.RightHand!=null){
      const S2=toW(M4.pos(W[i])),fa=ix.RightForeArm,hd=ix.RightHand,la=V.len(B[fa].local.slice(12,15)),lb=V.len(B[hd].local.slice(12,15));
      if(wVis&&pose.p<.5&&Mw){gripW=M4.pt(Mw,[0,WPN.tongY??WPN.gripY,0]);hand2=V.madd(gripW,V.norm(V.sub(S2,gripW)),.3)}
      else{hand2=toW([-.28,.95,.12]);gripW=V.add(hand2,[0,-.26,.06])}
      const tdir=V.norm(V.sub(gripW,hand2)),HwR=handFrame(handGrip(K,'R'),hand2,tdir,V.norm(V.sub(hand2,S2)));
      const A=ik(S2,M4.pos(HwR),la,lb,V.add(V.norm(V.sub(S2,toW([0,1.2,0]))),[0,-.7,0]));
      align(i,fa,toL(A.E));W[fa]=M4.mul(W[i],B[fa].local);align(fa,hd,toL(A.H));done.add(fa);handM.R=M4.mul(Mi,HwR);
    }
  }
  // 왼팔/오른팔 아래 뼈는 위에서 이미 갱신했으니 손 이하만 다시
  for(let i=0;i<n;i++){const nm=B[i].name;if(nm==='LeftHand'||nm==='RightHand'){W[i]=handM[nm[0]]||M4.mul(W[B[i].parent],B[i].local)}}
  // 그리기
  const u=P_SKIN.u;gl.useProgram(P_SKIN.p);
  const mats=new Float32Array(24*16);for(let i=0;i<n&&i<24;i++)mats.set(M4.chain(Ms,W[i],B[i].inv),i*16);
  gl.uniformMatrix4fv(u.uB,false,mats);
  gl.bindVertexArray(K.vao);
  for(const m of K.meshes){setMat(u,m.mat,M4.id());if(K.ib)gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_INT,m.start*4);else gl.drawArrays(gl.TRIANGLES,m.start,m.count)}
  gl.useProgram(P_PBR.p);
  // 망치·집게
  const hm=SC._ham;SC._ham=null;
  if(hm){const{d,tg,head:hd2,hand:hn}=hm;seg(MS.cyl,SC.woodM,V.madd(hn,d,-.07),hd2,.016);const zz=V.norm(V.cross(d,tg));
    drawPBR(MS.box,SC.hamHead,M4.basis(V.sc(d,.075),V.sc(tg,.17),V.sc(zz,.075),hd2));
    drawPBR(MS.box,SC.hamFace,M4.basis(V.sc(d,.082),V.sc(tg,.025),V.sc(zz,.082),V.madd(hd2,tg,-.085)));drawPBR(MS.box,SC.hamFace,M4.basis(V.sc(d,.082),V.sc(tg,.025),V.sc(zz,.082),V.madd(hd2,tg,.085)))}
  if(hand2&&gripW){const side=V.norm(V.cross(V.sub(gripW,hand2),[0,1,0]));for(const sd of[1,-1])seg(MS.cyl,SC.ironM,V.madd(hand2,side,sd*.012),V.madd(gripW,side,sd*.006),.007)}
  if(ix.Head!=null){L3.head=project(toW(V.add(M4.pos(W[ix.Head]),[0,.22,0])))}
  return{S,head,hand}}
/* 이펙트 */
function E3(){if(!WPN||WPN.type==='blank')return{c:[3,1.2,.3],l:[4,2.6,1.2]};
  if(WPN.type==='saber'){const c=lin(WPN.lv===18?hsv(performance.now()/1000*120%360):(H.SABER_C[WPN.lv]||'#fff'));return{c,l:V.mix(c,[1,1,1],.6)}}
  if(WPN.type==='scythe'){const c=lin(H.SCYTHE_C[WPN.lv]||'#9aa0aa');return{c,l:V.mix(c,[1,1,1],.55),d:V.sc(c,.3)}}
  if(WPN.type==='shinai'){const p=H.SHINAI_P[WPN.lv];return{c:lin(p[1]),l:V.mix(lin(p[1]),[1,1,1],.6)}}
  const E=H.ELS[WPN.el];return{c:lin(E.c),l:lin(E.l),d:lin(E.d)}}
function hsv(h){const f=n=>{const k=(n+h/60)%6;return 1-Math.max(0,Math.min(k,4-k,1))};const r=f(5),g=f(3),b=f(1);return'#'+[r,g,b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('')}
const rnd=(a,b)=>a+Math.random()*(b-a);
function spawnAura(dt,Mw,p){if(!WPN||!WPN.aura)return;const lv=WPN.lv,hid=WPN.hidden;const rate=hid?(lv>=5?lv*2:0):lv>=5?(lv-4)*7*(1+p*.8):0;if(!rate)return;
  auraAcc+=rate*dt;const E=E3(),A=WPN.aura,el=hid?(WPN.type==='scythe'?'dark':'holy'):WPN.el;
  while(auraAcc>1){auraAcc--;const y=rnd(A.y0,A.y1),x=A.axe?rnd(.03,A.w*1.1):rnd(-A.w,A.w)*1.2,pw=M4.pt(Mw,[x,A.axe?rnd(-A.w,A.w):y,rnd(-.01,.01)]);
    if(el==='fire')emit({p:pw,v:[rnd(-.05,.05),rnd(.25,.6),rnd(-.05,.05)],life:rnd(.5,.9),s0:.035,s1:.08,c0:V.sc(E.l,3),c1:V.sc(E.c,1.2),sh:3,a0:.9,a1:0});
    else if(el==='ice'){emit({p:pw,v:[rnd(-.08,.08),rnd(-.1,.05),rnd(-.08,.08)],life:rnd(.6,1.2),s0:.022,s1:.004,c0:V.sc(E.l,4),sh:1,a0:1,a1:0});if(Math.random()<.3)emit({p:V.add(pw,[rnd(-.2,.2),.3,rnd(-.1,.1)]),v:[rnd(-.05,.05),-.18,0],life:2,s0:.012,s1:.008,c0:[2.5,3,3.5],sh:1,a0:.8,a1:0})}
    else if(el==='thunder')emit({p:pw,v:[rnd(-.6,.6),rnd(-.3,.6),rnd(-.6,.6)],life:rnd(.1,.25),s0:.01,s1:.004,c0:V.sc(E.l,5),sh:1,st:.03,a0:1,a1:0});
    else if(el==='dark')emit({p:pw,v:[rnd(-.04,.04),rnd(.1,.3),rnd(-.04,.04)],life:rnd(.9,1.5),s0:.05,s1:.14,c0:V.sc(E.c,1.4),c1:V.sc(E.d||E.c,.8),sh:0,a0:.55,a1:0,fadeIn:.2});
    else emit({p:pw,v:[rnd(-.04,.04),rnd(.12,.3),rnd(-.04,.04)],life:rnd(1,1.8),s0:.016,s1:.006,c0:V.sc(E.l,3.5),sh:1,a0:1,a1:0,fadeIn:.2})}
  if(!hid&&WPN.el==='thunder'&&lv>=8){arcT-=dt;if(arcT<=0){arcT=rnd(.05,.14);const n=6,y0=rnd(A.y0,A.y1*.7),y1=Math.min(A.y1,y0+rnd(.15,.4));let prev=null;
    for(let i=0;i<=n;i++){const u=i/n,pp=M4.pt(Mw,[(i&&i<n)?rnd(-A.w*3,A.w*3):(i?A.w:-A.w),lerp(y0,y1,u),rnd(-.03,.03)]);if(prev){const mid=V.mix(prev,pp,.5);emit({p:mid,dir:V.sub(pp,prev),life:.09,s0:.012,s1:.008,c0:V.sc(E.l,6),sh:1,a0:1,a1:.3});emit({p:mid,dir:V.sub(pp,prev),life:.09,s0:.05,s1:.03,c0:V.sc(E.c,1.5),sh:0,a0:.7,a1:0})}prev=pp}}}}
function spawnForge(dt,now){const fx=SC.fx,fz=SC.fz;fireAcc+=70*dt;emberAcc+=6*dt;
  while(fireAcc>1){fireAcc--;emit({p:[fx+rnd(-.2,.2),.36,fz+rnd(-.15,.3)],v:[rnd(-.05,.05),rnd(.35,.75),rnd(.0,.12)],life:rnd(.45,.85),s0:rnd(.07,.11),s1:rnd(.14,.22),c0:[4.5,2.2,.55],c1:[1.4,.25,.04],sh:3,a0:.85,a1:0})}
  while(emberAcc>1){emberAcc--;emit({p:[fx+rnd(-.2,.2),.55,fz+.2],v:[rnd(-.1,.35),rnd(.3,.9),rnd(.05,.35)],life:rnd(1.5,3),s0:.012,s1:.006,c0:[5,1.6,.3],sh:1,a0:1,a1:0,drag:.3,g:-.05})}}
function hit(res){
  const T=L3.Tw,E=E3(),n={succ:40,great:90,awaken:110,hold:18,dmg:26,brk:60,none:10}[res]||20;
  for(let i=0;i<n;i++){const d=V.norm([rnd(-1,1),rnd(.25,1.5),rnd(-.4,1)]),sp=rnd(1.4,4.2)*(res==='great'||res==='awaken'?1.3:1);
    const el=(res==='great'||res==='awaken')&&Math.random()<.4;emit({p:[...T],v:V.sc(d,sp),g:7,st:.026,life:rnd(.25,.75),s0:.011,s1:.007,c0:el?V.sc(E.l,6):[7,4.5,1.6],c1:el?V.sc(E.c,2):[3,.9,.15],sh:1,a0:1,a1:.2})}
  emit({p:[...T],life:.13,s0:.55,s1:.15,c0:[8,6,3],sh:0,a0:1,a1:0});
  emit({p:V.add(T,[0,.01,0]),life:.32,s0:.06,s1:res==='great'||res==='awaken'?1.4:.8,c0:res==='dmg'?[3,1,.4]:[3,2.4,1.4],sh:2,a0:1,a1:0});
  if(res==='brk')for(let i=0;i<40;i++){const d=V.norm([rnd(-1,1),rnd(.2,1.2),rnd(-.3,1)]);emit({p:V.add(T,[rnd(-.3,.3),0,0]),v:V.sc(d,rnd(1,3)),g:6,st:.04,life:rnd(.5,1),s0:.02,s1:.015,c0:V.sc(E.l,3),c1:V.sc(E.c,1),sh:1,a0:1,a1:0})}
  if(res==='great'||res==='awaken'){const c=E.c;for(let i=0;i<50;i++){const a=rnd(0,TAU);emit({p:[FLX+Math.cos(a)*.1,1.65,.06+Math.sin(a)*.1],v:[Math.cos(a)*rnd(1,2.5),rnd(-.4,.6),Math.sin(a)*rnd(1,2.5)],drag:2,life:rnd(.6,1.2),s0:.02,s1:.008,c0:V.sc(E.l,5),sh:1,a0:1,a1:0})}
    emit({p:[FLX,1.65,.06],life:.6,s0:.2,s1:2.4,c0:V.sc(c,2.5),sh:2,a0:1,a1:0})}
  lastHitT=performance.now()}
