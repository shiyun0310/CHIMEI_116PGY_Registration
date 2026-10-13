(function () {
  'use strict';

  /* ===== 設定 =====
   * 報名表單網址：填入後頁面會自動顯示「立即報名」按鈕（例如 Google 表單連結）。 */
  var REGISTER_URL = '';

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

  /* ===== Register button ===== */
  if (REGISTER_URL) {
    var reg = document.getElementById('register');
    reg.href = REGISTER_URL;
    reg.hidden = false;
  }
})();
