import { Request, Response, NextFunction } from 'express';

export interface RouteMetric { m: string; p: string; l: number; h: number; }

const st = {
  a: 0, t: 0, c: [0, 0, 0, 0, 0, 0],
  s: Array(5).fill(0).map(() => ({ m: '', p: '', l: -1, h: 0 }))
};

const W = 72, DH = 10, d = '\x1b[90m', r = '\x1b[0m';
const oO = process.stdout.write, oE = process.stderr.write;
const write = (s: any) => oO.call(process.stdout, s);

let hk = false, p = false, v = false, eb = process.stdout.isTTY;

function re(m: string, p: string, ms: number, sc: number) {
  st.a && st.a--;
  st.c[sc / 100 | 0]++;
  const x = st.s.find(z => z.m === m && z.p === p);
  if (x) x.l += (ms - x.l) / ++x.h;
  else {
    const mn = st.s[4];
    if (ms > mn.l) { mn.m = m; mn.p = p; mn.l = ms; mn.h = 1; }
  }
  st.s.sort((a, b) => b.l - a.l);
}

const vl = (s: string) => s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').length;
const rw = (s: string) => `${d}│${r} ${s}${' '.repeat(Math.max(0, 68 - vl(s)))} ${d}│${r}\n`;

function er() {
  if (v) { write(`\x1b[${DH}A\x1b[J`); v = false; }
}

function pD() {
  if (!eb || p) return;
  p = true;
  try {
    const sR = st.s.map(x => {
      if (x.h > 0) {
        const isS = x.l >= 200, ms = Math.max(0, Math.round(x.l));
        const stStr = `\x1b[${isS ? 31 : 32}m[${isS ? '!' : '✓'}] ${r}`;
        const stats = `${ms}ms (x${x.h})`;
        const maxP = 50 - stats.length;
        const path = x.p.length > maxP ? x.p.slice(0, maxP - 3) + '…' : x.p;
        const dots = '.'.repeat(53 - path.length - stats.length || 1);
        return `${d}│${r} ${stStr} \x1b[1m${x.m.padEnd(6)}${r} ${path} ${d}${dots}${r} ${stats} ${d}│${r}\n`;
      }
      return rw(`${d}—${r}`);
    }).join('');

    write(
      `${d}┌──\x1b[1;36m api-spy \x1b[0;90m${"─".repeat(59)}┐${r}\n` +
      `${d}│${r} ${`Active: ${st.a}`.padEnd(20)} ${d}│${r} ${`Total: ${st.t}`.padEnd(20)} ${d}│${r} ${`RAM: ${process.memoryUsage().rss >> 20}MB`.padEnd(22)} ${d}│${r}\n` +
      `${d}├${"─".repeat(70)}┤${r}\n` +
      rw('\x1b[1mTop Slowest Routes:\x1b[0m') +
      sR +
      `${d}└${"─".repeat(70)}┘${r}\n`
    );
    v = true;
  } finally { p = false; }
}

function hS() {
  if (!eb || hk) return;
  hk = true;
  const hook = (orig: any, stream: any) => {
    return function (this: any, chunk: any) {
      const str = chunk ? chunk.toString() : '';
      if (p || str.includes('api-spy')) return orig.apply(stream, arguments as any);
      p = true;
      if (v) { write(`\x1b[${DH}A\x1b[J`); v = false; }
      const res = orig.apply(stream, arguments as any);
      p = false;
      pD();
      return res;
    };
  };
  (process.stdout as any).write = hook(oO, process.stdout);
  (process.stderr as any).write = hook(oE, process.stderr);
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
      const ms = Math.max(0, Math.round(Number(process.hrtime.bigint() - t0) / 1e6));
      let rn = req.route?.path || ((req.baseUrl || '') + req.path);
      if (!rn || rn.includes('undefined')) rn = req.originalUrl.split('?')[0] || '/';
      re(req.method, rn, ms, res.statusCode);
      er(); pD();
    });
    next();
  };
}

export { st as apiSpyMetrics };
