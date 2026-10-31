(function () {
  'use strict';

  /* ── 탭 ── */
  document.querySelectorAll('[data-tabs]').forEach(function (wrap) {
    var tabs = wrap.querySelectorAll('.tab');
    var panes = document.querySelectorAll('[data-pane]');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var key = t.dataset.tab;
        tabs.forEach(function (x) { x.classList.toggle('on', x === t); });
        panes.forEach(function (p) { p.classList.toggle('on', p.dataset.pane === key); });
        try { history.replaceState(null, '', '#' + key); } catch (e) {}
      });
    });
    var hash = location.hash.slice(1);
    if (hash) {
      var target = wrap.querySelector('.tab[data-tab="' + CSS.escape(hash) + '"]');
      if (target) target.click();
    }
  });

  /* ── 삭제 확인 ── */
  document.querySelectorAll('[data-confirm]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (!confirm(el.dataset.confirm)) e.preventDefault();
    });
  });

  /* ── 검수 워크스페이스 ── */
  var rows = Array.prototype.slice.call(document.querySelectorAll('.fieldrow'));
  if (!rows.length) return;

  var idx = 0;
  function focusRow(i) {
    if (i < 0 || i >= rows.length) return;
    rows[idx].classList.remove('focus');
    idx = i;
    rows[idx].classList.add('focus');
    rows[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
    var inp = rows[idx].querySelector('input,textarea');
    if (inp) inp.focus({ preventScroll: true });
  }
  focusRow(0);

  function confirmRow(row) {
    var btn = row.querySelector('[data-confirm-field]');
    if (btn) btn.click();
  }

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);

    if (!typing && (e.key === 'j' || e.key === 'J')) { e.preventDefault(); focusRow(idx + 1); }
    if (!typing && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); focusRow(idx - 1); }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      confirmRow(rows[idx]);
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      var ap = document.getElementById('btnApprove');
      if (ap && !ap.classList.contains('off')) ap.click();
    }
  });

  /* 원문 보기 → 좌측 하이라이트로 스크롤 */
  document.querySelectorAll('[data-jump]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var t = document.getElementById('ev-' + a.dataset.jump);
      if (t) {
        t.scrollIntoView({ block: 'center', behavior: 'smooth' });
        t.style.outline = '2px solid #2B4EE6';
        setTimeout(function () { t.style.outline = ''; }, 1200);
      }
    });
  });
})();
