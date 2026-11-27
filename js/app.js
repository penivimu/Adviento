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
      label = 'Empieza en ';
    } else {
      const n = new Date();
      target = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
      label = 'Siguiente casilla en ';
    }
    const s = Math.max(0, Math.floor((target - new Date()) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    out.textContent = label + (d > 0 ? d + (d === 1 ? ' día y ' : ' días y ') : '') +
      pad(h) + ':' + pad(m) + ':' + pad(s % 60);
  }

  /* ---------- Visor ---------- */
  const viewer = $('#viewer');
  const body = $('#viewerBody');
  let timers = [];
  let cleanups = [];
  let activeLightboxClose = null;
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
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (activeLightboxClose) { activeLightboxClose(); return; }
    closeView();
  });

  /* ---------- Piezas reutilizables ---------- */
  function player(parent, d, label) {
    const box = el('div', 'player');
    if (d.title) box.appendChild(el('h2', 'title', d.title));
    if (d.artist) box.appendChild(el('p', 'sub', d.artist));

    const a = new Audio();
    a.preload = 'metadata';
    a.src = d.file;

    const btn = el('button', 'btn', label || 'Reproducir');
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
      if (a.paused) a.play().catch(() => { err.textContent = 'No se puede reproducir ' + d.file; });
      else a.pause();
    };
    a.onplay = () => { btn.textContent = 'Pausar'; };
    a.onpause = () => { btn.textContent = label || 'Reproducir'; };
    a.onended = () => { btn.textContent = label || 'Reproducir'; bar.value = 0; };
    a.ontimeupdate = update;
    a.onloadedmetadata = update;
    a.onerror = () => { err.textContent = 'Falta el archivo ' + d.file; };
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
    const btn = el('button', 'btn', 'Comprobar');
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
      msg.textContent = d.wrong || 'Esa no.';
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

  R.song = (b, d) => {
    const quiz = el('section', 'song-quiz');
    const card = el('div', 'song-quiz__card');
    const play = el('button', 'song-quiz__play');
    play.type = 'button';
    play.setAttribute('aria-label', 'Escuchar fragmento');
    play.innerHTML = '<span aria-hidden="true">▶</span>';

    const prompt = el('p', 'song-quiz__prompt', d.prompt || '¿Qué canción es?');
    const input = el('input', 'field song-quiz__input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    input.placeholder = d.placeholder || 'Escribe el título de la canción';
    input.setAttribute('aria-label', 'Título de la canción');

    const check = el('button', 'btn song-quiz__check', 'Comprobar');
    check.type = 'button';
    const feedback = el('p', 'feedback song-quiz__feedback');
    card.append(play, prompt, input, check, feedback);
    quiz.appendChild(card);
    b.appendChild(quiz);

    const preview = new Audio();
    preview.preload = 'auto';
    preview.src = d.file;
    const startAt = Math.max(0, Number(d.start) || 0);
    const clipLength = Math.max(0.1, Number(d.duration) || 1);
    let previewStopTimer = null;
    let unlocked = false;

    const stopPreview = () => {
      if (previewStopTimer) {
        clearTimeout(previewStopTimer);
        previewStopTimer = null;
      }
      preview.pause();
    };

    play.addEventListener('click', () => {
      if (unlocked) return;
      stopPreview();
      const begin = () => {
        preview.currentTime = startAt;
        const result = preview.play();
        if (result && typeof result.catch === 'function') {
          result.catch(() => { feedback.textContent = 'No se ha podido reproducir el fragmento.'; });
        }
        previewStopTimer = setTimeout(() => {
          preview.pause();
          previewStopTimer = null;
          play.classList.remove('is-playing');
        }, clipLength * 1000);
        play.classList.add('is-playing');
      };
      if (preview.readyState >= 1) begin();
      else preview.addEventListener('loadedmetadata', begin, { once: true });
    });

    preview.addEventListener('pause', () => play.classList.remove('is-playing'));
    preview.addEventListener('ended', () => play.classList.remove('is-playing'));

    const accepted = (d.answer || [d.title || '']).map(norm).filter(Boolean);
    const reveal = () => {
      unlocked = true;
      stopPreview();
      preview.pause();
      input.disabled = true;
      check.disabled = true;
      card.classList.add('is-solved');
      quiz.classList.add('is-solved');

      // La misma tarjeta se transforma en la portada: no añade altura ni obliga a deslizar.
      const reveal = el('div', 'song-quiz__reveal');
      const image = new Image();
      image.className = 'song-quiz__artwork';
      image.alt = d.title ? 'Portada de ' + d.title : 'Portada de la canción';
      image.src = d.cover || '';
      image.onerror = () => {
        image.remove();
        reveal.classList.add('no-artwork');
        reveal.appendChild(el('span', 'song-quiz__artwork-fallback', '♪'));
      };

      const shade = el('div', 'song-quiz__shade');
      const details = el('div', 'song-quiz__details');
      const heading = el('div', 'song-quiz__heading');
      const trackInfo = el('div', 'song-quiz__track-info');
      if (d.title) trackInfo.appendChild(el('h2', 'song-quiz__title', d.title));
      if (d.artist) trackInfo.appendChild(el('p', 'song-quiz__artist', d.artist));

      const audio = new Audio(d.file);
      audio.preload = 'auto';
      const controls = el('div', 'song-quiz__controls');
      const toggle = el('button', 'song-quiz__toggle', 'Ⅱ');
      toggle.type = 'button';
      toggle.setAttribute('aria-label', 'Pausar canción');
      const timeline = el('input', 'song-quiz__timeline');
      timeline.type = 'range';
      timeline.min = 0;
      timeline.max = 1000;
      timeline.value = 0;
      timeline.setAttribute('aria-label', 'Progreso de la canción');
      const clock = el('span', 'song-quiz__clock', '0:00');

      const updateAudio = () => {
        if (audio.duration) timeline.value = String((audio.currentTime / audio.duration) * 1000);
        clock.textContent = fmt(audio.currentTime);
      };
      const setPlaying = (playing) => {
        toggle.textContent = playing ? 'Ⅱ' : '▶';
        toggle.setAttribute('aria-label', playing ? 'Pausar canción' : 'Reproducir canción');
      };
      toggle.addEventListener('click', () => {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
      });
      audio.addEventListener('play', () => setPlaying(true));
      audio.addEventListener('pause', () => setPlaying(false));
      audio.addEventListener('ended', () => { setPlaying(false); timeline.value = '0'; });
      audio.addEventListener('timeupdate', updateAudio);
      audio.addEventListener('loadedmetadata', updateAudio);
      timeline.addEventListener('input', () => {
        if (audio.duration) audio.currentTime = (Number(timeline.value) / 1000) * audio.duration;
      });

      controls.append(toggle, timeline, clock);
      heading.append(trackInfo);
      details.append(heading, controls);
      shade.appendChild(details);
      reveal.append(image, shade);
      card.replaceChildren(reveal);
      card.classList.add('song-quiz__card--revealed');

      // La validación ocurre tras una interacción del usuario, por lo que el navegador
      // normalmente permite iniciar aquí la reproducción automáticamente.
      audio.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false);
        toggle.classList.add('needs-tap');
      });

      onClose(() => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      });
    };

    const validate = () => {
      if (unlocked) return;
      const value = norm(input.value);
      if (!value) return;
      if (accepted.includes(value)) {
        reveal();
      } else {
        feedback.textContent = d.wrong || 'No es esa. ¡Prueba otra vez!';
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
      }
    };

    check.addEventListener('click', validate);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') validate();
    });

    onClose(() => {
      stopPreview();
      preview.removeAttribute('src');
      preview.load();
    });
  };

  R.voice = (b, d) => player(b, d, 'Escuchar');

  R.photo = (b, d) => {
    const fig = el('figure', 'photo');
    const trigger = el('button', 'photo-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Ampliar imagen');

    const img = new Image();
    img.alt = d.alt || d.caption || 'Imagen del calendario';
    img.onload = () => fig.classList.add('in');
    img.onerror = () => fig.appendChild(el('p', 'dev', 'Falta ' + d.file));
    img.src = d.file;
    trigger.appendChild(img);
    fig.appendChild(trigger);

    const lightbox = el('div', 'photo-lightbox');
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Imagen ampliada');

    const panel = el('div', 'photo-lightbox__panel');
    const close = el('button', 'photo-lightbox__close', 'Cerrar');
    close.type = 'button';
    close.setAttribute('aria-label', 'Cerrar imagen ampliada');

    const largeImg = new Image();
    largeImg.className = 'photo-lightbox__image';
    largeImg.alt = img.alt;

    const actions = el('div', 'photo-lightbox__actions');
    const download = el('a', 'photo-lightbox__download', 'Descargar ' + (/\.gif(?:$|[?#])/i.test(d.file) ? 'GIF' : 'imagen'));
    download.href = d.file;
    download.setAttribute('download', (d.file.split('/').pop() || 'imagen').split(/[?#]/)[0]);

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      if (activeLightboxClose === closeLightbox) activeLightboxClose = null;
      document.removeEventListener('keydown', onLightboxKeydown, true);
      setTimeout(() => lightbox.remove(), 220);
    };
    const onLightboxKeydown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeLightbox();
      }
    };

    close.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', onLightboxKeydown, true);

    actions.appendChild(download);
    panel.append(close, largeImg, actions);
    lightbox.appendChild(panel);

    trigger.addEventListener('click', () => {
      largeImg.src = img.currentSrc || img.src;
      document.body.appendChild(lightbox);
      requestAnimationFrame(() => lightbox.classList.add('open'));
      activeLightboxClose = closeLightbox;
      close.focus();
    });

    onClose(() => {
      if (activeLightboxClose === closeLightbox) activeLightboxClose = null;
      document.removeEventListener('keydown', onLightboxKeydown, true);
      lightbox.remove();
    });

    if (d.caption) fig.appendChild(el('figcaption', '', d.caption));
    fig.appendChild(el('p', 'photo-hint', 'Pulsa la imagen para ampliarla'));
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
    v.onerror = () => { err.textContent = 'Falta el archivo ' + d.file; };
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
      const give = el('button', 'link', 'Enseñármela entera');
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
      const btn = el('button', 'btn', 'Reproducir');
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
        btn.textContent = 'Pausar';
        run((p) => { fill.style.width = p + '%'; });
      };
      return;
    }

    const stage = el('div', 'fake' + (v === 'photo' ? ' photo' : ''));
    const status = el('span');
    w.appendChild(stage);
    if (v === 'photo') {
      stage.appendChild(status);
      run((p) => { status.textContent = 'Cargando… ' + p + '%'; });
    } else {
      const btn = el('button', 'btn', 'Reproducir');
      btn.type = 'button';
      stage.appendChild(btn);
      btn.onclick = () => {
        btn.remove();
        stage.appendChild(status);
        run((p) => { status.textContent = 'Cargando… ' + p + '%'; });
      };
    }
  };

  /* Pendientes: mapa, minijuegos, interactivos (se programan después). */
  R.pending = (b, d) => {
    const w = el('div', 'center');
    w.appendChild(el('p', 'q', 'Este día todavía no tiene contenido.'));
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
    btn.textContent = C.intro.boton || 'Entrar';
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
