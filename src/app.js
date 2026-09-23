/* ============================================================================
   app.js — навигация, шаги, эффекты, пульт спикера, интерактивы
   ========================================================================== */

/* ───────────── НАСТРОЙКИ — поменяйте под себя ───────────── */
const CONFIG = {
  speaker: 'Роман Казанцев',
  cospeaker: 'Степан Гришков',
  role: 'Стрим «AI в BI»',
  date: 'дата митапа',                    // [СОБРАТЬ]
  contact: 'ник в Time',                  // [СОБРАТЬ]
  durationMin: 30,                        // хронометраж для таймера пульта (короткая версия — 15)
  links: {                                // QR-коды строятся автоматически
    nessySql: 'https://wiki.tcsbank.ru/pages/viewpage.action?pageId=9035808218',
    hermes: 'https://personal-agent.t-tech.team/hermes',
    byok: 'https://wiki.tcsbank.ru/pages/viewpage.action?pageId=9112708455',
    n8n: 'https://wiki.tcsbank.ru/pages/viewpage.action?pageId=8886861056',
    all: ''                               // [СОБРАТЬ] одна ссылка «всё из доклада» для финального QR
  },
  shots: {                                // пути к картинкам рядом с файлом (или перетащите на рамку)
    before1: '', after1: '', before2: '', after2: ''
  }
};

/* ───────────── сцены частиц для каждого слайда ───────────── */
const COLOR_ONLY = { dur: 1.3, turb: .12, sweep: 'x' };
const FLOW_PLACE = { y: 1.55 };            // кольца флоу — над колонками этапов, петля ОС — под ними
const DIM = (shape, bright = .3, place = {}) => ({ shape, place, bright });
const SCENES = {
  title: { shape: 'title', place: { y: 1.1, sway: .1 }, morph: { dur: 3.4, sweep: 'r', turb: 1.3 } },
  who: { shape: 'bridge', place: { y: .4 } },
  useful: { shape: 'helix', place: { y: -.35 }, morph: { dur: 2.8 } },
  flow: { shape: ['flow:all', 'flow:2,5,6', 'flow:all'], place: FLOW_PLACE, morph: [{ dur: 3, sweep: 'x', sweepAmt: .95 }, COLOR_ONLY] },
  heli: { shape: 'ide', place: { x: 3.9, y: -.45, s: .74, ry: -.22, sway: .04 } },
  ctx: DIM('wave', .5, { y: -3.1, rx: .42 }),
  proteus: { shape: 'split', place: { y: -.1, s: .72, sway: .12 }, bright: .5 },
  envs: { shape: 'duo', place: { y: 1.25, s: .75 } },
  nessy: { shape: ['qwen', 'deepseek'], place: { y: 1.45, sway: .08 }, morph: [{}, { dur: 3.2, turb: 1.8, sweep: 'x' }] },
  tclaude: { shape: 'orbit', place: { x: -3.75, y: -.5, s: .86 } },
  n8n: DIM('network', .22, { y: -.2, s: 1.3, spin: .05 }),
  pack: { shape: 'voxels', place: { x: 5.4, y: -2.2, s: .55, rx: .4, ry: -.7, sway: .08 }, bright: .8 },
  skillflow: { shape: 'flow:1,2,4', place: FLOW_PLACE, morph: { dur: 3, sweep: 'x' } },
  'rq-problem': DIM('knot', .28, { y: -.8, s: .9, spin: .08 }),
  'rq-jobs': DIM('wave', .28, { y: -3.4, rx: .42 }),
  'rq-not': DIM('ring', .3, { y: -.2, s: 1.3, rx: .95, spin: .1 }),
  'rq-check': DIM('galaxy', .3, { y: -.6, rx: 1.05, s: 1.2, spin: .04 }),
  'rq-rules': DIM('core', .22, { y: -.3, s: 1.1, spin: .06 }),
  'rq-steps': { shape: 'pipe:6', place: FLOW_PLACE, morph: { dur: 3, sweep: 'x', sweepAmt: .95 } },
  'rq-demo': DIM('wave', .22, { y: -3.6, rx: .42 }),
  'rq-doc': DIM('wave', .25, { y: -3.6, rx: .42 }),
  'rq-final': DIM('ring', .3, { y: -.2, s: 1.3, rx: .95, spin: .1 }),
  ech: { shape: ['html', 'db', 'widget'], morph: { dur: 2.6, turb: 1.4 },
         place: [{ x: 4.3, y: -.1, s: .95, ry: -.25, sway: .05 }, { x: 4.3, y: -.2, s: .95, rx: .35, spin: .25 }, { x: 4.4, y: -.05, s: 1.05, rx: .35, ry: -.6, sway: .12 }] },
  'ech-demo': DIM('widget', .2, { x: 5.6, y: -1.8, s: .6, rx: .35, ry: -.6, sway: .1 }),
  'ech-ex': DIM('wave', .3, { y: -3.4, rx: .42 }),
  dd: DIM('db', .5, { x: 4.6, y: -2.1, s: .6, rx: .35, spin: .2 }),
  todo: DIM('ring', .4, { y: -.2, s: 1.3, rx: .95, spin: .1 }),
  horizon: { shape: 'horizon', place: {}, morph: { dur: 3, sweep: 'y' } },
  final: { shape: 'final', place: { y: 1.75, sway: .1 }, morph: { dur: 3.2, sweep: 'r', turb: 1.3 } }
};

(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pick = (v, b) => Array.isArray(v) ? v[Math.min(b, v.length - 1)] : v;
  const pad = n => String(n).padStart(2, '0');
  const store = {
    get(k) { try { return localStorage.getItem('aibi.' + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('aibi.' + k, v); } catch (e) { /* ignore */ } }
  };
  const ACTS = { 1: 'Акт I · Что изменилось', 2: 'Акт II · Инструменты по флоу', 3: 'Акт III · Наши скиллы', 4: 'Акт IV · Что делать вам' };
  const LCOL = { 1: '#22d3ee', 2: '#a78bfa', 3: '#f472b6', 4: '#fbbf24' };
  const STAGES = ['Потребность', 'Бизнес-анализ', 'Разработка', 'Тестирование', 'Подготовка к релизу', 'Информирование', 'Демо', 'Анализ используемости', 'Сбор ОС'];
  const stageLabel = st => st.length === STAGES.length ? 'весь флоу' : st.map(i => STAGES[i]).join(' · ');
  const PRESENTER = location.hash === '#presenter';

  /* ───────────── модель колоды ───────────── */
  const slides = $$('.slide').map(el => ({
    el, id: el.id, n: 0, title: el.dataset.title, act: +el.dataset.act,
    level: +el.dataset.level || 0, sec: el.dataset.sec || '', builds: +el.dataset.builds || 0,
    short: el.hasAttribute('data-short'), divider: el.classList.contains('divider'),
    notes: ($('.notes', el)?.textContent || '').trim().replace(/\n\s+/g, '\n')
  }));
  // нумерация — по порядку слайдов (разделители не считаются)
  let cnt = 0; slides.forEach(s => { if (!s.divider) s.n = ++cnt; });
  const TOTAL = cnt;
  // раздел и этапы флоу наследуются от ближайшего разделителя; на разделителе частицы — флоу с подсвеченными этапами
  let secTitle = '', secStages = [];
  const parseSt = v => (v || '').split(',').filter(Boolean).map(x => +x - 1);
  slides.forEach(s => {
    if (s.act === 1 || s.act === 4) { secTitle = ''; secStages = []; }
    if (s.divider) {
      secTitle = s.sec + ' · ' + $('.div-title', s.el).textContent; secStages = parseSt(s.el.dataset.stages);
      SCENES[s.id] = { shape: 'flow:' + secStages.join(','), place: { x: 3.9, y: .15, s: .48, rx: .3, spin: .3 }, morph: { dur: 2.6 } };
    }
    s.secTitle = secTitle;
    s.stages = s.el.dataset.stages && !s.divider ? parseSt(s.el.dataset.stages) : secStages;
  });

  let short = store.get('short') === '1';
  let order = [], cur = -1, build = 0, shapeKey = '';
  const rebuildOrder = () => { order = slides.filter(s => !short || s.short); document.body.classList.toggle('short', short); };
  rebuildOrder();

  /* ───────────── масштаб сцены ───────────── */
  let K = 1;
  const fit = () => { K = Math.min(innerWidth / 1920, innerHeight / 1080); document.documentElement.style.setProperty('--k', K); };
  const toStagePt = (cx, cy) => [(cx - (innerWidth - 1920 * K) / 2) / K, (cy - (innerHeight - 1080 * K) / 2) / K];

  /* ───────────── подготовка DOM ───────────── */
  function prepare() {
    $$('[data-cfg]').forEach(el => { el.textContent = CONFIG[el.dataset.cfg] ?? ''; });
    slides.forEach(s => {
      // киккер
      const k = $('.kicker[data-auto]', s.el);
      if (k) {
        let h = `<span class="dot"></span><span class="kn">${pad(s.n)}</span><span>${s.el.dataset.kicker || (s.secTitle ? 'Раздел ' + s.secTitle : ACTS[s.act].split(' · ')[1])}</span>`;
        if (s.stages.length) h += `<span class="kl">${stageLabel(s.stages)}</span>`;
        k.innerHTML = h;
      }
      $$('.r', s.el).forEach((r, i) => r.style.setProperty('--i', i));
      $$('.scr', s.el).forEach(prepScramble);
      // привязка HTML к точкам 3D-сцены
      const sc = SCENES[s.id];
      if (sc) {
        const place = pick(sc.place, 0);
        const set = (el, v) => { const [x, y] = PX.toStage(v, place); el.style.left = x + 'px'; el.style.top = y + 'px'; };
        $$('[data-anchor]', s.el).forEach(el => set(el, el.dataset.anchor.split(',').map(Number)));
        $$('[data-orb]', s.el).forEach(el => set(el, SH.orbitNode(+el.dataset.orb)));
        $$('[data-flow]', s.el).forEach(el => { set(el, [SH.FLOW_X[+el.dataset.flow], -.62, 0]); el.style.animationDelay = (.3 + +el.dataset.flow * .1) + 's'; });
        $$('[data-pipe]', s.el).forEach(el => { set(el, [SH.PIPE_X[+el.dataset.pipe], -.75, 0]); el.style.animationDelay = (.3 + +el.dataset.pipe * .15) + 's'; });
      }
    });
    renderQR(); initShots(); initWidget(); initChecklist(); initTerms(); initTilt();
  }

  /* ───────────── навигация ───────────── */
  function go(i, b = 0, opts = {}) {
    i = Math.max(0, Math.min(order.length - 1, i));
    const s = order[i], prev = order[cur];
    const changed = !prev || prev !== s;
    if (changed) {
      if (prev) {
        $$('.slide.leaving').forEach(e => e.classList.remove('leaving', 'back'));
        prev.el.classList.remove('active');
        prev.el.classList.add('leaving');
        if (i < cur) prev.el.classList.add('back');
        const pe = prev.el; setTimeout(() => pe.classList.remove('leaving', 'back'), 650);
      }
      s.el.classList.toggle('fast', !!opts.fast);
      s.el.classList.add('active');
      cur = i;
      onEnter(s);
    }
    build = Math.max(0, Math.min(s.builds, b));
    applyBuild(s, changed);
    hud(); sync();
    try { history.replaceState(null, '', '#/' + s.id + (build ? '/' + build : '')); } catch (e) { /* file:// */ }
  }
  function next() {
    const s = order[cur];
    if (build < s.builds) go(cur, build + 1); else if (cur < order.length - 1) go(cur + 1, 0);
  }
  function prev() {
    if (build > 0) go(cur, build - 1); else if (cur > 0) go(cur - 1, order[cur - 1].builds, { fast: true });
  }
  const gotoId = (id, b = 0) => { let i = order.findIndex(s => s.id === id); if (i < 0) { short = false; store.set('short', '0'); rebuildOrder(); i = order.findIndex(s => s.id === id); } go(i, b); };

  function applyBuild(s, entered) {
    $$('[data-step]', s.el).forEach(e => e.classList.toggle('on', build >= +e.dataset.step));
    $$('[data-step-only]', s.el).forEach(e => e.classList.toggle('on', build === +e.dataset.stepOnly));
    // частицы
    const sc = SCENES[s.id];
    if (sc && PX.ready) {
      const key = pick(sc.shape, build);
      if (key !== shapeKey) { PX.morph(SH.get(key), pick(sc.morph || {}, build)); shapeKey = key; }
      else if (!entered) PX.kick(.16);
      PX.place(pick(sc.place, build) || {});
      PX.bright(pick(sc.bright ?? 1, build));
    }
    HOOKS[s.id]?.(s, build, entered);
    // эффекты для только что открытых шагов
    $$('[data-step].on, [data-step-only].on', s.el).forEach(e => {
      if (e.dataset.fxDone === String(build)) return;
      if (+e.dataset.step === build || +e.dataset.stepOnly === build) {
        e.dataset.fxDone = String(build);
        $$('[data-count]', e).forEach(countUp);
        $$('pre[data-type]', e).concat(e.matches('pre[data-type]') ? [e] : []).forEach(p => typeInto(p, 350));
      }
    });
  }

  function onEnter(s) {
    const t = TERMS[s.id]; if (t && !t.started) setTimeout(() => t.restart(), 700);
    $$('[data-step], [data-step-only]', s.el).forEach(e => delete e.dataset.fxDone);
    $$('.scr', s.el).forEach(e => scramble(e, 420));
    $$('[data-count]', s.el).filter(e => !e.closest('[data-step]')).forEach(e => setTimeout(() => countUp(e), 500));
    $$('pre[data-type]', s.el).filter(e => !e.closest('[data-step]')).forEach(p => typeInto(p, 1300));
  }

  /* хуки конкретных слайдов */
  const HOOKS = {
    ech(s, b) { $$('.st3', s.el).forEach(e => { const k = +e.dataset.stp; e.classList.toggle('cur', k === b); e.classList.toggle('done', k < b); }); }
  };

  /* ───────────── HUD ───────────── */
  function hud() {
    const s = order[cur];
    $('#hud-act').textContent = (ACTS[s.act] || '').split(' · ')[0];
    $('#hud-n').textContent = s.n ? pad(s.n) : '§' + s.sec;
    $('#hud-total').textContent = pad(TOTAL);
    $('#hud-build').textContent = s.builds ? Array.from({ length: s.builds + 1 }, (_, k) => k <= build ? '●' : '○').join('') : '';
    $('#hud-bar').style.width = (order.length > 1 ? cur / (order.length - 1) * 100 : 0) + '%';
    const hf = $('#hud-flow');
    hf.classList.toggle('off', !s.stages.length);
    hf.style.setProperty('--lc', LCOL[s.level] || '#a78bfa');
    $$('i', hf).forEach((i, k) => i.classList.toggle('on', s.stages.includes(k)));
    $('#hud-lvl').textContent = s.stages.length ? stageLabel(s.stages) : '';
  }

  /* ───────────── эффекты ───────────── */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\АБВГДЖЗИКЛМНПРСТФХЦЧШЭЮЯ';
  /* «Расшифровка» заголовка без дёрганья вёрстки: при загрузке каждый символ оборачивается
     в span и замеряется; во время эффекта символы становятся inline-block фиксированной
     ширины — подмена глифа не двигает ни строку, ни соседние элементы. */
  function prepScramble(el) {
    const nodes = []; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) nodes.push(w.currentNode);
    const cells = [];
    nodes.forEach(n => {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const word = document.createElement('span'); word.className = 'scw';
        for (const ch of part) { const c = document.createElement('span'); c.className = 'scc'; c.textContent = ch; word.appendChild(c); cells.push(c); }
        frag.appendChild(word);
      });
      n.replaceWith(frag);
    });
    cells.forEach(c => { c._ch = c.textContent; c._w = c.getBoundingClientRect().width / K; });
    cells.forEach(c => { c.style.width = c._w + 'px'; });
    el._cells = cells;
  }
  function scramble(el, delay = 0) {
    const cells = el._cells; if (!cells || !cells.length) return;
    const total = cells.length, start = performance.now() + delay, dur = 800 + total * 10;
    const tok = (el._tok = (el._tok || 0) + 1);
    cells.forEach(c => { c.textContent = c._ch; c._done = false; });
    el.classList.add('scr-on');
    let lastSwap = 0;
    const tick = now => {
      if (el._tok !== tok) return;
      const t = (now - start) / dur, swap = now - lastSwap > 55; // глифы меняются ~18 раз в секунду, а не каждый кадр
      if (swap) lastSwap = now;
      let done = true;
      cells.forEach((c, i) => {
        if (c._done) return;
        const at = i / total * .75;
        if (t >= at + .25) { c.textContent = c._ch; c._done = true; return; }
        done = false;
        if (swap && t >= at - .1) c.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      });
      if (!done) requestAnimationFrame(tick); else el.classList.remove('scr-on');
    };
    requestAnimationFrame(tick);
  }
  function countUp(el) {
    const to = +el.dataset.count, t0 = performance.now(), d = 1600;
    const f = now => { const t = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - t, 4); el.textContent = Math.round(to * e).toLocaleString('ru-RU'); if (t < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  function typeInto(pre, delay = 0) {
    const nodes = []; const w = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) nodes.push(w.currentNode);
    if (!pre._orig) pre._orig = nodes.map(n => n.textContent);
    const orig = pre._orig, tok = (pre._tok = (pre._tok || 0) + 1);
    nodes.forEach(n => n.textContent = '');
    pre.classList.add('caret');
    let j = 0, c = 0;
    const step = () => {
      if (pre._tok !== tok) return;
      for (let k = 0; k < 3 && j < nodes.length; k++) {
        c++; nodes[j].textContent = orig[j].slice(0, c);
        if (c >= orig[j].length) { j++; c = 0; }
      }
      if (j < nodes.length) setTimeout(step, 14 + Math.random() * 18); else pre.classList.remove('caret');
    };
    setTimeout(step, delay);
  }
  function initTilt() {
    $$('.card').forEach(c => c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) / r.width * 100 + '%');
      c.style.setProperty('--my', (e.clientY - r.top) / r.height * 100 + '%');
    }));
    $$('.tilt').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - .5, dy = (e.clientY - r.top) / r.height - .5;
        c.style.rotate = `${-dy} ${dx} 0 ${Math.hypot(dx, dy) * 14}deg`; c.style.scale = '1.02';
      });
      c.addEventListener('pointerleave', () => { c.style.rotate = ''; c.style.scale = ''; });
    });
    ['.triad', '.cases', '.lims', '.acts'].forEach(s => $$(s).forEach(e => e.style.perspective = '1200px'));
  }

  /* ───────────── чек-лист 25 вопросов (часть Степана) ───────────── */
  function initChecklist() {
    const grid = $('#qgrid'), panel = $('#qpanel'); if (!grid || !window.RQ) return;
    let sel = 0;
    const paint = () => {
      [...grid.children].forEach((c, i) => c.classList.toggle('sel', i === sel));
      const b = RQ.QB[sel];
      panel.innerHTML = `<h4>Блок ${b.n}. ${b.t}</h4><ul>` + b.q.map(x => `<li><span class="star">${RQ.KEY10.includes(x[0]) ? '★' : ''}</span><span class="qid">${x[0]}</span><span>${x[1]}</span></li>`).join('') +
        '</ul><div class="qfoot">★ — ключевой вопрос: его стоит задать обязательно</div>';
    };
    RQ.QB.forEach((b, i) => {
      const d = document.createElement('div');
      const keys = b.q.filter(x => RQ.KEY10.includes(x[0])).length;
      d.className = 'qblock';
      d.innerHTML = `<div class="bn">БЛОК ${b.n}</div><div class="bt">${b.t}</div><div class="bc">${b.q.length} вопр. · <b>${keys}★</b></div>`;
      d.onclick = e => { e.stopPropagation(); sel = i; paint(); };
      grid.appendChild(d);
    });
    paint();
  }

  /* ───────────── терминальные демо ───────────── */
  const TERMS = {};
  function initTerms() {
    if (!window.TERM) return;
    const rq = $('#term-rq'), ech = $('#term-ech');
    if (rq) TERMS['rq-demo'] = TERM.create(rq, RQ.FLOW, { steps: 6, cmd: 'tclaude --skill bi-requirements-gather', qlist: RQ.qlist, tables: RQ.TABLES });
    if (ech) TERMS['ech-demo'] = TERM.create(ech, ECH.FLOW, { steps: 5, cmd: 'tclaude --skill proteus-echarts-builder', tables: ECH.TABLES });
  }

  /* ───────────── QR ───────────── */
  function renderQR() {
    if (typeof qrcode === 'undefined') return;
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    $$('[data-qr]').forEach(el => {
      const url = CONFIG.links[el.dataset.qr];
      if (!url) { el.classList.add('ph'); el.innerHTML = `[СОБРАТЬ] ссылка<small>CONFIG.links.${el.dataset.qr}</small>`; return; }
      const q = qrcode(0, 'M'); q.addData(url); q.make();
      const n = q.getModuleCount(); let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
      el.innerHTML = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path d="${d}" fill="#05060f"/></svg>`;
      el.title = url;
    });
  }

  /* ───────────── картинки: путь из CONFIG или drag&drop (IndexedDB) ───────────── */
  const IDB = {
    db: null,
    open() {
      return new Promise(res => {
        try {
          const r = indexedDB.open('ai-bi-deck', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('shots');
          r.onsuccess = () => res(this.db = r.result); r.onerror = () => res(null);
        } catch (e) { res(null); }
      });
    },
    op(mode, fn) {
      return new Promise(res => {
        if (!this.db) return res(null);
        try { const tx = this.db.transaction('shots', mode), rq = fn(tx.objectStore('shots')); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); }
      });
    },
    get(k) { return this.op('readonly', s => s.get(k)); },
    set(k, v) { return this.op('readwrite', s => s.put(v, k)); },
    del(k) { return this.op('readwrite', s => s.delete(k)); }
  };
  function setShot(el, src) {
    if (!el._ph) el._ph = el.innerHTML;
    if (!src) { el.innerHTML = el._ph; el.classList.remove('has-img'); return; }
    el.innerHTML = ''; const img = new Image(); img.src = src; img.alt = ''; el.appendChild(img); el.classList.add('has-img');
  }
  async function initShots() {
    await IDB.open();
    $$('[data-shot]').forEach(async el => {
      const k = el.dataset.shot, saved = await IDB.get(k);
      if (saved || CONFIG.shots[k]) setShot(el, saved || CONFIG.shots[k]);
      el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag'); });
      el.addEventListener('dragleave', () => el.classList.remove('drag'));
      el.addEventListener('drop', e => {
        e.preventDefault(); el.classList.remove('drag');
        const f = e.dataTransfer.files[0]; if (!f || !f.type.startsWith('image/')) return;
        const fr = new FileReader(); fr.onload = () => { setShot(el, fr.result); IDB.set(k, fr.result); }; fr.readAsDataURL(f);
      });
      el.addEventListener('click', e => { if (e.altKey) { e.stopPropagation(); setShot(el, CONFIG.shots[k] || ''); IDB.del(k); } });
    });
    addEventListener('dragover', e => e.preventDefault());
    addEventListener('drop', e => e.preventDefault());
  }

  /* ───────────── живой виджет (слайд 19), данные синтетические ───────────── */
  function initWidget() {
    const host = $('#w-after'), before = $('#w-before'); if (!host) return;
    let sd = 3; const r = () => (sd = sd * 16807 % 2147483647) / 2147483647;
    const CH = ['Мобильное приложение', 'Веб-сайт', 'Отделения', 'Партнёры', 'Колл-центр', 'Маркетплейсы', 'Реферальная программа', 'Email-рассылки', 'Push-уведомления', 'Соцсети', 'B2B-менеджеры', 'Офлайн-ивенты'];
    const MON = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    const MET = [
      { k: 'rev', name: 'Выручка', unit: 'млн ₽', agg: 'sum' },
      { k: 'cli', name: 'Клиенты', unit: 'тыс.', agg: 'sum' },
      { k: 'conv', name: 'Конверсия', unit: '%', agg: 'avg' }
    ];
    const rows = CH.map((name, i) => {
      const base = 4 + r() * 40 / (1 + i * .25), tr = (r() - .35) * .05, s = {};
      s.rev = MON.map((_, m) => +(base * (1 + tr * m) * (1 + .12 * Math.sin(m / 1.9 + i)) * (.9 + r() * .2)).toFixed(1));
      s.cli = MON.map((_, m) => +(base * 1.7 * (1 + tr * m * .8) * (.88 + r() * .24)).toFixed(1));
      s.conv = MON.map((_, m) => +(2 + r() * 6 + tr * 30 + Math.sin(m / 2 + i) * .6).toFixed(1));
      return { name, s };
    });
    const total = (row, m) => { const v = row.s[m.k]; const sum = v.reduce((a, b) => a + b, 0); return m.agg === 'sum' ? sum : sum / v.length; };
    const delta = (row, m) => { const v = row.s[m.k]; return (v[11] - v[10]) / v[10] * 100; };
    const fmt = v => v.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    let met = MET[0], q = '', sortK = 'total', sortD = -1, page = 0, sel = rows.reduce((a, b) => total(b, MET[0]) > total(a, MET[0]) ? b : a);
    const PER = 7;

    host.innerHTML = `
      <div class="w-top">
        <div class="w-title">Каналы · 2026<small>синтетические данные · иллюстрация</small></div>
        <div class="w-tabs">${MET.map((m, i) => `<button data-m="${i}" class="${i ? '' : 'on'}">${m.name}</button>`).join('')}</div>
        <input class="w-search" placeholder="🔍 поиск канала">
        <button class="w-btn" data-x>⤓ CSV</button>
      </div>
      <div class="w-body">
        <div><table class="w-table"><thead><tr>
          <th data-s="name">Канал</th><th data-s="total">Итого</th><th></th><th>Тренд</th><th data-s="delta">Δ м/м</th>
        </tr></thead><tbody></tbody></table>
        <div class="w-pg"><button data-p="-1">‹</button><span></span><button data-p="1">›</button></div></div>
        <div class="w-drill"><h4></h4><small></small><svg viewBox="0 0 300 300" preserveAspectRatio="none"></svg></div>
      </div>`;
    const tb = $('tbody', host), pg = $('.w-pg span', host), drill = $('.w-drill', host), dsvg = $('svg', drill);
    // столбики drilldown
    dsvg.innerHTML = MON.map((m, i) => `<rect x="${i * 25 + 3}" width="19" rx="3" y="270" height="0" fill="url(#wg)"/><text x="${i * 25 + 12.5}" y="292" font-size="10" fill="#8a90b4" text-anchor="middle" font-family="JetBrains Mono">${m}</text>`).join('') +
      '<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>';
    const spark = v => { const mn = Math.min(...v), mx = Math.max(...v); const pts = v.map((x, i) => `${i / 11 * 86 + 2},${22 - (x - mn) / (mx - mn || 1) * 18}`).join(' '); return `<svg width="90" height="24"><polyline points="${pts}" fill="none" stroke="#a78bfa" stroke-width="1.6"/></svg>`; };

    function render() {
      let list = rows.filter(x => x.name.toLowerCase().includes(q));
      const key = x => sortK === 'name' ? x.name : sortK === 'delta' ? delta(x, met) : total(x, met);
      list.sort((a, b) => { const A = key(a), B = key(b); return (A > B ? 1 : A < B ? -1 : 0) * sortD; });
      const pages = Math.max(1, Math.ceil(list.length / PER)); page = Math.min(page, pages - 1);
      const mx = Math.max(...rows.map(x => total(x, met)));
      tb.innerHTML = list.slice(page * PER, page * PER + PER).map(x => {
        const t = total(x, met), d = delta(x, met);
        return `<tr data-n="${x.name}" class="${x === sel ? 'sel' : ''}"><td>${x.name}</td><td class="v">${fmt(t)}</td>
          <td style="width:110px"><div class="w-bar" style="width:${t / mx * 100}%"></div></td><td>${spark(x.s[met.k])}</td>
          <td class="${d >= 0 ? 'w-up' : 'w-dn'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}%</td></tr>`;
      }).join('') || '<tr><td colspan="5" style="color:#8a90b4">ничего не найдено</td></tr>';
      pg.textContent = `${page + 1} / ${pages}`;
      $('[data-p="-1"]', host).disabled = page === 0; $('[data-p="1"]', host).disabled = page >= pages - 1;
      $$('th', host).forEach(th => th.classList.toggle('sorted', th.dataset.s === sortK));
      renderDrill();
    }
    function renderDrill() {
      const v = sel.s[met.k], mx = Math.max(...v) * 1.1;
      $('h4', drill).textContent = sel.name;
      $('small', drill).textContent = `${met.name}, ${met.unit} · по месяцам · drilldown`;
      $$('rect', dsvg).forEach((rc, i) => { const h = v[i] / mx * 250; rc.style.height = h + 'px'; rc.style.y = (270 - h) + 'px'; });
    }
    host.addEventListener('click', e => {
      e.stopPropagation();
      const t = e.target;
      if (t.dataset.m) { met = MET[+t.dataset.m]; $$('.w-tabs button', host).forEach(b => b.classList.toggle('on', b === t)); render(); }
      else if (t.closest('th[data-s]')) { const k = t.closest('th').dataset.s; sortD = sortK === k ? -sortD : (k === 'name' ? 1 : -1); sortK = k; render(); }
      else if (t.dataset.p) { page += +t.dataset.p; render(); }
      else if (t.closest('tr[data-n]')) { sel = rows.find(x => x.name === t.closest('tr').dataset.n); render(); }
      else if (t.hasAttribute('data-x')) {
        const csv = ['Канал;' + MON.join(';'), ...rows.map(x => x.name + ';' + x.s[met.k].join(';'))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `widget-${met.k}.csv`; a.click();
      }
    });
    $('.w-search', host).addEventListener('input', e => { q = e.target.value.toLowerCase(); page = 0; render(); });
    render();

    // «было»: стандартный столбчатый график из палитры
    const top = rows.slice(0, 8), mx = Math.max(...top.map(x => total(x, MET[0])));
    before.innerHTML = `<svg viewBox="0 0 470 500" width="100%" height="100%">
      <text x="10" y="24" fill="#c3c8e6" font-size="16" font-family="Manrope">Выручка по каналам</text>
      ${[0, 1, 2, 3, 4].map(i => `<line x1="40" x2="460" y1="${440 - i * 90}" y2="${440 - i * 90}" stroke="#2a2f4a"/>`).join('')}
      ${top.map((x, i) => { const h = total(x, MET[0]) / mx * 360; return `<rect x="${52 + i * 51}" y="${440 - h}" width="34" height="${h}" fill="#5470c6"/><text x="${69 + i * 51}" y="462" fill="#6b7299" font-size="11" text-anchor="middle" font-family="Manrope">${x.name.slice(0, 6)}…</text>`; }).join('')}
      <text x="235" y="492" fill="#535a80" font-size="12" text-anchor="middle" font-family="JetBrains Mono">ни поиска, ни сортировки, ни drilldown</text>
    </svg>`;
  }

  /* ───────────── обзор, заметки, справка ───────────── */
  function toggleOverview(force) {
    const ov = $('#overview'), show = force ?? ov.hidden;
    ov.hidden = !show;
    if (!show) return;
    $('#ov-grid').innerHTML = slides.map(s => {
      const c = s.level ? LCOL[s.level] : s.act === 4 ? '#7dd3fc' : '#a78bfa';
      return `<div class="ov-c ${order[cur] === s ? 'cur' : ''} ${order.includes(s) ? '' : 'skip'}" data-id="${s.id}" style="--lc:${c}"><b>${s.n ? pad(s.n) : '§ ' + s.sec}</b><div>${s.title}</div></div>`;
    }).join('');
  }
  $('#ov-grid').addEventListener('click', e => { const c = e.target.closest('.ov-c'); if (c) { toggleOverview(false); gotoId(c.dataset.id); } });
  function showNotes() {
    const p = $('#notes-pop'); if (p.hidden) return;
    const s = order[cur]; p.innerHTML = `<b>Заметки · ${s.title}</b>` + s.notes.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  /* ───────────── синхронизация с пультом ───────────── */
  let presWin = null; let bc = null;
  try { bc = new BroadcastChannel('ai-bi-deck'); } catch (e) { /* нет поддержки */ }
  const post = msg => { try { presWin && !presWin.closed && presWin.postMessage(msg, '*'); } catch (e) { } try { bc && bc.postMessage(msg); } catch (e) { } };
  function sync() { showNotes(); if (!PRESENTER) post({ type: 'state', id: order[cur].id, build, short }); }
  let lastMid = 0;
  function onMsg(m) {
    if (!m || PRESENTER || (m.mid && m.mid === lastMid)) return;
    lastMid = m.mid;
    if (m.type === 'nav') m.dir > 0 ? next() : prev();
    if (m.type === 'goto') gotoId(m.id, m.build || 0);
    if (m.type === 'hello') sync();
  }

  /* ───────────── клавиатура / мышь ───────────── */
  let gotoBuf = '', gotoT;
  function key(e) {
    if (e.target.closest('input, textarea')) return;
    const k = e.key;
    // терминальные демо: ↑ ↓ ⏎ цифры R уходят в терминал
    const term = order[cur] && TERMS[order[cur].id];
    if (term && !gotoBuf && term.key(k)) { e.preventDefault(); return; }
    if (k === 'l' || k === 'L' || k === 'д' || k === 'Д') { PX.setLite && PX.setLite(!PX.lite); return; }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k) && !(k === 'Enter' && gotoBuf)) { e.preventDefault(); next(); return; }
    if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); return; }
    if (k === 'Home') return go(0);
    if (k === 'End') return go(order.length - 1);
    if (/^\d$/.test(k)) {
      gotoBuf += k; const g = $('#goto'); g.hidden = false; g.textContent = gotoBuf;
      clearTimeout(gotoT); gotoT = setTimeout(() => { gotoBuf = ''; g.hidden = true; }, 2000); return;
    }
    if (k === 'Enter' && gotoBuf) {
      const s = slides.find(x => x.n === +gotoBuf); gotoBuf = ''; $('#goto').hidden = true; if (s) gotoId(s.id); return;
    }
    const lk = k.toLowerCase();
    if (lk === 'o' || lk === 'щ' || (k === 'Escape' && $('#help').hidden)) return toggleOverview(k === 'Escape' ? false : undefined);
    if (k === 'Escape') { $('#help').hidden = true; return; }
    if (lk === 'f' || lk === 'а') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); return; }
    if (lk === 'b' || lk === 'и' || k === '.') { $('#black').classList.toggle('on'); return; }
    if (lk === 'n' || lk === 'т') { const p = $('#notes-pop'); p.hidden = !p.hidden; showNotes(); return; }
    if (lk === 'h' || lk === 'р' || k === '?') { $('#help').hidden = !$('#help').hidden; return; }
    if (lk === 'k' || lk === 'л') {
      const s = order[cur]; short = !short; store.set('short', short ? '1' : '0'); rebuildOrder();
      let i = order.indexOf(s); if (i < 0) i = order.findIndex(x => slides.indexOf(x) > slides.indexOf(s));
      cur = -1; go(i < 0 ? order.length - 1 : i, 0, { fast: true }); return;
    }
    if (lk === 'p' || lk === 'з') {
      presWin = window.open(location.href.split('#')[0] + '#presenter', 'ai-bi-presenter', 'width=1200,height=820');
      setTimeout(sync, 800); return;
    }
  }

  function initInput() {
    addEventListener('keydown', key);
    addEventListener('message', e => onMsg(e.data));
    if (bc) bc.onmessage = e => onMsg(e.data);
    let idleT;
    addEventListener('pointermove', e => {
      document.body.classList.remove('idle');
      const [x, y] = toStagePt(e.clientX, e.clientY); PX.mouse(x, y, true);
      clearTimeout(idleT); idleT = setTimeout(() => { document.body.classList.add('idle'); PX.mouse(x, y, false); }, 2500);
    });
    document.addEventListener('pointerleave', () => PX.mouse(0, 0, false));
    $('#stage').addEventListener('click', e => {
      if (e.target.closest('a, button, input, .widget, .term, .qblock, [data-shot], .qr')) return;
      if (getSelection().toString()) return;
      next();
    });
    $('#black').addEventListener('click', () => $('#black').classList.remove('on'));
    $('#help').addEventListener('click', () => { $('#help').hidden = true; });
    addEventListener('resize', fit);
    addEventListener('wheel', (() => { let t = 0; return e => { if (e.target.closest('.ov, .notes-pop, .term-body, .qpanel')) return; const n = Date.now(); if (n - t < 700 || Math.abs(e.deltaY) < 30) return; t = n; e.deltaY > 0 ? next() : prev(); }; })(), { passive: true });
  }

  /* ───────────── пульт спикера (отдельное окно) ───────────── */
  function presenter() {
    document.body.classList.add('presenter');
    $('#presenter').hidden = false;
    document.title = 'Пульт · AI в BI';
    let st = { id: slides[0].id, build: 0, short: false };
    let t0 = 0, acc = 0, runT = false;
    // один канал на сообщение, иначе главное окно получит команду дважды
    const send = m => { m.mid = Math.random(); try { if (window.opener && !window.opener.closed) return window.opener.postMessage(m, '*'); } catch (e) { } try { bc && bc.postMessage(m); } catch (e) { } };
    const listEl = $('#pr-list');
    listEl.innerHTML = slides.map(s => `<li data-id="${s.id}"><span>${s.n ? pad(s.n) : '§' + s.sec}</span>${s.title}</li>`).join('');
    listEl.addEventListener('click', e => { const li = e.target.closest('li'); if (li) send({ type: 'goto', id: li.dataset.id }); });
    function render() {
      const s = slides.find(x => x.id === st.id) || slides[0];
      const ord = slides.filter(x => !st.short || x.short), i = ord.indexOf(s), nx = ord[i + 1];
      $('#pr-num').textContent = (s.n ? 'Слайд ' + pad(s.n) : 'Раздел ' + s.sec) + ' · ' + (ACTS[s.act] || '');
      $('#pr-builds').textContent = s.builds ? `шаг ${st.build} из ${s.builds} · ещё кликов на слайде: ${s.builds - st.build}` : '';
      $('#pr-stitle').textContent = s.title;
      $('#pr-notes').textContent = s.notes;
      const nxt = nx ? (nx.n ? pad(nx.n) + ' · ' : '§' + nx.sec + ' · ') + nx.title : '— конец —';
      $('#pr-next').textContent = st.build < s.builds ? 'ещё шаг на этом слайде, затем: ' + nxt : nxt;
      $$('li', listEl).forEach(li => { li.classList.toggle('cur', li.dataset.id === s.id); li.classList.toggle('skip', st.short && !slides.find(x => x.id === li.dataset.id).short); });
      $('li.cur', listEl)?.scrollIntoView({ block: 'nearest' });
    }
    function onM(m) { if (m && m.type === 'state') { st = m; render(); } }
    addEventListener('message', e => onM(e.data));
    if (bc) bc.onmessage = e => onM(e.data);
    addEventListener('keydown', e => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); send({ type: 'nav', dir: 1 }); }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); send({ type: 'nav', dir: -1 }); }
    });
    $('#pr-fwd').onclick = () => send({ type: 'nav', dir: 1 });
    $('#pr-prev').onclick = () => send({ type: 'nav', dir: -1 });
    $('#pr-start').onclick = () => { if (runT) { acc += Date.now() - t0; runT = false; $('#pr-start').textContent = '▶ старт'; } else { t0 = Date.now(); runT = true; $('#pr-start').textContent = '❚❚ пауза'; } };
    $('#pr-reset').onclick = () => { acc = 0; t0 = Date.now(); };
    const mmss = ms => { const s = Math.floor(Math.abs(ms) / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
    setInterval(() => {
      const el = Math.floor((acc + (runT ? Date.now() - t0 : 0)) / 1000) * 1000, budget = (st.short ? 15 : CONFIG.durationMin) * 60000, left = budget - el;
      $('#pr-elapsed').textContent = mmss(el);
      const l = $('#pr-left'); l.textContent = left >= 0 ? 'осталось ' + mmss(left) : 'перебор ' + mmss(left); l.classList.toggle('over', left < 0);
      $('#pr-clock').textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }, 250);
    render(); send({ type: 'hello' });
  }

  /* ───────────── старт ───────────── */
  async function boot() {
    if (PRESENTER) return presenter();
    fit();
    try { await Promise.all([document.fonts.load('800 100px Unbounded'), document.fonts.load('600 60px Unbounded'), document.fonts.ready]); } catch (e) { /* шрифты не критичны */ }
    PX.init($('#gl'));
    let toastT;
    PX.onLite = on => { const t = $('#toast'); t.textContent = on ? 'лёгкий режим частиц · L — вернуть полный' : 'полный режим частиц'; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); };
    prepare(); initInput();
    const m = location.hash.match(/^#\/([\w-]+)(?:\/(\d+))?/);
    let i = 0, b = 0;
    if (m) { i = order.findIndex(s => s.id === m[1]); if (i < 0) i = 0; b = +(m[2] || 0); }
    go(i, b);
    // ручная смена адреса (#/id/шаг) — переход без перезагрузки
    addEventListener('hashchange', () => { const h = location.hash.match(/^#\/([\w-]+)(?:\/(\d+))?/); if (h) gotoId(h[1], +(h[2] || 0)); });
    // прогреваем все формы заранее, чтобы на выступлении не было подтормаживаний
    if (PX.ready) {
      const keys = [...new Set(Object.values(SCENES).flatMap(s => [].concat(s.shape)))];
      const warm = () => { const k = keys.shift(); if (!k) return; SH.get(k); setTimeout(warm, 60); };
      setTimeout(warm, 3500);
    }
  }
  boot();
})();
