import { Request, Response, NextFunction } from 'express';

export interface RouteMetric { m: string; p: string; l: number; h: number; }

const st = {
  a: 0, t: 0, c: [0, 0, 0, 0, 0, 0],
  s: Array(5).fill(0).map(() => ({ m: '', p: '', l: -1, h: 0 }))
};

const W = 70, DH = 10, d = '\x1b[90m', r = '\x1b[0m';
const oO = process.stdout.write.bind(process.stdout);
const oE = process.stderr.write.bind(process.stderr);

let hk = false, p = false, v = false, eb = process.stdout.isTTY;

function re(m: string, p: string, ms: number, sc: number) {
  st.a && st.a--;
  st.c[sc / 100 | 0]++;
  const x = st.s.find(z => z.m === m && z.p === p);
  if (x) x.l += (ms - x.l) / ++x.h;
  else {
    const mn = st.s.reduce((a, b) => a.l < b.l ? a : b);
    if (ms > mn.l) Object.assign(mn, { m, p, l: ms, h: 1 });
  }
  st.s.sort((a, b) => b.l - a.l);
}

const vl = (s: string) => s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').length;
const rw = (s: string) => `${d}│${r} ${s}${' '.repeat(Math.max(0, W - 4 - vl(s)))} ${d}│${r}\n`;

function er() {
  if (v) { oO(`\x1b[${DH}A\x1b[J`); v = false; }
}

function pD() {
  if (!eb || p) return;
  p = true;
  try {
    const sR = st.s.map(x => {
      if (x.h > 0) {
        const lat = Math.max(0, Math.round(x.l));
        const col = lat >= 1000 ? '\x1b[1;31m' : lat >= 200 ? '\x1b[33m' : '\x1b[32m';
        return rw(`${lat >= 1000 ? '🚨' : lat >= 200 ? '⚠️' : '✅'} ${col}${x.m.padEnd(6)}${r} ${x.p} - ${col}${lat}ms${r} (Hit: ${x.h}x)`);
      }
      return rw(`${d}—${r}`);
    }).join('');

    oO(
      `${d}┌──\x1b[1;36m api-spy \x1b[0;90m${"─".repeat(W - 13)}┐${r}\n` +
      rw(`⏳ Active: ${st.a}`.padEnd(20) + `📊 Total: ${st.t}`.padEnd(20) + `🧠 RAM: ${process.memoryUsage().rss >> 20}MB`) +
      `${d}├${"─".repeat(W - 2)}┤${r}\n` +
      rw('\x1b[1mTop Slowest Routes:\x1b[0m') +
      sR +
      `${d}└${"─".repeat(W - 2)}┘${r}\n`
    );
    v = true;
  } finally { p = false; }
}

function hS() {
  if (!eb || hk) return;
  hk = true;
  const hook = (orig: typeof process.stdout.write) => {
    return function (this: any, chunk: any) {
      const str = chunk ? chunk.toString() : '';
      if (p || str.includes('api-spy')) return orig.apply(this, arguments as any);
      p = true;
      if (v) { oO(`\x1b[${DH}A\x1b[J`); v = false; }
      const res = orig.apply(this, arguments as any);
      p = false;
      pD();
      return res;
    };
  };
  (process.stdout as any).write = hook(oO);
  (process.stderr as any).write = hook(oE);
}

export function apiSpy(o: { enabled?: boolean } = {}) {
  if (o.enabled === true) eb = true;
  if (o.enabled !== false && !hk) { hS(); pD(); }
  return (req: Request, res: Response, next: NextFunction) => {
    if (o.enabled === false) return next();
    st.a++; st.t++;
    er(); pD();
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
      const diffMs = Number(process.hrtime.bigint() - t0) / 1e6;
      const duration = Math.max(0, Math.round(diffMs));
      let rn = req.route ? req.route.path : ((req.baseUrl || '') + req.path);
      if (!rn || rn.includes('undefined')) {
        rn = req.originalUrl.split('?')[0] || '/';
      }
      re(req.method, rn, duration, res.statusCode);
      er(); pD();
    });
    next();
  };
}

export { st as apiSpyMetrics };
