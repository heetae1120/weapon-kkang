
/* ---------------- 렌더러 ---------------- */
let P_SKIN=null,SMITH=null,P_PBR,P_DOWN,P_UP,P_COMP,P_SPR,P_DEC,emptyVAO,quadM,sprVAO,sprBuf,sprData;
const SPR_MAX=5000,SPR_F=12;
let RT=null,W_=0,H_=0,DPR=1,samples=4;
const TEX={};
function initGL(canvas){
  cv=canvas;gl=canvas.getContext('webgl2',{antialias:false,alpha:false,depth:true,stencil:false,premultipliedAlpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!gl)return false;if(!gl.getExtension('EXT_color_buffer_float'))return false;
  P_PBR=prog(PBR_VS,PBR_FS);P_DOWN=prog(FS_VS,DOWN_FS);P_UP=prog(FS_VS,UP_FS);P_COMP=prog(FS_VS,COMP_FS);P_SPR=prog(SPR_VS,SPR_FS);P_DEC=prog(DEC_VS,DEC_FS);
  try{P_SKIN=prog(SKIN_VS,PBR_FS)}catch(e){P_SKIN=null}
  emptyVAO=gl.createVertexArray();
  const q=G();quad(q,[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0],[0,0],[1,0],[1,1],[0,1],[0,0,1]);quadM=mesh(q);
  sprVAO=gl.createVertexArray();gl.bindVertexArray(sprVAO);
  const cb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  sprData=new Float32Array(SPR_MAX*SPR_F);sprBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sprBuf);gl.bufferData(gl.ARRAY_BUFFER,sprData.byteLength,gl.DYNAMIC_DRAW);
  const st=SPR_F*4;[[1,3,0],[2,3,3],[3,2,6],[4,4,8]].forEach(([l,s,o])=>{gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,s,gl.FLOAT,false,st,o*4);gl.vertexAttribDivisor(l,1)});
  gl.bindVertexArray(null);
  samples=Math.min(4,gl.getParameter(gl.MAX_SAMPLES)||0);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;ACTIVE=false;if(H&&H.onLost)H.onLost()});
  makeTextures();loadPhoto();loadSmith();return true}
function mkTex(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,w,h,0,gl.RGBA,gl.HALF_FLOAT,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return{t,f,w,h}}
function freeRT(){if(!RT)return;gl.deleteFramebuffer(RT.ms);gl.deleteRenderbuffer(RT.cr);gl.deleteRenderbuffer(RT.dr);[RT.scene,...RT.mips].forEach(m=>{gl.deleteTexture(m.t);gl.deleteFramebuffer(m.f)});RT=null}
function ensureRT(w,h){if(RT&&W_===w&&H_===h)return;freeRT();W_=w;H_=h;
  const ms=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,ms);
  const cr=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,cr);samples?gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.RGBA16F,w,h):gl.renderbufferStorage(gl.RENDERBUFFER,gl.RGBA16F,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,cr);
  const dr=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,dr);samples?gl.renderbufferStorageMultisample(gl.RENDERBUFFER,samples,gl.DEPTH_COMPONENT24,w,h):gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,dr);
  const scene=mkTex(w,h),mips=[];let mw=w>>1,mh=h>>1;for(let i=0;i<6&&mw>2&&mh>2;i++){mips.push(mkTex(mw,mh));mw>>=1;mh>>=1}
  RT={ms,cr,dr,scene,mips}}
/* 텍스처 생성 (캔버스 2D로 그림) */
function cvs(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')]}
function runeGlyph(x,r,cx,cy,s){x.beginPath();const n=2+Math.floor(r()*3);let px=cx+(r()-.5)*s,py=cy-s/2;x.moveTo(px,py);
  for(let k=0;k<n;k++){px=cx+(r()-.5)*s;py=cy-s/2+(k+1)/n*s;x.lineTo(px,py)}
  if(r()<.6){x.moveTo(cx-s*.4,cy+(r()-.5)*s*.6);x.lineTo(cx+s*.4,cy+(r()-.5)*s*.6)}if(r()<.4){x.moveTo(cx,cy-s/2);x.arc(cx,cy,s*.22,-PI/2,PI*1.2)}x.stroke()}
function loadImgTex(url,o={}){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(o.def||[255,255,255,255]));
  const img=new Image();img.onload=()=>{if(lost)return;gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,o.srgb?gl.SRGB8_ALPHA8:gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
    const an=gl.getExtension('EXT_texture_filter_anisotropic');if(an)gl.texParameterf(gl.TEXTURE_2D,an.TEXTURE_MAX_ANISOTROPY_EXT,8);t.ready=1};img.src=url;return t}
let ENV=null;
function loadHDR(url){fetch(url).then(r=>r.arrayBuffer()).then(buf=>{const d=new Uint8Array(buf);let i=0,line='';
  while(i<d.length){let j=i;while(d[j]!==10)j++;line=String.fromCharCode(...d.subarray(i,j));i=j+1;if(/^[-+]Y/.test(line))break}
  const m=/-Y (\d+) \+X (\d+)/.exec(line);const Hh=+m[1],Ww=+m[2],f=new Float32Array(Ww*Hh*4);
  for(let k=0;k<Ww*Hh;k++){const e=d[i+k*4+3],sc=e?Math.pow(2,e-136):0;f[k*4]=d[i+k*4]*sc;f[k*4+1]=d[i+k*4+1]*sc;f[k*4+2]=d[i+k*4+2]*sc;f[k*4+3]=1}
  if(lost)return;const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,Ww,Hh,0,gl.RGBA,gl.FLOAT,f);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  ENV={t,lod:Math.log2(Math.max(Ww,Hh))}}).catch(()=>{})}
const PT={};
function loadPhoto(){const b=(H&&H.assetBase)||'assets/';for(const k of['wall','floor','steel','leather','bark','planks','rust']){PT[k+'_d']=loadImgTex(b+k+'_d.jpg',{srgb:1});}
  for(const k of['wall','floor','steel','leather','bark','planks'])PT[k+'_n']=loadImgTex(b+k+'_n.jpg',{def:[128,128,255,255]});
  for(const k of['wall','floor','steel','rust'])PT[k+'_r']=loadImgTex(b+k+'_r.jpg',{def:[128,128,128,255]});
  loadHDR(b+'env_hdr.wasm')}
const CH={},ANIM={};
function loadChar(name,file){const b=(H&&H.assetBase)||'assets/';if(!P_SKIN||CH[name])return;CH[name]='loading';
  Promise.all([fetch(b+file+'.json').then(r=>{if(!r.ok)throw 0;return r.json()}),fetch(b+file+'_bin.wasm').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()})]).then(([J,buf])=>{if(lost)return;
    const n=J.n,vao=gl.createVertexArray();gl.bindVertexArray(vao);let off=0;const bs=[];
    const at=(loc,sz,type,bytes)=>{const bb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bb);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(buf,off,n*bytes),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,type,false,0,0);off+=n*bytes;bs.push(bb)};
    at(0,3,gl.FLOAT,12);at(1,3,gl.FLOAT,12);at(2,2,gl.FLOAT,8);at(3,4,gl.UNSIGNED_BYTE,4);at(4,4,gl.FLOAT,16);
    let ib=null;if(J.ni){ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(buf,off,J.ni),gl.STATIC_DRAW)}
    gl.bindVertexArray(null);
    const bones=J.bones.map(x=>({name:x.name,parent:x.parent,local:new Float32Array(x.local),inv:new Float32Array(x.invBind)}));const idx={};bones.forEach((x,i)=>idx[x.name]=i);
    const meshes=J.meshes.map(m=>({start:m.start,count:m.count,mat:mat({col:m.col.map(v=>Math.pow(v,2.2)),alb:m.tex?loadImgTex(b+m.tex,{srgb:1}):null,nor:m.nor?loadImgTex(b+m.nor,{def:[128,128,255,255]}):null,rgh:m.rgh?loadImgTex(b+m.rgh,{def:[128,128,128,255]}):null,norS:1,rou:m.rou??.6,met:m.met??0})}));
    CH[name]={vao,ib,bones,idx,meshes,J,sc:J.sc||1,loy:J.loy||0};if(name==='smith')SMITH=CH[name]}).catch(()=>{delete CH[name]})}
function loadAnims(name,file){const b=(H&&H.assetBase)||'assets/';if(ANIM[name])return;ANIM[name]='loading';
  fetch(b+file+'.json').then(r=>{if(!r.ok)throw 0;return r.json()}).then(J=>{const clips={};for(const[k,c]of Object.entries(J.clips)){const src=c.d||c.q;if(!src)continue;const q={};for(const[bn,arr]of Object.entries(src))q[bn]=new Float32Array(arr);clips[k]={n:c.n,fps:c.fps||30,dur:(c.n-1)/(c.fps||30),q,hips:new Float32Array(c.hips||[]),loop:!!c.loop}}clips.__hsc=J.hsc;clips.__hrest=J.hrest;clips.__world=!!J.world;clips.__meta=J.meta||null;ANIM[name]=clips}).catch(()=>{ANIM[name]='fail'})}
function animOk(n){const A=ANIM[n];return!!A&&A!=='loading'&&A!=='fail'}
function animDone(n){const A=ANIM[n];return!!A&&A!=='loading'}
/* ---- Codex 납품 에셋 팩 (GLB -> dev/glb2wk.py로 변환) ----
   정점(위치·법선·UV)과 인덱스, 공유 PBR 텍스처 1세트를 쓴다. 파트마다 애니메이션 피벗을 가질 수 있다. */
const PACK={},PACKT={};
function packTex(){if(PACKT.ready)return PACKT;const b=((H&&H.assetBase)||'assets/')+'pack/';
  PACKT.alb=loadImgTex(b+'tex_basecolor.jpg',{srgb:1});PACKT.nor=loadImgTex(b+'tex_normal.jpg',{def:[128,128,255,255]});
  PACKT.orm=loadImgTex(b+'tex_orm.jpg',{def:[255,128,0,255]});PACKT.emi=loadImgTex(b+'tex_emissive.jpg',{def:[0,0,0,255]});
  PACKT.ready=1;return PACKT}
function loadPack(name){if(PACK[name])return PACK[name]==='loading'?null:PACK[name];PACK[name]='loading';const b=((H&&H.assetBase)||'assets/')+'pack/';
  Promise.all([fetch(b+name+'.json').then(r=>{if(!r.ok)throw 0;return r.json()}),fetch(b+name+'_m.wasm').then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()})]).then(([J,buf])=>{if(lost)return;
    const n=J.n,vao=gl.createVertexArray();gl.bindVertexArray(vao);let off=0;const bs=[];
    const at=(loc,sz,bytes)=>{const bb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bb);gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(buf,off,n*bytes),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0);off+=n*bytes;bs.push(bb)};
    at(0,3,12);at(1,3,12);at(2,2,8);
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(buf,off,J.ni),gl.STATIC_DRAW);bs.push(ib);
    gl.bindVertexArray(null);const T=packTex();
    if(typeof TCACHE!=='undefined')TCACHE.clear();if(typeof WCACHE!=='undefined')WCACHE.clear();WKEY='';
    PACK[name]={vao,ib,bs,J,parts:J.parts,bounds:J.bounds,
      mat:mat({col:[1,1,1],alb:T.alb,nor:T.nor,rgh:T.orm,orm:1,norS:.4,met:1,rou:1,emT:T.emi,emTCol:[1.6,1.6,1.6],emRGB:1,rep:[1,1]})}})
    .catch(()=>{delete PACK[name]});return null}
function packTexReady(){const T=PACKT;return !!(T.ready&&T.alb&&T.alb.ready&&T.nor&&T.nor.ready&&T.orm&&T.orm.ready&&T.emi&&T.emi.ready)}
function packReady(name){return PACK[name]&&PACK[name]!=='loading'?PACK[name]:null}
/* 시작 화면에 필요한 소품만 미리 받는다. 무기는 20단계 조립식 런타임 메쉬를 쓰고,
   오오라는 장착한 종류만 지연 로드해 모바일의 초기 네트워크/VRAM 사용량을 줄인다. */
const PACK_ALL=['iron-ingot-0','weapon-chest','aura-orb'];
function preloadPacks(){for(const n of PACK_ALL)if(!PACK[n])loadPack(n)}
/* 팩 에셋 그리기. M=월드 변환, t=시간(초), o={emi,col,rate} */
function drawPack(K,M,t,o){o=o||{};const m=K.mat,c0=m.col,e0=m.emTCol;
  if(o.col)m.col=o.col;if(o.emi)m.emTCol=o.emi;
  gl.bindVertexArray(K.vao);
  for(const p of K.parts){let Mp=M;
    if(p.anim&&p.anim.q&&p.anim.q.length){const A=p.anim,n=A.q.length;let x=(t||0)*A.fps*(o.rate||1);
      x=A.loop?((x%n)+n)%n:clamp(x,0,n-1);const i=Math.floor(x),j=Math.min(n-1,i+1),f=x-i;
      const q=qSlerp(A.q[i],A.q[j],f),P=p.pivot||[0,0,0];
      Mp=M4.chain(M,M4.tr(P[0],P[1],P[2]),qToM(q),M4.tr(-P[0],-P[1],-P[2]))}
    setMat(P_PBR.u,m,Mp);gl.drawElements(gl.TRIANGLES,p.count,gl.UNSIGNED_INT,p.start*4)}
  m.col=c0;m.emTCol=e0}
function loadSmith(){loadChar('smith','smith');loadAnims('ual','ual_anim')}
function makeTextures(){
  const r=rng(7);
  // 벽돌
  let[c,x]=cvs(512,512);x.fillStyle='#2a221f';x.fillRect(0,0,512,512);
  const bh=42,bw=96;for(let row=0;row*bh<512;row++)for(let col=-1;col*bw<512;col++){const ox=(row%2)*bw/2,v=30+r()*30,hue=r()*10;x.fillStyle=`hsl(${15+hue},${12+r()*10}%,${v*.55}%)`;x.fillRect(col*bw+ox+3,row*bh+3,bw-6,bh-6);
    for(let k=0;k<40;k++){x.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:200},${r()<.5?0:180},${r()*.07})`;x.fillRect(col*bw+ox+3+r()*(bw-8),row*bh+3+r()*(bh-8),2+r()*6,2+r()*4)}
    x.fillStyle='rgba(255,255,255,.05)';x.fillRect(col*bw+ox+3,row*bh+3,bw-6,2);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(col*bw+ox+3,row*bh+bh-5,bw-6,2)}
  TEX.brick=texFrom(c,{srgb:1});
  // 바닥 돌판
  [c,x]=cvs(512,512);x.fillStyle='#1c1614';x.fillRect(0,0,512,512);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){const v=18+r()*12;x.fillStyle=`hsl(20,10%,${v}%)`;x.fillRect(col*128+3,row*128+3,122,122);
    for(let k=0;k<120;k++){x.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:220},${r()<.5?0:200},${r()*.05})`;x.beginPath();x.arc(col*128+r()*128,row*128+r()*128,1+r()*5,0,TAU);x.fill()}
    x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=1;x.beginPath();x.moveTo(col*128+10+r()*100,row*128+5);x.lineTo(col*128+10+r()*100,row*128+60+r()*60);x.stroke()}
  TEX.floor=texFrom(c,{srgb:1});
  // 나무
  [c,x]=cvs(256,256);x.fillStyle='#4a2f1c';x.fillRect(0,0,256,256);for(let i=0;i<80;i++){x.strokeStyle=`rgba(${r()<.5?20:120},${r()<.5?10:70},${r()<.5?5:40},${.15+r()*.2})`;x.lineWidth=1+r()*2;x.beginPath();const y0=r()*256;x.moveTo(0,y0);x.bezierCurveTo(80,y0+(r()-.5)*20,170,y0+(r()-.5)*20,256,y0+(r()-.5)*10);x.stroke()}
  TEX.wood=texFrom(c,{srgb:1});
  // 칼날 룬 (발광 마스크)
  [c,x]=cvs(128,1024);x.fillStyle='#000';x.fillRect(0,0,128,1024);x.strokeStyle='#fff';x.lineCap='round';x.lineJoin='round';x.shadowColor='#fff';x.shadowBlur=6;x.lineWidth=4;
  for(let y=110;y<760;y+=58)runeGlyph(x,r,64,y,34);x.lineWidth=2;x.beginPath();x.moveTo(64,60);x.lineTo(64,90);x.moveTo(64,780);x.lineTo(64,820);x.stroke();
  TEX.rune=texFrom(c,{clamp:1});
  // 금속 균열(어둠/화염용)
  [c,x]=cvs(128,1024);x.fillStyle='#000';x.fillRect(0,0,128,1024);x.strokeStyle='#fff';x.shadowColor='#fff';x.shadowBlur=5;x.lineWidth=2.5;
  for(let k=0;k<14;k++){let px=20+r()*88,py=r()*900;x.beginPath();x.moveTo(px,py);for(let s=0;s<6;s++){px+=(r()-.5)*30;py+=10+r()*30;x.lineTo(clamp(px,4,124),py)}x.stroke()}
  TEX.crack=texFrom(c,{clamp:1});
  // 마법진
  [c,x]=cvs(1024,1024);x.translate(512,512);x.strokeStyle='#fff';x.fillStyle='#fff';x.shadowColor='#fff';x.shadowBlur=8;
  const ring=(rr,lw)=>{x.lineWidth=lw;x.beginPath();x.arc(0,0,rr,0,TAU);x.stroke()};ring(500,6);ring(470,3);ring(360,4);ring(340,2);ring(150,4);
  for(let k=0;k<36;k++){x.save();x.rotate(k/36*TAU);x.lineWidth=3;runeGlyph(x,r,0,-418,30);x.restore()}
  x.lineWidth=3;for(const off of[0,PI/6]){x.beginPath();for(let k=0;k<=3;k++){const a=off+k/3*TAU-PI/2;k?x.lineTo(Math.cos(a)*360,Math.sin(a)*360):x.moveTo(Math.cos(a)*360,Math.sin(a)*360)}x.stroke()}
  for(let k=0;k<12;k++){x.save();x.rotate(k/12*TAU);x.lineWidth=2;runeGlyph(x,r,0,-250,24);x.restore()}
  for(let k=0;k<6;k++){x.save();x.rotate(k/6*TAU);x.beginPath();x.arc(0,-360,26,0,TAU);x.stroke();x.restore()}
  TEX.circle=texFrom(c,{clamp:1});
  // 룬 고리
  [c,x]=cvs(1024,1024);x.translate(512,512);x.strokeStyle='#fff';x.shadowColor='#fff';x.shadowBlur=10;ring(490,5);ring(400,3);
  for(let k=0;k<28;k++){x.save();x.rotate(k/28*TAU);x.lineWidth=5;runeGlyph(x,r,0,-445,44);x.restore()}
  TEX.ring=texFrom(c,{clamp:1});
  // 후광
  [c,x]=cvs(512,512);x.translate(256,256);let gr=x.createRadialGradient(0,0,0,0,0,256);gr.addColorStop(0,'rgba(255,255,255,.6)');gr.addColorStop(.12,'rgba(255,255,255,.22)');gr.addColorStop(.4,'rgba(255,255,255,.04)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(-256,-256,512,512);
  x.globalCompositeOperation='lighter';for(let k=0;k<24;k++){x.save();x.rotate(k/24*TAU+r()*.1);const L=120+r()*130;gr=x.createLinearGradient(0,0,0,-L);gr.addColorStop(0,'rgba(255,255,255,.5)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.beginPath();x.moveTo(-5-r()*5,0);x.lineTo(0,-L);x.lineTo(5+r()*5,0);x.fill();x.restore()}
  TEX.halo=texFrom(c,{clamp:1});
  // 석탄 발광
  [c,x]=cvs(256,128);x.fillStyle='#000';x.fillRect(0,0,256,128);for(let k=0;k<160;k++){const v=r();x.fillStyle=`rgba(255,255,255,${v*v})`;x.beginPath();x.arc(r()*256,r()*128,3+r()*9,0,TAU);x.fill()}
  TEX.coal=texFrom(c,{clamp:1});
}
/* ---------------- 파티클 ---------------- */
const parts=[];
function emit(o){if(parts.length>=SPR_MAX)return;parts.push(Object.assign({v:[0,0,0],g:0,drag:0,life:1,age:0,s0:.05,s1:.05,c0:[1,1,1],c1:null,a0:1,a1:0,sh:0,st:0,dir:null,ang:0},o))}
function stepParts(dt){for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.age+=dt;if(q.age>=q.life){parts.splice(i,1);continue}
  q.v[1]-=q.g*dt;if(q.drag){const k=Math.exp(-q.drag*dt);q.v=V.sc(q.v,k)}if(q.swirl){const a=q.swirl*dt,c=Math.cos(a),s=Math.sin(a),dx=q.p[0]-q.cx,dz=q.p[2]-q.cz;q.p[0]=q.cx+dx*c-dz*s;q.p[2]=q.cz+dx*s+dz*c}
  q.p=V.madd(q.p,q.v,dt)}}
let sprN=0;
function pushSpr(p,d,size,shape,c,a){if(sprN>=SPR_MAX)return;const o=sprN*SPR_F;sprData[o]=p[0];sprData[o+1]=p[1];sprData[o+2]=p[2];
  sprData[o+3]=d?d[0]:0;sprData[o+4]=d?d[1]:0;sprData[o+5]=d?d[2]:0;sprData[o+6]=size;sprData[o+7]=shape;sprData[o+8]=c[0];sprData[o+9]=c[1];sprData[o+10]=c[2];sprData[o+11]=a;sprN++}
function partsToSpr(){for(const q of parts){const t=q.age/q.life,s=lerp(q.s0,q.s1,t),c=q.c1?V.mix(q.c0,q.c1,t):q.c0,a=lerp(q.a0,q.a1,t)*(q.fadeIn?Math.min(1,t/q.fadeIn):1);
  const d=q.st?V.sc(q.v,q.st):q.dir;pushSpr(q.p,d,s,q.sh,c,Math.max(0,a))}}
