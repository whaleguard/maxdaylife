/* 키디랜드 공개 사이트 스크립트 — 외부 라이브러리 없음
   메뉴 · 제품 목록 필터·정렬 · 사진 갤러리 · 유튜브 lite · 견적 폼(토큰·필수 검사·자동 하이픈·시군구·제출) · 클릭 추적 */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* ---------- 추적 (전화·카톡·폼) ---------- */
  function track(kind, extra) {
    try {
      var body = { kind: kind, path: location.pathname };
      if (extra) for (var k in extra) body[k] = extra[k];
      var data = JSON.stringify(body);
      if (navigator.sendBeacon) navigator.sendBeacon('/api/track.php', new Blob([data], { type: 'application/json' }));
    } catch (e) { /* 추적 실패는 화면에 영향 없음 */ }
  }
  track('pageview', { ref: d.referrer ? d.referrer.slice(0, 300) : '' });
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (a.dataset.track === 'call' || href.indexOf('tel:') === 0) track('call');
    else if (a.dataset.track === 'kakao') track('kakao');
  });

  /* ---------- 모바일 메뉴 ---------- */
  var drawer = $('#kd-drawer'), menuBtn = $('.kd-hd-menu'), lastFocus = null, drawerTimer = 0;
  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function openMenu() {
    if (!drawer) return;
    lastFocus = d.activeElement;
    clearTimeout(drawerTimer);
    drawer.hidden = false;
    // 다음 그림에서 열림 표시 → 오른쪽에서 부드럽게 들어옴
    requestAnimationFrame(function () { requestAnimationFrame(function () { drawer.classList.add('is-open'); }); });
    d.body.classList.add('kd-lock');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    var f = $('.kd-drawer-panel a, .kd-drawer-panel button', drawer);
    if (f) f.focus();
  }
  function closeMenu() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('is-open');
    clearTimeout(drawerTimer);
    drawerTimer = setTimeout(function () { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, REDUCE ? 0 : 340);
    d.body.classList.remove('kd-lock');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (menuBtn) menuBtn.addEventListener('click', openMenu);
  if (drawer) {
    $$('[data-close]', drawer).forEach(function (b) { b.addEventListener('click', closeMenu); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { if ((a.getAttribute('href') || '').indexOf('#') >= 0) closeMenu(); }); });
  }
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); closeFilter(); }
    if (e.key === 'Tab' && drawer && !drawer.hidden) {
      var items = $$('a[href], button:not([disabled])', drawer).filter(function (x) { return x.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', function () { if (window.innerWidth > 1060) closeMenu(); });

  /* ---------- 제품 목록: 검색·업종·상태·가격·렌탈·정렬 (카드 data-*) ---------- */
  var plist = $('[data-plist]'), filterBox = null;
  function closeFilter() {}
  if (plist) {
    var form = $('[data-filter]', plist), grid = $('[data-items]', plist), empty = $('[data-empty]', plist);
    var cards = grid ? $$('[data-card]', grid) : [];
    var countEl = $('[data-count]', plist), sortSel = $('[data-sort]', plist), qIn = $('[data-q]', plist);
    var resetBtns = $$('[data-filter-reset]', plist);
    var params = new URLSearchParams(location.search);
    var fsel = function (k) { return form ? form.querySelector('[data-f="' + k + '"]') : null; };
    // 주소로 넘어온 조건 (?biz=kidscafe&q=...)
    ['biz', 'cond', 'price'].forEach(function (k) { var el = fsel(k), v = params.get(k); if (el && v && el.querySelector('option[value="' + CSS.escape(v) + '"]')) el.value = v; });
    if (params.get('rental') === '1' && fsel('rental')) fsel('rental').checked = true;
    if (qIn && params.get('q')) qIn.value = params.get('q');
    if (sortSel && params.get('sort') && sortSel.querySelector('option[value="' + CSS.escape(params.get('sort')) + '"]')) sortSel.value = params.get('sort');
    function v(k) { var el = fsel(k); return el ? (el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value) : ''; }
    function apply() {
      var biz = v('biz'), cond = v('cond'), price = v('price'), rental = v('rental');
      var q = qIn ? qIn.value.trim().toLowerCase() : '';
      var words = q ? q.split(/\s+/) : [];
      var n = 0;
      cards.forEach(function (c) {
        var ok = true;
        if (biz && (' ' + c.dataset.biz + ' ').indexOf(' ' + biz + ' ') < 0) ok = false;
        if (cond && c.dataset.cond !== cond) ok = false;
        if (rental && c.dataset.rental !== '1') ok = false;
        if (price && c.dataset.price !== price) ok = false;
        if (ok && words.length) { var hay = c.dataset.q || c.textContent.toLowerCase(); for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) { ok = false; break; } }
        c.hidden = !ok; if (ok) n++;
      });
      if (countEl) countEl.textContent = n;
      if (empty) empty.hidden = n > 0;
      if (grid) grid.hidden = n === 0;
      var any = !!(biz || cond || price || rental || q);
      resetBtns.forEach(function (b) { if (b.classList.contains('kd-list-reset')) b.hidden = !any; });
      try {
        var p = new URLSearchParams();
        if (biz) p.set('biz', biz); if (cond) p.set('cond', cond); if (price) p.set('price', price); if (rental) p.set('rental', '1'); if (q) p.set('q', qIn.value.trim());
        if (sortSel && sortSel.value !== 'pop') p.set('sort', sortSel.value);
        var s = p.toString();
        history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
      } catch (e) {}
    }
    function sort() {
      if (!grid || !sortSel) return;
      var mode = sortSel.value;
      var list = cards.slice();
      list.sort(function (a, b) {
        if (mode === 'new') return (+b.dataset.new || 0) - (+a.dataset.new || 0) || (+a.dataset.i - +b.dataset.i);
        if (mode === 'name') return (a.dataset.name || '').localeCompare(b.dataset.name || '', 'ko');
        if (mode === 'price') {
          var pa = a.dataset.pmin === '' ? Infinity : +a.dataset.pmin, pb = b.dataset.pmin === '' ? Infinity : +b.dataset.pmin;
          return pa === pb ? (+a.dataset.i - +b.dataset.i) : (pa < pb ? -1 : 1);
        }
        return +a.dataset.i - +b.dataset.i;
      });
      list.forEach(function (c) { grid.appendChild(c); });
    }
    if (form) {
      form.addEventListener('change', function (e) { if (e.target === sortSel) { sort(); } apply(); });
      form.addEventListener('submit', function (e) { e.preventDefault(); if (qIn) qIn.blur(); });
    }
    var qt = 0;
    if (qIn) qIn.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(apply, 120); });
    resetBtns.forEach(function (b) { b.addEventListener('click', function () {
      ['biz', 'cond', 'price'].forEach(function (k) { var el = fsel(k); if (el) el.value = ''; });
      if (fsel('rental')) fsel('rental').checked = false;
      if (qIn) qIn.value = '';
      apply();
    }); });
    sort(); apply();
  }

  /* ---------- 사례 목록 필터 ---------- */
  var clist = $('[data-clist]');
  if (clist) {
    var cf = $('[data-cfilter]', clist), cgrid = $('[data-items]', clist), cempty = $('[data-empty]', clist), ccount = $('[data-count]', clist);
    var ccards = cgrid ? $$('.kd-ccard', cgrid) : [];
    var cp = new URLSearchParams(location.search);
    if (cf) {
      ['biz', 'region', 'prod'].forEach(function (k) { var s = cf.querySelector('select[name="' + k + '"]'); if (s && cp.get(k)) s.value = cp.get(k); });
      var capply = function () {
        var g = function (k) { var s = cf.querySelector('select[name="' + k + '"]'); return s ? s.value : ''; };
        var b = g('biz'), r = g('region'), pr = g('prod'), n = 0;
        ccards.forEach(function (c) {
          var ok = (!b || c.dataset.biz === b) && (!r || c.dataset.region === r) && (!pr || (' ' + c.dataset.prod + ' ').indexOf(' ' + pr + ' ') >= 0);
          c.hidden = !ok; if (ok) n++;
        });
        if (ccount) ccount.textContent = n;
        if (cempty) cempty.hidden = n > 0;
        if (cgrid) cgrid.hidden = n === 0;
      };
      cf.addEventListener('change', capply);
      cf.addEventListener('submit', function (e) { e.preventDefault(); });
      capply();
    }
  }

  /* ---------- 사진 갤러리 (썸네일·앞뒤·크게 보기) ---------- */
  $$('[data-gallery]').forEach(function (g) {
    var main = $('.kd-pd-main-img', g), thumbs = $$('.kd-pd-thumb', g), zoom = $('[data-lb-open]', g), cnt = $('[data-gal-n]', g), cur = 0;
    if (!main) return;
    function show(i) {
      if (!thumbs.length) return;
      i = (i + thumbs.length) % thumbs.length;
      var t = thumbs[i]; cur = i;
      main.classList.add('is-swap');
      setTimeout(function () {
        main.removeAttribute('srcset');
        main.src = t.dataset.src;
        if (t.dataset.srcset) main.srcset = t.dataset.srcset;
        main.width = +t.dataset.w || main.width; main.height = +t.dataset.h || main.height;
        main.alt = t.dataset.alt || main.alt;
        main.classList.remove('is-swap');
      }, REDUCE ? 0 : 140);
      if (zoom) { zoom.dataset.full = t.dataset.full || t.dataset.src; zoom.dataset.w = t.dataset.w; zoom.dataset.h = t.dataset.h; }
      var note = $('[data-ai-note]', g);
      if (note) note.hidden = t.dataset.ai !== '1';
      if (cnt) cnt.textContent = i + 1;
      thumbs.forEach(function (x) { x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); });
      t.classList.add('is-on'); t.setAttribute('aria-pressed', 'true');
    }
    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(i); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1;
        if (j >= 0 && j < thumbs.length) { e.preventDefault(); thumbs[j].focus(); show(j); }
      });
    });
    $$('[data-gal-step]', g).forEach(function (b) { b.addEventListener('click', function () { show(cur + parseInt(b.dataset.galStep, 10)); }); });
    // 손가락으로 밀어 넘기기
    var sx = null;
    var mainBox = $('.kd-pd-main', g);
    if (mainBox && thumbs.length > 1) {
      mainBox.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      mainBox.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 45) show(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
    }
    if (zoom) zoom.addEventListener('click', function () {
      var items = thumbs.length ? thumbs.map(function (t) { return { src: t.dataset.full || t.dataset.src, w: +t.dataset.w, h: +t.dataset.h, alt: t.dataset.alt || '' }; })
        : [{ src: zoom.dataset.full, w: +zoom.dataset.w, h: +zoom.dataset.h, alt: main.alt }];
      if (window.KDLightbox) window.KDLightbox.open(items, thumbs.length ? cur : 0, zoom);
    });
  });

  /* ---------- 유튜브 lite (누르기 전에는 썸네일만) ---------- */
  $$('.kd-yt').forEach(function (box) {
    var btn = $('.kd-yt-btn', box);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = box.dataset.yt;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
      var f = d.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = box.dataset.title || '영상';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      f.allowFullscreen = true;
      f.loading = 'lazy';
      box.innerHTML = ''; box.appendChild(f);
    });
  });

  /* ---------- v1.0.8 머리 겹침 방지: 메뉴·오른쪽 칸이 실제로 부딪히는지 재서 hd-fit-1~4 단계로 줄인다 (1101px 이상) ---------- */
  (function () {
    var hd = $('.kd-hd'); if (!hd) return;
    var inner = $('.kd-hd-in', hd), nav = $('.kd-nav', hd), list = $('.kd-nav-list', hd), act = $('.kd-hd-act', hd), logo = $('.kd-logo', hd);
    if (!inner || !nav || !list || !act) return;
    var L = ['hd-fit-1', 'hd-fit-2', 'hd-fit-3', 'hd-fit-4'];
    function clash() {
      if (getComputedStyle(nav).display === 'none') return false;
      var items = list.children; if (!items.length) return false;
      var first = items[0].getBoundingClientRect(), last = items[items.length - 1].getBoundingClientRect(), a = act.getBoundingClientRect();
      var lg = logo ? logo.getBoundingClientRect() : { right: 0 };
      return list.scrollWidth > nav.clientWidth + 1 || inner.scrollWidth > inner.clientWidth + 1 || last.right > a.left - 12 || first.left < lg.right + 8;
    }
    function fit() {
      L.forEach(function (c) { hd.classList.remove(c); });
      if (window.innerWidth <= 1100) return;
      for (var i = 0; i < L.length && clash(); i++) hd.classList.add(L[i]);
      // 앞 단계에서 이미 맞으면 뒤 단계는 붙지 않는다. 1 단계 없이도 맞으면 원래 모양 그대로
    }
    var t = 0;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 80); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit);
    window.addEventListener('load', fit);
    fit();
    window.KDFitHeader = fit;
  })();

  /* ---------- 영상 크게 보기 (첫 화면 "영상 보기") — 누를 때만 iframe ---------- */
  $$('[data-vlb]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.vlb; if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
      var wrap = d.createElement('div'); wrap.className = 'kd-vlb'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', b.dataset.title || '영상');
      wrap.innerHTML = '<div class="kd-vlb-box"><button type="button" class="kd-vlb-x" aria-label="영상 닫기">×</button></div>';
      var f = d.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0'; f.title = b.dataset.title || '영상';
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen = true;
      $('.kd-vlb-box', wrap).appendChild(f);
      function close() { wrap.remove(); d.removeEventListener('keydown', esc); b.focus(); }
      function esc(e) { if (e.key === 'Escape') close(); }
      wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('.kd-vlb-x')) close(); });
      d.addEventListener('keydown', esc);
      d.body.appendChild(wrap); $('.kd-vlb-x', wrap).focus();
    });
  });

  /* ---------- 견적 폼 ---------- */
  var PHONE_RE = /^(01[016789]\d{7,8}|0[2-6]\d{7,9}|1[5-9]\d{6})$/;
  function digits(s) { return (s || '').replace(/\D/g, ''); }
  function hyphen(v) {
    var n = digits(v).slice(0, 11);
    if (/^02/.test(n)) {
      if (n.length <= 2) return n;
      if (n.length <= 5) return n.slice(0, 2) + '-' + n.slice(2);
      if (n.length <= 9) return n.slice(0, 2) + '-' + n.slice(2, n.length - 4) + '-' + n.slice(-4);
      return n.slice(0, 2) + '-' + n.slice(2, 6) + '-' + n.slice(6, 10);
    }
    if (/^1[5-9]/.test(n)) return n.length <= 4 ? n : n.slice(0, 4) + '-' + n.slice(4, 8);
    if (n.length <= 3) return n;
    if (n.length <= 7) return n.slice(0, 3) + '-' + n.slice(3);
    if (n.length <= 10) return n.slice(0, 3) + '-' + n.slice(3, 6) + '-' + n.slice(6);
    return n.slice(0, 3) + '-' + n.slice(3, 7) + '-' + n.slice(7);
  }

  var tokenState = { t: '', status: 'wait', waiters: [], listeners: [] }; // wait | ok | fail
  function fetchToken(cb) {
    if (cb) tokenState.waiters.push(cb);
    if (tokenState.busy) return;
    tokenState.busy = true; tokenState.status = 'wait';
    tokenState.listeners.forEach(function (f) { f(); });
    var done = function (ok, t) {
      tokenState.busy = false; tokenState.status = ok ? 'ok' : 'fail'; tokenState.t = ok ? t : '';
      var w = tokenState.waiters; tokenState.waiters = [];
      w.forEach(function (f) { f(); });
      tokenState.listeners.forEach(function (f) { f(); });
    };
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    fetch('/api/form-token.php', { method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { 'X-Requested-With': 'fetch' }, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { clearTimeout(timer); if (j && typeof j.t === 'string' && j.t) done(true, j.t); else done(false); })
      .catch(function () { clearTimeout(timer); done(false); });
  }

  /* v1.0.8 견적 폼: 유형(구매·행사 대여·무상 입점·장기 렌탈·기타)별 칸 · 단계(유형 → 상세 → 연락처) · 기종 여러 줄(찾기+수량) · 사진 3장(보내기 전에 줄임)
     서버(Inquiry::validate)가 같은 검사를 다시 한다. 칸 이름은 서버와 약속 — 바꾸지 말 것 */
  var forms = $$('form.kd-form');
  // 받은 보안 확인값은 곧바로 각 폼의 숨은 칸(_t)에 넣어 둔다
  tokenState.listeners.push(function () { forms.forEach(function (f) { if (f.elements._t) f.elements._t.value = tokenState.t; }); });
  if (forms.length) fetchToken();

  var KIND_TXT = {
    region: { event: ['행사 지역', 1], share: ['매장 지역', 1], buy: ['설치 지역', 0], rental: ['지역', 0], etc: ['지역', 0] },
    items: { event: '필요한 기종·수량', buy: '구매할 기종·수량', share: '희망 기종', rental: '렌탈할 기종·수량', etc: '관심 기종' },
    biz: { buy: '설치 장소 업종', share: '매장 업종' },
    step: { event: '행사 대여 · ', buy: '구매 · ', share: '무상 입점·수익배분 · ', rental: '장기 렌탈 · ', etc: '' }
  };
  var ISO = /^\d{4}-\d{2}-\d{2}$/;
  function todayIso() { var t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s\-_·()]+/g, ''); }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // 사진 줄이기: 긴 변 1600px JPEG (작은 사진은 그대로)
  function shrink(file) {
    return new Promise(function (res) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.URL || !d.createElement('canvas').getContext) return res(file);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, m = 1600;
        if (Math.max(w, h) <= m && file.size < 900 * 1024) { URL.revokeObjectURL(url); return res(file); }
        var s = Math.min(1, m / Math.max(w, h)), c = d.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { res(b ? new File([b], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }

  forms.forEach(function (form) {
    var box = form.closest('.kd-formbox');
    var btn = $('.kd-form-btn', form), btnT = $('.kd-form-btn-t', form), msg = $('.kd-form-msg', form);
    var type = form.dataset.type === 'full' ? 'full' : 'short';
    var el = function (n) { return form.elements[n]; };
    var regions = { sido: [], sub: {} };
    try { regions = JSON.parse($('.kd-regions', form).textContent); } catch (e) {}
    var plist = [];
    try { var pj = $('.kd-plist', form); if (pj) plist = JSON.parse(pj.textContent); } catch (e) {}
    var touched = {}, started = false, sending = false, done = false, step = 1, photos = [];
    var label = btn ? (btn.dataset.label || '견적 문의하기') : '';
    var qs = new URLSearchParams(location.search);

    if (el('source_path')) el('source_path').value = location.pathname;

    // v1.2.1 빠른 상담 띠는 유형을 라디오가 아니라 <select> 로 고른다 → 둘 다 읽는다
    function kind() {
      var r = form.querySelector('input[name="inquiry_type"]:checked');
      if (r) return r.value;
      var s = form.querySelector('select[name="inquiry_type"]');
      return s ? String(s.value || '') : '';
    }
    function val(n, scope) { var x = (scope || form).querySelector('[name="' + n + '"]:not(:disabled)'); if (!x) return ''; if (x.type === 'radio') { var c = (scope || form).querySelector('[name="' + n + '"]:checked:not(:disabled)'); return c ? c.value : ''; } return String(x.value || '').trim(); }

    // ---- 유형에 따라 칸 켜고 끄기 (꺼진 칸은 disabled → 보내지 않음) ----
    function applyKind() {
      var k = kind();
      $$('.kd-tsec', form).forEach(function (sec) {
        var on = !!k && (' ' + sec.dataset.for + ' ').indexOf(' ' + k + ' ') >= 0;
        sec.hidden = !on;
        $$('input,select,textarea', sec).forEach(function (x) { if (x.classList.contains('kd-biz-text') || x.name === 'region_sigungu') return; x.disabled = !on; });
        if (on) $$('.kd-f-region', sec).forEach(syncRegion); else $$('select[name="region_sigungu"]', sec).forEach(function (x) { x.disabled = true; });
        syncBizText(sec);
      });
      var rt = KIND_TXT.region[k] || ['지역', 0];
      $$('.kd-f-region', form).forEach(function (b) {
        var ev = !!b.closest('.kd-tsec[data-for="event"]'), l = $('.kd-rg-l', b), rq = $('.kd-rg-req', b);
        if (l) l.textContent = ev ? '행사 지역' : (k ? rt[0] : (l.dataset.l || '지역'));
        if (rq) rq.hidden = !(ev || rt[1]);
      });
      var il = $('.kd-items-l', form); if (il) il.textContent = KIND_TXT.items[k] || '기종 선택';
      var bl = $('.kd-biz-l', form); if (bl && KIND_TXT.biz[k]) bl.textContent = KIND_TXT.biz[k];
      var sk = $('.kd-iqs-kind', form); if (sk) sk.textContent = KIND_TXT.step[k] || '';
      var more = $('[data-more]', form);
      if (more) { var u = new URL(more.getAttribute('href'), location.href); if (k) u.searchParams.set('type', k); else u.searchParams.delete('type'); more.setAttribute('href', u.pathname + u.search + u.hash); }
      if (box) box.dataset.kind = k;
    }

    // ---- 시군구 (지역 칸마다) ----
    function syncRegion(b) {
      var sd = $('select[name="region_sido"]', b), sg = $('select[name="region_sigungu"]', b);
      if (!sd || !sg) return;
      var list = regions.sub && regions.sub[sd.value];
      var keep = sg.value;
      sg.innerHTML = '';
      var first = d.createElement('option'); first.value = ''; first.textContent = '시·군·구 선택 (선택)'; sg.appendChild(first);
      if (list && list.length && !sd.disabled) {
        list.forEach(function (n) { var op = d.createElement('option'); op.value = n; op.textContent = n; sg.appendChild(op); });
        sg.hidden = false; sg.disabled = false; if (keep && list.indexOf(keep) >= 0) sg.value = keep;
      } else { sg.hidden = true; sg.disabled = true; }
      b.classList.toggle('has-sub', !sg.hidden);
    }
    $$('.kd-f-region', form).forEach(function (b) { var sd = $('select[name="region_sido"]', b); if (sd) sd.addEventListener('change', function () { syncRegion(b); }); });
    function syncBizText(scope) {
      var s = $('select[name="biz_slug"]', scope), t = $('.kd-biz-text', scope);
      if (!s || !t) return;
      var on = !s.disabled && s.value === 'etc';
      t.hidden = !on; t.disabled = !on;
    }
    $$('select[name="biz_slug"]', form).forEach(function (s) { s.addEventListener('change', function () { syncBizText(s.closest('.kd-f')); }); });

    // ---- 기종 여러 줄 ----
    var ilist = $('.kd-items-list', form), tpl = $('.kd-item-tpl', form), addBtn = $('.kd-items-add', form), maxItems = ilist ? +(ilist.dataset.max || 10) : 0;
    function renumber() {
      if (!ilist) return;
      var rows = $$('.kd-item', ilist), total = 0, named = 0;
      rows.forEach(function (li, i) {
        $$('[data-k]', li).forEach(function (x) { x.name = 'items[' + i + '][' + x.dataset.k + ']'; });
        var q = parseInt($('[data-k=qty]', li).value, 10); if ($('[data-k=name]', li).value.trim()) { named++; total += (q > 0 ? q : 0); }
      });
      if (addBtn) addBtn.disabled = rows.length >= maxItems;
      var sum = $('.kd-items-sum', form); if (sum) sum.textContent = named ? '고른 기종 ' + named + '종 · 총 ' + total + '대' : '';
    }
    function addRow(p, qty) {
      if (!ilist || !tpl || $$('.kd-item', ilist).length >= maxItems) return null;
      var li = tpl.content ? tpl.content.firstElementChild.cloneNode(true) : null;
      if (!li) return null;
      ilist.appendChild(li);
      if (p) { $('[data-k=pid]', li).value = p.i; $('[data-k=name]', li).value = p.n; }
      if (qty) $('[data-k=qty]', li).value = qty;
      bindRow(li); renumber();
      return li;
    }
    function bindRow(li) {
      var inp = $('[data-k=name]', li), pid = $('[data-k=pid]', li), ac = $('.kd-ac', li), qty = $('[data-k=qty]', li), cur = -1, hits = [];
      function close() { ac.hidden = true; ac.innerHTML = ''; inp.setAttribute('aria-expanded', 'false'); cur = -1; }
      function pick(p) { pid.value = p.i; inp.value = p.n; close(); renumber(); touched.items = true; refresh(); qty.focus(); qty.select && qty.select(); }
      function draw() {
        var q = norm(inp.value);
        hits = !q ? [] : plist.filter(function (p) { return norm(p.n).indexOf(q) >= 0 || norm(p.c).indexOf(q) >= 0 || norm(p.b).indexOf(q) >= 0; }).slice(0, 8);
        if (!hits.length) { close(); return; }
        ac.innerHTML = hits.map(function (p, i) { return '<li role="option" id="' + form.id + '-ac-' + i + '" data-i="' + i + '"><b>' + escH(p.n) + '</b>' + (p.c || p.b ? '<small>' + escH([p.b, p.c].filter(Boolean).join(' · ')) + '</small>' : '') + '</li>'; }).join('');
        ac.hidden = false; inp.setAttribute('aria-expanded', 'true');
      }
      inp.addEventListener('input', function () {
        var v = inp.value.trim(), exact = null;
        plist.forEach(function (p) { if (p.n === v) exact = p; });
        pid.value = exact ? exact.i : '';
        draw(); renumber();
      });
      inp.addEventListener('keydown', function (e) {
        if (ac.hidden) return;
        var items = $$('li', ac);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach(function (x, i) { x.classList.toggle('is-on', i === cur); }); inp.setAttribute('aria-activedescendant', items[cur].id); }
        else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); pick(hits[cur]); }
        else if (e.key === 'Escape') close();
      });
      inp.addEventListener('blur', function () { setTimeout(close, 180); });
      ac.addEventListener('mousedown', function (e) { var x = e.target.closest('li'); if (x) { e.preventDefault(); pick(hits[+x.dataset.i]); } });
      $$('.kd-qty-b', li).forEach(function (b) { b.addEventListener('click', function () { var n = (parseInt(qty.value, 10) || 0) + (+b.dataset.q); qty.value = Math.max(1, Math.min(999, n)); renumber(); refresh(); }); });
      qty.addEventListener('input', function () { qty.value = qty.value.replace(/\D/g, '').slice(0, 3); renumber(); });
      $('.kd-item-x', li).addEventListener('click', function () { li.remove(); if (!$$('.kd-item', ilist).length) addRow(); renumber(); refresh(); });
    }
    if (ilist) {
      if (addBtn) addBtn.addEventListener('click', function () { var li = addRow(); if (li) $('[data-k=name]', li).focus(); });
      // 주소로 미리 고르기: ?product=slug(&qty=2) 또는 ?pid=
      var ps = qs.get('product'), pq = parseInt(qs.get('qty') || '1', 10), pidQ = qs.get('pid'), pre = null;
      plist.forEach(function (p) { if ((ps && p.s === ps) || (pidQ && String(p.i) === pidQ)) pre = p; });
      addRow(pre, pre && pq > 0 && pq < 1000 ? pq : 0);
    }

    // ---- 사진 ----
    var pin = $('.kd-photos-in', form), plistEl = $('.kd-photos-list', form);
    function drawPhotos() {
      if (!plistEl) return;
      plistEl.innerHTML = '';
      photos.forEach(function (f, i) {
        var li = d.createElement('li');
        var url = window.URL ? URL.createObjectURL(f) : '';
        li.innerHTML = (url ? '<img src="' + url + '" alt="" width="80" height="80">' : '') + '<span>' + escH(f.name) + '</span><button type="button" aria-label="이 사진 빼기">빼기</button>';
        $('button', li).addEventListener('click', function () { photos.splice(i, 1); drawPhotos(); refresh(); });
        plistEl.appendChild(li);
      });
      var drop = $('.kd-photos-drop b', form); if (drop) drop.textContent = photos.length ? '사진 더 고르기 (' + photos.length + '/3)' : '사진 고르기';
    }
    if (pin) pin.addEventListener('change', function () {
      var bad = '';
      Array.prototype.forEach.call(pin.files || [], function (f) {
        if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { bad = 'jpg·png·webp 사진만 붙일 수 있습니다'; return; }
        if (photos.length >= 3) { bad = '사진은 3장까지 붙일 수 있습니다'; return; }
        if (f.size > 25 * 1024 * 1024) { bad = '너무 큰 사진은 뺐습니다 (25MB 넘음)'; return; }
        photos.push(f);
      });
      pin.value = '';
      drawPhotos(); touched.photos = true; setErr('photos', bad); refresh(); if (bad) setErr('photos', bad);
    });

    // ---- 행사 기간 일수 ----
    function syncDays() {
      var a = val('event_start'), b = val('event_end'), out = $('.kd-f-days', form);
      if (!out) return;
      var es = el('event_end'); if (es && a) es.min = a;
      if (ISO.test(a) && ISO.test(b) && b >= a) out.textContent = ((Date.parse(b) - Date.parse(a)) / 864e5 + 1) + '일';
      else out.textContent = ISO.test(a) && !b ? '1일' : '';
    }

    // 연락처 자동 하이픈
    var ph = el('phone');
    if (ph) ph.addEventListener('input', function () {
      var pos = ph.selectionStart, before = ph.value.length;
      ph.value = hyphen(ph.value);
      try { var nd = pos + (ph.value.length - before); ph.setSelectionRange(nd, nd); } catch (e) {}
    });

    function fieldBox(n) { return form.querySelector('.kd-tsec:not([hidden]) [data-field="' + n + '"]') || form.querySelector('[data-field="' + n + '"]'); }
    function setErr(n, text) {
      var b = fieldBox(n); if (!b) return;
      var p = $('.kd-f-err', b); if (p) p.textContent = text || '';
      b.classList.toggle('is-err', !!text);
      var inp = b.querySelector('input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea');
      if (inp) { if (text) inp.setAttribute('aria-invalid', 'true'); else inp.removeAttribute('aria-invalid'); }
    }
    var FIELDS = ['inquiry_type', 'event_kind', 'region_sido', 'event_start', 'event_end', 'headcount', 'buy_qty', 'rental_months', 'rental_qty', 'area_pyeong', 'items', 'name', 'phone', 'email', 'photos', 'agree'];
    var STEP_OF = { inquiry_type: 1, name: 3, phone: 3, email: 3, photos: 3, agree: 3 };

    // 필수 검사: [칸, 이유, 단계]
    function problems() {
      var out = [], k = kind();
      var num = function (n, lo, hi, l) { var v = val(n).replace(/[,\s]/g, ''); if (v && (!/^\d+(\.\d+)?$/.test(v) || +v < lo || +v > hi)) out.push([n, l + '은(는) 숫자로 적어 주세요', 2]); };
      if (!k) out.push(['inquiry_type', '문의 유형을 골라 주세요', 1]);
      if (k === 'event') {
        if (type === 'full' && !val('event_kind')) out.push(['event_kind', '행사 종류를 골라 주세요', 2]);
        var a = val('event_start'), b = val('event_end');
        if (type === 'full' && !a) out.push(['event_start', '행사 시작일을 골라 주세요', 2]);
        else if (a && (!ISO.test(a) || a < todayIso())) out.push(['event_start', '행사 시작일을 다시 골라 주세요 (지난 날짜 안 됨)', 2]);
        if (b && a && b < a) out.push(['event_start', '종료일이 시작일보다 앞입니다', 2]);
        num('headcount', 1, 1000000, '예상 인원');
      }
      if ((k === 'event' || k === 'share') && !val('region_sido')) out.push(['region_sido', (k === 'event' ? '행사' : '매장') + ' 지역(시·도)을 골라 주세요', type === 'full' ? 2 : 3]);
      if (k === 'buy') num('buy_qty', 1, 999, '희망 수량');
      if (k === 'rental') { num('rental_months', 1, 120, '렌탈 기간'); num('rental_qty', 1, 999, '수량'); }
      if (k === 'share') num('area_pyeong', 0.1, 100000, '매장 면적');
      if (ilist) $$('.kd-item', ilist).forEach(function (li, i) {
        var nm = $('[data-k=name]', li).value.trim(), q = $('[data-k=qty]', li).value.trim();
        if (nm && !(/^\d+$/.test(q) && +q >= 1 && +q <= 999)) out.push(['items', (i + 1) + '번째 기종의 수량을 1~999 로 적어 주세요', 2]);
      });
      if (!val('name')) out.push(['name', '성함을 입력해 주세요', 3]);
      else if (val('name').length < 2) out.push(['name', '성함을 두 글자 이상 입력해 주세요', 3]);
      var pd = digits(val('phone'));
      if (!pd) out.push(['phone', '연락처를 입력해 주세요', 3]);
      else if (!PHONE_RE.test(pd)) out.push(['phone', '연락처 형식을 확인해 주세요', 3]);
      var em = val('email');
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) out.push(['email', '이메일 형식을 확인해 주세요', 3]);
      if (photos.length > 3) out.push(['photos', '사진은 3장까지 붙일 수 있습니다', 3]);
      if (!el('agree') || !el('agree').checked) out.push(['agree', '개인정보 수집에 동의해 주세요', 3]);
      return out;
    }

    // ---- 단계 (전체 폼) ----
    function showStep(n, focus) {
      if (type !== 'full') return;
      step = n;
      $$('.kd-iqs', form).forEach(function (fs) { fs.classList.toggle('is-on', +fs.dataset.step === n); });
      $$('.kd-iqsteps-i', form).forEach(function (li) { var s = +li.dataset.go; li.classList.toggle('is-on', s === n); li.classList.toggle('is-done', s < n); if (s === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      if (focus) {
        var top = form.getBoundingClientRect().top + window.pageYOffset - 110;
        if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: REDUCE ? 'auto' : 'smooth' });
        var fs = form.querySelector('.kd-iqs[data-step="' + n + '"]');
        var first = fs && fs.querySelector('input:not([type=hidden]):not(:disabled):not(.kd-photos-in),select:not(:disabled),textarea');
        if (first && n > 1) try { first.focus({ preventScroll: true }); } catch (e) {}
      }
      refresh();
    }
    function tryStep(n) {
      if (n <= step) { showStep(n, true); return; }
      var ps = problems().filter(function (p) { return p[2] < n; });
      if (ps.length) {
        ps.forEach(function (p) { touched[p[0]] = true; });
        showStep(ps[0][2], true); refresh();
        var b = fieldBox(ps[0][0]); var inp = b && b.querySelector('input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea'); if (inp) inp.focus();
        return;
      }
      showStep(n, true);
    }
    // 유형 카드를 누르면 (이미 골라져 있던 카드여도) 다음 단계로
    $$('.kd-type', form).forEach(function (lb) { lb.addEventListener('click', function (e) { if (type !== 'full' || step !== 1 || !e.isTrusted) return; setTimeout(function () { applyKind(); tryStep(2); }, 160); }); });
    $$('[data-next]', form).forEach(function (b) { b.addEventListener('click', function () { tryStep(+b.dataset.next); }); });
    $$('.kd-iqsteps-i', form).forEach(function (li) { li.addEventListener('click', function () { tryStep(+li.dataset.go); }); });

    function refresh() {
      if (!btn || done) return;
      var ps = problems();
      FIELDS.forEach(function (n) {
        var hit = null; ps.forEach(function (p) { if (p[0] === n && hit === null) hit = p[1]; });
        if (touched[n] || hit === null) setErr(n, touched[n] ? hit : '');
      });
      var touchedAny = function () { for (var k in touched) if (touched[k]) return true; return false; };
      var reason = '';
      if (sending) reason = '보내는 중입니다';
      else if (ps.length) reason = ps[0][1];
      else if (tokenState.status === 'wait') reason = '보안 확인값을 받는 중입니다';
      else if (tokenState.status === 'fail') reason = '보안 확인값을 받지 못했습니다. 전화로 문의해 주세요';
      btn.disabled = !!reason;
      btn.setAttribute('aria-disabled', reason ? 'true' : 'false');
      // v1.2.1 한 줄짜리 빠른 상담 띠는 단추 글자를 그대로 두고, 막힌 이유는 아래 안내 줄에만 적는다 (단추가 늘었다 줄었다 하지 않게)
      var quick = form.classList.contains('kd-iq--quick');
      if (btnT) btnT.textContent = quick ? label : (reason || label);
      if (quick && msg && !sending) { msg.textContent = reason && touchedAny() ? reason : ''; msg.className = 'kd-form-msg' + (reason && touchedAny() ? ' is-bad' : ''); }
      btn.classList.toggle('is-busy', sending);
      // 다음 단계 단추: 이 단계에서 막힌 이유를 단추에 적는다
      $$('.kd-iqs-next', form).forEach(function (nb) {
        var to = +nb.dataset.next, why = ''; ps.forEach(function (p) { if (!why && p[2] < to) why = p[1]; });
        var t = nb.nextElementSibling && nb.nextElementSibling.classList.contains('kd-next-why') ? nb.nextElementSibling : null;
        if (!t) { t = d.createElement('small'); t.className = 'kd-next-why'; nb.parentNode.insertBefore(t, nb.nextSibling); }
        t.textContent = why ? '먼저: ' + why : '';
      });
    }

    form.addEventListener('input', function (e) {
      var n = e.target.name || ''; if (n && e.target.value !== '') touched[n.replace(/^items\[.*$/, 'items')] = true;
      if (!started && n && n !== 'hp') { started = true; track('form_start', { form: type }); }
      if (n === 'event_start' || n === 'event_end') syncDays();
      refresh();
    });
    form.addEventListener('change', function (e) {
      var n = e.target.name || ''; if (n) touched[n.replace(/^items\[.*$/, 'items')] = true;
      if (n === 'inquiry_type') applyKind();
      if (n === 'event_start' || n === 'event_end') { touched.event_start = true; syncDays(); }
      refresh();
    });
    form.addEventListener('focusout', function (e) { var n = e.target.name; if (n && (e.target.value || '') !== '') { touched[n.replace(/^items\[.*$/, 'items')] = true; refresh(); } });

    // 폼이 화면에 보이면 한 번 기록
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { track('form_view', { form: type }); io.disconnect(); } }); }, { threshold: .3 });
      io.observe(form);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending || done) return;
      var ps = problems();
      if (ps.length) {
        ps.forEach(function (p) { touched[p[0]] = true; });
        if (type === 'full' && ps[0][2] !== step) showStep(ps[0][2], true);
        refresh();
        var b = fieldBox(ps[0][0]); var inp = b && b.querySelector('input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea'); if (inp) inp.focus();
        return;
      }
      if (tokenState.status !== 'ok') { refresh(); return; }
      el('_t').value = tokenState.t;
      if (ph) ph.value = hyphen(ph.value);
      renumber();
      sending = true; refresh();
      if (msg) { msg.textContent = ''; msg.className = 'kd-form-msg'; }
      Promise.all(photos.map(shrink)).then(function (small) {
        var fd = new FormData(form);
        if (fd.delete) fd.delete('photos[]');
        small.forEach(function (f) { fd.append('photos[]', f, f.name || 'photo.jpg'); });
        return fetch(form.getAttribute('action') || '/api/inquiry.php', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'fetch', 'Accept': 'application/json' } });
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false, msg: '서버 응답을 읽지 못했습니다 (' + r.status + ')' }; }); })
        .then(function (j) {
          sending = false;
          if (j && j.ok) {
            done = true;
            track('form_done', { form: type, kind: kind() });
            var doneBox = box && $('.kd-form-done', box);
            if (doneBox) {
              if (j.msg) { var ps2 = doneBox.querySelectorAll('p'); if (ps2[1]) ps2[1].textContent = j.msg; }
              form.hidden = true; doneBox.hidden = false; doneBox.focus();
            } else if (msg) { msg.textContent = j.msg || '접수되었습니다'; msg.className = 'kd-form-msg is-ok'; }
            return;
          }
          var errs = (j && j.errors) || {};
          var keys = Object.keys(errs);
          keys.forEach(function (k) { touched[k] = true; });
          if (msg) { msg.textContent = (j && j.msg) || '접수하지 못했습니다. 잠시 뒤 다시 시도하거나 전화로 문의해 주세요'; msg.className = 'kd-form-msg is-bad'; }
          // 토큰은 한 번 쓰면 새로 받는다
          fetchToken(function () { refresh(); keys.forEach(function (k) { setErr(k, errs[k]); }); });
          refresh();
          keys.forEach(function (k) { setErr(k, errs[k]); });
          var fk = keys[0];
          if (fk && type === 'full') showStep(STEP_OF[fk] || 2, true);
          keys.forEach(function (k) { setErr(k, errs[k]); });
          var fb = fk && fieldBox(fk); var fi = fb && fb.querySelector('input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea'); if (fi) fi.focus();
        })
        .catch(function () {
          sending = false;
          if (msg) { msg.textContent = '네트워크 오류로 보내지 못했습니다. 잠시 뒤 다시 시도하거나 전화로 문의해 주세요'; msg.className = 'kd-form-msg is-bad'; }
          refresh();
        });
    });

    // ---- 처음 상태: 주소로 넘어온 유형·업종 ----
    var qt = qs.get('type');
    if (qt) {
      var rr = form.querySelector('input[name="inquiry_type"][value="' + (window.CSS && CSS.escape ? CSS.escape(qt) : qt) + '"]'); if (rr) rr.checked = true;
      var rs = form.querySelector('select[name="inquiry_type"]'); if (rs && rs.querySelector('option[value="' + (window.CSS && CSS.escape ? CSS.escape(qt) : qt) + '"]')) rs.value = qt;
    }
    var qb = qs.get('biz');
    if (qb) $$('select[name="biz_slug"]', form).forEach(function (s) { if (!s.value && s.querySelector('option[value="' + (window.CSS && CSS.escape ? CSS.escape(qb) : qb) + '"]')) s.value = qb; });
    applyKind(); syncDays(); renumber();
    if (type === 'full' && kind() && (qt || qs.get('product') || qs.get('pid'))) showStep(2, false);
    else showStep(1, false);
    tokenState.listeners.push(refresh);
    refresh();
  });

  /* ---------- 404 검색: 제품 목록으로 ---------- */
  var sf = $('[data-search]');
  if (sf) sf.addEventListener('submit', function (e) {
    var v = (sf.elements.q.value || '').trim();
    if (!v) { e.preventDefault(); sf.elements.q.focus(); }
  });
  /* ---------- 인기 기종 좌우 넘김 (시안 F) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-car]'), function (b) {
    b.addEventListener('click', function () {
      var sec = b.closest('section'); var track = sec && sec.querySelector('.kd-car');
      if (!track) return;
      var card = track.firstElementChild; var step = card ? card.getBoundingClientRect().width + 16 : 300;
      track.scrollBy({ left: step * parseInt(b.getAttribute('data-car'), 10), behavior: 'smooth' });
    });
  });
})();

/* ---------- v1.0.5 움직임: 머리 유리판 · 펼침 메뉴 · 첫 화면 사진 넘김 · 로고 톡톡 · 나타나기 · 크게 보기 · 목차 따라감 · 모바일 견적 바 ----------
   prefers-reduced-motion 이면 자동 넘김·로고 튐·나타나기를 하지 않는다 (버튼은 그대로 작동) */
(function () {
  'use strict';
  var d = document, w = window;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var mq = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reduce = function () { return !!(mq && mq.matches); };

  /* 머리: 스크롤하면 얇은 흰 유리판 */
  var hd = $('[data-hd]');
  if (hd) {
    var ticking = false;
    var onScroll = function () {
      ticking = false;
      hd.classList.toggle('is-scrolled', (w.pageYOffset || d.documentElement.scrollTop) > 12);
    };
    w.addEventListener('scroll', function () { if (!ticking) { ticking = true; w.requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  /* 펼침 메뉴: 마우스·키보드·터치 모두 (aria-expanded 맞춤) */
  $$('.kd-nav-item.has-sub').forEach(function (it) {
    var link = $('.kd-nav-link', it), t = 0;
    var open = function () { clearTimeout(t); $$('.kd-nav-item.is-open').forEach(function (o) { if (o !== it) { o.classList.remove('is-open'); var l = $('.kd-nav-link', o); if (l) l.setAttribute('aria-expanded', 'false'); } }); it.classList.add('is-open'); if (link) link.setAttribute('aria-expanded', 'true'); };
    var close = function (now) { clearTimeout(t); t = setTimeout(function () { it.classList.remove('is-open'); if (link) link.setAttribute('aria-expanded', 'false'); }, now ? 0 : 160); };
    it.addEventListener('mouseenter', function () { t = setTimeout(open, 70); });
    it.addEventListener('mouseleave', function () { close(false); });
    it.addEventListener('focusin', open);
    it.addEventListener('focusout', function (e) { if (!it.contains(e.relatedTarget)) close(true); });
    it.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(true); if (link) link.focus(); } });
    // 터치 화면(마우스 없음): 첫 번째 누름은 펼치기, 두 번째 누름은 이동
    if (link) link.addEventListener('click', function (e) {
      if (w.matchMedia && w.matchMedia('(hover: none)').matches && !it.classList.contains('is-open')) { e.preventDefault(); open(); }
    });
  });
  d.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.kd-nav-item.has-sub')) $$('.kd-nav-item.is-open').forEach(function (o) { o.classList.remove('is-open'); var l = $('.kd-nav-link', o); if (l) l.setAttribute('aria-expanded', 'false'); }); });

  /* 첫 화면 사진 넘김 */
  $$('[data-hs]').forEach(function (box) {
    var slides = $$('.kd-hs-slide', box), dots = $$('[data-hs-go]', box), pauseBtn = $('[data-hs-pause]', box);
    if (slides.length < 2) return;
    var cur = 0, timer = 0, userPaused = false, hover = false, dur = parseInt(box.dataset.interval || '6000', 10) || 6000;
    box.style.setProperty('--hs-dur', dur + 'ms');
    var loadImg = function (i) { var im = $('img', slides[i]); if (im && im.loading === 'lazy') im.loading = 'eager'; };
    function go(i, user) {
      i = (i + slides.length) % slides.length;
      if (i === cur) return;
      loadImg(i); loadImg((i + 1) % slides.length);
      var prev = slides[cur];
      prev.classList.remove('is-on'); prev.classList.add('is-leaving'); prev.setAttribute('aria-hidden', 'true');
      setTimeout(function () { prev.classList.remove('is-leaving'); }, 1400);
      var nx = slides[i];
      nx.classList.remove('is-leaving');
      void nx.offsetWidth; // 확대 움직임을 처음부터
      nx.classList.add('is-on'); nx.removeAttribute('aria-hidden');
      $$('a', prev).forEach(function (a) { a.tabIndex = -1; });
      $$('a', nx).forEach(function (a) { a.removeAttribute('tabindex'); });
      dots.forEach(function (dt, k) {
        dt.classList.toggle('is-on', k === i);
        if (k === i) dt.setAttribute('aria-current', 'true'); else dt.removeAttribute('aria-current');
        // 진행 막대를 다시 시작
        var sp = $('span', dt); if (sp && k === i) { sp.style.animation = 'none'; void sp.offsetWidth; sp.style.animation = ''; }
      });
      cur = i;
      if (user) restart();
    }
    function auto() { return !userPaused && !reduce(); }
    function restart() {
      clearTimeout(timer);
      box.classList.toggle('is-auto', auto());
      box.classList.toggle('is-paused', hover);
      if (auto() && !hover && !d.hidden) timer = setTimeout(function () { go(cur + 1); restart(); }, dur);
    }
    $$('[data-hs-prev]', box).forEach(function (b) { b.addEventListener('click', function () { go(cur - 1, true); }); });
    $$('[data-hs-next]', box).forEach(function (b) { b.addEventListener('click', function () { go(cur + 1, true); }); });
    dots.forEach(function (b) { b.addEventListener('click', function () { go(parseInt(b.dataset.hsGo, 10), true); }); });
    if (pauseBtn) {
      if (reduce()) { pauseBtn.setAttribute('aria-pressed', 'true'); pauseBtn.setAttribute('aria-label', '자동 넘김 시작'); }
      pauseBtn.addEventListener('click', function () {
        userPaused = auto(); // 돌고 있으면 멈추고, 멈춰 있으면 돈다
        if (!userPaused && reduce()) userPaused = false;
        pauseBtn.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
        pauseBtn.setAttribute('aria-label', userPaused ? '자동 넘김 시작' : '자동 넘김 멈추기');
        if (!userPaused && reduce()) { go(cur + 1, true); return; }
        restart();
      });
    }
    box.addEventListener('mouseenter', function () { hover = true; restart(); });
    box.addEventListener('mouseleave', function () { hover = false; restart(); });
    box.addEventListener('focusin', function () { hover = true; restart(); });
    box.addEventListener('focusout', function (e) { if (!box.contains(e.relatedTarget)) { hover = false; restart(); } });
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { go(cur + 1, true); } else if (e.key === 'ArrowLeft') { go(cur - 1, true); } });
    var sx = null;
    box.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 45) go(cur + (dx < 0 ? 1 : -1), true); }, { passive: true });
    d.addEventListener('visibilitychange', restart);
    if (mq && mq.addEventListener) mq.addEventListener('change', restart);
    // 첫 장이 뜬 뒤 다음 장을 미리
    w.addEventListener('load', function () { loadImg(1); });
    restart();
  });

  /* 로고 톡톡: 불러온 뒤 한 번, 8초마다, 마우스를 올릴 때 */
  $$('[data-logo]').forEach(function (lg) {
    var busy = false;
    function hop() {
      if (reduce() || busy || d.hidden) return;
      busy = true;
      lg.classList.remove('is-hop'); void lg.offsetWidth; lg.classList.add('is-hop');
      setTimeout(function () { lg.classList.remove('is-hop'); busy = false; }, 1500);
    }
    var start = function () { setTimeout(hop, 350); setInterval(hop, 8000); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(start, start); else start();
    var a = lg.closest('a') || lg;
    a.addEventListener('mouseenter', hop);
    a.addEventListener('focus', hop);
  });

  /* 나타나기: 처음 화면 아래에 있는 덩어리만 살짝 떠오르며 보이게 */
  if ('IntersectionObserver' in w && !reduce()) {
    var sel = ['.kd-sec .kd-sechd', '.kd-grid > *', '.kd-hpc-grid:not(.kd-car) > *', '.kd-featc > li', '.kd-inst > li', '.kd-tl > li', '.kd-org-teams > li', '.kd-certg > li',
      '.kd-cobiz > li', '.kd-maker-steps > li', '.kd-steps > *', '.kd-trust-list > li', '.kd-bizrows > *', '.kd-pains > li', '.kd-ctaband', '.kd-faq-i', '.kd-spec--v2',
      '.kd-co-grid > *', '.kd-chkgrid > *', '.kd-inq-form', '.kd-pd-sec .kd-prose', '.kd-files > li', '.kd-hero-biz-in', '.kd-map', '.kd-maker-in', '.kd-lib-grp'].join(',');
    var vh = w.innerHeight || 800;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('is-in'); io.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    $$(sel).forEach(function (el) {
      if (el.closest('.kd-hero, .kd-phd, .kd-bizhero, .kd-pd-hero, .kd-drawer, .kd-mega') || el.classList.contains('kd-rv')) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92) return; // 이미 보이는 것은 그대로
      var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      el.style.setProperty('--rv', String(Math.min(sib % 8, 6)));
      el.classList.add('kd-rv');
      io.observe(el);
    });
    // 인쇄·주소 이동(#)으로 바로 내려간 경우 대비: 3초 뒤 남은 것도 보이게 하지 않음 — 화면에 들어오면 보임
  }

  /* 크게 보기 (라이트박스) — 제품·사례 갤러리, 인증서 묶음 [data-lb-group] a[data-lb] */
  var lb = null, lbItems = [], lbIdx = 0, lbBack = null;
  function lbBuild() {
    lb = d.createElement('div');
    lb.className = 'kd-lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', '사진 크게 보기');
    lb.innerHTML = '<p class="kd-lb-n" aria-live="polite"></p><button type="button" class="kd-lb-x" aria-label="닫기"><svg class="kd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>'
      + '<button type="button" class="kd-lb-nav kd-lb-prev" aria-label="이전 사진"><svg class="kd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></button>'
      + '<button type="button" class="kd-lb-nav kd-lb-next" aria-label="다음 사진"><svg class="kd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg></button>'
      + '<figure class="kd-lb-fig"><img class="kd-lb-img" alt="" width="800" height="800"><figcaption class="kd-lb-cap"></figcaption></figure>';
    d.body.appendChild(lb);
    $('.kd-lb-x', lb).addEventListener('click', lbClose);
    $('.kd-lb-prev', lb).addEventListener('click', function () { lbShow(lbIdx - 1); });
    $('.kd-lb-next', lb).addEventListener('click', function () { lbShow(lbIdx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('kd-lb-fig')) lbClose(); });
    var img = $('.kd-lb-img', lb);
    img.addEventListener('click', function () { img.classList.toggle('is-zoom'); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') lbClose();
      else if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
      else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
      else if (e.key === 'Tab') { var f = $$('button', lb).filter(function (b) { return !b.hidden; }); var i = f.indexOf(d.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) lbShow(lbIdx + (dx < 0 ? 1 : -1)); }, { passive: true });
  }
  function lbShow(i) {
    if (!lbItems.length) return;
    lbIdx = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIdx], img = $('.kd-lb-img', lb);
    img.classList.remove('is-zoom');
    img.removeAttribute('srcset');
    if (it.w && it.h) { img.width = it.w; img.height = it.h; img.style.setProperty('--nh', it.h + 'px'); }
    img.src = it.src; img.alt = it.alt || '';
    $('.kd-lb-cap', lb).textContent = it.cap || it.alt || '';
    $('.kd-lb-n', lb).textContent = lbItems.length > 1 ? (lbIdx + 1) + ' / ' + lbItems.length : '';
    $('.kd-lb-prev', lb).hidden = $('.kd-lb-next', lb).hidden = lbItems.length < 2;
  }
  function lbOpen(items, i, back) {
    if (!items || !items.length) return;
    if (!lb) lbBuild();
    lbItems = items; lbBack = back || d.activeElement;
    lb.hidden = false; d.body.classList.add('kd-lock');
    lbShow(i || 0);
    requestAnimationFrame(function () { lb.classList.add('is-open'); $('.kd-lb-x', lb).focus(); });
  }
  function lbClose() {
    if (!lb || lb.hidden) return;
    lb.classList.remove('is-open');
    setTimeout(function () { lb.hidden = true; }, reduce() ? 0 : 220);
    d.body.classList.remove('kd-lock');
    if (lbBack && lbBack.focus) lbBack.focus();
  }
  w.KDLightbox = { open: lbOpen, close: lbClose };
  $$('[data-lb-group]').forEach(function (g) {
    var links = $$('a[data-lb]', g);
    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        lbOpen(links.map(function (x) { var im = $('img', x); return { src: x.getAttribute('href'), w: +x.dataset.w, h: +x.dataset.h, alt: im ? im.alt : '', cap: x.dataset.cap || '' }; }), i, a);
      });
    });
  });

  /* 제품 상세 목차: 보고 있는 부분 표시 */
  var spy = $('[data-spy]');
  if (spy && 'IntersectionObserver' in w) {
    var links = $$('a[href^="#"]', spy), map = {};
    links.forEach(function (a) { var t = d.getElementById(a.getAttribute('href').slice(1)); if (t) map[t.id] = a; });
    var setOn = function (a) {
      links.forEach(function (x) { x.classList.toggle('is-on', x === a); });
      var bar = a.parentNode; if (bar && bar.scrollTo) bar.scrollTo({ left: a.offsetLeft - 20, behavior: reduce() ? 'auto' : 'smooth' });
    };
    var sio = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting && map[x.target.id]) setOn(map[x.target.id]); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { sio.observe(d.getElementById(id)); });
  }

  /* 제품 상세 모바일 아래 견적 바: 위쪽 버튼이 화면 밖으로 나가고 견적 폼이 안 보일 때만 */
  var mcta = $('[data-pd-mcta]'), btns = $('[data-pd-btns]'), pinq = $('#kd-pinq');
  if (mcta && btns && 'IntersectionObserver' in w) {
    var btnGone = false, inqSeen = false;
    var upd = function () {
      var on = btnGone && !inqSeen;
      mcta.classList.toggle('is-on', on);
      mcta.setAttribute('aria-hidden', on ? 'false' : 'true');
      $$('a', mcta).forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    };
    new IntersectionObserver(function (en) { en.forEach(function (x) { btnGone = !x.isIntersecting && x.boundingClientRect.top < 0; }); upd(); }).observe(btns);
    if (pinq) new IntersectionObserver(function (en) { en.forEach(function (x) { inqSeen = x.isIntersecting; }); upd(); }, { threshold: 0.05 }).observe(pinq);
  }

  /* 긴 표 더 보기 — 사례 목록이 너무 길어 8건만 보이고 나머지는 눌러야 나온다 */
  $$('[data-more]').forEach(function (b) {
    b.addEventListener('click', function () {
      var sec = b.closest('section'), open = b.getAttribute('aria-expanded') === 'true';
      if (!sec) return;
      $$('.kd-row-more', sec).forEach(function (tr) { tr.hidden = open; });
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
      b.classList.toggle('is-on', !open);
      b.firstChild.nodeValue = open ? b.firstChild.nodeValue.replace('접기', '나머지 ' + $$('.kd-row-more', sec).length + '건 더 보기') : '접기';
    });
  });
})();
