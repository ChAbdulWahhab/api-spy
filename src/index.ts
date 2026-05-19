import { Request, Response, NextFunction } from 'express';

export interface RouteMetric { m:string;p:string;l:number;h:number; }

const st={a:0,t:0,c:[0,0,0,0,0,0],s:Array(5).fill(0).map(()=>({m:'',p:'',l:-1,h:0}))};
const W=70,DH=10,dk='\x1b[90m',rs='\x1b[0m';
const oO=process.stdout.write.bind(process.stdout);
const oE=process.stderr.write.bind(process.stderr);
let hooked=false,pt=false,vis=false,eb=!!process.stdout.isTTY;

function rEnd(m:string,p:string,ms:number,sc:number){
  st.a&&st.a--;st.c[sc/100|0]++;
  const x=st.s.find(z=>z.m===m&&z.p===p);
  if(x){x.l+=(ms-x.l)/++x.h;}
  else{const mn=st.s.reduce((a,b)=>a.l<b.l?a:b);if(ms>mn.l)Object.assign(mn,{m,p,l:ms,h:1});}
  st.s.sort((a,b)=>b.l-a.l);
}

const vl=(s:string)=>s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g,'').length;
const bdr=(s:string)=>`${dk}|${rs} ${s}${' '.repeat(Math.max(0,W-4-vl(s)))} ${dk}|${rs}`;

function erase(){if(!vis)return;oO(`\x1b[${DH}A\x1b[J`);vis=false;}

function paint(){
  if(!eb||pt)return;pt=true;
  try{
    const inn=W-2,cw=(W/3|0)-2,rw=Math.max(0,W-9-2*cw),ln:string[]=[];
    ln.push(`${dk}+-- \x1b[1;36mapi-spy\x1b[0m ${dk}${'-'.repeat(W-11)}+${rs}`);
    ln.push(`${dk}|${rs} ${'Act:'+st.a} | ${'Tot:'+st.t} | ${'RAM:'+String(process.memoryUsage().rss>>20)+'MB'}${' '.repeat(Math.max(0,W-3-(('Act:'+st.a+' | Tot:'+st.t+' | RAM:'+String(process.memoryUsage().rss>>20)+'MB').length)))}${dk}|${rs}`);
    ln.push(`${dk}|${'-'.repeat(inn)}|${rs}`);
    ln.push(bdr('\x1b[1mTop Slowest Routes:\x1b[0m'));
    for(let i=0;i<5;i++){
      const x=st.s[i];
      if(x&&x.h>0){
        const v=Math.round(x.l),c2=v>=1000?'\x1b[1;31m':v>=200?'\x1b[33m':'\x1b[32m';
        const tag=v>=1000?'[!]':v>=200?'[~]':'[ok]';
        const sfv=` ${v}ms(${x.h}x)`,sf=` ${c2}${v}ms${rs}(${x.h}x)`;
        const p2=x.p.length>W-14-sfv.length?x.p.slice(0,Math.max(3,W-17-sfv.length))+'..':x.p;
        ln.push(bdr(`${tag} ${c2}${x.m.padEnd(6)}${rs} ${p2}${sf}`));
      }else{ln.push(bdr(`${dk} --${rs}`));}
    }
    ln.push(`${dk}+${'-'.repeat(inn)}+${rs}`);
    oO(ln.join('\n')+'\n');vis=true;
  }finally{pt=false;}
}

function hook(){
  if(!eb||hooked)return;hooked=true;
  const ic=(c:any,e:any,cb:any,o:Function):any=>{
    const s=typeof c==='string'?c:Buffer.isBuffer(c)?c.toString():'';
    if(pt||s.includes('api-spy')||s.includes('+--')||s.includes('+-'))return o(c,e,cb);
    erase();const res=o(c,e,cb);paint();return res;
  };
  (process.stdout as any).write=(c:any,e:any,cb:any)=>ic(c,e,cb,oO);
  (process.stderr as any).write=(c:any,e:any,cb:any)=>ic(c,e,cb,oE);
}

export function apiSpy(o:{enabled?:boolean}={}){
  if(o.enabled===true)eb=true;
  if(o.enabled!==false&&!hooked){hook();paint();}
  return(req:Request,res:Response,next:NextFunction)=>{
    if(o.enabled===false)return next();
    st.a++;st.t++;erase();paint();
    const t0=process.hrtime.bigint();
    res.on('finish',()=>{
      let rp=req.route?req.route.path:(req.baseUrl||'')+req.path;
      if(!rp||rp.includes('undefined'))rp=req.originalUrl.split('?')[0]||'/';
      rEnd(req.method,rp,Math.max(0,Number(process.hrtime.bigint()-t0)/1e6),res.statusCode);
      erase();paint();
    });
    next();
  };
}

export{st as apiSpyMetrics};
