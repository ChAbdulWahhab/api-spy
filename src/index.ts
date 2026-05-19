import { Request, Response, NextFunction } from 'express';

export interface RouteMetric { m: string; p: string; l: number; h: number; }

const st = { a: 0, t: 0, c: [0,0,0,0,0,0], s: Array(5).fill(0).map(() => ({ m:'', p:'', l:-1, h:0 })) };

const W = 72, DH = 9, d = '\x1b[90m', r = '\x1b[0m';
const oO = process.stdout.write.bind(process.stdout);
const oE = process.stderr.write.bind(process.stderr);

let hooked = false, painting = false, visible = false;
let eb = process.stdout.isTTY;

function rEnd(m: string, p: string, ms: number, sc: number) {
  st.a && st.a--;
  st.c[sc / 100 | 0]++;
  const x = st.s.find(z => z.m === m && z.p === p);
  if (x) { x.l += (ms - x.l) / ++x.h; }
  else {
    const mn = st.s.reduce((a, b) => a.l < b.l ? a : b);
    if (ms > mn.l) Object.assign(mn, { m, p, l: ms, h: 1 });
  }
  st.s.sort((a, b) => b.l - a.l);
}

const vl = (s: string) => s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').length;
const bdr = (s: string) => `${d}│${r} ${s}${' '.repeat(Math.max(0, W - 4 - vl(s)))} ${d}│${r}`;

function erase() {
  if (!visible) return;
  oO(`\x1b[${DH}A\x1b[0J`);
  visible = false;
}

function paint() {
  if (!eb || painting) return;
  painting = true;
  try {
    const inn = W - 2, cw = (W / 3 | 0) - 2, ln: string[] = [];
    ln.push(`${d}┌──\x1b[1;36m api-spy \x1b[0m${d}${'─'.repeat(W - 11)}┐${r}`);
    ln.push(`${d}│${r} ${ `⏳ Active: ${st.a}`.padEnd(cw)}${d}│${r} ${`📊 Total: ${st.t}`.padEnd(cw)}${d}│${r} ${`🧠 RAM: ${process.memoryUsage().rss >> 20}MB`.padEnd(inn - 2 - cw * 2 - 2)}  ${d}│${r}`);
    ln.push(`${d}├${'─'.repeat(inn)}┤${r}`);
    ln.push(bdr('\x1b[1mTop Slowest Routes:\x1b[0m'));
    for (let i = 0; i < 5; i++) {
      const x = st.s[i];
      if (x && x.h > 0) {
        const ms2 = Math.round(x.l);
        const c2 = ms2 >= 1000 ? '\x1b[1;31m' : ms2 >= 200 ? '\x1b[33m' : '\x1b[32m';
        const em = ms2 >= 1000 ? '🚨' : ms2 >= 200 ? '⚠️ ' : '✅ ';
        const sf = ` ${c2}${ms2}ms${r} (${x.h}x)`, sfv = ` ${ms2}ms (${x.h}x)`;
        const mp = W - 14 - sfv.length;
        const p2 = x.p.length > mp ? x.p.slice(0, Math.max(3, mp - 3)) + '…' : x.p;
        ln.push(bdr(`${em}${c2}${x.m.padEnd(6)}${r} ${p2}${sf}`));
      } else { ln.push(bdr(`${d}  —${r}`)); }
    }
    ln.push(`${d}└${'─'.repeat(inn)}┘${r}`);
    oO(ln.join('\n') + '\n');
    visible = true;
  } finally { painting = false; }
}

function hookStreams() {
  if (!eb || hooked) return;
  hooked = true;
  const ic = (chunk: any, enc: any, cb: any, orig: Function): any => {
    if (painting) return orig(chunk, enc, cb);
    erase();
    const res = orig(chunk, enc, cb);
    paint();
    return res;
  };
  (process.stdout as any).write = (c: any, e: any, cb: any) => ic(c, e, cb, oO);
  (process.stderr as any).write = (c: any, e: any, cb: any) => ic(c, e, cb, oE);
}

export function apiSpy(o: { enabled?: boolean } = {}) {
  if (o.enabled === true) eb = true;
  if (o.enabled !== false && !hooked) { hookStreams(); paint(); }
  return (req: Request, res: Response, next: NextFunction) => {
    if (o.enabled === false) return next();
    st.a++; st.t++;
    erase(); paint();
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
      rEnd(req.method, req.baseUrl + (req.route?.path || req.path || req.url), Number(process.hrtime.bigint() - t0) / 1e6, res.statusCode);
      erase(); paint();
    });
    next();
  };
}

export { st as apiSpyMetrics };
