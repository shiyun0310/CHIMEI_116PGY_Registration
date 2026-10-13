(function () {
  'use strict';

  /* ===== 設定 =====
   * GAS_URL：Google Apps Script 部署成「網頁應用程式」後取得的網址（結尾為 /exec）。
   * 設定方式請見 gas/README.md。 */
  var GAS_URL = '';

  var EVENT = {
    title: '奇美醫院116學年度西醫PGY醫師招募說明會',
    start: new Date('2026-11-29T13:00:00+08:00'),
    end: new Date('2026-11-29T17:15:00+08:00'),
    location: '奇美醫院第五醫療大樓5樓國際會議廳（台南市永康區中華路901號）',
    details: '內科、外科、婦產科、兒科、急診訓練特色分享、Y2學長分享與分科互動交流。'
  };

  /* ===== Nav ===== */
  var nav = document.getElementById('nav');
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('menu');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 20); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toggle.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
  });

  /* ===== Countdown ===== */
  var cdEls = {};
  ['d', 'h', 'm', 's'].forEach(function (k) { cdEls[k] = document.querySelector('[data-cd="' + k + '"]'); });
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function setCd(k, v) {
    var el = cdEls[k];
    if (el.textContent !== v) {
      el.textContent = v;
      el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
    }
  }
  var timer;
  function tick() {
    var diff = EVENT.start - Date.now();
    if (diff <= 0) {
      if (Date.now() > EVENT.end) {
        document.getElementById('countdown').hidden = true;
        document.getElementById('cdDone').hidden = false;
      } else {
        ['d', 'h', 'm', 's'].forEach(function (k) { setCd(k, '00'); });
      }
      clearInterval(timer);
      return;
    }
    var s = Math.floor(diff / 1000);
    setCd('d', String(Math.floor(s / 86400)));
    setCd('h', pad(Math.floor(s % 86400 / 3600)));
    setCd('m', pad(Math.floor(s % 3600 / 60)));
    setCd('s', pad(s % 60));
  }
  tick();
  timer = setInterval(tick, 1000);

  /* ===== Reveal on scroll ===== */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ===== Agenda cards: tap to animate ===== */
  document.querySelectorAll('.tl-card').forEach(function (card) {
    if (card.tagName === 'A') return;
    card.addEventListener('click', function () {
      card.classList.remove('active'); void card.offsetWidth; card.classList.add('active');
      setTimeout(function () { card.classList.remove('active'); }, 900);
    });
  });

  /* ===== Tabs ===== */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });

  /* ===== Calendar ===== */
  function utc(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  var gcal = document.getElementById('gcal');
  gcal.href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    '&text=' + encodeURIComponent(EVENT.title) +
    '&dates=' + utc(EVENT.start) + '/' + utc(EVENT.end) +
    '&location=' + encodeURIComponent(EVENT.location) +
    '&details=' + encodeURIComponent(EVENT.details);

  document.getElementById('ics').addEventListener('click', function () {
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CHIMEI//PGY116//ZH-TW', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:pgy116-20261129@chimei',
      'DTSTAMP:' + utc(new Date()),
      'DTSTART:' + utc(EVENT.start),
      'DTEND:' + utc(EVENT.end),
      'SUMMARY:' + EVENT.title,
      'LOCATION:' + EVENT.location.replace(/,/g, '\\,'),
      'DESCRIPTION:' + EVENT.details.replace(/,/g, '\\,'),
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'CHIMEI_PGY116.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  /* ===== Registration form ===== */
  var form = document.getElementById('regForm');
  var submitBtn = document.getElementById('regSubmit');
  var msg = document.getElementById('regMsg');
  var done = document.getElementById('regDone');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 依選項顯示「請填寫」欄位
  var conditionals = form.querySelectorAll('[data-show-when]');
  function syncConditionals() {
    conditionals.forEach(function (box) {
      var rule = box.getAttribute('data-show-when').split('=');
      var field = form.elements[rule[0]];
      var on = field && field.value === rule[1];
      box.hidden = !on;
      var input = box.querySelector('input');
      if (!on) input.value = '';
    });
  }
  form.addEventListener('change', function (e) {
    syncConditionals();
    var f = e.target.closest('.field');
    if (f && f.classList.contains('invalid')) validate(f);
  });
  syncConditionals();

  function val(name) { return (form.elements[name].value || '').trim(); }
  function setInvalid(name, bad) {
    var err = form.querySelector('.err[data-for="' + name + '"]');
    err.closest('.field').classList.toggle('invalid', bad);
    return !bad;
  }
  function validate(only) {
    var checks = {
      name: function () { return !!val('name'); },
      email: function () { return EMAIL_RE.test(val('email')); },
      school: function () { return !!val('school') && (val('school') !== '國外醫學校' || !!val('schoolOther')); },
      program: function () { return !!val('program'); }
    };
    var ok = true, first = null;
    Object.keys(checks).forEach(function (k) {
      var err = form.querySelector('.err[data-for="' + k + '"]');
      if (only && err.closest('.field') !== only) return;
      var good = setInvalid(k, !checks[k]());
      if (!good && !first) first = err.closest('.field');
      ok = ok && good;
    });
    return { ok: ok, first: first };
  }
  form.addEventListener('input', function (e) {
    var f = e.target.closest('.field');
    if (f && f.classList.contains('invalid')) validate(f);
  });

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.classList.toggle('loading', on);
    submitBtn.querySelector('.btn-txt').textContent = on ? '送出中…' : '送出報名';
  }

  function confetti() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var colors = ['#213C8F', '#FFA319', '#F2541B', '#FFC83D'];
    for (var i = 0; i < 70; i++) {
      var c = document.createElement('span');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.borderRadius = i % 3 ? '2px' : '50%';
      c.style.animationDuration = 2 + Math.random() * 2 + 's';
      c.style.animationDelay = Math.random() * .6 + 's';
      document.body.appendChild(c);
      setTimeout(function (el) { el.remove(); }, 5000, c);
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.textContent = ''; msg.className = 'reg-msg';
    var v = validate();
    if (!v.ok) {
      v.first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var focusEl = v.first.querySelector('input, select');
      if (focusEl) setTimeout(function () { focusEl.focus({ preventScroll: true }); }, 300);
      return;
    }
    if (val('website')) return; // honeypot
    if (!GAS_URL) {
      msg.textContent = '報名系統尚未開放，請稍後再試。';
      msg.className = 'reg-msg error';
      return;
    }

    var data = new URLSearchParams();
    ['name', 'email', 'school', 'schoolOther', 'program', 'source', 'referrer', 'sourceOther', 'interest']
      .forEach(function (k) { data.append(k, val(k)); });

    setLoading(true);
    fetch(GAS_URL, { method: 'POST', body: data })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) throw new Error(res && res.error || '送出失敗');
        document.getElementById('doneName').textContent = val('name');
        form.hidden = true;
        done.hidden = false;
        done.focus();
        confetti();
      })
      .catch(function (err) {
        msg.textContent = (err && err.message && err.message !== 'Failed to fetch' ? err.message : '網路連線異常') + '，請稍後再試一次。';
        msg.className = 'reg-msg error';
      })
      .then(function () { setLoading(false); });
  });

  document.getElementById('regAgain').addEventListener('click', function () {
    form.reset();
    syncConditionals();
    done.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
})();
