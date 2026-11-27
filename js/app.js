(() => {
  'use strict';

  const C = window.ADV;
  const KEY = 'adv26_opened';
  const INTRO_KEY = 'adv26_intro';
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const pad = (n) => String(n).padStart(2, '0');
  const norm = (s) => String(s).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const fmt = (s) => (isFinite(s) ? Math.floor(s / 60) + ':' + pad(Math.floor(s % 60)) : '0:00');

  /* ---------- Modo prueba: ?dia=15 simula esa fecha, ?reset borra lo guardado ---------- */
  const params = new URLSearchParams(location.search);
  if (params.has('reset')) {
    try { localStorage.removeItem(KEY); localStorage.removeItem(INTRO_KEY); } catch (e) { /* nada */ }
  }
  const sim = parseInt(params.get('dia'), 10);
  const simulando = !isNaN(sim);

  /* ---------- Días abiertos (se guardan en el móvil) ---------- */
  let opened = (() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(opened)); } catch (e) { /* nada */ } };

  /* ---------- Fechas ---------- */
  const startDate = new Date(C.start.year, C.start.month - 1, C.start.day);

  function todayNumber() {
    if (simulando) return sim;
    const n = new Date();
    const t = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((t - startDate) / 864e5) + 1;
  }
  function dateOf(n) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + n - 1);
    return d;
  }

  /* ---------- Aviso ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- Calendario ---------- */
  const grid = $('#grid');
  for (let n = 1; n <= 24; n++) {
    const b = el('button', 'door');
    b.type = 'button';
    b.dataset.n = n;
    b.setAttribute('aria-label', 'Día ' + n);
    b.appendChild(el('span', '', n));
    grid.appendChild(b);
  }

  function paint() {
    const t = todayNumber();
    grid.querySelectorAll('.door').forEach((b) => {
      const n = +b.dataset.n;
      const isOpen = opened.includes(n);
      b.classList.toggle('locked', n > t);
      b.classList.toggle('ready', n <= t && !isOpen);
      b.classList.toggle('today', n === t && !isOpen);
      b.classList.toggle('done', isOpen);
    });
  }

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.door');
    if (!b) return;
    const n = +b.dataset.n;
    if (n > todayNumber()) {
      const d = dateOf(n);
      toast('Aún no. Se abre el ' + d.getDate() + ' de ' + MESES[d.getMonth()]);
      return;
    }
    openDay(n, b);
  });

  /* ---------- Contador ---------- */
  let lastT = null;
  function tick() {
    const t = todayNumber();
    if (t !== lastT) { lastT = t; paint(); }
    const out = $('#countdown');
    if (simulando || t >= 24) { out.textContent = ''; return; }

    let target, label;
    if (t < 1) {
      target = startDate;
      label = 'Starts in ';
    } else {
      const n = new Date();
      target = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
      label = 'Next in ';
    }
    const s = Math.max(0, Math.floor((target - new Date()) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    out.textContent = label + (d > 0 ? d + (d === 1 ? ' day y ' : ' days y ') : '') +
      pad(h) + ':' + pad(m) + ':' + pad(s % 60);
  }

  /* ---------- Visor ---------- */
  const viewer = $('#viewer');
  const body = $('#viewerBody');
  let timers = [];
  let cleanups = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const stopTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const onClose = (fn) => cleanups.push(fn);

  function openDay(n, origin) {
    const r = origin.getBoundingClientRect();
    viewer.style.setProperty('--cx', (r.left + r.width / 2) + 'px');
    viewer.style.setProperty('--cy', (r.top + r.height / 2) + 'px');
    $('#viewerNum').textContent = n;
    body.innerHTML = '';
    body.scrollTop = 0;

    const day = C.days[n] || { type: 'pending' };
    (R[day.type] || R.pending)(body, day, n);

    viewer.classList.add('open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('noscroll');
    history.pushState({ day: n }, '');

    if (!opened.includes(n)) { opened.push(n); save(); paint(); }
  }

  function closeView() {
    if (!viewer.classList.contains('open')) return;
    stopTimers();
    cleanups.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
    cleanups = [];
    viewer.classList.remove('open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('noscroll');
    setTimeout(() => { if (!viewer.classList.contains('open')) body.innerHTML = ''; }, 900);
  }

  $('#close').addEventListener('click', () => {
    if (history.state && history.state.day) history.back(); else closeView();
  });
  window.addEventListener('popstate', closeView);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeView(); });

  /* ---------- Piezas reutilizables ---------- */
  function player(parent, d, label) {
    const box = el('div', 'player');
    if (d.title) box.appendChild(el('h2', 'title', d.title));
    if (d.artist) box.appendChild(el('p', 'sub', d.artist));

    const a = new Audio();
    a.preload = 'metadata';
    a.src = d.file;

    const btn = el('button', 'btn', label || 'Replay');
    btn.type = 'button';
    const bar = el('input', 'seek');
    bar.type = 'range'; bar.min = 0; bar.max = 1000; bar.value = 0;
    bar.setAttribute('aria-label', 'Posición');
    const time = el('div', 'time', '0:00');
    const err = el('p', 'dev');

    const update = () => {
      if (a.duration) bar.value = (a.currentTime / a.duration) * 1000;
      time.textContent = fmt(a.currentTime) + ' / ' + fmt(a.duration);
    };
    btn.onclick = () => {
      if (a.paused) a.play().catch(() => { err.textContent = 'Cannot replay ' + d.file; });
      else a.pause();
    };
    a.onplay = () => { btn.textContent = 'Pause'; };
    a.onpause = () => { btn.textContent = label || 'Replay'; };
    a.onended = () => { btn.textContent = label || 'Replay'; bar.value = 0; };
    a.ontimeupdate = update;
    a.onloadedmetadata = update;
    a.onerror = () => { err.textContent = 'Document not found ' + d.file; };
    bar.oninput = () => { if (a.duration) a.currentTime = (bar.value / 1000) * a.duration; };
    onClose(() => { a.pause(); a.removeAttribute('src'); a.load(); });

    box.append(btn, bar, time, err);
    if (d.note) box.appendChild(el('p', 'note', d.note));
    parent.appendChild(box);
  }

  function answerBox(parent, d, onSolve) {
    const box = el('div', 'answer');
    const input = el('input', 'field');
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    input.setAttribute('enterkeyhint', 'done');
    if (d.placeholder) input.placeholder = d.placeholder;
    const btn = el('button', 'btn', 'Check');
    btn.type = 'button';
    const msg = el('p', 'feedback');
    const hint = el('p', 'sub');
    box.append(input, btn, msg, hint);
    parent.appendChild(box);

    const ok = (d.answer || []).map(norm);
    let fails = 0;
    const check = () => {
      const v = norm(input.value);
      if (!v) return;
      if (ok.includes(v)) {
        input.disabled = true; btn.disabled = true;
        msg.textContent = d.success || '';
        msg.classList.add('good');
        hint.textContent = '';
        if (onSolve) onSolve();
        return;
      }
      fails++;
      msg.textContent = d.wrong || 'Incorrect';
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
      if (d.hint && fails >= (d.hintAfter || 2)) hint.textContent = d.hint;
    };
    btn.onclick = check;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
  }

  /* ---------- Tipos de día ---------- */
  const R = {};

  R.message = (b, d) => {
    const w = el('div', 'msg');
    b.appendChild(w);
    if (d.title) w.appendChild(el('h2', 'title', d.title));
    const paras = [].concat(d.text || []);
    const ps = paras.map(() => w.appendChild(el('p', 'p')));
    const mode = d.mode || 'lines';

    if (mode === 'plain') { ps.forEach((p, i) => { p.textContent = paras[i]; }); return; }

    let skip;
    if (mode === 'lines') {
      ps.forEach((p, i) => { p.textContent = paras[i]; p.classList.add('hide'); });
      let i = 0;
      const next = () => {
        if (i >= ps.length) return;
        ps[i++].classList.remove('hide');
        if (i < ps.length) later(next, d.gap || 1700);
      };
      later(next, 600);
      skip = () => { stopTimers(); ps.forEach((p) => p.classList.remove('hide')); };
    } else {
      let pi = 0, ci = 0;
      const step = () => {
        if (pi >= ps.length) return;
        ci++;
        ps[pi].textContent = paras[pi].slice(0, ci);
        if (ci >= paras[pi].length) { pi++; ci = 0; later(step, 700); }
        else later(step, d.speed || 34);
      };
      later(step, 600);
      skip = () => { stopTimers(); ps.forEach((p, i) => { p.textContent = paras[i]; }); };
    }
    b.addEventListener('click', skip, { once: true });
  };

  R.song = (b, d) => player(b, d, 'Replay');

  R.voice = (b, d) => player(b, d, 'Listen');

  R.photo = (b, d) => {
    const fig = el('figure', 'photo');
    const img = new Image();
    img.alt = d.alt || '';
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'Ampliar imagen');
    img.onload = () => fig.classList.add('in');
    img.onerror = () => fig.appendChild(el('p', 'dev', 'Not found ' + d.file));
    img.src = d.file;

    let modal = null;

    const closeModal = () => {
      if (!modal) return;
      modal.remove();
      modal = null;
      document.removeEventListener('keydown', modalKeydown, true);
      img.focus();
    };

    const modalKeydown = (e) => {
      if (e.key === 'Escape' && modal) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeModal();
      }
    };

    const openModal = () => {
      if (modal) return;

      modal = el('div', 'photo-modal');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Imagen ampliada');

      const large = new Image();
      large.className = 'photo-modal__image';
      large.src = d.file;
      large.alt = d.alt || 'Imagen ampliada';

      const close = el('button', 'photo-modal__close', '×');
      close.type = 'button';
      close.setAttribute('aria-label', 'Cerrar imagen');
      close.addEventListener('click', closeModal);

      const actions = el('div', 'photo-modal__actions');
      const download = el('a', 'photo-modal__download', 'Descargar ' + (/\.gif(?:$|[?#])/i.test(d.file) ? 'GIF' : 'imagen'));
      download.href = d.file;
      download.setAttribute('download', (d.file.split('/').pop() || 'imagen').split('?')[0].split('#')[0]);

      actions.appendChild(download);
      modal.append(large, close, actions);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });

      document.body.appendChild(modal);
      document.addEventListener('keydown', modalKeydown, true);
      requestAnimationFrame(() => {
        if (modal) modal.classList.add('show');
      });
      close.focus();
    };

    img.addEventListener('click', openModal);
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });
    onClose(closeModal);

    fig.appendChild(img);
    if (d.caption) fig.appendChild(el('figcaption', '', d.caption));
    b.appendChild(fig);
  };

  R.video = (b, d) => {
    const w = el('div', 'video');
    const v = document.createElement('video');
    v.controls = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.preload = 'metadata';
    if (d.poster) v.poster = d.poster;
    v.src = d.file;
    const err = el('p', 'dev');
    v.onerror = () => { err.textContent = 'Document not found ' + d.file; };
    onClose(() => { v.pause(); v.removeAttribute('src'); v.load(); });
    w.append(v, err);
    if (d.note) w.appendChild(el('p', 'note', d.note));
    b.appendChild(w);
  };

  R.riddle = (b, d) => {
    const w = el('div', 'center');
    w.appendChild(el('p', 'q', d.question));
    answerBox(w, d);
    b.appendChild(w);
  };

  R.cropped = (b, d) => {
    const w = el('div', 'center');
    const box = el('div', 'crop');
    const img = new Image();
    img.alt = '';
    img.onerror = () => box.appendChild(el('p', 'dev', 'Falta ' + d.file));
    img.src = d.file;
    img.style.transformOrigin = (d.x != null ? d.x : 50) + '% ' + (d.y != null ? d.y : 50) + '%';
    img.style.transform = 'scale(' + (d.zoom || 5) + ')';
    box.appendChild(img);
    w.appendChild(box);
    if (d.question) w.appendChild(el('p', 'q', d.question));
    const reveal = () => { img.style.transform = 'scale(1)'; };
    answerBox(w, d, reveal);
    if (d.rendirse !== false) {
      const give = el('button', 'link', 'Show');
      give.type = 'button';
      give.onclick = () => { reveal(); give.remove(); };
      w.appendChild(give);
    }
    b.appendChild(w);
  };

  /* Día en blanco camuflado: se ve igual que un día normal, y no pasa nada. */
  R.ragebait = (b, d) => {
    const v = d.variant || 'video';
    const w = el('div', 'center');
    b.appendChild(w);

    const end = () => w.appendChild(el('p', 'q final', d.final || 'TODO: frase final'));
    const run = (setPct) => {
      const dur = (d.carga || 6) * 1000;
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        setPct(Math.floor(99 * (1 - Math.pow(1 - k, 2))));
        if (k < 1) later(step, 120);
        else later(end, (d.espera || 4) * 1000);
      };
      step();
    };

    if (v === 'song') {
      if (d.title) w.appendChild(el('h2', 'title', d.title));
      if (d.artist) w.appendChild(el('p', 'sub', d.artist));
      const btn = el('button', 'btn', 'Replay');
      btn.type = 'button';
      const bar = el('div', 'bar');
      const fill = el('span');
      bar.appendChild(fill);
      const time = el('div', 'time', '0:00 / ' + (d.duracion || '3:12'));
      w.append(btn, bar, time);
      let started = false;
      btn.onclick = () => {
        if (started) return;
        started = true;
        btn.textContent = 'Pause';
        run((p) => { fill.style.width = p + '%'; });
      };
      return;
    }

    const stage = el('div', 'fake' + (v === 'photo' ? ' photo' : ''));
    const status = el('span');
    w.appendChild(stage);
    if (v === 'photo') {
      stage.appendChild(status);
      run((p) => { status.textContent = 'Loading.. ' + p + '%'; });
    } else {
      const btn = el('button', 'btn', 'Replay');
      btn.type = 'button';
      stage.appendChild(btn);
      btn.onclick = () => {
        btn.remove();
        stage.appendChild(status);
        run((p) => { status.textContent = 'Loading.. ' + p + '%'; });
      };
    }
  };

  /* Pendientes: mapa, minijuegos, interactivos (se programan después). */
  R.pending = (b, d) => {
    const w = el('div', 'center');
    w.appendChild(el('p', 'q', 'Not yet'));
    if (d && d.nota) w.appendChild(el('p', 'dev', d.nota));
    b.appendChild(w);
  };
  R.map = R.game = R.interactive = R.pending;

  /* ---------- Pantalla de bienvenida ---------- */
  function intro() {
    const s = $('#intro');
    let seen = null;
    try { seen = localStorage.getItem(INTRO_KEY); } catch (e) { /* nada */ }
    if (seen || simulando) { s.remove(); return; }
    $('#introTitle').textContent = C.intro.titulo || '';
    $('#introText').textContent = C.intro.texto || '';
    const btn = $('#introBtn');
    btn.textContent = C.intro.boton || 'Enter';
    btn.onclick = () => {
      s.classList.add('out');
      try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* nada */ }
      setTimeout(() => s.remove(), 1100);
    };
  }

  /* ---------- Nieve (muy sutil) ---------- */
  function snow() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = $('#snow');
    const x = c.getContext('2d');
    let w, h, dpr;
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.width = innerWidth * dpr;
      h = c.height = innerHeight * dpr;
    };
    size();
    addEventListener('resize', size);
    const flakes = Array.from({ length: 42 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.6 + Math.random() * 1.3,
      s: 0.025 + Math.random() * 0.05,
      p: Math.random() * 6.28,
      o: 0.15 + Math.random() * 0.3
    }));
    let last = 0;
    const frame = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      x.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.s * dt;
        if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
        const px = (f.x + Math.sin(t / 4000 + f.p) * 0.012) * w;
        x.beginPath();
        x.arc(px, f.y * h, f.r * dpr, 0, 6.283);
        x.fillStyle = 'rgba(233,223,208,' + f.o + ')';
        x.fill();
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Arranque ---------- */
  document.title = C.titulo || 'Adviento';
  $('#titulo').textContent = C.titulo || '';
  intro();
  snow();
  tick();
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', tick);
})();
