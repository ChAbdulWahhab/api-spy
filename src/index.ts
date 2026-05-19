import { Request, Response, NextFunction } from 'express';

export interface RouteMetric {
  m: string;
  p: string;
  l: number;
  h: number;
}

const st = {
  a: 0,
  t: 0,
  c: [0, 0, 0, 0, 0, 0],
  s: Array(5).fill(0).map(() => ({ m: '', p: '', l: -1, h: 0 }))
};

const oOut = process.stdout.write.bind(process.stdout);
const oErr = process.stderr.write.bind(process.stderr);
let hooked = false;
let drawing = false;
let drawn = false;
let eb = process.stdout.isTTY;

const d = '\x1b[90m';
const r = '\x1b[0m';

function rEnd(m: string, p: string, ms: number, status: number) {
  st.a && st.a--;
  st.c[status / 100 | 0]++;

  const x = st.s.find(z => z.m === m && z.p === p);
  if (x) {
    x.l += (ms - x.l) / ++x.h;
  } else {
    const min = st.s.reduce((a, b) => a.l < b.l ? a : b);
    if (ms > min.l) {
      Object.assign(min, { m, p, l: ms, h: 1 });
    }
  }
  st.s.sort((a, b) => b.l - a.l);
}

const G = (s: string) => s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').length;
const P = (s: string, w: number) => `${d}│${r} ${s}${' '.repeat(w - 4 - G(s))} ${d}│${r}`;

function D() {
  if (!eb || drawing) return;
  drawing = true;
  try {
    const w = process.stdout.columns || 80;
    const lns: string[] = [];
    lns.push(`${d}┌──\x1b[1;36m api-spy ${d}${'─'.repeat(w - 12)}┐${r}`);

    const colW = (w / 3 | 0) - 2;
    lns.push(`${d}│${r} ${`⏳ Active: ${st.a}`.padEnd(colW)}${d}│${r} ${`📊 Total: ${st.t}`.padEnd(colW)}${d}│${r} ${`🧠 RAM: ${process.memoryUsage().rss >> 20}MB`.padEnd(w - 6 - colW * 2)}${d}│${r}`);
    lns.push(`${d}├${'─'.repeat(w - 2)}┤${r}`);
    lns.push(P('\x1b[1mTop Slowest Routes (Action Required):\x1b[0m', w));

    for (let i = 0; i < 5; i++) {
      const x = st.s[i];
      if (x && x.h > 0) {
        const lat = Math.round(x.l);
        const col = lat >= 1000 ? '\x1b[1;31m' : (lat >= 200 ? '\x1b[33m' : '\x1b[32m');
        const emo = lat >= 1000 ? '🚨' : (lat >= 200 ? '⚠️' : '✅');
        const suf = ` - ${lat}ms (Hit: ${x.h}x)`;
        const maxP = w - 14 - suf.length;
        const p = x.p.length > maxP ? x.p.slice(0, maxP < 6 ? 3 : maxP - 3) + '...' : x.p;
        lns.push(P(`${emo} ${col}${x.m.padEnd(6)}${r} ${p}${suf.replace(' - ', ` - ${col}`)}${r}`, w));
      } else {
        lns.push(P(`${d}-${r}`, w));
      }
    }
    lns.push(`${d}└${'─'.repeat(w - 2)}┘${r}`);
    oOut(lns.join('\n') + '\n');
    drawn = true;
  } finally {
    drawing = false;
  }
}

function H() {
  if (!eb || hooked) return;
  hooked = true;
  const ic = (chunk: any, enc: any, cb: any, orig: any) => {
    if (drawing) return orig(chunk, enc, cb);
    if (drawn) {
      orig(`\x1b[10A\x1b[J`);
      drawn = false;
    }
    const res = orig(chunk, enc, cb);
    D();
    return res;
  };
  (process.stdout as any).write = (c: any, e: any, cb: any) => ic(c, e, cb, oOut);
  (process.stderr as any).write = (c: any, e: any, cb: any) => ic(c, e, cb, oErr);
}

export function apiSpy(o: any = {}) {
  if (o.enabled === true) eb = true;
  if (o.enabled !== false && !hooked) {
    H();
    D();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (o.enabled === false) return next();
    st.a++;
    st.t++;
    D();

    const start = process.hrtime.bigint();
    res.on('finish', () => {
      rEnd(req.method, req.baseUrl + (req.route?.path || req.path || req.url), Number(process.hrtime.bigint() - start) / 1e6, res.statusCode);
      D();
    });
    next();
  };
}

export { st as apiSpyMetrics };
