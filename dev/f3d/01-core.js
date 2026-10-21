/* 무기 깡! 3D 대장간 — 의존성 없는 WebGL2 렌더러 (PBR + 블룸 + 파티클) */
(function(){
'use strict';
/* ---------------- 수학 ---------------- */
const PI=Math.PI,TAU=PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const V={
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],sc:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},
  mix:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],
  madd:(a,b,s)=>[a[0]+b[0]*s,a[1]+b[1]*s,a[2]+b[2]*s]
};
const M4={
  id:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
  mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3]}return o},
  chain(...m){let o=m[0];for(let i=1;i<m.length;i++)o=M4.mul(o,m[i]);return o},
  tr:(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]),
  sc:(x,y=x,z=x)=>new Float32Array([x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1]),
  rx(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])},
  ry(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])},
  rz(a){const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])},
  basis:(x,y,z,t)=>new Float32Array([x[0],x[1],x[2],0,y[0],y[1],y[2],0,z[0],z[1],z[2],0,t[0],t[1],t[2],1]),
  persp(fy,asp,n,f){const t=1/Math.tan(fy/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(f+n)/(n-f);o[11]=-1;o[14]=2*f*n/(n-f);return o},
  look(e,c,u){const z=V.norm(V.sub(e,c)),x=V.norm(V.cross(u,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,e),-V.dot(y,e),-V.dot(z,e),1])},
  pt:(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]],
  inv(m){const a=m,o=new Float32Array(16);const[a00,a01,a02,a03,a10,a11,a12,a13,a20,a21,a22,a23,a30,a31,a32,a33]=a;
    const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!det)return M4.id();det=1/det;
    o[0]=(a11*b11-a12*b10+a13*b09)*det;o[1]=(a02*b10-a01*b11-a03*b09)*det;o[2]=(a31*b05-a32*b04+a33*b03)*det;o[3]=(a22*b04-a21*b05-a23*b03)*det;o[4]=(a12*b08-a10*b11-a13*b07)*det;o[5]=(a00*b11-a02*b08+a03*b07)*det;o[6]=(a32*b02-a30*b05-a33*b01)*det;o[7]=(a20*b05-a22*b02+a23*b01)*det;
    o[8]=(a10*b10-a11*b08+a13*b06)*det;o[9]=(a01*b08-a00*b10-a03*b06)*det;o[10]=(a30*b04-a31*b02+a33*b00)*det;o[11]=(a21*b02-a20*b04-a23*b00)*det;o[12]=(a11*b07-a10*b09-a12*b06)*det;o[13]=(a00*b09-a01*b07+a02*b06)*det;o[14]=(a31*b01-a30*b03-a32*b00)*det;o[15]=(a20*b03-a21*b01+a22*b00)*det;return o},
  rotFromTo(a,b){a=V.norm(a);b=V.norm(b);const v=V.cross(a,b),c=V.dot(a,b);if(c<-.9999){let ax=V.norm(V.cross(a,Math.abs(a[0])<.9?[1,0,0]:[0,1,0]));return M4.axis(ax,PI)}const k=1/(1+c);
    return new Float32Array([v[0]*v[0]*k+c,v[1]*v[0]*k+v[2],v[2]*v[0]*k-v[1],0, v[0]*v[1]*k-v[2],v[1]*v[1]*k+c,v[2]*v[1]*k+v[0],0, v[0]*v[2]*k+v[1],v[1]*v[2]*k-v[0],v[2]*v[2]*k+c,0, 0,0,0,1])},
  axis(ax,an){const[x,y,z]=V.norm(ax),c=Math.cos(an),s=Math.sin(an),t=1-c;return new Float32Array([t*x*x+c,t*x*y+s*z,t*x*z-s*y,0,t*x*y-s*z,t*y*y+c,t*y*z+s*x,0,t*x*z+s*y,t*y*z-s*x,t*z*z+c,0,0,0,0,1])},
  pos:m=>[m[12],m[13],m[14]],
  dir:(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2],m[1]*p[0]+m[5]*p[1]+m[9]*p[2],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]],
  nm3(m){const a=m[0],b=m[4],c=m[8],d=m[1],e=m[5],f=m[9],g=m[2],h=m[6],i=m[10];
    const C00=e*i-f*h,C01=-(d*i-f*g),C02=d*h-e*g,C10=-(b*i-c*h),C11=a*i-c*g,C12=-(a*h-b*g),C20=b*f-c*e,C21=-(a*f-c*d),C22=a*e-b*d;
    const det=a*C00+b*C01+c*C02||1e-9;return new Float32Array([C00/det,C10/det,C20/det,C01/det,C11/det,C21/det,C02/det,C12/det,C22/det])}
};
// 쿼터니언 (포즈 보간)
function qFromM(m){const t=m[0]+m[5]+m[10];let x,y,z,w;
  if(t>0){const s=.5/Math.sqrt(t+1);w=.25/s;x=(m[6]-m[9])*s;y=(m[8]-m[2])*s;z=(m[1]-m[4])*s}
  else if(m[0]>m[5]&&m[0]>m[10]){const s=2*Math.sqrt(1+m[0]-m[5]-m[10]);w=(m[6]-m[9])/s;x=.25*s;y=(m[4]+m[1])/s;z=(m[8]+m[2])/s}
  else if(m[5]>m[10]){const s=2*Math.sqrt(1+m[5]-m[0]-m[10]);w=(m[8]-m[2])/s;x=(m[4]+m[1])/s;y=.25*s;z=(m[9]+m[6])/s}
  else{const s=2*Math.sqrt(1+m[10]-m[0]-m[5]);w=(m[1]-m[4])/s;x=(m[8]+m[2])/s;y=(m[9]+m[6])/s;z=.25*s}
  return[x,y,z,w]}
function qSlerp(a,b,t){let d=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];if(d<0){b=b.map(v=>-v);d=-d}
  if(d>.9995){const o=a.map((v,i)=>v+(b[i]-v)*t),l=Math.hypot(...o);return o.map(v=>v/l)}
  const th=Math.acos(d),s=Math.sin(th),wa=Math.sin((1-t)*th)/s,wb=Math.sin(t*th)/s;return a.map((v,i)=>v*wa+b[i]*wb)}
function qToM(q){const[x,y,z,w]=q;return new Float32Array([1-2*(y*y+z*z),2*(x*y+z*w),2*(x*z-y*w),0,2*(x*y-z*w),1-2*(x*x+z*z),2*(y*z+x*w),0,2*(x*z+y*w),2*(y*z-x*w),1-2*(x*x+y*y),0,0,0,0,1])}
// 색
const hexRGB=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]};
const lin=h=>hexRGB(h).map(v=>Math.pow(v,2.2));
const cmix=(a,b,t)=>V.mix(a,b,t);
// 결정적 난수
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}

/* ---------------- 지오메트리 ---------------- */
function G(){return{p:[],n:[],u:[],i:[]}}
function gv(g,p,n,u){g.p.push(p[0],p[1],p[2]);g.n.push(n[0],n[1],n[2]);g.u.push(u[0],u[1]);return g.p.length/3-1}
function merge(dst,src,m){
  const base=dst.p.length/3,nm=m?M4.nm3(m):null;
  for(let k=0;k<src.p.length;k+=3){
    let p=[src.p[k],src.p[k+1],src.p[k+2]],n=[src.n[k],src.n[k+1],src.n[k+2]];
    if(m){p=M4.pt(m,p);n=V.norm([nm[0]*n[0]+nm[3]*n[1]+nm[6]*n[2],nm[1]*n[0]+nm[4]*n[1]+nm[7]*n[2],nm[2]*n[0]+nm[5]*n[1]+nm[8]*n[2]])}
    dst.p.push(p[0],p[1],p[2]);dst.n.push(n[0],n[1],n[2])}
  for(let k=0;k<src.u.length;k++)dst.u.push(src.u[k]);
  for(let k=0;k<src.i.length;k++)dst.i.push(src.i[k]+base);
  return dst}
function quad(g,a,b,c,d,ua,ub,uc,ud,hint){// a-b-c-d 순서, 면 법선(평면)
  let n=V.norm(V.cross(V.sub(b,a),V.sub(d,a)));if(!isFinite(n[0])||V.len(V.cross(V.sub(b,a),V.sub(d,a)))<1e-12){n=V.norm(V.cross(V.sub(c,b),V.sub(a,b)))}
  if(hint&&V.dot(n,hint)<0)n=V.sc(n,-1);if(!isFinite(n[0]))n=hint?V.norm(hint):[0,1,0];
  const i0=gv(g,a,n,ua||[0,0]),i1=gv(g,b,n,ub||[1,0]),i2=gv(g,c,n,uc||[1,1]),i3=gv(g,d,n,ud||[0,1]);g.i.push(i0,i1,i2,i0,i2,i3)}
function box(w,h,d){const g=G(),x=w/2,y=h/2,z=d/2;
  const F=[[[x,-y,-z],[x,y,-z],[x,y,z],[x,-y,z],[1,0,0]],[[-x,-y,z],[-x,y,z],[-x,y,-z],[-x,-y,-z],[-1,0,0]],[[-x,y,-z],[-x,y,z],[x,y,z],[x,y,-z],[0,1,0]],[[-x,-y,z],[-x,-y,-z],[x,-y,-z],[x,-y,z],[0,-1,0]],[[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z],[0,0,1]],[[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z],[0,0,-1]]];
  for(const f of F)quad(g,f[0],f[1],f[2],f[3],[0,0],[1,0],[1,1],[0,1],f[4]);return g}
function area2(P){let a=0;for(let i=0;i<P.length;i++){const p=P[i],q=P[(i+1)%P.length];a+=p[0]*q[1]-q[0]*p[1]}return a/2}
function inTri(p,a,b,c){const d1=(p[0]-b[0])*(a[1]-b[1])-(a[0]-b[0])*(p[1]-b[1]),d2=(p[0]-c[0])*(b[1]-c[1])-(b[0]-c[0])*(p[1]-c[1]),d3=(p[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(p[1]-a[1]);return!((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0))}
function earcut(P){// P는 CCW
  const idx=P.map((_,i)=>i),T=[];let guard=0;
  while(idx.length>3&&guard++<20000){let ok=false;
    for(let k=0;k<idx.length;k++){const a=idx[(k+idx.length-1)%idx.length],b=idx[k],c=idx[(k+1)%idx.length],A=P[a],B=P[b],C=P[c];
      if((B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0])<=1e-14)continue;
      let bad=false;for(const j of idx){if(j===a||j===b||j===c)continue;const Q=P[j];if((Q[0]===A[0]&&Q[1]===A[1])||(Q[0]===B[0]&&Q[1]===B[1])||(Q[0]===C[0]&&Q[1]===C[1]))continue;if(inTri(Q,A,B,C)){bad=true;break}}
      if(bad)continue;T.push(a,b,c);idx.splice(k,1);ok=true;break}
    if(!ok){T.push(idx[0],idx[1],idx[2]);idx.splice(1,1)}}
  if(idx.length===3)T.push(idx[0],idx[1],idx[2]);return T}
function cleanPoly(P){const o=[];for(const p of P){const l=o[o.length-1];if(!l||Math.hypot(p[0]-l[0],p[1]-l[1])>1e-6)o.push(p)}
  while(o.length>2&&Math.hypot(o[0][0]-o[o.length-1][0],o[0][1]-o[o.length-1][1])<1e-6)o.pop();if(area2(o)<0)o.reverse();return o}
/* 2D 외곽선 돌출 (베벨, 두께 함수 지원) */
function extrude(outline,o={}){
  const P=cleanPoly(outline),n=P.length,g=G();const depth=o.depth||.05,bev=o.bevel??Math.min(.01,depth*.3),df=o.depthFn||(()=>depth);
  let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;for(const p of P){mnx=Math.min(mnx,p[0]);mny=Math.min(mny,p[1]);mxx=Math.max(mxx,p[0]);mxy=Math.max(mxy,p[1])}
  const uv=p=>[(p[0]-mnx)/(mxx-mnx||1),(p[1]-mny)/(mxy-mny||1)];
  const out=[],ins=[];
  for(let i=0;i<n;i++){const a=P[(i+n-1)%n],p=P[i],b=P[(i+1)%n];
    let e1=[p[0]-a[0],p[1]-a[1]],e2=[b[0]-p[0],b[1]-p[1]];const l1=Math.hypot(...e1)||1,l2=Math.hypot(...e2)||1;e1=[e1[0]/l1,e1[1]/l1];e2=[e2[0]/l2,e2[1]/l2];
    const n1=[e1[1],-e1[0]],n2=[e2[1],-e2[0]];let m=[n1[0]+n2[0],n1[1]+n2[1]];const ml=Math.hypot(...m)||1;m=[m[0]/ml,m[1]/ml];const k=1/Math.max(.35,m[0]*n1[0]+m[1]*n1[1]);
    out.push(m);const d=df(p[0],p[1]);const b2=Math.min(bev,d*.45);ins.push([p[0]-m[0]*b2*k,p[1]-m[1]*b2*k,b2])}
  const Z=i=>df(P[i][0],P[i][1])/2;
  // 캡
  const tri=earcut(ins.map(q=>[q[0],q[1]]));
  for(const side of[1,-1]){const base=g.p.length/3,acc=ins.map(()=>[0,0,0]),pos=ins.map((q,i)=>[q[0],q[1],side*Z(i)]);
    for(let t=0;t<tri.length;t+=3){const A=pos[tri[t]],B=pos[tri[t+1]],C=pos[tri[t+2]];let nn=V.cross(V.sub(B,A),V.sub(C,A));if(nn[2]*side<0)nn=V.sc(nn,-1);for(const j of[tri[t],tri[t+1],tri[t+2]])acc[j]=V.add(acc[j],nn)}
    pos.forEach((p,i)=>gv(g,p,V.norm(acc[i][2]*side<=0&&V.len(acc[i])<1e-12?[0,0,side]:acc[i]),uv(p)));
    for(let t=0;t<tri.length;t+=3)side>0?g.i.push(base+tri[t],base+tri[t+1],base+tri[t+2]):g.i.push(base+tri[t],base+tri[t+2],base+tri[t+1])}
  // 베벨 + 옆면
  const ring=(arr,z)=>arr.map((q,i)=>[q[0],q[1],z(i)]);
  const Fi=ring(ins,i=>Z(i)),Fo=ring(P,i=>Z(i)-ins[i][2]),Bo=ring(P,i=>-Z(i)+ins[i][2]),Bi=ring(ins,i=>-Z(i));
  const strips=bev>0?[[Fi,Fo,.8],[Fo,Bo,0],[Bo,Bi,-.8]]:[[Fo,Bo,0]];
  for(const[A,B,zh]of strips)for(let i=0;i<n;i++){const j=(i+1)%n,e=[P[j][0]-P[i][0],P[j][1]-P[i][1]],hint=[e[1],-e[0],zh*Math.hypot(...e)];
    quad(g,A[i],A[j],B[j],B[i],uv(A[i]),uv(A[j]),uv(B[j]),uv(B[i]),hint)}
  return g}
/* 회전체 */
function lathe(prof,seg=24,o={}){const g=G(),m=prof.length,flat=o.flat,ph=o.phase||0,sz=o.sz||1;
  const segN=[];let tl=0;const cum=[0];for(let k=0;k<m-1;k++){const dr=prof[k+1][0]-prof[k][0],dy=prof[k+1][1]-prof[k][1],l=Math.hypot(dr,dy)||1e-9;segN.push([dy/l,-dr/l]);tl+=l;cum.push(tl)}
  const nAt=(k,end)=>{const j=end?k+1:k-1;const s=segN[k];if(j<0||j>=segN.length||o.hard)return s;const t=segN[j];if(s[0]*t[0]+s[1]*t[1]>.82){const a=[s[0]+t[0],s[1]+t[1]],l=Math.hypot(...a);return[a[0]/l,a[1]/l]}return s};
  for(let k=0;k<m-1;k++){const p0=prof[k],p1=prof[k+1],n0=nAt(k,false),n1=nAt(k,true);
    for(let s=0;s<seg;s++){const a0=ph+s/seg*TAU,a1=ph+(s+1)/seg*TAU,c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1);
      const A=[p0[0]*c0,p0[1],p0[0]*s0*sz],B=[p0[0]*c1,p0[1],p0[0]*s1*sz],C=[p1[0]*c1,p1[1],p1[0]*s1*sz],D=[p1[0]*c0,p1[1],p1[0]*s0*sz];
      const uA=[s/seg,cum[k]/tl],uB=[(s+1)/seg,cum[k]/tl],uC=[(s+1)/seg,cum[k+1]/tl],uD=[s/seg,cum[k+1]/tl];
      if(flat){const am=(a0+a1)/2,nm=[(n0[0]+n1[0])/2,(n0[1]+n1[1])/2];quad(g,A,D,C,B,uA,uD,uC,uB,[nm[0]*Math.cos(am),nm[1],nm[0]*Math.sin(am)])}
      else{const N=(n,c,si)=>V.norm([n[0]*c,n[1],n[0]*si/sz]);const i0=gv(g,A,N(n0,c0,s0),uA),i1=gv(g,B,N(n0,c1,s1),uB),i2=gv(g,C,N(n1,c1,s1),uC),i3=gv(g,D,N(n1,c0,s0),uD);g.i.push(i0,i3,i2,i0,i2,i1)}}}
  return g}
const sphere=(r,ws=20,hs=12)=>{const pr=[];for(let i=0;i<=hs;i++){const a=-PI/2+i/hs*PI;pr.push([Math.cos(a)*r,Math.sin(a)*r])}pr[0][0]=0;pr[hs][0]=0;return lathe(pr,ws)};
/* 튜브 (곡선) */
function tube(path,rad,rs=8,o={}){const g=G(),n=path.length,R=typeof rad==='function'?rad:()=>rad;
  const T=path.map((p,i)=>V.norm(V.sub(path[Math.min(n-1,i+1)],path[Math.max(0,i-1)])));
  let N=V.norm(V.cross(T[0],Math.abs(T[0][1])<.9?[0,1,0]:[1,0,0]));const fr=[];
  for(let i=0;i<n;i++){if(i){N=V.norm(V.sub(N,V.sc(T[i],V.dot(N,T[i]))))}fr.push([N,V.cross(T[i],N)])}
  for(let i=0;i<n;i++){const r=R(i/(n-1)),[Nn,B]=fr[i];for(let s=0;s<=rs;s++){const a=s/rs*TAU,d=V.add(V.sc(Nn,Math.cos(a)),V.sc(B,Math.sin(a)));gv(g,V.madd(path[i],d,r),d,[s/rs,i/(n-1)])}}
  for(let i=0;i<n-1;i++)for(let s=0;s<rs;s++){const a=i*(rs+1)+s,b=a+rs+1;g.i.push(a,b,b+1,a,b+1,a+1)}
  return g}
/* 칼날: 단면(능선·베벨·홈)을 길이 방향으로 쓸어 만듦 */
function blade(L,hwL,hwR,th,xc,fullerF,N=80){
  const g=G();// 단면 [s, z배율]; 가운데(홈/능선)는 t에 따라
  const S=[[-1,0],[-.6,1],[-.22,1],[0,'c'],[.22,1],[.6,1],[1,0],[.6,-1],[.22,-1],[0,'-c'],[-.22,-1],[-.6,-1]];
  const pos=(t,k)=>{const s=S[k][0];let zf=S[k][1];const fu=fullerF(t);if(zf==='c')zf=lerp(1.14,.42,fu);else if(zf==='-c')zf=-lerp(1.14,.42,fu);
    const hw=s<0?hwL(t):hwR(t);return[xc(t)+s*hw,t*L,zf*th(t)]};
  const M=S.length;
  for(let k=0;k<M;k++){const k2=(k+1)%M,sm=(S[k][0]+S[k2][0])/2,zs=(typeof S[k][1]==='number'?S[k][1]:(S[k][1][0]==='-'?-1:1))+(typeof S[k2][1]==='number'?S[k2][1]:(S[k2][1][0]==='-'?-1:1));
    const base=g.p.length/3;let lastN=[0,0,1];
    for(let j=0;j<=N;j++){const t=j/N,A=pos(t,k),B=pos(t,k2),ta=Math.max(0,t-1/N),tb=Math.min(1,t+1/N),C0=V.mix(pos(ta,k),pos(ta,k2),.5),C1=V.mix(pos(tb,k),pos(tb,k2),.5);
      let n=V.cross(V.sub(B,A),V.sub(C1,C0));const hint=[sm,0,zs*2];if(V.len(n)<1e-10)n=lastN;else{n=V.norm(n);if(V.dot(n,hint)<0)n=V.sc(n,-1)}lastN=n;
      gv(g,A,n,[(S[k][0]+1)/2,t]);gv(g,B,n,[(S[k2][0]+1)/2,t])}
    for(let j=0;j<N;j++){const a=base+j*2;g.i.push(a,a+1,a+3,a,a+3,a+2)}}
  return g}

/* ---------------- GL ---------------- */
let gl=null,cv=null,H=null,ACTIVE=false,lost=false;
function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)+'\n'+src.split('\n').map((l,i)=>(i+1)+': '+l).join('\n'));return s}
function prog(vs,fs){const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
  const u={},n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const a=gl.getActiveUniform(p,i),nm=a.name.replace('[0]','');u[nm]=gl.getUniformLocation(p,a.name)}return{p,u}}
function mesh(g){const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const buf=(data,loc,sz)=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,0,0);return b};
  const bs=[buf(g.p,0,3),buf(g.n,1,3),buf(g.u,2,2)];const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(g.i),gl.STATIC_DRAW);
  gl.bindVertexArray(null);return{vao,n:g.i.length,bs:[...bs,ib]}}
function freeMesh(m){if(!m)return;gl.deleteVertexArray(m.vao);m.bs.forEach(b=>gl.deleteBuffer(b))}
function texFrom(canvas,o={}){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texImage2D(gl.TEXTURE_2D,0,o.srgb?gl.SRGB8_ALPHA8:gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,canvas);gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  const w=o.clamp?gl.CLAMP_TO_EDGE:gl.REPEAT;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);
  const an=gl.getExtension('EXT_texture_filter_anisotropic');if(an)gl.texParameterf(gl.TEXTURE_2D,an.TEXTURE_MAX_ANISOTROPY_EXT,4);return t}

const PBR_VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec2 aU;
uniform mat4 uVP,uM;uniform mat3 uNM;out vec3 vW;out vec3 vN;out vec2 vU;
void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=normalize(uNM*aN);vU=aU;gl_Position=uVP*w;}`;
const PBR_FS=`#version 300 es
precision highp float;in vec3 vW;in vec3 vN;in vec2 vU;out vec4 o;
uniform vec3 uCam,uCol,uEmi,uEdgeCol,uEmTCol,uEnvTint;uniform float uMet,uRou,uEdge,uEmGrad,uEnvI,uTime,uAlpha,uFogK,uFogS;uniform vec2 uRep;
uniform sampler2D uAlb,uEmT,uNor,uRgh,uEnvM;uniform int uUseAlb,uUseEm,uUseNor,uUseRgh,uUseEnv,uNL;uniform float uNorS,uEnvLod,uEnvRot,uEnvK;uniform vec4 uLP[7];uniform vec3 uLC[7];
const float PI=3.14159265;
vec3 envMap(vec3 d,float lod){float u=atan(d.z,d.x)/6.2831853+.5+uEnvRot;float v=acos(clamp(d.y,-1.,1.))/3.14159265;return textureLod(uEnvM,vec2(u,v),lod).rgb;}
mat3 cotan(vec3 N,vec3 p,vec2 uv){vec3 dp1=dFdx(p),dp2=dFdy(p);vec2 du1=dFdx(uv),du2=dFdy(uv);vec3 a=cross(dp2,N),b=cross(N,dp1);vec3 T=a*du1.x+b*du2.x,B=a*du1.y+b*du2.y;float k=inversesqrt(max(max(dot(T,T),dot(B,B)),1e-20));return mat3(T*k,B*k,N);}
vec3 env(vec3 d,float r){float up=d.y;if(uUseEnv==1){vec3 h=envMap(d,r*uEnvLod)*uEnvK;vec3 kd=normalize(vec3(.55,.8,.55));h+=vec3(1.5,1.6,1.9)*pow(max(dot(d,kd),0.),mix(90.,3.,r))*mix(1.4,.1,r);vec3 fd=normalize(vec3(-1.,-.05,.25));h+=vec3(3.,1.05,.3)*pow(max(dot(d,fd),0.),mix(40.,2.5,r))*mix(1.,.18,r);return h*uEnvTint*uEnvI;}
  vec3 c=mix(vec3(.03,.022,.028),vec3(.075,.06,.07),smoothstep(-.5,.5,up));
  c+=vec3(.05,.02,.008)*smoothstep(.1,-.7,up);
  vec3 fd=normalize(vec3(-1.,-.05,.25));c+=vec3(3.,1.05,.3)*pow(max(dot(d,fd),0.),mix(40.,2.5,r))*mix(1.2,.22,r);
  vec3 kd=normalize(vec3(.55,.8,.55));c+=vec3(1.5,1.6,1.9)*pow(max(dot(d,kd),0.),mix(90.,3.,r))*mix(2.2,.22,r);
  vec3 rd=normalize(vec3(-.3,.45,-1.));c+=vec3(.45,.6,1.2)*pow(max(dot(d,rd),0.),mix(30.,2.5,r))*mix(1.,.15,r);
  vec3 sd=normalize(vec3(.1,1.,.2));c+=vec3(.9,.85,.8)*pow(max(dot(d,sd),0.),mix(200.,6.,r))*mix(1.8,.1,r);
  return c*uEnvTint*uEnvI;}
vec3 envBRDF(vec3 F0,float r,float NoV){const vec4 c0=vec4(-1.,-.0275,-.572,.022);const vec4 c1=vec4(1.,.0425,1.04,-.04);vec4 q=r*c0+c1;float a=min(q.x*q.x,exp2(-9.28*NoV))*q.x+q.y;vec2 AB=vec2(-1.04,1.04)*a+q.zw;return F0*AB.x+AB.y;}
void main(){vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);vec2 tu=vU*uRep;
  if(uUseNor==1){vec3 tn=texture(uNor,tu).xyz*2.-1.;tn.xy*=uNorS;N=normalize(cotan(N,vW,tu)*tn);}
  vec3 alb=uCol;if(uUseAlb==1)alb*=texture(uAlb,tu).rgb;
  float rr=uRou;if(uUseRgh==1)rr*=.35+texture(uRgh,tu).r*1.3;
  float rou=clamp(rr,.045,1.),met=uMet;vec3 F0=mix(vec3(.04),alb,met);float NoV=max(dot(N,V),1e-3);
  vec3 Lo=vec3(0);
  for(int i=0;i<7;i++){if(i>=uNL)break;vec3 Ld=uLP[i].xyz-vW;float dist=length(Ld);vec3 L=Ld/dist;float att=1./(1.+dist*dist*uLP[i].w);
    vec3 Hh=normalize(L+V);float NoL=max(dot(N,L),0.),NoH=max(dot(N,Hh),0.),VoH=max(dot(V,Hh),0.);
    float a=rou*rou,a2=a*a,dd=NoH*NoH*(a2-1.)+1.,D=a2/(PI*dd*dd),k=(rou+1.)*(rou+1.)/8.,Gs=NoV/(NoV*(1.-k)+k)*NoL/(NoL*(1.-k)+k);
    vec3 F=F0+(1.-F0)*pow(1.-VoH,5.);vec3 spec=D*Gs*F/(4.*NoV*NoL+1e-4);vec3 kd=(1.-F)*(1.-met);
    Lo+=(kd*alb/PI+spec)*uLC[i]*NoL*att;}
  vec3 R=reflect(-V,N);vec3 col=Lo+env(R,rou)*envBRDF(F0,rou,NoV)+(uUseEnv==1?envMap(N,uEnvLod-1.)*uEnvK*uEnvTint*uEnvI*.8:env(N,1.))*alb*(1.-met)*.9;
  vec3 em=uEmi*mix(1.,smoothstep(.0,1.,vU.y)*1.6,uEmGrad);
  if(uUseEm==1){float m=texture(uEmT,vU).r;em+=uEmTCol*m*(.75+.25*sin(uTime*3.+vU.y*20.));}
  float e=abs(vU.x*2.-1.);em+=uEdgeCol*uEdge*smoothstep(.8,1.,e)*(.85+.15*sin(uTime*6.+vU.y*30.));
  col+=em;
  float fd=length(vW-uCam);col*=mix(1.,.35,smoothstep(uFogS,uFogS+4.,fd)*uFogK);
  o=vec4(col,uAlpha);}`;
const SKIN_VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=1) in vec3 aN;layout(location=2) in vec2 aU;layout(location=3) in vec4 aJ;layout(location=4) in vec4 aW;
uniform mat4 uVP,uM;uniform mat3 uNM;uniform mat4 uB[24];out vec3 vW;out vec3 vN;out vec2 vU;
void main(){mat4 S=uB[int(aJ.x)]*aW.x+uB[int(aJ.y)]*aW.y+uB[int(aJ.z)]*aW.z+uB[int(aJ.w)]*aW.w;vec4 w=S*vec4(aP,1.);vW=w.xyz;vN=normalize(mat3(S)*aN);vU=aU;gl_Position=uVP*w;}`;
const FS_VS=`#version 300 es
out vec2 vUv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const DOWN_FS=`#version 300 es
precision highp float;in vec2 vUv;out vec4 o;uniform sampler2D uT;uniform vec2 uTx;uniform float uTh;uniform int uBright;
void main(){vec3 c=(texture(uT,vUv+uTx*vec2(-1,-1)).rgb+texture(uT,vUv+uTx*vec2(1,-1)).rgb+texture(uT,vUv+uTx*vec2(-1,1)).rgb+texture(uT,vUv+uTx*vec2(1,1)).rgb)*.25;
  if(uBright==1){float l=max(c.r,max(c.g,c.b));float k=clamp((l-uTh)/max(l,1e-4),0.,1.);c*=k;c=min(c,vec3(60.));}o=vec4(c,1.);}`;
const UP_FS=`#version 300 es
precision highp float;in vec2 vUv;out vec4 o;uniform sampler2D uT;uniform vec2 uTx;uniform float uW;
void main(){vec3 c=vec3(0);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){float w=(x==0?2.:1.)*(y==0?2.:1.);c+=texture(uT,vUv+uTx*vec2(x,y)*1.5).rgb*w;}o=vec4(c/16.*uW,1.);}`;
const COMP_FS=`#version 300 es
precision highp float;in vec2 vUv;out vec4 o;uniform sampler2D uS,uB;uniform float uBloom,uExp,uCA,uFz,uTime,uVig;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 d=(vUv-.5)*uCA;vec3 c=vec3(texture(uS,vUv+d).r,texture(uS,vUv).g,texture(uS,vUv-d).b);
  c+=texture(uB,vUv).rgb*uBloom;c*=uExp;c=mix(c,c*vec3(1.35,.75,.62),uFz*.45);c=aces(c);
  float v=smoothstep(1.15,.35,length((vUv-.5)*vec2(1.1,1.)));c*=mix(1.,v,uVig);
  c=pow(c,vec3(1./2.2));c+=(hash(vUv*997.+uTime)-.5)*.018;o=vec4(c,1.);}`;
const SPR_VS=`#version 300 es
layout(location=0) in vec2 aC;layout(location=1) in vec3 iP;layout(location=2) in vec3 iD;layout(location=3) in vec2 iS;layout(location=4) in vec4 iC;
uniform mat4 uVP;uniform vec2 uRes,uPS;out vec2 vC;out vec4 vCol;flat out float vSh;
void main(){vC=aC;vCol=iC;vSh=iS.y;vec4 c=uVP*vec4(iP,1.);
  if(dot(iD,iD)>1e-10){vec4 a=uVP*vec4(iP-iD*.5,1.),b=uVP*vec4(iP+iD*.5,1.);if(a.w<.02||b.w<.02){gl_Position=vec4(9.,9.,9.,1.);return;}
    vec2 h=uRes*.5,sa=a.xy/a.w*h,sb=b.xy/b.w*h,d=sb-sa;float L=length(d);vec2 t=L>1e-3?d/L:vec2(1.,0.),n=vec2(-t.y,t.x);
    float w=max(1.2,iS.x*uPS.y*h.y/c.w);vec2 px=(sa+sb)*.5+t*(L*.5+w*.5)*aC.x+n*w*.5*aC.y;gl_Position=vec4(px/h*c.w,c.z,c.w);}
  else gl_Position=c+vec4(aC*iS.x*.5*uPS,0.,0.);}`;
const SPR_FS=`#version 300 es
precision highp float;in vec2 vC;in vec4 vCol;flat in float vSh;out vec4 o;
void main(){float r=length(vC),a;
  if(vSh<.5)a=exp(-r*r*3.2);
  else if(vSh<1.5){a=1.-smoothstep(0.,1.,r);a=a*a*(1.+2.*exp(-r*r*20.));}
  else if(vSh<2.5)a=smoothstep(.62,.84,r)*(1.-smoothstep(.86,1.,r));
  else{a=exp(-r*r*2.6);a*=a;a+=exp(-r*r*12.)*.6;}
  a*=1.-smoothstep(.9,1.,r);o=vec4(vCol.rgb*vCol.a*a,0.);}`;
const DEC_VS=`#version 300 es
layout(location=0) in vec3 aP;layout(location=2) in vec2 aU;uniform mat4 uVP,uM;out vec2 vU;void main(){vU=aU;gl_Position=uVP*uM*vec4(aP,1.);}`;
const DEC_FS=`#version 300 es
precision highp float;in vec2 vU;out vec4 o;uniform sampler2D uT;uniform vec4 uCol;uniform int uMode;
void main(){vec2 q=vU*2.-1.;float r=length(q);
  if(uMode==1){float a=(1.-smoothstep(.0,1.,r));o=vec4(0.,0.,0.,a*a*uCol.a);return;}
  if(uMode==2){float a=exp(-r*r*3.5)*(1.-smoothstep(.9,1.,r));o=vec4(uCol.rgb*a*uCol.a,0.);return;}
  vec4 t=texture(uT,vU);o=vec4(uCol.rgb*t.r*t.a*uCol.a,0.);}`;
