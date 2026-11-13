/* ================================================================
   소스 보호 (일반 사용자 대상 억제책)
   ------------------------------------------------------------
   ※ 완전 차단은 불가능합니다. 화면 코드는 브라우저에 이미 내려간 것이라
     마음먹은 사람은 어떤 방법으로든 봅니다.
     이 파일은 "지나가다 우클릭해보는 사람"을 막는 용도입니다.
   ※ 관리자 화면에서는 불러오지 않습니다 (작업에 방해되므로).
   ================================================================ */
(function () {
  'use strict';

  /* 입력·복사가 꼭 필요한 곳은 예외로 둔다 (계좌번호·문자문구 등) */
  function allowed(el) {
    if (!el) return false;
    return !!el.closest(
      'input, textarea, select, [contenteditable="true"], ' +
      '.acct, .smsbox, .selectable, .qrbox, [data-copy]'
    );
  }

  function warn(msg) {
    if (typeof toast === 'function') toast(msg);
  }

  /* 1) 마우스 오른쪽 버튼 */
  document.addEventListener('contextmenu', function (e) {
    if (allowed(e.target)) return;
    e.preventDefault();
    warn('이 화면은 복사할 수 없습니다');
  });

  /* 2) 글자 끌어서 선택 */
  document.addEventListener('selectstart', function (e) {
    if (allowed(e.target)) return;
    e.preventDefault();
  });

  /* 3) 그림 끌어가기 */
  document.addEventListener('dragstart', function (e) {
    if (allowed(e.target)) return;
    e.preventDefault();
  });

  /* 4) 단축키 — F12 / Ctrl+U(소스보기) / Ctrl+S(저장) / Ctrl+Shift+I,J,C */
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    var block =
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && !e.shiftKey && (k === 'u' || k === 's')) ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c'));
    if (block) {
      if (allowed(e.target)) return;   /* 입력칸 안에서는 그대로 둔다 */
      e.preventDefault();
      e.stopPropagation();
      warn('이 기능은 사용할 수 없습니다');
      return false;
    }
  }, true);

  /* 5) 복사·잘라내기 */
  ['copy', 'cut'].forEach(function (ev) {
    document.addEventListener(ev, function (e) {
      if (allowed(e.target)) return;
      e.preventDefault();
      warn('이 화면은 복사할 수 없습니다');
    });
  });

  /* 6) 그림 저장 시도 줄이기 */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('img').forEach(function (im) {
      im.setAttribute('draggable', 'false');
    });
  });
})();
