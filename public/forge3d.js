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
precision highp float;in vec2 vUv;out vec4 o;uniform sampler2D uS,uB;uniform float uBloom,uExp,uCA,uFz,uTime,uVig,uInv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 d=(vUv-.5)*uCA;vec3 c=vec3(texture(uS,vUv+d).r,texture(uS,vUv).g,texture(uS,vUv-d).b);
  c+=texture(uB,vUv).rgb*uBloom;c*=uExp;c=mix(c,c*vec3(1.35,.75,.62),uFz*.45);c=aces(c);
  float v=smoothstep(1.15,.35,length((vUv-.5)*vec2(1.1,1.)));c*=mix(1.,v,uVig);
  c=pow(c,vec3(1./2.2));c=mix(c,vec3(1.)-vec3(dot(c,vec3(.3,.59,.11))),uInv);c+=(hash(vUv*997.+uTime)-.5)*.018;o=vec4(c,1.);}`;
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
  fetch(b+file+'.json').then(r=>{if(!r.ok)throw 0;return r.json()}).then(J=>{const clips={};for(const[k,c]of Object.entries(J.clips)){if(!c.q)continue;const q={};for(const[bn,arr]of Object.entries(c.q))q[bn]=new Float32Array(arr);clips[k]={n:c.n,fps:c.fps||30,dur:(c.n-1)/(c.fps||30),q,hips:new Float32Array(c.hips||[])}}clips.__hsc=J.hsc;clips.__hrest=J.hrest;ANIM[name]=clips}).catch(()=>{delete ANIM[name]})}
function loadSmith(){loadChar('smith','smith')}
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

/* ---------------- 무기 (절차적 판타지 무기) ---------------- */
function mat(o){return Object.assign({nor:null,rgh:null,norS:1,col:[.5,.5,.5],met:0,rou:.5,emi:[0,0,0],emGrad:0,edge:0,edgeCol:[0,0,0],emT:null,emTCol:[0,0,0],alb:null,rep:[1,1],envI:1,alpha:1,fog:1},o)}
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
/* 무기 생성 */
function buildWeapon(w){
  const type=w.type||'blank',lv=w.lv||0,el=w.el||'fire';const wb=Batches();let R={type,lv,el,hidden:type==='saber'||type==='shinai'||type==='scythe'};
  if(type==='blank'){
    const o=[];for(let i=0;i<24;i++){const a=i/24*TAU,cx=Math.cos(a)>0?.13:-.13,cy=Math.sin(a)>0?.012:-.012;o.push([cx+Math.cos(a)*.05,cy+Math.sin(a)*.026])}
    wb.add('ingot',extrude(o,{depth:.12,bevel:.016}),M4.rz(PI/2));
    R.mats={ingot:mat({col:lin('#3a302c'),met:.5,rou:.6,emi:lin('#ff6a1a')})};Object.assign(R,{top:.2,bot:-.2,hitY:0,wingY:0,ringY:0,aura:null});
  }
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
  R.batches=Object.entries(wb.B).map(([k,g])=>({m:mesh(g),mat:R.mats[k]||mat({})}));
  if(!R.hidden&&type!=='blank'&&lv>=10){R.wings={m:mesh(wingGeo(el,lv)),mat:wingMat(el,lv)}}
  if(type==='scythe'&&lv>=16){R.wings={m:mesh(wingGeo('dark',lv)),mat:wingMat('dark',lv)}}
  R.len=R.top-R.bot;R.mid=(R.top+R.bot)/2;
  return R}
function freeWeapon(R){if(!R)return;R.batches.forEach(b=>freeMesh(b.m));if(R.wings)freeMesh(R.wings.m)}

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
  const calc=i=>{const b=B[i];W[i]=b.parent>=0?M4.mul(W[b.parent],b.local):b.local};
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
