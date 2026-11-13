/* 홈 화면 앱으로 쓰기 위한 준비 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function(){
    var base = document.querySelector('link[rel=manifest]');
    var scope = base ? base.getAttribute('href').replace(/manifest\.php.*$/, '') : './';
    navigator.serviceWorker.register(scope + 'sw.js', {scope: scope}).catch(function(){});
  });
}
/* 안드로이드에서 "홈 화면에 추가"를 우리 버튼으로 띄운다 */
var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault(); deferredPrompt = e;
  document.querySelectorAll('[data-install]').forEach(function(b){ b.style.display=''; });
});
function installApp(){
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(){ deferredPrompt = null; });
  } else {
    location.href = document.body.dataset.base + 'install_app.php';
  }
}
window.addEventListener('appinstalled', function(){ toast('홈 화면에 앱이 만들어졌습니다'); });

/* 공통 스크립트 — 카운트다운 / 확인창 / 토스트 / 체크박스 / 사진첨부 미리보기 */

function toast(t){
  var e=document.getElementById('toast'); if(!e) return;
  e.textContent=t; e.classList.add('on');
  clearTimeout(e._t); e._t=setTimeout(function(){e.classList.remove('on')},2300);
}
function closeModal(){ var m=document.getElementById('mask'); if(m) m.classList.remove('on'); }
function infoBox(title, body){
  document.getElementById('modal').innerHTML =
    '<div class="mh">'+title+'</div><div class="mb">'+body+'</div>'+
    '<div class="mf"><button class="btn btn-dark" onclick="closeModal()">확인</button></div>';
  document.getElementById('mask').classList.add('on');
}
/* 결과를 문장으로 먼저 설명하고, 확인 버튼은 동사로 */
function askThen(formId, title, body, okLabel, danger){
  document.getElementById('modal').innerHTML =
    '<div class="mh">'+title+'</div><div class="mb">'+body+'</div>'+
    '<div class="mf"><button class="btn btn-line" onclick="closeModal()">그만두기</button>'+
    '<button class="btn '+(danger?'btn-danger':'btn-main')+'" id="_ok">'+okLabel+'</button></div>';
  document.getElementById('mask').classList.add('on');
  document.getElementById('_ok').onclick=function(){
    this.disabled=true; this.textContent='처리 중...';
    document.getElementById(formId).submit();
  };
}

/* 남은 시간 실시간 표시 — 시계표기(00:00:00) 금지, 문장형 */
function tick(){
  var now=Date.now();
  document.querySelectorAll('[data-dl]').forEach(function(el){
    var t=parseInt(el.dataset.dl,10)*1000, d=t-now, txt, hot=false;
    if(d<=0){ txt='시간이 지났습니다'; hot=true; }
    else{
      var h=Math.floor(d/3600000), m=Math.floor((d%3600000)/60000);
      if(h>=24){ txt=Math.floor(h/24)+'일 '+(h%24)+'시간 남음'; }
      else{ txt=h+'시간 '+m+'분 남음'; hot=h<12; }
    }
    el.textContent=txt;
    var box=el.closest('.cdn'); if(box && !box.classList.contains('res')) box.classList.toggle('warm',hot);
    if(el.classList.contains('pill-time')) el.classList.toggle('cool',!hot);
  });
}
setInterval(tick,1000);

/* 확인 버튼 (data-ask) — 속성에 담긴 문구를 읽어 확인창을 띄운다 */
document.addEventListener('click', function(e){
  var btn = e.target.closest('[data-ask]');
  if(!btn) return;
  e.preventDefault();
  askThen(btn.dataset.ask, btn.dataset.title || '확인',
          btn.dataset.body || '', btn.dataset.ok || '진행하기',
          btn.dataset.danger === '1');
});

/* 체크박스 라벨 토글 */
document.addEventListener('change', function(e){
  if(e.target.matches('.chk input[type=checkbox], .chk input[type=radio]')){
    var name=e.target.name;
    if(e.target.type==='radio' && name){
      document.querySelectorAll('.chk input[name="'+CSS.escape(name)+'"]').forEach(function(i){
        i.closest('.chk').classList.toggle('on', i.checked);
      });
    } else {
      e.target.closest('.chk').classList.toggle('on', e.target.checked);
    }
    if(typeof onPick==='function') onPick();
  }
});

/* 사진 촬영 첨부 미리보기 */
document.addEventListener('change', function(e){
  if(!e.target.matches('.shot input[type=file]')) return;
  var box=e.target.closest('.shot'), f=e.target.files[0];
  if(!f){ box.classList.remove('has'); return; }
  box.classList.add('has');
  var nm=box.querySelector('.sname');
  if(nm) nm.textContent='첨부됨 : '+f.name;
  var pv=box.querySelector('.spv');
  if(pv && f.type.indexOf('image')===0){
    var r=new FileReader();
    r.onload=function(){ pv.innerHTML='<img src="'+r.result+'" style="max-height:150px;margin:10px auto 0;border-radius:9px">'; };
    r.readAsDataURL(f);
  }
});

/* 계좌번호 복사 */
function copyText(t){
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(t).then(function(){toast('계좌번호가 복사되었습니다')});
  }else{
    var a=document.createElement('textarea'); a.value=t; document.body.appendChild(a);
    a.select(); try{document.execCommand('copy'); toast('계좌번호가 복사되었습니다');}catch(x){}
    document.body.removeChild(a);
  }
}

/* 필수 입력 누락 시 첫 항목으로 스크롤 + 포커스 */
document.addEventListener('submit', function(e){
  var f=e.target; if(!f.matches('form[data-check]')) return;
  var bad=null;
  f.querySelectorAll('[required]').forEach(function(el){
    if(!bad && !el.value.trim()) bad=el;
  });
  if(bad){ e.preventDefault(); bad.scrollIntoView({block:'center'}); bad.focus();
    toast('빈 칸이 있습니다. 표시된 곳을 채워주세요.'); }
});

tick();


/* ── 바탕화면 바로가기 안내 배너 ───────────────────────────
   · 이미 앱으로 깔아 쓰는 중이면 안 띄운다
   · [나중에] 를 누르면 7일 동안 안 띄운다
   · 안드로이드·PC 는 눌러서 바로 설치, 아이폰은 방법을 그림처럼 알려준다 */
(function(){
  var bar = document.getElementById('a2hs');
  if (!bar) return;

  var KEY = 'a2hs_hide_until';
  function installed(){
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches)
        || window.navigator.standalone === true
        || document.referrer.indexOf('android-app://') === 0;
  }
  function hidden(){
    try { return parseInt(localStorage.getItem(KEY) || '0', 10) > Date.now(); } catch(e){ return false; }
  }
  function snooze(days){
    try { localStorage.setItem(KEY, String(Date.now() + days*86400000)); } catch(e){}
    bar.hidden = true;
  }

  var ua  = navigator.userAgent;
  var iOS = /iPhone|iPad|iPod/i.test(ua);
  var safari = iOS && !/CriOS|FxiOS|EdgiOS|KAKAOTALK|NAVER/i.test(ua);
  var inApp  = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line/i.test(ua);

  function show(sub, label){
    if (installed() || hidden()) return;
    if (sub)   document.getElementById('a2hs-sub').textContent = sub;
    if (label) document.getElementById('a2hs-go').textContent  = label;
    bar.hidden = false;
    requestAnimationFrame(function(){ bar.classList.add('on'); });
  }

  document.getElementById('a2hs-no').onclick = function(){ snooze(7); };
  document.getElementById('a2hs-x').onclick  = function(){ snooze(7); };

  document.getElementById('a2hs-go').onclick = function(){
    if (deferredPrompt) {                     /* 안드로이드·PC 크롬 */
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function(r){
        deferredPrompt = null;
        if (r && r.outcome === 'accepted') { bar.hidden = true; }
        else snooze(3);
      });
      return;
    }
    if (inApp) {                              /* 카카오톡·네이버 앱 안 */
      infoBox('먼저 인터넷 앱으로 열어주세요',
        '지금은 <b>카카오톡(또는 네이버) 안에서</b> 보고 계셔서 바로가기를 만들 수 없습니다.<br><br>'
        + '오른쪽 위 <b>⋮ (점 세 개)</b> → <b>다른 브라우저로 열기</b> 를 누르신 뒤 다시 시도해 주세요.');
      return;
    }
    if (iOS) {                                /* 아이폰 */
      infoBox('아이폰에서 바로가기 만들기',
        safari
          ? '① 화면 <b>아래 가운데 공유 버튼</b> ⬆️ 를 누릅니다<br>'
            + '② 목록을 아래로 넘겨 <b>홈 화면에 추가</b> 를 누릅니다<br>'
            + '③ 오른쪽 위 <b>추가</b> 를 누르면 끝입니다'
          : '아이폰은 <b>사파리(Safari)</b> 로 열어야 만들 수 있습니다.<br>'
            + '나침반 모양 아이콘으로 이 주소를 다시 열어주세요.');
      return;
    }
    location.href = document.body.dataset.base + 'install_app.php';   /* 그 밖 */
  };

  window.addEventListener('beforeinstallprompt', function(){
    setTimeout(function(){ show(null, '만들기'); }, 1200);
  });
  window.addEventListener('appinstalled', function(){ bar.hidden = true; });

  /* 설치 신호가 안 오는 브라우저(아이폰 등)도 안내는 해준다 */
  setTimeout(function(){
    if (bar.hidden === false || deferredPrompt) return;
    if (iOS)        show('사파리 공유 버튼으로 홈 화면에 추가하시면 됩니다.', '방법 보기');
    else if (inApp) show('인터넷 앱으로 열면 바로가기를 만들 수 있습니다.', '방법 보기');
    else            show(null, '방법 보기');
  }, 4500);
})();
