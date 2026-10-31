(function () {
  'use strict';
  var KEY = 'kr_compare', MAX = 5;

  function get() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function set(v) { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} render(); }

  function render() {
    var ids  = get();
    var tray = document.getElementById('tray');

    document.querySelectorAll('[data-add]').forEach(function (b) {
      var on = ids.indexOf(b.dataset.add) > -1;
      b.dataset.on = on ? '1' : '0';
      b.textContent = on ? b.dataset.labelOn : b.dataset.labelOff;
    });
    if (!tray) return;

    var list = document.getElementById('trayList');
    list.innerHTML = '';
    ids.forEach(function (id) {
      var src  = document.querySelector('[data-add="' + id + '"]');
      var name = (src && src.dataset.name) || id;
      var s = document.createElement('span');
      s.appendChild(document.createTextNode(name));
      var x = document.createElement('button');
      x.type = 'button';
      x.setAttribute('aria-label', name);
      x.textContent = '\u00d7';
      x.onclick = function () { set(get().filter(function (v) { return v !== id; })); };
      s.appendChild(x);
      list.appendChild(s);
    });

    tray.hidden = ids.length === 0;
    var go = document.getElementById('trayGo');
    if (go) {
      go.href = go.dataset.base + '?ids=' + ids.join(',');
      go.textContent = (go.dataset.label || 'Compare').replace('{n}', ids.length);
      var few = ids.length < 2;
      go.style.pointerEvents = few ? 'none' : '';
      go.style.opacity = few ? '.45' : '';
    }
  }

  function add(id) {
    var ids = get();
    if (ids.indexOf(id) > -1) { set(ids.filter(function (v) { return v !== id; })); return; }
    if (ids.length >= MAX) { alert(document.body.dataset.maxMsg || 'Max ' + MAX); return; }
    ids.push(id); set(ids);
  }

  // 비교함 담기 (비자제한 대학은 확인 모달)
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.blocked === '1' && get().indexOf(b.dataset.add) < 0) {
      var m = document.getElementById('blockModal');
      if (m) {
        m.hidden = false;
        m.dataset.pending = b.dataset.add;
        return;
      }
    }
    add(b.dataset.add);
  });

  var modal = document.getElementById('blockModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target.dataset.act === 'yes') { add(modal.dataset.pending); modal.hidden = true; }
      if (e.target.dataset.act === 'no' || e.target === modal) modal.hidden = true;
    });
  }

  var clear = document.getElementById('trayClear');
  if (clear) clear.onclick = function () { set([]); };

  // 칩 선택 → 폼 자동 제출
  document.querySelectorAll('[data-chip]').forEach(function (c) {
    c.addEventListener('click', function () {
      var input = document.querySelector('input[name="' + c.dataset.chip + '"]');
      if (!input) return;
      var same = input.value === c.dataset.val;
      input.value = same ? '' : c.dataset.val;
      c.closest('form').querySelectorAll('[data-chip="' + c.dataset.chip + '"]')
        .forEach(function (o) { o.classList.remove('on'); });
      if (!same) c.classList.add('on');
      if (c.dataset.auto === '1') c.closest('form').submit();
    });
  });

  // 계산기 · 필터: 값 바뀌면 제출
  document.querySelectorAll('[data-autosubmit]').forEach(function (el) {
    el.addEventListener('change', function () { el.closest('form').submit(); });
  });

  render();
})();
