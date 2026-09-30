/* ============================================================================
   demos.js — интерактивные терминалы и данные для части про скиллы
   • TERM.create(el, flow, opts) — терминал с ветвлениями (выбор ↑ ↓ ⏎, цифрами или мышью)
   • RQ — чек-лист 25 вопросов и сценарий скилла bi-requirements-gather (часть Степана)
   • ECH — сценарий скилла proteus-echarts-builder (иллюстрация)
   ========================================================================== */
(function () {
  'use strict';

  /* ───────────── движок терминала ───────────── */
  function create(root, FLOW, opts = {}) {
    const body = root.querySelector('.term-body');
    const total = opts.steps || 6;
    const slow = opts.slow || 1.5; // Стёпа просил помедленнее
    const bar = s => '▓'.repeat(s) + '░'.repeat(total - s);
    let queue = [], pend = null, optIdx = 0, skipping = false, timer = null, started = false;

    const scroll = () => { body.scrollTop = body.scrollHeight; };
    function line(html, cls) {
      const d = document.createElement('div');
      d.className = 'tline ' + (cls || ''); d.innerHTML = html;
      body.appendChild(d); scroll(); return d;
    }
    function table(t) {
      const d = document.createElement('div'); d.className = 'tline';
      d.innerHTML = '<table class="ttab"><thead><tr>' + t.head.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>' +
        t.rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
      body.appendChild(d); scroll();
    }
    function ask(b) {
      pend = b; optIdx = 0;
      const box = document.createElement('div');
      box.className = 'tline ask';
      box.innerHTML = '<div class="aq-top">?  выбор — ' + b.h + '</div><div class="aq-q">' + b.q + '</div>' +
        b.o.map((o, i) => '<div class="opt' + (i ? '' : ' sel') + '" data-i="' + i + '"><span class="car">' + (i ? ' ' : '❯') + '</span>' +
          '<span class="ob"><span class="ol">' + (i + 1) + '. ' + o.l + '</span><br><span class="od">' + o.d + '</span></span></div>').join('') +
        '<div class="hint">↑/↓ — навигация · Enter — выбор · или кликните мышью</div>';
      body.appendChild(box); scroll();
      box.querySelectorAll('.opt').forEach(el => {
        el.onmouseenter = () => { optIdx = +el.dataset.i; paint(); };
        el.onclick = e => { e.stopPropagation(); optIdx = +el.dataset.i; choose(); };
      });
      b._box = box;
    }
    function paint() {
      if (!pend) return;
      pend._box.querySelectorAll('.opt').forEach((el, i) => {
        el.classList.toggle('sel', i === optIdx);
        el.querySelector('.car').textContent = i === optIdx ? '❯' : ' ';
      });
    }
    function choose() {
      if (!pend) return;
      const b = pend, o = b.o[optIdx];
      b._box.querySelectorAll('.opt').forEach((el, i) => { if (i !== optIdx) el.style.display = 'none'; else { el.onclick = null; el.onmouseenter = null; el.style.cursor = 'default'; } });
      b._box.querySelector('.hint').remove();
      pend = null;
      line('выбрано: <b>' + o.l + '</b>', 't-user'); line('', 't-blank');
      timer = setTimeout(() => run(o.n), 380);
    }
    function delay(b) {
      if (skipping) return 0;
      const d = { blank: 60, d: 170, ql: 600, tab: 560, a: 520, warn: 520 }[b.k] ?? 300;
      return d * slow;
    }
    function type(txt, done) {
      const el = line('', 't-user');
      if (skipping) { el.innerHTML = txt; done(); return; }
      let i = 0;
      (function tick() {
        el.innerHTML = txt.slice(0, i) + '<span class="tcaret"></span>'; scroll(); i++;
        if (i <= txt.length) timer = setTimeout(tick, 24 * slow); else { el.innerHTML = txt; done(); }
      })();
    }
    function next() {
      if (!queue.length) { skipping = false; return; }
      const b = queue.shift();
      switch (b.k) {
        case 'a': line(b.x, 't-assist'); break;
        case 'p': line(b.x); break;
        case 'd': line(b.x, 't-dim'); break;
        case 'ok': line(b.x, 't-ok'); break;
        case 'warn': line(b.x, 't-warnline'); break;
        case 'path': line(b.x, 't-path'); break;
        case 'blank': line('', 't-blank'); break;
        case 'bar': line('Шаг ' + b.s + ' из ' + total + ': ' + b.t, 't-bar'); line(bar(b.s), 't-prog'); line('', 't-blank'); break;
        case 'ql': (opts.qlist ? opts.qlist(b.mode) : []).forEach(l => line(l, 'qline')); break;
        case 'tab': table(opts.tables[b.d]); break;
        case 'u': type(b.x, () => { timer = setTimeout(next, 330 * slow); }); return;
        case 'go': run(b.n); return;
        case 'ask': ask(b); return;
      }
      timer = setTimeout(next, delay(b));
    }
    function run(key) { queue = FLOW[key].slice(); next(); }
    function restart() {
      clearTimeout(timer); queue = []; pend = null; skipping = false; started = true;
      body.innerHTML = '';
      line('$ ' + (opts.cmd || 'tclaude'), 't-dim'); line('', 't-blank');
      timer = setTimeout(() => run('start'), 600);
    }
    root.querySelectorAll('.term-bar button').forEach(b => {
      b.onclick = e => {
        e.stopPropagation();
        if (b.dataset.act === 'restart') restart();
        else { skipping = true; clearTimeout(timer); next(); }
      };
    });
    return {
      restart,
      get started() { return started; },
      // возвращает true, если клавиша ушла в терминал
      key(k) {
        if (k === 'r' || k === 'R' || k === 'к' || k === 'К') { restart(); return true; }
        // стрелки ↑ ↓ и Enter на слайде с терминалом никогда не листают презентацию
        if (!pend) return ['ArrowUp', 'ArrowDown', 'Enter'].includes(k);
        if (k === 'ArrowDown') { optIdx = (optIdx + 1) % pend.o.length; paint(); return true; }
        if (k === 'ArrowUp') { optIdx = (optIdx - 1 + pend.o.length) % pend.o.length; paint(); return true; }
        if (k === 'Enter') { choose(); return true; }
        if (/^[1-9]$/.test(k) && +k <= pend.o.length) { optIdx = +k - 1; paint(); choose(); return true; }
        return false;
      }
    };
  }

  /* ───────────── чек-лист требований (Степан) ───────────── */
  const KEY10 = ['Q1.1', 'Q1.2', 'Q2.1', 'Q3.1', 'Q3.4', 'Q4.1', 'Q5.1', 'Q5.2', 'Q7.1', 'Q7.3'];
  const QB = [
    { n: 1, t: 'Цель и контекст', q: [
      ['Q1.1', 'Какую бизнес-задачу решает дашборд? Какое решение будет приниматься на его основе?', 'full'],
      ['Q1.2', 'Что происходит сейчас без дашборда? В чём боль?', 'part'],
      ['Q1.3', 'Как поймём, что дашборд успешен? (критерий успеха)', 'none']] },
    { n: 2, t: 'Аудитория и роли', q: [
      ['Q2.1', 'Кто основные пользователи? Роли/должности?', 'full'],
      ['Q2.2', 'Кто заказчик и спонсор? Кто принимает финальное решение по приёмке?', 'full'],
      ['Q2.3', 'Как часто и в каком контексте смотрят? (ежедневно/еженедельно, планёрка/самостоятельно)', 'part'],
      ['Q2.4', 'С какого устройства? (десктоп / мобайл / ТВ-панель)', 'none']] },
    { n: 3, t: 'Метрики и показатели', q: [
      ['Q3.1', 'Какие ключевые KPI/метрики нужны?', 'full'],
      ['Q3.2', 'Формула расчёта каждой метрики?', 'part'],
      ['Q3.3', 'Целевые/плановые значения, бенчмарки?', 'part'],
      ['Q3.4', 'На какие вопросы должен отвечать дашборд? Какой главный вопрос должен закрывать дашборд одним взглядом?', 'full']] },
    { n: 4, t: 'Разрезы и фильтры', q: [
      ['Q4.1', 'По каким измерениям смотреть? (регион, продукт, менеджер, канал…)', 'part'],
      ['Q4.2', 'Нужные фильтры и их значения по умолчанию?', 'none'],
      ['Q4.3', 'Глубина детализации (drill-down до какого уровня)?', 'none'],
      ['Q4.4', 'Период по умолчанию и доступные периоды сравнения (YoY, MoM)?', 'none']] },
    { n: 5, t: 'Источники данных', q: [
      ['Q5.1', 'Из каких систем берутся данные?', 'none'],
      ['Q5.2', 'Требуемая частота обновления? (real-time / раз в час / раз в сутки)', 'part'],
      ['Q5.3', 'Глубина исторических данных?', 'part'],
      ['Q5.4', 'Известные проблемы качества/полноты данных?', 'none']] },
    { n: 6, t: 'Визуализация и UX', q: [
      ['Q6.1', 'Предпочтительные типы визуализаций? Есть ли референсы?', 'full'],
      ['Q6.2', 'Приоритет элементов на экране (что важнее всего сверху)?', 'part'],
      ['Q6.3', 'Формат вывода/выгрузки (экспорт в Excel, PDF, рассылка)?', 'full']] },
    { n: 7, t: 'Ограничения', q: [
      ['Q7.1', 'Требования к доступам и разграничению прав (row-level security)?', 'part'],
      ['Q7.2', 'Требования безопасности / конфиденциальности данных?', 'none'],
      ['Q7.3', 'Срок готовности (deadline)?', 'none']] }
  ];
  function qlist(mode) {
    const out = [];
    QB.forEach(b => {
      out.push('<span class="bhead">Блок ' + b.n + '. ' + b.t + '</span>');
      b.q.forEach(x => {
        const star = KEY10.includes(x[0]);
        let pre;
        if (mode === 'new') pre = star ? '  <span class="m-star">✓</span> ' : '    ';
        else {
          const m = x[2] === 'full' ? '<span class="m-full">●</span>' : x[2] === 'part' ? '<span class="m-part">◐</span>' : '<span class="m-none">○</span>';
          pre = (star ? '  <span class="m-star">★</span> ' : '    ') + m + ' ';
        }
        out.push(pre + '<span class="qid">' + x[0] + '</span> ' + x[1]);
      });
    });
    return out;
  }
  const CR = '<span class="c-crit">🔴 Критично</span>', WA = '<span class="c-warn">🟡 Желательно</span>';
  const RQ_TABLES = {
    GAPS1: { head: ['Приоритет', 'Вопрос', 'Чего не хватает'], rows: [
      [CR, 'Q5.1 Источники данных', 'не названы системы-источники (откуда данные обзвона, затрат, времени звонков)'],
      [WA, 'Q1.2 Боль / контекст', 'есть частичный ответ — «неинформативный дашборд»; нужна конкретика'],
      [WA, 'Q4.1 Разрезы', 'есть частичный ответ (по сотруднику); другие измерения не оговорены'],
      [WA, 'Q5.2 Частота обновления', 'единоразовый / регулярная рассылка; интервал не задан'],
      [WA, 'Q7.1 Доступы', 'сотрудник видит себя; полное разграничение прав не описано'],
      [WA, 'Q7.3 Срок готовности', 'не указан deadline']] },
    GAPS2: { head: ['Приоритет', 'Вопрос', 'Чего не хватает'], rows: [
      [CR, 'Q5.1 Источники данных', 'не названы системы-источники'],
      [WA, 'Q5.2 Частота обновления', '<span class="c-serious">противоречие источников</span> (единоразовый отчёт vs динамика в течение акции)'],
      [WA, 'Q7.1 Доступы', 'полное разграничение прав не описано'],
      [WA, 'Q7.3 Срок готовности', 'не указан deadline']] }
  };
  const SET = [
    { l: 'Взять предложенный набор — 10 отмеченных вопросов', d: 'Сокращённый набор для небольшого дашборда' },
    { l: 'Взять все 25 вопросов', d: 'Полный чек-лист' },
    { l: 'Настроить по блокам', d: 'Отметить нужные вопросы по блокам вручную' }];
  const RQ_FLOW = {
    start: [
      { k: 'a', x: 'Помогу собрать требования к BI-дашборду небольшими шагами и сохранить прогресс.' },
      { k: 'blank' },
      { k: 'bar', s: 1, t: 'Старт' },
      { k: 'p', x: 'Укажи путь к рабочей папке, где сохранить прогресс и итоговый файл.' },
      { k: 'u', x: '~/projects/obzvon' },
      { k: 'ok', x: 'Созданы input/ и output/ · запись проверена · сохранённой сессии не найдено' },
      { k: 'blank' },
      { k: 'ask', h: 'Старт', q: 'Что у тебя есть на старте?', o: [
        { l: 'Новый дашборд', d: 'Материалов пока нет', n: 'newA' },
        { l: 'Уже есть материалы', d: 'Транскрипт, заметки, бриф', n: 'matA' }] }],
    newA: [
      { k: 'bar', s: 2, t: 'Выбор набора' },
      { k: 'p', x: 'Ниже — весь чек-лист из 25 вопросов по 7 блокам. ✓ отмечены десять ключевых.' },
      { k: 'blank' }, { k: 'ql', mode: 'new' }, { k: 'blank' },
      { k: 'p', x: 'Отмеченные ✓ — сокращённый набор для небольшого дашборда. Можно взять его, пройти все вопросы или настроить набор по блокам.' },
      { k: 'ask', h: 'Набор', q: 'Как будем собирать требования?', o: SET.map(o => ({ ...o, n: 'newB' })) }],
    newB: [
      { k: 'bar', s: 3, t: 'Подготовка и сбор' },
      { k: 'ok', x: 'Интервью-гайд собран только из выбранных вопросов:' },
      { k: 'path', x: '~/projects/obzvon/output/Вопросы_для_интервью_Эффективность_обзвона.md' },
      { k: 'p', x: 'Можно идти с ним на встречу. Вернись с чем угодно: файл, транскрипт, заметки, текст в чат или ответы прямо здесь.' },
      { k: 'blank' },
      { k: 'd', x: '— ожидание — прогресс в output/state.json, можно вернуться хоть через неделю —' },
      { k: 'blank' },
      { k: 'u', x: 'input/interview_raw.txt  # вернулся со встречи, транскрипт 38 мин' },
      { k: 'a', x: 'Материалы получены и разобраны по выбранным вопросам. Неотвеченные переходят в проверку пробелов.' },
      { k: 'go', n: 'step4' }],
    matA: [
      { k: 'bar', s: 2, t: 'Материалы и разбор' },
      { k: 'p', x: 'Передай материалы любым способом: загрузи файл, вставь текст в чат или укажи путь.' },
      { k: 'u', x: 'input/interview_raw.txt  # транскрипт встречи с владельцем продукта, 38 мин' },
      { k: 'ok', x: 'Сохранено в input/ · active_source зафиксирован' },
      { k: 'blank' },
      { k: 'a', x: 'Материал разобран по всем 25 вопросам чек-листа: по каждому проверено, есть ли ответ и достаточно ли его для проектирования дашборда.' },
      { k: 'blank' },
      { k: 'p', x: 'Сводка: закрыто полностью — <b class="c-good">7</b>, частично — <b class="c-warn">9</b>, пусто — <b class="c-none">9</b>.' },
      { k: 'blank' },
      { k: 'bar', s: 3, t: 'Набор вопросов' },
      { k: 'ql', mode: 'mat' }, { k: 'blank' },
      { k: 'd', x: '● ответ есть · ◐ частичный, нужна конкретика · ○ в материалах ничего нет · ★ входит в предложенный набор из 10 ключевых' },
      { k: 'blank' },
      { k: 'p', x: 'Часть вопросов уже закрыта материалами. Выбери, какой набор считаем обязательным: по нему будет считаться заполненность и проверка пробелов.' },
      { k: 'ask', h: 'Набор', q: 'Как будем собирать требования?', o: SET.map(o => ({ ...o, n: 'step4' })) }],
    step4: [
      { k: 'bar', s: 4, t: 'Проверка пробелов' },
      { k: 'd', x: 'Проверка пробелов — сравнение того, что мы хотели узнать, с тем, что реально удалось узнать.' },
      { k: 'd', x: 'Ответа достаточно → пробела нет. Ответ есть, но не хватает конкретики → пробел. Ответа нет → пробел.' },
      { k: 'd', x: 'Вопрос не выбирали → он не участвует в проверке. Цель — не формальные 100%, а понимание, чего не хватает.' },
      { k: 'blank' },
      { k: 'p', x: '<span class="c-crit">🔴 1</span> / <span class="c-warn">🟡 5</span>' },
      { k: 'tab', d: 'GAPS1' },
      { k: 'ask', h: 'Пробелы', q: 'Что сделать дальше?', o: [
        { l: 'Уточнить открытые вопросы сейчас', d: 'Добавить материал или ответить в диалоге', n: 'clarify' },
        { l: 'Сформировать черновой артефакт для доуточнения', d: 'Забрать список открытых вопросов и вернуться позже', n: 'draft' },
        { l: 'Продолжить без уточнений', d: 'Перенести пробелы в «Открытые вопросы» и перейти к финалу', n: 'step5' }] }],
    clarify: [
      { k: 'ask', h: 'Способ', q: 'Как хочешь уточнять?', o: [
        { l: 'Добавить новый материал', d: 'Файл, транскрипт, заметки или текст', n: 'more' },
        { l: 'Ответить на вопросы отдельно', d: 'По одному, сначала все 🔴', n: 'more2' }] }],
    more: [
      { k: 'u', x: 'заметки_после_уточняющего_звонка.md' },
      { k: 'a', x: 'Второй материал разобран и объединён с первым. Q1.2 (боль) и Q4.1 (разрезы) стали достаточными. Добавлены: формула эффективности, план 50%, состав фильтров, типы визуализаций.' },
      { k: 'warn', x: 'Противоречие источников по частоте обновления: «единоразовый отчёт» vs «динамика в течение длительной акции». Версию не выбираю — выношу в открытые вопросы.' },
      { k: 'blank' },
      { k: 'p', x: '<span class="c-crit">🔴 1</span> / <span class="c-warn">🟡 3</span>' },
      { k: 'tab', d: 'GAPS2' },
      { k: 'ask', h: 'Пробелы', q: 'Что сделать дальше?', o: [
        { l: 'Перейти к итоговому документу', d: 'Оставшиеся пробелы уедут в «Открытые вопросы»', n: 'step5' },
        { l: 'Ещё уточнить открытые вопросы', d: 'Ответить на оставшиеся', n: 'more2' }] }],
    more2: [
      { k: 'a', x: 'Задаю только реальные пробелы, сначала критичные. По одному.' },
      { k: 'blank' },
      { k: 'p', x: '<span class="c-crit">🔴</span> Q5.1 Из каких систем берутся данные?' },
      { k: 'u', x: 'не знаю, надо спрашивать у дата-инженеров' },
      { k: 'ok', x: 'Принято. Вопрос остаётся открытым, в ответ ничего не дописываю. Не настаиваю.' },
      { k: 'blank' },
      { k: 'p', x: '<span class="c-crit">🔴 1</span> / <span class="c-warn">🟡 3</span>' },
      { k: 'ask', h: 'Пробелы', q: 'Что сделать дальше?', o: [
        { l: 'Перейти к итоговому документу', d: 'Пробелы уедут в «Открытые вопросы»', n: 'step5' },
        { l: 'Сформировать черновик для доуточнения', d: 'Вернуться к этому позже', n: 'draft' }] }],
    draft: [
      { k: 'ok', x: 'Черновик для доуточнения готов:' },
      { k: 'path', x: '~/projects/obzvon/output/Черновик_для_доуточнения_Эффективность_обзвона.md' },
      { k: 'p', x: 'Открытые вопросы вынесены отдельно. Принесёшь уточнения — обновлю ответы, пересчитаю пробелы и доработаю артефакт.' },
      { k: 'ask', h: 'Пробелы', q: 'Что дальше?', o: [
        { l: 'Добавить уточнения сейчас', d: 'Второй материал после звонка', n: 'more' },
        { l: 'Перейти к итоговому документу', d: 'Зафиксировать как есть', n: 'step5' }] }],
    step5: [
      { k: 'bar', s: 5, t: 'Итоговый артефакт' },
      { k: 'p', x: 'Собираю документ только из реально собранной информации.' },
      { k: 'warn', x: 'Статус: Черновик. «Готово к проектированию» присвоить нельзя — остался критичный пробел Q5.1.' },
      { k: 'ok', x: 'Сохранено:' },
      { k: 'path', x: '~/projects/obzvon/output/Требования_Эффективность_обзвона.md' },
      { k: 'd', x: 'заполненность выбранного набора 60% (6/10) · открытых вопросов 4 · находок вне набора 12' },
      { k: 'go', n: 'step6' }],
    step6: [
      { k: 'blank' },
      { k: 'bar', s: 6, t: 'Завершение' },
      { k: 'a', x: 'Сбор требований завершён. Прогресс сохранён в output/state.json — сессию можно продолжить позже.' },
      { k: 'ask', h: 'Дальше', q: 'Что сделать следующим шагом?', o: [
        { l: 'A. Уточнить открытые вопросы', d: 'Закрыть критичный пробел — источники данных', n: 'clarify' },
        { l: 'B. Создать задачу', d: 'Задача по реализации дашборда', n: 'endB' },
        { l: 'C. Сгенерировать прототип', d: 'Передать артефакт в skill bi-analyst-prototype', n: 'endC' },
        { l: 'D. Ничего, работа завершена', d: 'Завершить сценарий', n: 'endD' }] }],
    endB: [{ k: 'ok', x: 'Задача создана из артефакта требований.' }, { k: 'go', n: 'endD' }],
    endC: [{ k: 'ok', x: 'Передаю сохранённый артефакт в skill bi-analyst-prototype как входные требования.' }, { k: 'go', n: 'endD' }],
    endD: [
      { k: 'blank' },
      { k: 'a', x: 'Готово. Удачи с дашбордом.' },
      { k: 'd', x: 'сессия завершена · R или «⟲ заново» — пройти ещё раз, ветка может быть другой' }]
  };

  /* ───────────── proteus-echarts-builder (иллюстрация сценария) ───────────── */
  const ECH_TABLES = {
    MAP: { head: ['Элемент макета', 'Поле в data', 'Статус'], rows: [
      ['KPI «Выручка»', 'revenue', '<span class="c-good">✓</span>'],
      ['KPI «Клиенты»', 'clients', '<span class="c-good">✓</span>'],
      ['Сводная · канал', 'channel', '<span class="c-good">✓</span>'],
      ['График · месяц', 'month', '<span class="c-good">✓</span>'],
      ['KPI «Конверсия»', '—', '<span class="c-warn">нет поля в SQL</span>']] }
  };
  const ECH_FLOW = {
    start: [
      { k: 'a', x: 'Соберу интерактивный виджет для Proteus. Работаем по шагам — сессией управляют слова-команды.' },
      { k: 'd', x: 'ШАГ 1 · ШАГ 2 · СБОРКА · СДАЧА · ВОЗОБНОВИ · ПРАВКА' },
      { k: 'blank' },
      { k: 'bar', s: 1, t: 'Болванки и вход' },
      { k: 'u', x: '/proteus-echarts-builder ШАГ 1 ~/projects/channels' },
      { k: 'ok', x: 'bootstrap.py → 5 болванок: channels.html · .data.sql · .chart.js · .NOTES.md · FIELDS.md' },
      { k: 'p', x: 'Стоп: пришлите HTML-макет и ссылку на график Proteus — SQL соберу сам через MCP.' },
      { k: 'blank' },
      { k: 'u', x: '/proteus-echarts-builder ШАГ 2' },
      { k: 'ask', h: 'Данные', q: 'Откуда брать SQL для виджета?', o: [
        { l: 'Ссылка на график Proteus', d: 'query-логика чарта через MCP: groupby, метрики, фильтры', n: 'link' },
        { l: 'Готовый SQL-файл', d: 'Перезапишу болванку channels.data.sql', n: 'both' }] }],
    link: [
      { k: 'ok', x: 'MCP Proteus → proteus_chart_logic: groupby · метрики · фильтры → собран channels.data.sql' },
      { k: 'go', n: 'scan' }],
    both: [
      { k: 'u', x: 'input/query.sql' },
      { k: 'ok', x: 'SQL разобран: колонки запроса → поля глобального массива data' },
      { k: 'go', n: 'scan' }],
    scan: [
      { k: 'ok', x: 'Макет прочитан по плану сканера: шапка, 3 KPI-карточки, сводная, график по месяцам' },
      { k: 'ok', x: 'Реестр и диапазоны → NOTES.md; колонки SQL → NOTES §3. Макет больше не нужен.' },
      { k: 'p', x: 'План сборки — в чате, жду «да». NOTES переживёт обрыв сессии: продолжение — ВОЗОБНОВИ.' },
      { k: 'blank' },
      { k: 'bar', s: 2, t: 'Сверка макета с данными' },
      { k: 'tab', d: 'MAP' },
      { k: 'warn', x: 'KPI «Конверсия»: поля в SQL нет. Колонку не придумываю — спрашиваю.' },
      { k: 'ask', h: 'Пробел', q: 'Что делаем с «Конверсией»?', o: [
        { l: 'Посчитать в JS из сырых полей', d: 'conversion = converted / clients — доля в buildModel, SQL не трогаем', n: 'formula' },
        { l: 'Добавить поле в Proteus руками', d: 'Колонку в «Измерения» чарта — потом SQL пересоберу через MCP', n: 'addfield' },
        { l: 'Убрать KPI из виджета', d: 'Элемент сдаю открытым пунктом в NOTES', n: 'build' }] }],
    formula: [
      { k: 'ok', x: 'Принято: SQL остаётся сырым, доля считается в JS (buildModel). Решение — в NOTES §4.' },
      { k: 'go', n: 'build' }],
    addfield: [
      { k: 'p', x: 'Поле добавлено вами в «Измерения» чарта — само в data оно не приедет.' },
      { k: 'ok', x: 'SQL пересобран через MCP: «Конверсия» теперь в данных' },
      { k: 'go', n: 'build' }],
    build: [
      { k: 'u', x: '/proteus-echarts-builder СБОРКА' },
      { k: 'bar', s: 3, t: 'Сборка JS — блоками' },
      { k: 'd', x: 'eCharts — пустой холст: отрисовка — HTML/CSS/SVG поверх массива data' },
      { k: 'ok', x: 'блоки 1–2 · node --check OK · NOTES §5: DONE' },
      { k: 'ok', x: 'блоки 3–7 · node --check OK · NOTES §5: DONE' },
      { k: 'd', x: 'поиск · сортировка · переключатель метрик · drilldown · пагинация' },
      { k: 'blank' },
      { k: 'u', x: '/proteus-echarts-builder СДАЧА' },
      { k: 'bar', s: 4, t: 'Проверки — check.py' },
      { k: 'ok', x: 'validate.py: код по каркасу скилла — PASS' },
      { k: 'ok', x: 'smoke.mjs: headless-браузер — клики, тултипы, вкладки — PASS' },
      { k: 'ok', x: 'SELF_CHECK.md сгенерирован: суждения заполнены, FAIL нет — сдано' },
      { k: 'blank' },
      { k: 'bar', s: 5, t: 'Готово' },
      { k: 'path', x: 'channels.chart.js · FIELDS.md' },
      { k: 'p', x: 'В Proteus: JS → в чарт eCharts; поля из FIELDS.md — руками в «Измерения»/«Меры», иначе data пуст.' },
      { k: 'ask', h: 'Дальше', q: 'Что дальше?', o: [
        { l: 'Поправить по комментарию', d: 'Режим ПРАВКА — точечный diff, макет не трогаю', n: 'tweak' },
        { l: 'Завершить', d: 'Виджет готов', n: 'end' }] }],
    tweak: [
      { k: 'u', x: 'ПРАВКА: акцентный цвет — жёлтый, и добавь экспорт в CSV' },
      { k: 'ok', x: 'Минимальный diff в channels.chart.js, проверки прогнаны. Макет не тронут.' },
      { k: 'go', n: 'end' }],
    end: [
      { k: 'blank' },
      { k: 'a', x: 'Готово. Виджет живёт в Proteus, данные — из вашего SQL.' },
      { k: 'd', x: 'R или «⟲ заново» — пройти ещё раз' }]
  };

  window.TERM = { create };
  window.RQ = { QB, KEY10, qlist, TABLES: RQ_TABLES, FLOW: RQ_FLOW };
  window.ECH = { TABLES: ECH_TABLES, FLOW: ECH_FLOW };
})();
