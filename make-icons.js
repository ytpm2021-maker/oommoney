/* Generate cute "น้องออม" coin-mascot PNG icons — no dependencies (zlib only). */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'icons');
fs.mkdirSync(OUT, { recursive: true });

// ---- tiny PNG encoder (RGBA, 8-bit) ----
function crc32(buf){
  let c, table = crc32.t || (crc32.t = (()=>{const t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})());
  let crc = 0xFFFFFFFF;
  for(let i=0;i<buf.length;i++) crc = table[(crc^buf[i])&0xFF]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const t = Buffer.from(type,'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);
  return Buffer.concat([len,t,data,crc]);
}
function encodePNG(w,h,rgba){
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const raw = Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){
    raw[y*(w*4+1)] = 0;
    rgba.copy(raw, y*(w*4+1)+1, y*w*4, y*w*4+w*4);
  }
  const idat = zlib.deflateSync(raw,{level:9});
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',idat), chunk('IEND',Buffer.alloc(0))]);
}

// ---- drawing helpers ----
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>clamp(t,0,1);

function draw(S, maskable){
  const buf = Buffer.alloc(S*S*4);
  const cx=S/2, cy=S/2;
  const scale = maskable ? 0.78 : 1;        // shrink content into safe zone for maskable
  const R = S*0.30*scale;                    // coin radius
  const mcx=cx, mcy=cy;

  // palette
  const top=[123,216,168], bot=[79,191,138];
  const white=[255,255,255], ring=[200,238,222];
  const ink=[56,85,74], blush=[255,159,182];

  function set(x,y,col,a){
    if(x<0||y<0||x>=S||y>=S||a<=0) return;
    const i=(y*S+x)*4;
    const ia=clamp(a,0,1);
    buf[i]  = lerp(buf[i],  col[0], ia);
    buf[i+1]= lerp(buf[i+1],col[1], ia);
    buf[i+2]= lerp(buf[i+2],col[2], ia);
    buf[i+3]= Math.max(buf[i+3], Math.round(ia*255));
  }
  function disc(px,py,r,col,a=1){
    const x0=Math.floor(px-r-1),x1=Math.ceil(px+r+1),y0=Math.floor(py-r-1),y1=Math.ceil(py+r+1);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const d=Math.hypot(x+0.5-px,y+0.5-py);
      set(x,y,col, smooth(r-d+0.6)*a);
    }
  }
  function ellipse(px,py,rx,ry,col,a=1){
    const x0=Math.floor(px-rx-1),x1=Math.ceil(px+rx+1),y0=Math.floor(py-ry-1),y1=Math.ceil(py+ry+1);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const dx=(x+0.5-px)/rx, dy=(y+0.5-py)/ry, d=Math.hypot(dx,dy);
      set(x,y,col, smooth((1-d)*Math.min(rx,ry))*a);
    }
  }

  // 1) background — full-bleed vertical gradient (OS masks corners)
  for(let y=0;y<S;y++){
    const t=y/(S-1);
    const col=[Math.round(lerp(top[0],bot[0],t)),Math.round(lerp(top[1],bot[1],t)),Math.round(lerp(top[2],bot[2],t))];
    for(let x=0;x<S;x++){const i=(y*S+x)*4;buf[i]=col[0];buf[i+1]=col[1];buf[i+2]=col[2];buf[i+3]=255;}
  }

  // soft decorative bubbles
  disc(S*0.80,S*0.20,S*0.10,[255,255,255],0.10);
  disc(S*0.18,S*0.82,S*0.08,[255,255,255],0.10);

  // 2) coin shadow + body + ring
  disc(cx,cy+R*0.06, R*1.03, [60,150,110], 0.25);   // drop shadow
  disc(cx,cy, R, ring, 1);                            // outer ring
  disc(cx,cy, R*0.90, white, 1);                      // face

  // faint ฿ at top of coin
  // (drawn as simple stem — keep subtle)
  // 3) face
  const eyeR=R*0.085, eyeDX=R*0.34, eyeY=cy-R*0.10;
  disc(mcx-eyeDX, eyeY, eyeR, ink, 1);
  disc(mcx+eyeDX, eyeY, eyeR, ink, 1);
  // eye sparkles
  disc(mcx-eyeDX+eyeR*0.4, eyeY-eyeR*0.4, eyeR*0.28, white, 1);
  disc(mcx+eyeDX+eyeR*0.4, eyeY-eyeR*0.4, eyeR*0.28, white, 1);
  // blush
  ellipse(mcx-R*0.50, cy+R*0.14, R*0.16, R*0.10, blush, 0.75);
  ellipse(mcx+R*0.50, cy+R*0.14, R*0.16, R*0.10, blush, 0.75);
  // smile (downward arc)
  const sm_r=R*0.34, smx=mcx, smy=cy+R*0.10, th=R*0.07;
  for(let a=0.18;a<=0.82;a+=0.008){
    const th2=Math.PI*a;
    const px=smx+sm_r*Math.cos(th2), py=smy+sm_r*Math.sin(th2);
    disc(px,py,th,ink,1);
  }

  return encodePNG(S,S,buf);
}

const jobs = [
  ['icon-192.png',192,false],
  ['icon-512.png',512,false],
  ['icon-180.png',180,false],
  ['icon-maskable-512.png',512,true],
];
for(const [name,size,mask] of jobs){
  fs.writeFileSync(path.join(OUT,name), draw(size,mask));
  console.log('✓', name, size+'px', mask?'(maskable)':'');
}
console.log('Done →', OUT);
