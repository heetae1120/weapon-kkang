
/* ---------------- 프레임 ---------------- */
let FIXQ=0,FIXP=null;
function drawDecal(M,tex,col,a,mode){const u=P_DEC.u;gl.uniformMatrix4fv(u.uM,false,M);gl.uniform4f(u.uCol,col[0],col[1],col[2],a);gl.uniform1i(u.uMode,mode);
  if(tex){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex)}gl.bindVertexArray(quadM.vao);gl.drawElements(gl.TRIANGLES,quadM.n,gl.UNSIGNED_INT,0)}
function project(p){const c=M4.pt(cam.VP,p),w=cam.VP[3]*p[0]+cam.VP[7]*p[1]+cam.VP[11]*p[2]+cam.VP[15];return{x:(c[0]/w*.5+.5)*cv.clientWidth,y:(1-(c[1]/w*.5+.5))*cv.clientHeight}}
function prepFrame(now){if(!ACTIVE||lost)return null;
  const cw=cv.clientWidth,ch=cv.clientHeight;if(cw<2||ch<2)return null;
  if(lastNow&&!FIXQ&&now-lastNow<120&&!document.hidden){const ft=now-lastNow;ftAvg=ftAvg*.95+ft*.05;if(ftAvg>30&&quality>.6){quality-=.1;ftAvg=20}else if(ftAvg<18&&quality<1){quality=Math.min(1,quality+.02)}}lastNow=now;
  DPR=Math.min(window.devicePixelRatio||1,cw<700?1.6:2)*quality;const w=Math.max(2,Math.round(cw*DPR)),h=Math.max(2,Math.round(ch*DPR));
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}ensureRT(w,h);return{w,h,cw,ch}}
function setProgCommon(pr,eye,lights,fogS,tint,t){const u=pr.u;gl.useProgram(pr.p);gl.uniformMatrix4fv(u.uVP,false,cam.VP);gl.uniform3fv(u.uCam,eye);gl.uniform1f(u.uTime,t);gl.uniform1i(u.uAlb,0);gl.uniform1i(u.uEmT,1);gl.uniform1i(u.uNor,2);gl.uniform1i(u.uRgh,3);gl.uniform1i(u.uEnvM,4);
  gl.uniform1i(u.uUseEnv,ENV?1:0);gl.uniform1f(u.uEnvLod,ENV?ENV.lod:0);gl.uniform1f(u.uEnvRot,.25);gl.uniform1f(u.uEnvK,.55);gl.uniform3fv(u.uEnvTint,ENV?tint:[1,1,1]);gl.uniform1f(u.uEnvI,1);gl.uniform1f(u.uFogS,fogS);
  gl.uniform1i(u.uNL,lights.length);gl.uniform4fv(u.uLP,new Float32Array(lights.flatMap(l=>[l[0][0],l[0][1],l[0][2],l[2]])));gl.uniform3fv(u.uLC,new Float32Array(lights.flatMap(l=>l[1])))}
function beginScene(w,h,eye,lights,fogS,tint){const t=performance.now()/1000;
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.ms);gl.viewport(0,0,w,h);gl.clearColor(.01,.008,.012,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
  gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,ENV?ENV.t:null);
  if(P_SKIN)setProgCommon(P_SKIN,eye,lights,fogS,tint,t);setProgCommon(P_PBR,eye,lights,fogS,tint,t)}
function endScene(w,h,o){
  if(sprN){gl.useProgram(P_SPR.p);gl.uniformMatrix4fv(P_SPR.u.uVP,false,cam.VP);gl.uniform2f(P_SPR.u.uRes,w,h);gl.uniform2f(P_SPR.u.uPS,cam.P[0],cam.P[5]);
    gl.bindVertexArray(sprVAO);gl.bindBuffer(gl.ARRAY_BUFFER,sprBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,sprData,0,sprN*SPR_F);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,sprN)}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.ms);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.scene.f);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  gl.bindVertexArray(emptyVAO);gl.useProgram(P_DOWN.p);gl.uniform1i(P_DOWN.u.uT,0);gl.activeTexture(gl.TEXTURE0);
  let src=RT.scene;for(let i=0;i<RT.mips.length;i++){const d=RT.mips[i];gl.bindFramebuffer(gl.FRAMEBUFFER,d.f);gl.viewport(0,0,d.w,d.h);gl.bindTexture(gl.TEXTURE_2D,src.t);
    gl.uniform2f(P_DOWN.u.uTx,1/src.w,1/src.h);gl.uniform1i(P_DOWN.u.uBright,i===0?1:0);gl.uniform1f(P_DOWN.u.uTh,1.0);gl.drawArrays(gl.TRIANGLES,0,3);src=d}
  gl.useProgram(P_UP.p);gl.uniform1i(P_UP.u.uT,0);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
  for(let i=RT.mips.length-1;i>0;i--){const s=RT.mips[i],d=RT.mips[i-1];gl.bindFramebuffer(gl.FRAMEBUFFER,d.f);gl.viewport(0,0,d.w,d.h);gl.bindTexture(gl.TEXTURE_2D,s.t);gl.uniform2f(P_UP.u.uTx,1/s.w,1/s.h);gl.uniform1f(P_UP.u.uW,1);gl.drawArrays(gl.TRIANGLES,0,3)}
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.useProgram(P_COMP.p);const cu=P_COMP.u;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,RT.scene.t);gl.uniform1i(cu.uS,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,RT.mips[0].t);gl.uniform1i(cu.uB,1);
  gl.uniform1f(cu.uBloom,.16);gl.uniform1f(cu.uInv,(o&&o.inv)?1:0);gl.uniform1f(cu.uExp,1.05);gl.uniform1f(cu.uCA,Math.min(.012,(o.shake||0)*.0006));gl.uniform1f(cu.uFz,o.fz?.6+.4*Math.sin(o.t*14):0);gl.uniform1f(cu.uTime,o.t%10);gl.uniform1f(cu.uVig,.75);
  gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0)}
function weaponFX(R,Mw,E,t,eye,pv){if(!R||R.type==='blank')return;const lv=R.lv,cent=M4.pt(Mw,[0,R.ringY,0]),sc=V.len(M4.dir(Mw,[1,0,0]));
  if(lv>=8||R.hidden&&lv>=10){const r=(.17+lv*.007)*sc;drawDecal(M4.chain(M4.tr(cent[0],cent[1],cent[2]),M4.rx(PI/2-.42),M4.rz(t*.7),M4.sc(r)),TEX.ring,V.sc(E.c,1.8),pv,0)}
  if(R.saber&&R.saber.BL>0){const s=R.saber,b0=M4.pt(Mw,[0,.01,0]),b1=M4.pt(Mw,[0,.01+s.BL,0]),dd=V.sub(b1,b0),bc=lin(R.lv===18?hsv(t*120%360):s.col);
    pushSpr(V.mix(b0,b1,.5),dd,.085*sc,0,V.sc(bc,2.2),1);pushSpr(V.mix(b0,b1,.5),dd,.032*sc,1,V.sc(V.mix(bc,[1,1,1],.7),4),1);
    if(s.dbl){const c0=M4.pt(Mw,[0,-s.HL,0]),c1=M4.pt(Mw,[0,-s.HL-s.BL,0]),d2=V.sub(c1,c0);pushSpr(V.mix(c0,c1,.5),d2,.085*sc,0,V.sc(bc,2.2),1);pushSpr(V.mix(c0,c1,.5),d2,.032*sc,1,V.sc(V.mix(bc,[1,1,1],.7),4),1)}}}
function spawnAuraFor(R,Mw,dt,p){const keep=WPN;WPN=R;try{spawnAura(dt,Mw,p)}finally{WPN=keep}}
let MODE='forge';
function frame(now,dt,st){
  const fr=prepFrame(now);if(!fr)return;const{w,h,cw,ch}=fr;
  const FX=H.FX,W=H.curW(),t=now/1000,sdt=st.stopped?0:dt;
  // 무기 갱신
  const key=(W.type||'blank')+'|'+(W.el||'')+'|'+W.lv;
  if(key!==WKEY){freeWeapon(WPN);WPN=buildWeapon(W);WPN.gripY={sword:-.1,dagger:-.06,spear:-.64,axe:-.7,saber:-.13,shinai:-.14,scythe:-.75,blank:-.12}[WPN.type];WPN.flipLie=/^(spear|axe|scythe)$/.test(WPN.type);WPN.tongY=WPN.flipLie?WPN.top*.85:WPN.gripY;WKEY=key}
  // 포즈
  const blank=WPN.type==='blank',idle=FX.sw.ph==='idle'&&now-lastHitT>950;
  if(FX.raise>0&&now-FX.raiseT>1300)FX.raise=0;
  const tgt=blank?0:(FX.raise>0||idle)?1:0;pose.p+=(tgt-pose.p)*(1-Math.exp(-(tgt>pose.p?2.4:18)*sdt));if(FIXP!==null)pose.p=FIXP;
  const wVis=now>=FX.hidden;
  // 카메라
  const asp=cw/ch,fov=30*PI/180*(1-(FX.zoom||0)*.6),tn=Math.tan(fov/2);
  const pe=pose.p*pose.p*(3-2*pose.p),wcY=L3.wcY||1.6,hl=(L3.wHalf||.7)+.32,tgtC=V.mix([-.14,1.22,0],[FLX*.75,Math.max(1.22,wcY),0],pe*.75),dist=lerp(Math.max(1.2/tn,1.36/(tn*asp)),Math.max(hl/tn,(hl*.9)/(tn*asp),1.0/(tn*asp)),pe*.8);
  const sh=(FX.shake||0)*.0016;const jit=[rnd(-1,1)*sh,rnd(-1,1)*sh,0];
  const eye=V.add(V.add(tgtC,V.sc(V.norm([.13+Math.sin(t*.17)*.02,.2,1]),dist)),jit);
  cam.V=M4.look(eye,V.add(tgtC,jit),[0,1,0]);cam.P=M4.persp(fov,asp,.05,40);cam.VP=M4.mul(cam.P,cam.V);cam.eye=eye;
  const Mw=WPN?weaponMatrix(now,t):null;
  const p2=project(L3.Tw);L3.T.x=p2.x;L3.T.y=p2.y;
  // 파티클 갱신
  spawnForge(sdt,now);if(wVis&&Mw)spawnAura(sdt,Mw,pose.p);stepParts(sdt);
  // ---- 장면 렌더 ----
  gl.bindFramebuffer(gl.FRAMEBUFFER,RT.ms);gl.viewport(0,0,w,h);gl.clearColor(.01,.008,.012,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
  gl.useProgram(P_PBR.p);const u=P_PBR.u;gl.uniformMatrix4fv(u.uVP,false,cam.VP);gl.uniform3fv(u.uCam,eye);gl.uniform1f(u.uTime,t);gl.uniform1i(u.uAlb,0);gl.uniform1i(u.uEmT,1);
  gl.uniform3fv(u.uEnvTint,[1,1,1]);gl.uniform1f(u.uEnvI,1);gl.uniform1f(u.uFogS,dist+1.2);
  const E=E3(),fl=.85+.15*Math.sin(t*11)*Math.sin(t*7.3+1)+.06*Math.sin(t*23),heat=FX.heat||0;
  const wc=Mw?M4.pt(Mw,[0,WPN.mid,0]):[0,1,0],wl=WPN&&!blank?(WPN.hidden?.4+WPN.lv*.1:Math.max(0,WPN.lv-3)*.13)*(.5+.5*pose.p):blank?1:0;
  const lights=[[[SC.fx+.05,.62,SC.fz+.5],V.sc([3.4,1.3,.4],fl),.6],[[2.3,2.8,2],[1.05,1.12,1.4],.012],[[-.5,2.6,-1.7],[.5,.65,1.25],.04],
    [V.add(wc,[0,0,.25]),V.sc(E.c,wl),2.5],[V.add(L3.Tw,[0,.12,.2]),V.sc([5,2.8,1.1],heat*1.4),5],[[.2,1.5,3.2],[.32,.28,.26],.015],[[1.7,2.1,-1.1],[.35,.5,.9],.25]];
  gl.uniform1i(u.uNL,lights.length);gl.uniform4fv(u.uLP,new Float32Array(lights.flatMap(l=>[l[0][0],l[0][1],l[0][2],l[2]])));gl.uniform3fv(u.uLC,new Float32Array(lights.flatMap(l=>l[1])));
  const I=M4.id();
  drawPBR(MS.floor,SC.floorM,I);drawPBR(MS.wall,SC.wallM,M4.tr(0,0,-1.42));
  drawPBR(MS.forge,SC.forgeM,I);SC.coalM.emTCol=V.sc([6,1.6,.3],fl);drawPBR(MS.coal,SC.coalM,M4.tr(SC.fx,.33,SC.fz));drawPBR(MS.inner,SC.innerM,M4.tr(SC.fx,.46,SC.fz-.3));
  drawPBR(MS.props,SC.plankM,I);drawPBR(MS.rack,SC.ironM,I);drawPBR(MS.window,SC.winM,M4.tr(1.85,2.15,-1.41));drawPBR(MS.winFrame,SC.woodM,M4.tr(1.85,2.15,-1.39));
  drawPBR(MS.stump,SC.woodM,M4.tr(0,0,0));SC.anvM.emi=[0,0,0];drawPBR(MS.anvil,SC.anvM,I);
  SC.anvTopM.emi=V.sc([1.5,.5,.1],heat*.6);drawPBR(MS.anvTop,SC.anvTopM,M4.tr(0,AT-.014,0));
  if(SMITH&&P_SKIN){const su=P_SKIN.u;gl.useProgram(P_SKIN.p);gl.uniformMatrix4fv(su.uVP,false,cam.VP);gl.uniform3fv(su.uCam,eye);gl.uniform1f(su.uTime,t);gl.uniform1i(su.uAlb,0);gl.uniform1i(su.uEmT,1);gl.uniform1i(su.uNor,2);gl.uniform1i(su.uRgh,3);gl.uniform1i(su.uEnvM,4);
    gl.uniform1i(su.uUseEnv,ENV?1:0);gl.uniform1f(su.uEnvLod,ENV?ENV.lod:0);gl.uniform1f(su.uEnvRot,.25);gl.uniform1f(su.uEnvK,.55);gl.uniform3fv(su.uEnvTint,ENV?[1.25,.82,.55]:[1,1,1]);gl.uniform1f(su.uEnvI,1);gl.uniform1f(su.uFogS,dist+1.2);
    gl.uniform1i(su.uNL,lights.length);gl.uniform4fv(su.uLP,new Float32Array(lights.flatMap(l=>[l[0][0],l[0][1],l[0][2],l[2]])));gl.uniform3fv(su.uLC,new Float32Array(lights.flatMap(l=>l[1])));gl.useProgram(P_PBR.p)}
  const sm=SMITH&&P_SKIN?drawSmithSkinned(now,t,st.a,st.pow,st.fz,Mw,wVis):drawSmith(now,t,st.a,st.pow,st.fz,Mw,wVis);
  if(wVis&&Mw){
    if(blank){WPN.mats.ingot.emi=V.sc([3,.9,.15],.55+.25*Math.sin(t*3)+heat*.6)}
    for(const b of WPN.batches)drawPBR(b.m,b.mat,Mw);
    if(WPN.wings&&pose.p>.04){const k=smooth(0,1,pose.p),fl2=1+Math.sin(t*2.2)*.05;drawPBR(WPN.wings.m,WPN.wings.mat,M4.chain(Mw,M4.tr(0,WPN.wingY,0),M4.sc(k*fl2,k,k)))}
  }
  // ---- 가산 / 데칼 ----
  gl.enable(gl.BLEND);gl.depthMask(false);gl.useProgram(P_DEC.p);gl.uniformMatrix4fv(P_DEC.u.uVP,false,cam.VP);gl.uniform1i(P_DEC.u.uT,0);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  drawDecal(M4.chain(M4.tr(0,.003,0),M4.rx(-PI/2),M4.sc(.55,.4,1)),null,[0,0,0],.6,1);
  drawDecal(M4.chain(M4.tr(.74,.003,-.44),M4.rx(-PI/2),M4.sc(.32,.26,1)),null,[0,0,0],.6,1);
  gl.blendFunc(gl.ONE,gl.ONE);
  drawDecal(M4.chain(M4.tr(SC.fx,.004,SC.fz+.7),M4.rx(-PI/2),M4.sc(1.1,.7,1)),null,V.sc([1.6,.5,.12],fl),.5,2);
  if(heat>0)drawDecal(M4.chain(M4.tr(L3.Tw[0],AT+.001,.02),M4.rx(-PI/2),M4.sc(.22,.12,1)),null,[4,1.4,.3],heat,2);
  sprN=0;
  if(wVis&&Mw&&WPN&&!blank){const lv=WPN.lv,pv=.25+.75*pose.p,cent=M4.pt(Mw,[0,WPN.ringY,0]),sc=V.len(M4.dir(Mw,[1,0,0]));
    if(lv>=8||WPN.hidden&&lv>=10){const r=(.17+lv*.007)*sc;drawDecal(M4.chain(M4.tr(cent[0],cent[1],cent[2]),M4.rx(PI/2-.42),M4.rz(t*.7),M4.sc(r)),TEX.ring,V.sc(E.c,1.8),pv,0);
      if(lv>=13){const c2=M4.pt(Mw,[0,WPN.ringY*1.7+.05,0]);drawDecal(M4.chain(M4.tr(c2[0],c2[1],c2[2]),M4.rx(PI/2-.5),M4.rz(-t*1.1),M4.sc(r*.72)),TEX.ring,V.sc(E.l,1.6),pv,0)}}
    if(lv>=14&&pose.p>.05){const c=M4.pt(Mw,[0,WPN.mid,0]),fw=V.norm(V.sub(eye,c)),rt=V.norm(V.cross([0,1,0],fw)),upv=V.cross(fw,rt),s=(.26+lv*.012)*(.9+.1*Math.sin(t*2));
      drawDecal(M4.basis(V.sc(rt,s),V.sc(upv,s),fw,V.madd(c,fw,-.12)),TEX.halo,V.sc(E.c,.32),pose.p,0)}
    if(lv>=15){const r=.95+(lv-15)*.08;drawDecal(M4.chain(M4.tr(FLX,.006,.08),M4.rx(-PI/2),M4.rz(t*.25),M4.sc(r)),TEX.circle,V.sc(E.c,1.6),.35+.65*pose.p,0)}
    if(lv>=18&&pose.p>.05)pushSpr([FLX,1.6,.06],[0,3.4,0],.32+Math.sin(t*3)*.03,0,V.sc(E.c,.5),pose.p);
    if(WPN.saber&&WPN.saber.BL>0){const s=WPN.saber,b0=M4.pt(Mw,[0,.01,0]),b1=M4.pt(Mw,[0,.01+s.BL,0]),dd=V.sub(b1,b0),bc=lin(WPN.lv===18?hsv(t*120%360):s.col);
      pushSpr(V.mix(b0,b1,.5),dd,.085*sc,0,V.sc(bc,2.2),1);pushSpr(V.mix(b0,b1,.5),dd,.032*sc,1,V.sc(V.mix(bc,[1,1,1],.7),4),1);
      if(s.dbl){const c0=M4.pt(Mw,[0,-s.HL,0]),c1=M4.pt(Mw,[0,-s.HL-s.BL,0]),d2=V.sub(c1,c0);pushSpr(V.mix(c0,c1,.5),d2,.085*sc,0,V.sc(bc,2.2),1);pushSpr(V.mix(c0,c1,.5),d2,.032*sc,1,V.sc(V.mix(bc,[1,1,1],.7),4),1)}}
  }
  partsToSpr();
  if(sprN){gl.useProgram(P_SPR.p);gl.uniformMatrix4fv(P_SPR.u.uVP,false,cam.VP);gl.uniform2f(P_SPR.u.uRes,w,h);gl.uniform2f(P_SPR.u.uPS,cam.P[0],cam.P[5]);
    gl.bindVertexArray(sprVAO);gl.bindBuffer(gl.ARRAY_BUFFER,sprBuf);gl.bufferSubData(gl.ARRAY_BUFFER,0,sprData,0,sprN*SPR_F);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,sprN)}
  gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);
  // ---- 후처리 ----
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,RT.ms);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,RT.scene.f);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);
  gl.bindVertexArray(emptyVAO);gl.useProgram(P_DOWN.p);gl.uniform1i(P_DOWN.u.uT,0);gl.activeTexture(gl.TEXTURE0);
  let src=RT.scene;for(let i=0;i<RT.mips.length;i++){const d=RT.mips[i];gl.bindFramebuffer(gl.FRAMEBUFFER,d.f);gl.viewport(0,0,d.w,d.h);gl.bindTexture(gl.TEXTURE_2D,src.t);
    gl.uniform2f(P_DOWN.u.uTx,1/src.w,1/src.h);gl.uniform1i(P_DOWN.u.uBright,i===0?1:0);gl.uniform1f(P_DOWN.u.uTh,1.0);gl.drawArrays(gl.TRIANGLES,0,3);src=d}
  gl.useProgram(P_UP.p);gl.uniform1i(P_UP.u.uT,0);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
  for(let i=RT.mips.length-1;i>0;i--){const s=RT.mips[i],d=RT.mips[i-1];gl.bindFramebuffer(gl.FRAMEBUFFER,d.f);gl.viewport(0,0,d.w,d.h);gl.bindTexture(gl.TEXTURE_2D,s.t);gl.uniform2f(P_UP.u.uTx,1/s.w,1/s.h);gl.uniform1f(P_UP.u.uW,1);gl.drawArrays(gl.TRIANGLES,0,3)}
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);gl.useProgram(P_COMP.p);const cu=P_COMP.u;
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,RT.scene.t);gl.uniform1i(cu.uS,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,RT.mips[0].t);gl.uniform1i(cu.uB,1);
  gl.uniform1f(cu.uBloom,.16);gl.uniform1f(cu.uInv,0);gl.uniform1f(cu.uExp,1.05);gl.uniform1f(cu.uCA,Math.min(.012,(FX.shake||0)*.0006));gl.uniform1f(cu.uFz,st.fz?.6+.4*Math.sin(t*14):0);gl.uniform1f(cu.uTime,t%10);gl.uniform1f(cu.uVig,.75);
  gl.drawArrays(gl.TRIANGLES,0,3);gl.activeTexture(gl.TEXTURE0);
}
window.Forge3D={
  init(canvas,hooks){H=hooks;try{if(!initGL(canvas))return false;buildScene();ACTIVE=true;return true}catch(e){console.error('3D 초기화 실패',e);ACTIVE=false;return false}},
  get active(){return ACTIVE&&!lost},L:L3,
  frame(now,dt,st){try{frame(now,dt,st)}catch(e){console.error('3D 렌더 오류',e);ACTIVE=false;if(H&&H.onLost)H.onLost()}},
  duel(now,dt){try{return duelFrame(now,dt)}catch(e){console.error('3D 결투 오류',e);return false}},
  duelReady:(DQ)=>duelReady(DQ),duelPt:()=>duelPt(),duelActorPt:s=>duelActorPt(s),preloadDuel(list){try{preloadDuel(list)}catch(e){}},charReady:k=>!!charReady(k),resetDuel(){DS.p=null;DS.o=null;parts.length=0},
  canvas:()=>cv,
  hit(res){try{hit(res)}catch(e){}},
  setPose(p){FIXP=p},setQ(q){FIXQ=q;quality=q},stats:()=>({parts:parts.length,quality,ftAvg})
};
})();
