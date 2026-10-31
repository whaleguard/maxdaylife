/* MAXDAY 교육 공통 스크립트 */
(function () {
  // 010 자동 하이픈
  document.querySelectorAll('input[data-phone]').forEach(function (el) {
    el.addEventListener('input', function () {
      var d = this.value.replace(/[^0-9]/g, '').slice(0, 11);
      if (d.length < 4) this.value = d;
      else if (d.length < 8) this.value = d.replace(/(\d{3})(\d+)/, '$1-$2');
      else this.value = d.replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
    });
  });

  // 관심공고 스크랩 토글 (fetch)
  document.body.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-save-job]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    var id = btn.getAttribute('data-save-job');
    fetch((window.GSI_BASE || '') + '/apply.php?ajax=save&job=' + encodeURIComponent(id), {
      method: 'POST', headers: { 'X-Requested-With': 'fetch' }
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.login) { location.href = (window.GSI_BASE || '') + '/login.php'; return; }
      if (j.ok) {
        btn.classList.toggle('on', j.saved);
        btn.textContent = j.saved ? '★' : '☆';
      }
    }).catch(function () {});
  });

  // Daum 우편번호
  window.gsiAddressSearch = function (targetId, sidoId, sigunguId) {
    if (typeof daum === 'undefined') { alert('주소검색 스크립트를 불러오지 못했습니다.'); return; }
    new daum.Postcode({
      oncomplete: function (data) {
        var full = data.roadAddress || data.jibunAddress;
        if (targetId) document.getElementById(targetId).value = full;
        if (sidoId && document.getElementById(sidoId)) document.getElementById(sidoId).value = data.sido.replace(/(특별시|광역시|특별자치도|특별자치시|도)$/,'').replace('경상','경').replace('전라','전').replace('충청','충') || data.sido;
        if (sigunguId && document.getElementById(sigunguId)) document.getElementById(sigunguId).value = data.sigungu;
      }
    }).open();
  };
})();
