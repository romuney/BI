/* ============================================================================
   shapes.js — генераторы форм для частиц. Каждая форма = {pos, col} на PX.N точек.
   SH.get('ladder:2') — кешируется.
   ========================================================================== */
(function () {
  'use strict';
  const N = PX.N, TAU = Math.PI * 2;
  const rn = Math.random, rs = () => rn() * 2 - 1;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rn(); while (!v) v = rn(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  const C = {
    l1: hex('#22D3EE'), l2: hex('#A78BFA'), l3: hex('#F472B6'), l4: hex('#FBBF24'),
    ink: hex('#DDE3FF'), ok: hex('#34D399'), no: hex('#FB7185'), blue: hex('#60A5FA'),
    dim: hex('#2A3052'), coral: hex('#FF8A65'), white: hex('#FFFFFF'), teal: hex('#2DD4BF')
  };
  const LV = [C.l1, C.l2, C.l3, C.l4];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const grad = (st, t) => { t = Math.max(0, Math.min(.9999, t)) * (st.length - 1); const i = Math.floor(t); return mix(st[i], st[Math.min(i + 1, st.length - 1)], t - i); };
  const jit = (c, a = .18) => mul(c, 1 - a + rn() * a * 2);
  let seed = 7; const srn = () => (seed = seed * 16807 % 2147483647) / 2147483647;

  class B {
    constructor() { this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.tag = new Int16Array(N).fill(-1); this.i = 0; }
    add(x, y, z, c, tag = -1) {
      if (this.i >= N) return false;
      const k = this.i * 3; const p = this.pos, q = this.col;
      p[k] = x; p[k + 1] = y; p[k + 2] = z; q[k] = c[0]; q[k + 1] = c[1]; q[k + 2] = c[2];
      this.tag[this.i] = tag;
      this.i++; return true;
    }
    get left() { return N - this.i; }
    done(o = {}) {
      const R = o.R || 11, dim = o.dim ?? .32;
      while (this.i < N) {
        const u = rs(), th = rn() * TAU, s = Math.sqrt(1 - u * u), r = R * (.3 + .7 * Math.cbrt(rn()));
        const c = mul(grad([C.l2, C.blue, C.l1], rn()), dim * (.2 + rn() * .6));
        this.add(r * s * Math.cos(th) * 1.3, r * u * .7, r * s * Math.sin(th) * .8 - 3, c);
      }
      // перемешать, чтобы при морфинге частицы летели «из кусочков»
      const p = this.pos, q = this.col, g = this.tag;
      for (let i = N - 1; i > 0; i--) {
        const j = (rn() * (i + 1)) | 0;
        const tg = g[i]; g[i] = g[j]; g[j] = tg;
        for (let k = 0; k < 3; k++) {
          let t = p[i * 3 + k]; p[i * 3 + k] = p[j * 3 + k]; p[j * 3 + k] = t;
          t = q[i * 3 + k]; q[i * 3 + k] = q[j * 3 + k]; q[j * 3 + k] = t;
        }
      }
      return { pos: p, col: q, tag: g };
    }
  }

  /* точка на коробке: рёбра (светятся) или грани */
  function boxPt(x0, x1, y0, y1, z0, z1, edge = .5) {
    const r = [rn(), rn(), rn()];
    if (rn() < edge) {
      const a = (rn() * 3) | 0;
      for (let k = 0; k < 3; k++) if (k !== a) r[k] = rn() < .5 ? 0 : 1;
    } else {
      const ax = (y1 - y0) * (z1 - z0), ay = (x1 - x0) * (z1 - z0), az = (x1 - x0) * (y1 - y0);
      const t = rn() * (ax + ay + az); const a = t < ax ? 0 : t < ax + ay ? 1 : 2;
      r[a] = rn() < .5 ? 0 : 1;
    }
    return [x0 + (x1 - x0) * r[0], y0 + (y1 - y0) * r[1], z0 + (z1 - z0) * r[2]];
  }
  function spherePt(r) { const u = rs(), th = rn() * TAU, s = Math.sqrt(1 - u * u); return [r * s * Math.cos(th), r * u, r * s * Math.sin(th)]; }
  function ballPt(r) { const p = spherePt(r * Math.cbrt(rn())); return p; }
  function rectOutline(b, x0, y0, x1, y1, n, c, z = 0, j = .012) {
    const w = x1 - x0, h = y1 - y0, per = 2 * (w + h);
    for (let i = 0; i < n; i++) {
      let t = rn() * per, x, y;
      if (t < w) { x = x0 + t; y = y0; } else if ((t -= w) < h) { x = x1; y = y0 + t; }
      else if ((t -= h) < w) { x = x1 - t; y = y1; } else { t -= w; x = x0; y = y1 - t; }
      b.add(x + rs() * j, y + rs() * j, z + rs() * j * 2, jit(c));
    }
  }

  /* ---------------- формы ---------------- */

  function text(str, o = {}) {
    const lines = str.split('\n'), fs = 220;
    const font = `${o.weight || 800} ${fs}px ${o.font || 'Unbounded'}, 'Segoe UI', sans-serif`;
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    ctx.font = font;
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const lh = fs * (o.lh || 1.12);
    cv.width = Math.ceil(maxW + 60); cv.height = Math.ceil(lh * lines.length + 60);
    ctx.font = font; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, cv.width / 2, 30 + lh * (i + .5)));
    const img = ctx.getImageData(0, 0, cv.width, cv.height).data, pts = [];
    for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) if (img[(y * cv.width + x) * 4 + 3] > 140) pts.push(x, y);
    const sc = (o.w || 10) / maxW, cx = cv.width / 2, cy = cv.height / 2, np = pts.length / 2;
    const b = new B(), n = Math.floor(N * (o.frac || .9)), cols = o.colors || LV;
    for (let i = 0; i < n && np; i++) {
      const j = ((rn() * np) | 0) * 2;
      const px = pts[j] + rs(), py = pts[j + 1] + rs();
      let x = (px - cx) * sc, y = -(py - cy) * sc, z = rs() * (o.depth || .22);
      if (o.chaos && rn() < o.chaos) { x += gauss() * .5; y += gauss() * .4; z += gauss() * .8; }
      let c = grad(cols, px / cv.width);
      c = jit(c, .25);
      if (o.chaos && rn() < .35) c = mul(c, .35);
      b.add(x, y, z, c);
    }
    return b.done({ dim: o.dustDim ?? .3 });
  }

  // 4 ступени зрелости. Геометрия общая для всех вариантов подсветки —
  // при смене подсветки частицы не летают, а переливаются цветом.
  // tag = ступень + 4 * вид (0 — корпус, 1 — искры, 2 — пол)
  function ladderBase() {
    const b = new B(), W = 1.3, D = 1.5, Hs = .72, X0 = -2 * W, Y0 = -1.5;
    const sparks = N * .08, floor = N * .05;
    const body = N * .85 - sparks - floor, wsum = [2.2, 2.6, 3, 3.4], ws = 11.2;
    for (let i = 0; i < 4; i++) {
      const x0 = X0 + i * W, x1 = x0 + W - .06, y1 = Y0 + Hs * (i + 1);
      const n = body * wsum[i] / ws;
      for (let k = 0; k < n; k++) {
        const p = boxPt(x0, x1, Y0, y1, -D / 2, D / 2, .55);
        b.add(p[0], p[1], p[2], jit(LV[i], .3), i);
      }
      for (let k = 0; k < sparks / 4; k++) {
        const h = Math.pow(rn(), 2.2) * 2.6;
        b.add(x0 + rn() * (W - .06), y1 + h, rs() * D / 2, mul(LV[i], 1.3 * (1 - h / 3)), i + 4);
      }
    }
    for (let k = 0; k < floor; k++) {
      let x = rs() * 4.2, z = rs() * 2.2;
      if (rn() < .5) x = Math.round(x / .52) * .52; else z = Math.round(z / .52) * .52;
      const f = 1 - Math.hypot(x / 4.2, z / 2.2);
      if (f <= 0) { k--; continue; }
      b.add(x, Y0 - .02, z, mul(C.l2, .35 * f), 8);
    }
    return b.done();
  }
  function variant(base, fn) {
    const col = new Float32Array(base.col);
    for (let i = 0; i < N; i++) {
      const t = base.tag[i]; if (t < 0) continue;
      const c = fn(t, [col[i * 3], col[i * 3 + 1], col[i * 3 + 2]]);
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    return { pos: base.pos, col };
  }
  // hl: -1 — все ступени светятся, 0..3 — подсвечена одна
  function ladder(hl) {
    return variant(SH.get('ladderBase'), (t, c) => {
      const step = t % 4, kind = t >> 2;
      if (kind === 2) return c;
      if (hl === -1) return kind === 1 ? mul(c, .5) : c;
      if (step === hl) return mul(c, kind === 1 ? 1.5 : 1.25);
      return kind === 1 ? [0, 0, 0] : mix(mul(c, .2), C.dim, .45);
    });
  }

  // команды-владельцы инструментов ↔ стрим «AI в BI» ↔ аналитики
  function bridge() {
    const b = new B(), xs = [-4.6, 0, 4.6], cs = [C.l1, C.l4, C.l3], rr = [.6, .78, .6];
    for (let i = 0; i < 3; i++) for (let k = 0; k < N * (i === 1 ? .2 : .16); k++) {
      const p = ballPt(rr[i]); const d = Math.hypot(...p) / rr[i];
      b.add(xs[i] + p[0], p[1], p[2], mul(cs[i], 1.4 - d * .7));
    }
    for (let a = 0; a < 2; a++) for (let dir = -1; dir <= 1; dir += 2) for (let k = 0; k < N * .08; k++) {
      const t = rn(), x0 = xs[a], x1 = xs[a + 1];
      const x = x0 + (x1 - x0) * t, y = dir * Math.sin(Math.PI * t) * 1.1;
      const z = Math.sin(t * TAU * 2 + dir) * .25;
      b.add(x + gauss() * .03, y + gauss() * .05, z + gauss() * .05, jit(mix(cs[a], cs[a + 1], t), .3));
    }
    return b.done({ dim: .25 });
  }

  // ДНК-таймлайн с 4 вехами
  function helix() {
    const b = new B(), R = .62, stops = [C.l2, C.l3, C.l4, C.l1], ms = [-4.8, -1.6, 1.6, 4.8];
    for (let k = 0; k < N * .44; k++) {
      const x = rs() * 6.8, th = x * 1.35 + (rn() < .5 ? 0 : Math.PI);
      b.add(x, R * Math.cos(th) + gauss() * .02, R * Math.sin(th) + gauss() * .02, jit(grad(stops, (x + 6.8) / 13.6), .2));
    }
    for (let k = 0; k < N * .16; k++) {
      const x = Math.round(rs() * 6.8 / .3) * .3, th = x * 1.35, t = rs();
      b.add(x, R * t * Math.cos(th), R * t * Math.sin(th), mul(grad(stops, (x + 6.8) / 13.6), .45));
    }
    ms.forEach((mx, i) => {
      for (let k = 0; k < N * .045; k++) { const p = ballPt(.32); b.add(mx + p[0], p[1], p[2], mul(grad(stops, (mx + 6.8) / 13.6), 1.6)); }
      for (let k = 0; k < N * .025; k++) { const a = rn() * TAU; b.add(mx + Math.cos(a) * .58 + gauss() * .01, Math.sin(a) * .58, gauss() * .01, mul(C.white, .6)); }
    });
    return b.done({ dim: .22 });
  }

  // IDE-голограмма: ноутбук слева, светящаяся панель агента справа
  function ide() {
    const b = new B(), c1 = mul(C.ink, .55), cc = C.blue;
    rectOutline(b, -3.4, -2, 3.4, 2, N * .1, c1);
    for (let k = 0; k < N * .025; k++) b.add(-3.4 + rn() * 6.8, 1.6 + rs() * .01, 0, mul(c1, .7));
    [[1.25, .6], [.35, -.35], [-.6, -1.2]].forEach(([y1, y0]) => {
      rectOutline(b, -3.15, y0, 1.05, y1, N * .045, mul(cc, .8));
      for (let l = 0; l < 3; l++) {
        const ly = y1 - .18 - l * .17, len = 1.2 + srn() * 2.4;
        for (let k = 0; k < N * .008; k++) b.add(-2.95 + rn() * len, ly + rs() * .015, 0, mul(cc, .55));
      }
    });
    // панель Nessy
    for (let k = 0; k < N * .2; k++) b.add(1.35 + rn() * 1.85, -1.85 + rn() * 3.3, rs() * .04, jit(mul(C.l2, .75), .35));
    rectOutline(b, 1.3, -1.9, 3.25, 1.5, N * .06, mul(C.l2, 1.6));
    [[1.1, .7, 1.5], [.45, 0, 1.75], [-.3, -.75, 1.4]].forEach(([y1, y0, x1]) => rectOutline(b, 1.5, y0, 1.5 + x1, y1, N * .02, mul(C.white, .9), .05));
    return b.done({ dim: .2 });
  }

  // волна данных (рельеф)
  function wave() {
    const b = new B();
    for (let k = 0; k < N * .9; k++) {
      let u = rs(), v = rs();
      if (rn() < .5) u = Math.round(u * 40) / 40; else v = Math.round(v * 22) / 22;
      const x = u * 10, z = v * 5;
      const y = .55 * Math.sin(u * 4 + v * 2) + .35 * Math.cos(v * 5 - u * 2) + .2 * Math.sin(u * 9);
      b.add(x, y, z, mul(grad([C.l1, C.l2, C.l3], (y + 1) / 2), .45 + (y + 1) * .35));
    }
    return b.done({ dim: .15 });
  }

  function galaxy() {
    const b = new B();
    for (let k = 0; k < N * .9; k++) {
      const arm = (rn() * 3) | 0, r = Math.pow(rn(), .65) * 6;
      const a = r * .85 + arm * TAU / 3 + gauss() * .32 / (r * .5 + .4);
      const y = gauss() * .12 * (1.4 - r / 6);
      const c = r < 1 ? mix(C.white, C.l4, r) : grad([C.l4, C.l3, C.l2, C.l1], r / 6);
      b.add(Math.cos(a) * r, y, Math.sin(a) * r, jit(mul(c, 1.1 - r / 9)));
    }
    return b.done({ dim: .2 });
  }

  function bars(pal, sd) {
    const b = new B(); seed = sd || 11;
    const cols = 6, rows = 4, sp = .82, w = .52, hs = [];
    for (let i = 0; i < cols * rows; i++) hs.push(.35 + srn() * 2.4 + (i % cols) * .12);
    const tot = hs.reduce((a, h) => a + h + .4, 0);
    for (let i = 0; i < cols * rows; i++) {
      const cx = ((i % cols) - (cols - 1) / 2) * sp, cz = (Math.floor(i / cols) - (rows - 1) / 2) * sp, h = hs[i];
      const c = grad(pal || [C.l1, C.l2, C.l3, C.l4], h / 3.1);
      const n = N * .8 * (h + .4) / tot;
      for (let k = 0; k < n; k++) { const p = boxPt(cx - w / 2, cx + w / 2, -1.4, -1.4 + h, cz - w / 2, cz + w / 2, .6); b.add(p[0], p[1], p[2], jit(c, .25)); }
    }
    for (let k = 0; k < N * .06; k++) {
      let x = rs() * 3, z = rs() * 2;
      if (rn() < .5) x = Math.round(x / .41) * .41; else z = Math.round(z / .41) * .41;
      b.add(x, -1.42, z, mul(C.l2, .3));
    }
    return b.done({ dim: .2 });
  }

  // сфера, расколотая на «работает / нет»
  function split() {
    const b = new B();
    for (let k = 0; k < N * .86; k++) {
      const p = spherePt(2.1), lat = Math.round(p[1] / .21) * .21;
      if (rn() < .45) { const r = Math.sqrt(Math.max(0, 2.1 * 2.1 - lat * lat)); const a = Math.atan2(p[2], p[0]); p[0] = r * Math.cos(a); p[1] = lat; p[2] = r * Math.sin(a); }
      if (p[0] < 0) b.add(p[0] - .35, p[1], p[2], jit(C.ok, .3));
      else {
        const f = rn() < .5 ? 1 + rn() * .5 : 1;
        b.add(p[0] * f + .35 + rn() * .3, p[1] * f, p[2] * f, jit(mul(C.no, f > 1 ? .5 : 1), .3));
      }
    }
    return b.done();
  }

  // ядро агента + 6 MCP-спутников
  const ORBIT_R = 2.55;
  const orbitNode = k => { const a = Math.PI / 2 - k * Math.PI / 3; return [ORBIT_R * Math.cos(a), ORBIT_R * Math.sin(a), 0]; };
  function orbit() {
    const b = new B(), nc = [C.l1, C.l4, C.coral, C.blue, C.teal, C.l2];
    for (let k = 0; k < N * .22; k++) { const p = ballPt(.85), d = Math.hypot(...p) / .85; b.add(...p, mix(C.white, C.l3, d * .9 + .1)); }
    for (let k = 0; k < N * .1; k++) { const a = rn() * TAU; b.add(Math.cos(a) * ORBIT_R + gauss() * .02, Math.sin(a) * ORBIT_R + gauss() * .02, gauss() * .02, mul(C.l3, .45)); }
    for (let k = 0; k < N * .06; k++) { const a = rn() * TAU, r = 1.35 + gauss() * .02; b.add(Math.cos(a) * r, Math.sin(a) * r * .35, Math.sin(a) * r, mul(C.l2, .4)); }
    for (let j = 0; j < 6; j++) {
      const [x, y] = orbitNode(j);
      for (let k = 0; k < N * .04; k++) { const p = ballPt(.26); b.add(x + p[0], y + p[1], p[2], mul(nc[j], 1.5)); }
      for (let k = 0; k < N * .012; k++) { const t = .35 + rn() * .55; b.add(x * t + gauss() * .01, y * t + gauss() * .01, 0, mul(nc[j], .45)); }
    }
    return b.done({ dim: .22 });
  }

  // труба-поток: ключ → прокси → tclaude
  function tube() {
    const b = new B(), xs = [-4.6, 0, 4.6], cs = [C.l4, C.l2, C.l3];
    for (let k = 0; k < N * .4; k++) {
      const x = rs() * 6, a = rn() * TAU, r = .2 + gauss() * .01;
      b.add(x, Math.cos(a) * r, Math.sin(a) * r, jit(grad(cs, (x + 6) / 12), .3));
    }
    xs.forEach((x0, i) => {
      for (let k = 0; k < N * .1; k++) { const p = spherePt(.62 + gauss() * .02); b.add(x0 + p[0], p[1], p[2], mul(cs[i], 1.1)); }
      for (let k = 0; k < N * .03; k++) { const a = rn() * TAU; b.add(x0 + Math.cos(a) * 1, Math.sin(a) * .22, Math.sin(a) * .9, mul(cs[i], .8)); }
    });
    return b.done({ dim: .22 });
  }

  // три модели
  function trio() {
    const b = new B(), xs = [-4.6, 0, 4.6], cs = [C.coral, C.blue, C.l1], rr = [.72, .72, .66];
    xs.forEach((x0, i) => {
      for (let k = 0; k < N * .18; k++) {
        const p = spherePt(rr[i]); const band = Math.sin(p[1] * 14 + i) * .5 + .5;
        b.add(x0 + p[0], p[1], p[2], mul(cs[i], .5 + band * .9));
      }
      for (let k = 0; k < N * .085; k++) {
        const a = rn() * TAU, r = rr[i] + .35 + rn() * .35, tilt = .35 + i * .15;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        b.add(x0 + x, z * Math.sin(tilt), z * Math.cos(tilt), mul(cs[i], .55));
      }
    });
    return b.done({ dim: .2 });
  }

  // граф нод — автоматизация
  function network() {
    const b = new B(); seed = 42;
    const nodes = []; for (let i = 0; i < 16; i++) nodes.push([(srn() * 2 - 1) * 5, (srn() * 2 - 1) * 2.4, (srn() * 2 - 1) * 1.6]);
    const edges = [];
    nodes.forEach((a, i) => {
      const ds = nodes.map((b2, j) => [j, Math.hypot(a[0] - b2[0], a[1] - b2[1], a[2] - b2[2])]).filter(d => d[0] !== i).sort((x, y) => x[1] - y[1]);
      edges.push([i, ds[0][0]], [i, ds[1][0]]);
    });
    const cs = [C.l4, C.l3, C.l1, C.l2];
    nodes.forEach((p0, i) => { for (let k = 0; k < N * .025; k++) { const p = ballPt(.2); b.add(p0[0] + p[0], p0[1] + p[1], p0[2] + p[2], mul(cs[i % 4], 1.5)); } });
    const per = (N * .5) / edges.length;
    edges.forEach(([i, j]) => {
      const a = nodes[i], c = nodes[j];
      for (let k = 0; k < per; k++) {
        const t = rn();
        b.add(a[0] + (c[0] - a[0]) * t + gauss() * .015, a[1] + (c[1] - a[1]) * t + gauss() * .015, a[2] + (c[2] - a[2]) * t, mul(mix(cs[i % 4], cs[j % 4], t), .5));
      }
    });
    return b.done({ dim: .22 });
  }

  // воксельный маркет; выделенный кластер — BI-пак
  function voxels() {
    const b = new B(), sp = .62, s = .42, gx = 9, gy = 5, gz = 3;
    const cells = [];
    for (let x = 0; x < gx; x++) for (let y = 0; y < gy; y++) for (let z = 0; z < gz; z++) {
      const pack = x >= 6 && x <= 7 && y >= 2 && y <= 3 && z >= 1;
      cells.push([(x - (gx - 1) / 2) * sp, (y - (gy - 1) / 2) * sp, (z - (gz - 1) / 2) * sp + (pack ? .9 : 0), pack]);
    }
    const nPack = N * .3, packs = cells.filter(c => c[3]), rest = cells.filter(c => !c[3]);
    const draw = (c, n, col) => { for (let k = 0; k < n; k++) { const p = boxPt(c[0] - s / 2, c[0] + s / 2, c[1] - s / 2, c[1] + s / 2, c[2] - s / 2, c[2] + s / 2, .75); b.add(p[0], p[1], p[2], jit(col, .3)); } };
    packs.forEach(c => draw(c, nPack / packs.length, mul(C.l4, 1.3)));
    rest.forEach((c, i) => draw(c, (N * .56) / rest.length, mul(grad([C.l2, C.blue, C.l1], (i % 9) / 9), .45)));
    return b.done({ dim: .2 });
  }

  // пайплайн MR: ось + 6 колец; lit — сколько колец горит.
  // tag = кольцо + 8 * вид (0 — ось, 1 — кольцо, 2 — ядро)
  const PIPE_X = [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5];
  const PIPE_C = [C.l1, C.blue, C.l2, C.l3, C.coral, C.l4];
  function pipeBase() {
    const b = new B();
    for (let k = 0; k < N * .16; k++) {
      const x = -6.6 + rn() * 13.2; const i = Math.max(0, PIPE_X.findIndex(p => x < p + 1.1));
      b.add(x, gauss() * .018, gauss() * .018, PIPE_C[i], i);
    }
    PIPE_X.forEach((x0, i) => {
      for (let k = 0; k < N * .1; k++) { const a = rn() * TAU, r = .5 + gauss() * .025; b.add(x0 + gauss() * .02, Math.sin(a) * r, Math.cos(a) * r * .9, PIPE_C[i], i + 8); }
      for (let k = 0; k < N * .025; k++) { const p = ballPt(.16); b.add(x0 + p[0], p[1], p[2], C.white, i + 16); }
    });
    return b.done({ dim: .2 });
  }
  function pipeLit(isOn) {
    return variant(SH.get('pipeBase'), (t, c) => {
      const i = t % 8, kind = t >> 3, on = isOn(i);
      if (kind === 2) return on ? mul(c, 1.2) : [0, 0, 0];
      if (kind === 1) return on ? mul(c, 1.4) : mix(C.dim, c, .25);
      return on ? mul(c, .9) : C.dim;
    });
  }
  const pipeline = lit => pipeLit(i => i < lit);
  // горят только перечисленные кольца: 'pset:0,3,4'
  const pipeSet = list => { const on = new Set(String(list).split(',').filter(x => x !== '').map(Number)); return pipeLit(i => on.has(i)); };

  // две агентские среды (Nessy и Hermes) и общие MCP-инструменты между ними
  function duo() {
    const b = new B(), xs = [-3.7, 3.7], cs = [C.l2, C.l1];
    xs.forEach((x0, i) => {
      for (let k = 0; k < N * .19; k++) { const p = spherePt(.78); const band = Math.sin(p[1] * 13 + i * 2) * .5 + .5; b.add(x0 + p[0], p[1], p[2], mul(cs[i], .55 + band * .9)); }
      for (let k = 0; k < N * .08; k++) {
        const a = rn() * TAU, r = 1.2 + rn() * .3, tilt = .45 + i * .2, x = Math.cos(a) * r, z = Math.sin(a) * r;
        b.add(x0 + x, z * Math.sin(tilt), z * Math.cos(tilt), mul(cs[i], .55));
      }
    });
    const nodes = [-1.3, -.65, 0, .65, 1.3].map((y, j) => [Math.cos(j) * .25, y * .95, 0]);
    nodes.forEach(n => { for (let k = 0; k < N * .025; k++) { const p = ballPt(.16); b.add(n[0] + p[0], n[1] + p[1], p[2], mul(C.l4, 1.4)); } });
    nodes.forEach(n => xs.forEach((x0, i) => {
      for (let k = 0; k < N * .012; k++) { const t = rn(); b.add(x0 + (n[0] - x0) * t + gauss() * .012, n[1] * t + Math.sin(t * Math.PI) * .15 + gauss() * .012, gauss() * .02, mul(mix(cs[i], C.l4, t), .5)); }
    }));
    return b.done({ dim: .2 });
  }

  // HTML-макет → SQL → виджет
  function htmlFrame() {
    const b = new B(), c = C.l1;
    rectOutline(b, -2.8, -1.8, 2.8, 1.8, N * .12, mul(c, 1.2));
    rectOutline(b, -2.65, 1.25, 2.65, 1.65, N * .05, mul(C.ink, .7));
    [[-2.65, -1.15], [-.85, .65], [.95, 2.65]].forEach(([x0, x1]) => rectOutline(b, x0, .45, x1, 1.05, N * .05, mul(C.l2, 1.1)));
    rectOutline(b, -2.65, -1.65, 2.65, .25, N * .1, mul(c, .9));
    for (let k = 0; k < N * .25; k++) {
      const col = (rn() * 9) | 0, x = -2.35 + col * .56, h = .3 + ((col * 37) % 11) / 11 * 1.4;
      b.add(x + rn() * .3, -1.5 + rn() * h, rs() * .02, mul(grad([C.l1, C.l2], col / 9), .5));
    }
    return b.done({ dim: .2 });
  }
  function db() {
    const b = new B(), R = 1.45, h = .62, g = .2;
    for (let d = 0; d < 3; d++) {
      const y0 = -1.4 + d * (h + g), y1 = y0 + h, c = grad([C.l2, C.l3, C.l1], d / 2);
      for (let k = 0; k < N * .09; k++) { const a = rn() * TAU, y = rn() < .5 ? y0 : y1; b.add(Math.cos(a) * R, y, Math.sin(a) * R, mul(c, 1.4)); }
      for (let k = 0; k < N * .12; k++) { const a = rn() * TAU; b.add(Math.cos(a) * R, y0 + rn() * h, Math.sin(a) * R, mul(c, .6)); }
      for (let k = 0; k < N * .04; k++) { const a = rn() * TAU, r = Math.sqrt(rn()) * R; b.add(Math.cos(a) * r, y1, Math.sin(a) * r, mul(c, .35)); }
    }
    return b.done({ dim: .2 });
  }

  // синтвейв-горизонт для roadmap
  function horizon() {
    const b = new B();
    for (let k = 0; k < N * .5; k++) {
      let x = rs() * 16, z = -rn() * 42 + 3;
      if (rn() < .55) x = Math.round(x / 1.2) * 1.2; else z = -Math.pow(Math.round(Math.pow(Math.max(0, 3 - z), .6) / .35) * .35, 1 / .6) + 3;
      const fade = 1 - (3 - z) / 46;
      b.add(x, -1.9, z, mul(mix(C.l3, C.l2, 1 - fade), .25 + fade * .9));
    }
    for (let k = 0; k < N * .36; k++) {
      const a = rn() * TAU, r = 9 * Math.sqrt(rn()), x = Math.cos(a) * r, y = Math.sin(a) * r;
      const t = (y + 9) / 18;
      if (t < .5 && ((t * 16) % 1) < (.5 - t) * 1.1) { k--; continue; }
      b.add(x * .6, y * .6 + 2.6, -22, mul(grad([C.l3, C.coral, C.l4], t), 2));
    }
    return b.done({ dim: .25 });
  }

  function ring() {
    const b = new B();
    for (let k = 0; k < N * .88; k++) {
      const a = rn() * TAU, R = 3.1, r = Math.abs(gauss()) * .45, b2 = rn() * TAU;
      const x = (R + r * Math.cos(b2)) * Math.cos(a), y = (R + r * Math.cos(b2)) * Math.sin(a), z = r * Math.sin(b2);
      b.add(x, y, z, jit(mul(grad([C.l1, C.l2, C.l3, C.l4, C.l1], a / TAU), 1.1 - r), .3));
    }
    return b.done({ dim: .2 });
  }

  function knot() {
    const b = new B(), p = 2, q = 3;
    for (let k = 0; k < N * .88; k++) {
      const t = rn() * TAU, r = Math.cos(q * t) + 2.2;
      const x = r * Math.cos(p * t), y = r * Math.sin(p * t), z = -Math.sin(q * t);
      const o = ballPt(.28);
      b.add(x * .95 + o[0], y * .95 + o[1], z * .95 + o[2], jit(grad([C.l3, C.l2, C.l1, C.l3], t / TAU), .3));
    }
    return b.done({ dim: .2 });
  }

  function core() {
    const b = new B();
    for (let k = 0; k < N * .85; k++) {
      const p = spherePt(2.3), lat = Math.abs(p[1]) / 2.3;
      const band = Math.sin(Math.atan2(p[2], p[0]) * 12 + p[1] * 3) > .6 ? 1.4 : .5;
      b.add(p[0], p[1], p[2], mul(grad([C.l1, C.l2, C.l3, C.l4], lat), band));
    }
    return b.done({ dim: .25 });
  }

  const GEN = {
    title: () => text('AI в BI', { w: 9.6 }),
    final: () => text('AI в BI', { w: 8.4, frac: .86 }),
    num: () => text('11 563', { w: 10.2, colors: [C.l4, C.l3, C.l2] }),
    qwen: () => text('Qwen', { w: 6.2, colors: [C.coral, C.no, mul(C.coral, .6)], chaos: .45, depth: .6, frac: .8 }),
    deepseek: () => text('DeepSeek', { w: 9.8, colors: [C.l1, C.blue, C.l2] }),
    ladderBase, pipeBase, ladder: a => ladder(+a), bridge, helix, ide, wave, galaxy, split, orbit, tube, trio, network, voxels, core,
    bars: () => bars(), widget: () => bars([C.l3, C.l4, C.l1], 29),
    pipe: a => pipeline(+a), pset: pipeSet, duo, html: htmlFrame, db, horizon, ring, knot
  };
  const cache = {};
  window.SH = {
    get(key) {
      if (cache[key]) return cache[key];
      const [name, arg] = key.split(':');
      return (cache[key] = GEN[name](arg));
    },
    orbitNode, PIPE_X
  };
})();
