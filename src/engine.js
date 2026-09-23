/* ============================================================================
   engine.js — GPU particle morph engine (WebGL2, zero dependencies)
   Частицы перетекают между формами (текст, лестница, сферы, графики…).
   API: PX.init(canvas) · PX.morph(shape, opts) · PX.place(p) · PX.bright(b)
        PX.kick(a) · PX.mouse(x, y, on) · PX.toStage([x,y,z], place)
   ========================================================================== */
(function () {
  'use strict';

  const N = 24000;           // частиц в главной системе
  const STARS = 2200;        // фоновая звёздная пыль
  const FOV = 40 * Math.PI / 180;
  const CAM_Z = 12;
  const STAGE_W = 1920, STAGE_H = 1080, AR = STAGE_W / STAGE_H;
  const WORLD_H = 2 * Math.tan(FOV / 2) * CAM_Z;
  const WPP = WORLD_H / STAGE_H; // world units per stage px
  const MAXD = 0.42, SPAN = 1 - MAXD;

  /* ---------- mat4 (column-major) ---------- */
  const M = {
    mul(a, b) {
      const o = new Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
      }
      return o;
    },
    persp(fy, ar, n, f) {
      const t = 1 / Math.tan(fy / 2);
      return [t / ar, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0];
    },
    trans: (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
    rotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; },
    rotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; },
    scale: s => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1],
    apply(m, v) {
      const [x, y, z] = v;
      return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13],
              m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]];
    }
  };
  const modelOf = p => M.mul(M.trans(p.x, p.y, p.z), M.mul(M.rotY(p.ry), M.mul(M.rotX(p.rx), M.scale(p.s))));

  /* ---------- shaders ---------- */
  const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aFrom;
layout(location=1) in vec3 aTo;
layout(location=2) in vec3 aCF;
layout(location=3) in vec3 aCT;
layout(location=4) in float aDelay;
layout(location=5) in vec3 aRnd;
uniform mat4 uP, uV, uM;
uniform float uT, uSpan, uTime, uTurb, uKick, uSize, uScale, uBright;
uniform vec3 uMouse;
uniform vec4 uLens; // x, y, радиус, сила — автономная «лупа»
uniform float uWave; // 0 в лёгком режиме
out vec3 vC; out float vA;
float ease(float t){ return t<.5 ? 4.*t*t*t : 1.-pow(-2.*t+2.,3.)*.5; }
vec3 flow(vec3 p, float t){
  return vec3(sin(p.y*1.3+t*.9+aRnd.x*6.2831)+sin(p.z*2.1-t*.7),
              sin(p.z*1.7+t*1.1+aRnd.y*6.2831)+sin(p.x*1.9+t*.6),
              sin(p.x*1.5+t*.8+aRnd.z*6.2831)+sin(p.y*2.3-t*.9))*.5;
}
void main(){
  float lt = clamp((uT - aDelay)/uSpan, 0., 1.);
  float e = ease(lt);
  vec3 p = mix(aFrom, aTo, e);
  float bump = sin(3.14159265*lt);
  vec3 f = flow(p*.55, uTime*.6);
  p += f*(bump*uTurb*(.6+aRnd.x*1.3) + uKick*(.25+aRnd.y));
  p += .035*vec3(sin(uTime*.9+aRnd.x*40.), sin(uTime*.8+aRnd.y*40.), sin(uTime*.7+aRnd.z*40.));
  vec4 w = uM*vec4(p,1.);
  vec2 d = w.xy - uMouse.xy; float dl = length(d);
  float m = uMouse.z * smoothstep(1.5, 0., dl);
  w.xy += (d/(dl+1e-4))*m*.85; w.z += m*.9;
  // лупа: плавно ездит по рисунку и увеличивает частицы под собой
  vec2 dq = w.xy - uLens.xy; float lf = uLens.w * smoothstep(uLens.z, 0., length(dq));
  w.xy += dq*lf*.5; w.z += lf*1.2;
  // бегущая световая волна по всей сцене
  float wv = sin(w.x*.55 + w.y*.3 - uTime*1.2);
  float band = smoothstep(.6, 1., wv)*uWave;
  w.z += wv*.06*uWave;
  vec4 v = uV*w;
  gl_Position = uP*v;
  float sz = uSize*(.5+aRnd.z)*(1.+bump*.7)*(1.+lf*1.7+band*.25);
  gl_PointSize = clamp(sz*uScale/(-v.z), 1., 64.);
  float tw = .86+.14*sin(uTime*(1.1+aRnd.y*1.6)+aRnd.x*50.);
  vC = mix(aCF, aCT, e)*(1.+bump*.9+m*1.6+lf*1.4+band*.45);
  vA = uBright*tw;
}`;
  const FS = `#version 300 es
precision mediump float;
in vec3 vC; in float vA; out vec4 o;
void main(){
  vec2 c = gl_PointCoord*2.-1.; float r = dot(c,c);
  if (r > 1.) discard;
  float a = (exp(-r*5.)*.92 + (1.-r)*.08)*vA;
  o = vec4(vC*a, a);
}`;

  /* ---------- state ---------- */
  let gl, prog, U = {}, vaoMain, vaoStars, bufs = {}, canvas;
  let W = 1, H = 1, dpr = 1, fovY = FOV;
  const from = new Float32Array(N * 3), to = new Float32Array(N * 3);
  const cfrom = new Float32Array(N * 3), cto = new Float32Array(N * 3);
  const delay = new Float32Array(N), rnd = new Float32Array(N * 3);
  let T = 1, dur = 2.4, turb = 1, kickV = 0, kickAmp = 0, kickT = 9, time = 0, last = 0;
  let brightCur = 0, brightTgt = 1;
  const cur = { x: 0, y: 0, z: 0, s: 1, rx: 0, ry: 0 };
  const tgt = { x: 0, y: 0, z: 0, s: 1, rx: 0, ry: 0 };
  let spin = 0, sway = 0, baseRy = 0;
  const mouse = { x: 0, y: 0, str: 0, on: false };
  const lens = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, str: 0, next: 0 };
  const cam = { ax: 0, ay: 0, tx: 0, ty: 0 };
  let running = false;

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function mkBuf(loc, data, size, usage) {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  }

  function init(cv) {
    canvas = cv;
    gl = cv.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) return false;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) { console.warn('[PX] shader error', e); return false; }
    ['uP', 'uV', 'uM', 'uT', 'uSpan', 'uTime', 'uTurb', 'uKick', 'uSize', 'uScale', 'uBright', 'uMouse', 'uLens', 'uWave']
      .forEach(n => U[n] = gl.getUniformLocation(prog, n));

    // стартовое облако: широкая сфера
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
      const s = Math.sqrt(1 - u * u);
      from[i * 3] = to[i * 3] = r * s * Math.cos(th);
      from[i * 3 + 1] = to[i * 3 + 1] = r * u * .7;
      from[i * 3 + 2] = to[i * 3 + 2] = r * s * Math.sin(th) - 6;
      const c = .12 + Math.random() * .2;
      cfrom[i * 3] = cto[i * 3] = c * .7; cfrom[i * 3 + 1] = cto[i * 3 + 1] = c * .8; cfrom[i * 3 + 2] = cto[i * 3 + 2] = c * 1.3;
      rnd[i * 3] = Math.random(); rnd[i * 3 + 1] = Math.random(); rnd[i * 3 + 2] = Math.random();
    }

    vaoMain = gl.createVertexArray(); gl.bindVertexArray(vaoMain);
    bufs.from = mkBuf(0, from, 3, gl.DYNAMIC_DRAW);
    bufs.to = mkBuf(1, to, 3, gl.DYNAMIC_DRAW);
    bufs.cf = mkBuf(2, cfrom, 3, gl.DYNAMIC_DRAW);
    bufs.ct = mkBuf(3, cto, 3, gl.DYNAMIC_DRAW);
    bufs.d = mkBuf(4, delay, 1, gl.DYNAMIC_DRAW);
    mkBuf(5, rnd, 3, gl.STATIC_DRAW);

    // звёзды
    const sp = new Float32Array(STARS * 3), sc = new Float32Array(STARS * 3), sr = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      sp[i * 3] = (Math.random() * 2 - 1) * 40; sp[i * 3 + 1] = (Math.random() * 2 - 1) * 24; sp[i * 3 + 2] = -8 - Math.random() * 40;
      const k = .1 + Math.random() * .35, hue = Math.random();
      sc[i * 3] = k * (hue > .7 ? 1.1 : .7); sc[i * 3 + 1] = k * .8; sc[i * 3 + 2] = k * 1.3;
      sr[i * 3] = Math.random(); sr[i * 3 + 1] = Math.random(); sr[i * 3 + 2] = Math.random() * .6;
    }
    vaoStars = gl.createVertexArray(); gl.bindVertexArray(vaoStars);
    mkBuf(0, sp, 3, gl.STATIC_DRAW); mkBuf(1, sp, 3, gl.STATIC_DRAW);
    mkBuf(2, sc, 3, gl.STATIC_DRAW); mkBuf(3, sc, 3, gl.STATIC_DRAW);
    mkBuf(4, new Float32Array(STARS), 1, gl.STATIC_DRAW); mkBuf(5, sr, 3, gl.STATIC_DRAW);
    gl.bindVertexArray(null);

    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    resize(); addEventListener('resize', resize);
    running = true; requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) last = performance.now(); });
    return true;
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ar = W / H;
    // сцена всегда «вписана» в сцену 16:9 так же, как HTML-слайд
    fovY = ar >= AR ? FOV : 2 * Math.atan(Math.tan(FOV / 2) * (H / (W / AR)));
  }

  /* зафиксировать текущее (промежуточное) состояние как стартовое */
  function capture() {
    for (let i = 0; i < N; i++) {
      const lt = Math.min(1, Math.max(0, (T - delay[i]) / SPAN)), e = ease(lt);
      for (let k = 0; k < 3; k++) {
        const j = i * 3 + k;
        from[j] += (to[j] - from[j]) * e;
        cfrom[j] += (cto[j] - cfrom[j]) * e;
      }
    }
  }

  function morph(shape, o = {}) {
    if (!gl) return;
    capture();
    to.set(shape.pos); cto.set(shape.col);
    const mode = o.sweep || 'x';
    let mn = Infinity, mx = -Infinity;
    const key = i => mode === 'y' ? -to[i * 3 + 1] : mode === 'r' ? Math.hypot(to[i * 3], to[i * 3 + 1]) : to[i * 3];
    if (mode !== 'rand') for (let i = 0; i < N; i++) { const v = key(i); if (v < mn) mn = v; if (v > mx) mx = v; }
    const rng = (mx - mn) || 1, sw = o.sweepAmt ?? .72;
    for (let i = 0; i < N; i++) {
      const pos = mode === 'rand' ? Math.random() : (key(i) - mn) / rng;
      delay[i] = MAXD * (pos * sw + Math.random() * (1 - sw));
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.from); gl.bufferData(gl.ARRAY_BUFFER, from, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.to); gl.bufferData(gl.ARRAY_BUFFER, to, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.cf); gl.bufferData(gl.ARRAY_BUFFER, cfrom, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.ct); gl.bufferData(gl.ARRAY_BUFFER, cto, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs.d); gl.bufferData(gl.ARRAY_BUFFER, delay, gl.DYNAMIC_DRAW);
    T = 0; dur = o.dur ?? 2.4; turb = o.turb ?? 1; lens.next = 0;
  }

  const DEF = { x: 0, y: 0, z: 0, s: 1, rx: 0, ry: 0, spin: 0, sway: 0 };
  function place(p) {
    p = Object.assign({}, DEF, p);
    tgt.x = p.x; tgt.y = p.y; tgt.z = p.z; tgt.s = p.s; tgt.rx = p.rx;
    spin = p.spin; sway = p.sway; baseRy = p.ry;
    // кратчайший поворот к целевому углу
    const TAU = Math.PI * 2;
    tgt.ry = p.ry + TAU * Math.round((cur.ry - p.ry) / TAU);
  }

  function toStage(v, p) {
    p = Object.assign({}, DEF, p);
    const mvp = M.mul(M.persp(FOV, AR, .1, 200), M.mul(M.trans(0, 0, -CAM_Z), modelOf(p)));
    const c = M.apply(mvp, v);
    return [(c[0] / c[3] + 1) / 2 * STAGE_W, (1 - c[1] / c[3]) / 2 * STAGE_H];
  }

  function setMouse(sx, sy, on) {
    mouse.x = (sx - STAGE_W / 2) * WPP; mouse.y = -(sy - STAGE_H / 2) * WPP; mouse.on = on;
    cam.tx = (sx / STAGE_W - .5); cam.ty = (sy / STAGE_H - .5);
  }

  /* лупа выбирает случайную яркую точку текущей фигуры и плавно едет к ней (пружина) */
  function pickLens(m) {
    for (let t = 0; t < 80; t++) {
      const i = (Math.random() * N) | 0;
      if (cto[i * 3] + cto[i * 3 + 1] + cto[i * 3 + 2] < .9) continue;
      const p = M.apply(m, [to[i * 3], to[i * 3 + 1], to[i * 3 + 2]]);
      if (Math.abs(p[0]) > 6.8 || Math.abs(p[1]) > 3.7) continue;
      if (t < 60 && Math.hypot(p[0] - lens.x, p[1] - lens.y) < 1.4) continue;
      lens.tx = p[0]; lens.ty = p[1]; return;
    }
  }
  function updateLens(m, dt) {
    lens.next -= dt;
    if (lens.next <= 0 || Math.hypot(lens.tx - lens.x, lens.ty - lens.y) < .12) { pickLens(m); lens.next = 3 + Math.random() * 2; }
    const k = 2.6, c = 2 * Math.sqrt(k) * .9;
    lens.vx += ((lens.tx - lens.x) * k - lens.vx * c) * dt; lens.vy += ((lens.ty - lens.y) * k - lens.vy * c) * dt;
    lens.x += lens.vx * dt; lens.y += lens.vy * dt;
    const want = (mouse.on ? 0 : 1) * (T >= 1 ? 1 : 0) * Math.min(1, Math.max(.25, (brightTgt - .2) / .6));
    lens.str += (want - lens.str) * (1 - Math.pow(.2, dt));
  }

  /* лёгкий режим: половина частиц, без волны, dpr 1. Включается клавишей L
     или сам, если несколько секунд подряд FPS ниже 40 (например, при шаринге экрана) */
  let lite = false, fpsAcc = 0, fpsN = 0, slowWin = 0, onLite = null;
  function setLite(v) { lite = !!v; resize(); onLite && onLite(lite); }
  function watchFps(dt) {
    if (lite || !dt) return;
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 2) {
      slowWin = fpsN / fpsAcc < 40 ? slowWin + 1 : 0;
      fpsAcc = 0; fpsN = 0;
      if (slowWin >= 2) setLite(true);
    }
  }

  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; time += dt;
    watchFps(dt);
    T = Math.min(1, T + dt / dur);
    // «толчок» — плавная волна (нарастает и спадает), без мгновенного рывка
    kickT += dt; kickV = kickT < 1.6 ? kickAmp * Math.sin(Math.PI * kickT / 1.6) : 0;
    const k = 1 - Math.pow(.02, dt);
    if (spin) tgt.ry += spin * dt;
    for (const n of ['x', 'y', 'z', 's', 'rx', 'ry']) cur[n] += (tgt[n] - cur[n]) * k;
    brightCur += (brightTgt - brightCur) * (1 - Math.pow(.05, dt));
    mouse.str += ((mouse.on ? 1 : 0) - mouse.str) * (1 - Math.pow(.03, dt));
    cam.ax += (cam.ty * .06 - cam.ax) * (1 - Math.pow(.1, dt));
    cam.ay += (cam.tx * .09 - cam.ay) * (1 - Math.pow(.1, dt));

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    const P = M.persp(fovY, W / H, .1, 200);
    const V = M.mul(M.trans(0, 0, -CAM_Z), M.mul(M.rotX(cam.ax), M.rotY(cam.ay)));
    const scale = canvas.height / (2 * Math.tan(fovY / 2));
    gl.uniformMatrix4fv(U.uP, false, P); gl.uniformMatrix4fv(U.uV, false, V);
    gl.uniform1f(U.uTime, time); gl.uniform1f(U.uScale, scale); gl.uniform1f(U.uSpan, SPAN);

    // звёзды
    gl.uniformMatrix4fv(U.uM, false, M.rotY(time * .01));
    gl.uniform1f(U.uT, 1); gl.uniform1f(U.uTurb, 0); gl.uniform1f(U.uKick, 0);
    gl.uniform1f(U.uSize, .09); gl.uniform1f(U.uBright, .8); gl.uniform3f(U.uMouse, 0, 0, 0); gl.uniform4f(U.uLens, 0, 0, 1, 0);
    gl.bindVertexArray(vaoStars); gl.drawArrays(gl.POINTS, 0, STARS);

    // главная система
    const m = modelOf({ x: cur.x, y: cur.y, z: cur.z, s: cur.s,
      rx: cur.rx + Math.sin(time * .27) * sway * .5, ry: cur.ry + Math.sin(time * .35) * sway });
    gl.uniformMatrix4fv(U.uM, false, m);
    gl.uniform1f(U.uT, T); gl.uniform1f(U.uTurb, turb); gl.uniform1f(U.uKick, kickV);
    gl.uniform1f(U.uSize, .052); gl.uniform1f(U.uBright, brightCur);
    gl.uniform3f(U.uMouse, mouse.x, mouse.y, mouse.str);
    updateLens(m, dt);
    gl.uniform4f(U.uLens, lens.x, lens.y, 1.05, lens.str);
    gl.uniform1f(U.uWave, lite ? 0 : 1);
    gl.bindVertexArray(vaoMain); gl.drawArrays(gl.POINTS, 0, lite ? Math.round(N * .5) : N);
  }

  window.PX = {
    N, WPP, init, morph, place, toStage,
    bright: b => { brightTgt = b; },
    kick: a => { kickAmp = kickT < 1.6 ? Math.max(kickV, a) : a; kickT = kickT < .8 ? kickT : 0; },
    setLite, get lite() { return lite; }, set onLite(f) { onLite = f; },
    settle: () => { T = 1; Object.assign(cur, tgt); brightCur = brightTgt; },
    mouse: setMouse,
    get ready() { return !!gl; }
  };
})();
