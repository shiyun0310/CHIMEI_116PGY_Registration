/**
 * 奇美醫院 116 學年度 PGY 招募說明會｜報名表 — Google Apps Script 後端
 *
 * 用法：在 Google 試算表中「擴充功能 → Apps Script」，貼上本檔，
 * 部署為「網頁應用程式」（執行身分：我；存取權：所有人），
 * 再把部署網址填到網站 assets/js/main.js 的 GAS_URL。詳見 gas/README.md。
 */

// ===== 設定 =====
var SHEET_NAME = '報名資料';
var SEND_CONFIRMATION = false;  // 設為 true 才會在報名成功後寄確認信給報名者（目前不寄）
var REG_DEADLINE = new Date('2026-11-14T00:00:00+08:00'); // 報名截止：11/13（五）23:59 前
var NOTIFY_EMAIL = '';          // 有新報名時通知承辦人（留空則不通知）

// 報到代碼（可選）：在「指令碼屬性」新增 CHECKIN_CODE，現場 QR Code 網址帶 ?c=代碼；未設定則不檢查

var EVENT_INFO = '日期：115年11月29日（星期日）\n' +
                 '時間：13:30 ~ 17:00（13:00 開始報到）\n' +
                 '地點：奇美醫院第五醫療大樓5樓國際會議廳';

var HEADERS = ['報名時間', '姓名', '電子郵件', '就讀學校', '學制',
               '得知管道', '推薦人姓名', '想進一步了解的部分', '參與原因', '報到時間', '簽退時間'];
var CHECKIN_COL = 10;  // 「報到時間」在第 J 欄
var CHECKOUT_COL = 11; // 「簽退時間」在第 K 欄
// 完成報到的人另外寫一份到第二個工作表「報到系統」
var CHECKIN_SHEET_NAME = '報到系統';
var CHECKIN_HEADERS = ['姓名', '電子郵件', '就讀學校', '學制', '報到時間', '簽退時間'];
// 簽退時填寫的滿意度調查寫到「滿意度調查」工作表（第三頁）
// 題數與順序需與網站 checkouttt/index.html 的 SURVEY 相同
// scale：1～5 分（必填）；text：詳答（選填）
var SURVEY_SHEET_NAME = '滿意度調查';
var SURVEY = [
  { h: '1. 整體滿意度', t: 'scale' },
  { h: '2. 了解PGY訓練制度與課程', t: 'scale' },
  { h: '3. 分科互動交流有幫助', t: 'scale' },
  { h: '4. 學長姐經驗分享具參考價值', t: 'scale' },
  { h: '5. 講者說明與交流時間', t: 'scale' },
  { h: '6. 時間安排、場地與報到流程', t: 'scale' },
  { h: '7. 選擇奇美PGY意願', t: 'scale' },
  { h: '8. 印象最深刻／最有收穫的部分', t: 'text' },
  { h: '9. 還想了解的資訊', t: 'text' },
  { h: '10. 其他建議', t: 'text' }
];
var SURVEY_HEADERS = ['填答時間', '姓名', '電子郵件', '就讀學校', '學制']
  .concat(SURVEY.map(function (x) { return x.h; }));

var SCHOOLS = ['國立臺灣大學', '國立陽明交通大學', '國立成功大學', '臺北醫學大學', '長庚大學',
               '中國醫藥大學', '高雄醫學大學', '中山醫學大學', '天主教輔仁大學', '慈濟大學',
               '馬偕醫學大學', '國防醫學大學', '國立清華大學', '國立中興大學', '國立中山大學', '義守大學', '國外醫學校'];
var PROGRAMS = ['七年制醫學系', '六年制醫學系', '中西醫雙主修', '學士後醫學系'];
var SOURCES = ['學校公告', '同學推薦', '學長姐推薦', '奇美醫院官方網站／社群', '其他'];
var REASONS = ['了解奇美醫院 PGY 訓練制度', '正在比較各醫院 PGY 訓練，蒐集資訊', '已將奇美列入考慮，想進一步確認', '對特定專科有興趣，想了解該科訓練特色', '想聽學長姐的實際經驗分享', '學長姐或同學推薦參加', '地緣因素（家鄉或就學地點在南部）', '現場抽獎與紀念品吸引', '其他'];

function doPost(e) {
  var p0 = (e && e.parameter) || {};
  if (p0.action === 'list') return listRegistrations_(p0.key);
  if (p0.action === 'views') return pageViews_(p0.hit === '1');
  if (p0.action === 'lookup') return checkinLookup_(p0);
  if (p0.action === 'checkin') return checkinConfirm_(p0);
  if (p0.action === 'checkout') return checkoutConfirm_(p0);

  var lock = LockService.getScriptLock();
  try {
    var p = p0;
    var f = {
      name: clean_(p.name, 50),
      email: clean_(p.email, 120).toLowerCase(),
      school: clean_(p.school, 50),
      schoolOther: clean_(p.schoolOther, 100),
      program: clean_(p.program, 30),
      source: clean_(p.source, 30),
      referrer: clean_(p.referrer, 50),
      sourceOther: clean_(p.sourceOther, 100),
      reasonOther: clean_(p.reasonOther, 100),
      interest: clean_(p.interest, 1000)
    };

    // ---- 驗證 ----
    if (clean_(p.website, 10)) return json_({ ok: true }); // honeypot
    if (new Date() >= REG_DEADLINE) return json_({ ok: false, closed: true, error: '已報名截止，如需報名請來電或MAIL詢問' });
    if (!f.name) return json_({ ok: false, error: '請填寫姓名' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return json_({ ok: false, error: '電子郵件格式不正確' });
    if (SCHOOLS.indexOf(f.school) < 0) return json_({ ok: false, error: '請選擇就讀學校' });
    if (f.school === '國外醫學校' && !f.schoolOther) return json_({ ok: false, error: '請填寫國外醫學校名稱' });
    if (PROGRAMS.indexOf(f.program) < 0) return json_({ ok: false, error: '請選擇學制' });
    if (f.source && SOURCES.indexOf(f.source) < 0) f.source = '';

    var school = f.school === '國外醫學校' ? '國外醫學校：' + f.schoolOther : f.school;
    var source = f.source === '其他' && f.sourceOther ? '其他：' + f.sourceOther : f.source;
    var referrer = f.source === '學長姐推薦' ? f.referrer : '';
    // 可複選：e.parameters 才拿得到同名的多個值；依題目順序排列、去除不在選項內的值
    var picked = ((e && e.parameters && e.parameters.reason) || []).map(function (v) { return clean_(v, 50); });
    var reason = REASONS.filter(function (r) { return picked.indexOf(r) >= 0; }).map(function (r) {
      return r === '其他' && f.reasonOther ? '其他：' + f.reasonOther : r;
    }).join('、');

    lock.waitLock(10000);
    var sheet = getSheet_();
    sheet.appendRow([new Date(), f.name, f.email, school, f.program, source, referrer, f.interest, reason]
      .map(function (v, i) { return i === 0 ? v : safe_(v); }));
    lock.releaseLock();

    if (SEND_CONFIRMATION) {
      try {
        MailApp.sendEmail({
          to: f.email,
          subject: '【報名成功】奇美醫院116學年度西醫PGY醫師招募說明會',
          body: f.name + ' 您好：\n\n感謝您報名「奇美醫院116學年度西醫PGY醫師招募說明會」，我們已收到您的報名資料。\n\n' +
                EVENT_INFO + '\n\n期待與您見面！\n奇美醫院'
        });
      } catch (mailErr) { console.error(mailErr); }
    }
    if (NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail(NOTIFY_EMAIL, '【PGY說明會】新報名：' + f.name,
          ['姓名：' + f.name, 'E-mail：' + f.email, '學校：' + school, '學制：' + f.program,
           '得知管道：' + source + (referrer ? '（推薦人：' + referrer + '）' : ''),
           '參與原因：' + reason,
           '想了解：' + f.interest].join('\n'));
      } catch (mailErr2) { console.error(mailErr2); }
    }

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: '系統忙碌中' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

// 直接用瀏覽器開啟部署網址時，用來確認服務正常
function doGet() {
  return json_({ ok: true, service: 'PGY116 registration' });
}

// ===== 網頁瀏覽人次 =====
// 計數存在「指令碼屬性」的 VIEW_COUNT；hit=1 時加一（網站端每個分頁工作階段只送一次）
function pageViews_(hit) {
  var props = PropertiesService.getScriptProperties();
  if (!hit) return json_({ ok: true, views: Number(props.getProperty('VIEW_COUNT')) || 0 });
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    var n = (Number(props.getProperty('VIEW_COUNT')) || 0) + 1;
    props.setProperty('VIEW_COUNT', String(n));
    return json_({ ok: true, views: n });
  } catch (err) {
    return json_({ ok: true, views: Number(props.getProperty('VIEW_COUNT')) || 0 });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

// ===== 報名狀況儀表板 =====
// 密碼存在「專案設定 → 指令碼屬性」的 DASHBOARD_KEY，不寫在程式碼裡。
function listRegistrations_(key) {
  var expected = PropertiesService.getScriptProperties().getProperty('DASHBOARD_KEY');
  if (!expected) return json_({ ok: false, error: '尚未設定儀表板密碼（DASHBOARD_KEY）' });
  if (!key || String(key) !== expected) {
    Utilities.sleep(1000); // 減緩暴力猜測
    return json_({ ok: false, error: '密碼錯誤' });
  }
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
  var data = rows.filter(function (r) { return r[1] !== ''; }).map(function (r) {
    var t = r[0] instanceof Date ? r[0].toISOString() : String(r[0]);
    return { time: t, name: r[1], email: r[2], school: r[3], program: r[4],
             source: r[5], referrer: r[6], interest: r[7], reason: r[8],
             checkin: iso_(r[9]), checkout: iso_(r[10]) };
  });
  return json_({ ok: true, updated: new Date().toISOString(), rows: data });
}

// ===== 現場報到 =====
// lookup：輸入姓名（需與報名時一模一樣，只忽略前後空白），回傳符合的報名資料（Email 遮蔽）
// checkin：以列號＋姓名確認後，在「報到時間」欄寫入時間；已報到者不會覆寫
// checkout：已報到者才能簽退，在「簽退時間」欄寫入時間；已簽退者不會覆寫
// 兩者都會同步寫到「報到系統」工作表
function checkinGate_(p) {
  var code = PropertiesService.getScriptProperties().getProperty('CHECKIN_CODE');
  if (code && String(p.code || '').trim() !== code) {
    Utilities.sleep(500);
    return 'CODE';
  }
  return '';
}

function norm_(v) {
  return String(v == null ? '' : v).trim();
}

function maskEmail_(e) {
  var m = String(e).match(/^([^@]*)@(.*)$/);
  if (!m) return '';
  var u = m[1];
  return (u.length <= 2 ? u.charAt(0) : u.slice(0, 2)) + '***@' + m[2];
}

function checkinLookup_(p) {
  var gate = checkinGate_(p);
  if (gate === 'CODE') return json_({ ok: false, needCode: true, error: '報到代碼錯誤，請掃描現場 QR Code' });
  if (gate) return json_({ ok: false, error: gate });
  var q = norm_(clean_(p.q, 50));
  if (!q) return json_({ ok: false, error: '請輸入報名時填寫的姓名' });

  var sheet = getSheet_();
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
  var matches = [];
  rows.forEach(function (r, i) {
    if (r[1] === '') return;
    if (norm_(r[1]) !== q) return;
    matches.push({
      row: i + 2,
      name: String(r[1]),
      email: maskEmail_(r[2]),
      school: String(r[3]),
      program: String(r[4]),
      checkin: iso_(r[9]),
      checkout: iso_(r[10])
    });
  });
  return json_({ ok: true, rows: matches.slice(0, 10) });
}

function checkinConfirm_(p) {
  var gate = checkinGate_(p);
  if (gate === 'CODE') return json_({ ok: false, needCode: true, error: '報到代碼錯誤，請掃描現場 QR Code' });
  if (gate) return json_({ ok: false, error: gate });
  var row = parseInt(p.row, 10);
  var name = norm_(clean_(p.name, 50));
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet_();
    if (!(row >= 2 && row <= sheet.getLastRow())) return json_({ ok: false, error: '找不到這筆報名資料，請重新查詢' });
    var r = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    if (!name || norm_(r[1]) !== name) return json_({ ok: false, error: '資料已變動，請重新查詢' });
    var already = filled_(r[9]);
    var t = already ? r[9] : new Date();
    if (!already) {
      sheet.getRange(row, CHECKIN_COL).setValue(t).setNumberFormat('yyyy/mm/dd hh:mm:ss');
      var log = getCheckinSheet_();
      log.appendRow([r[1], r[2], r[3], r[4]].map(function (v) { return safe_(String(v)); }).concat([t, '']));
      log.getRange(log.getLastRow(), 5).setNumberFormat('yyyy/mm/dd hh:mm:ss');
    }
    return json_({ ok: true, already: already, name: String(r[1]),
                   time: iso_(t), checkout: iso_(r[10]) });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: '系統忙碌中，請再試一次' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function checkoutConfirm_(p) {
  var gate = checkinGate_(p);
  if (gate === 'CODE') return json_({ ok: false, needCode: true, error: '報到代碼錯誤，請掃描現場 QR Code' });
  if (gate) return json_({ ok: false, error: gate });
  var row = parseInt(p.row, 10);
  var name = norm_(clean_(p.name, 50));
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet_();
    if (!(row >= 2 && row <= sheet.getLastRow())) return json_({ ok: false, error: '找不到這筆報名資料，請重新查詢' });
    var r = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
    if (!name || norm_(r[1]) !== name) return json_({ ok: false, error: '資料已變動，請重新查詢' });
    if (!filled_(r[9])) return json_({ ok: false, error: '尚未報到，無法簽退' });
    var already = filled_(r[10]);
    // 滿意度：評分題需為 1～5 分，詳答題選填（已簽退者不再寫入）
    var answers = SURVEY.map(function (x, i) {
      var v = p['q' + (i + 1)];
      return x.t === 'scale' ? parseInt(v, 10) : safe_(clean_(v, 500));
    });
    var incomplete = SURVEY.some(function (x, i) { return x.t === 'scale' && !(answers[i] >= 1 && answers[i] <= 5); });
    if (!already && incomplete) {
      return json_({ ok: false, error: '請完成滿意度調查所有必填題目' });
    }
    var t = already ? r[10] : new Date();
    if (!already) {
      var sv = getSurveySheet_();
      sv.appendRow([t].concat([r[1], r[2], r[3], r[4]].map(function (v) { return safe_(String(v)); }), answers));
      sv.getRange(sv.getLastRow(), 1).setNumberFormat('yyyy/mm/dd hh:mm:ss');
      sheet.getRange(row, CHECKOUT_COL).setValue(t).setNumberFormat('yyyy/mm/dd hh:mm:ss');
      // 同步「報到系統」：找同姓名＋Email 的那一列寫入簽退時間（找不到就補一列）
      var log = getCheckinSheet_();
      var n = log.getLastRow() - 1;
      var vals = n > 0 ? log.getRange(2, 1, n, 2).getValues() : [];
      var at = -1;
      for (var i = vals.length - 1; i >= 0; i--) {
        if (norm_(vals[i][0]) === norm_(r[1]) && norm_(vals[i][1]) === norm_(r[2])) { at = i + 2; break; }
      }
      if (at < 0) {
        log.appendRow([r[1], r[2], r[3], r[4]].map(function (v) { return safe_(String(v)); }).concat([r[9], '']));
        at = log.getLastRow();
        log.getRange(at, 5).setNumberFormat('yyyy/mm/dd hh:mm:ss');
      }
      log.getRange(at, 6).setValue(t).setNumberFormat('yyyy/mm/dd hh:mm:ss');
    }
    return json_({ ok: true, already: already, name: String(r[1]), time: iso_(r[9]), checkout: iso_(t) });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: '系統忙碌中，請再試一次' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function filled_(v) {
  return v instanceof Date || String(v == null ? '' : v) !== '';
}

function iso_(v) {
  return v instanceof Date ? v.toISOString() : String(v == null ? '' : v);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#FFC83D');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm:ss');
  } else if (sheet.getLastColumn() < HEADERS.length) {
    // 舊工作表新增欄位時補上標題（新欄位一律加在最後，不影響既有資料）
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#FFC83D');
  }
  return sheet;
}

// 「報到系統」工作表：不存在時建立在第二頁，欄位：姓名／電子郵件／就讀學校／學制／報到時間／簽退時間
function getCheckinSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CHECKIN_SHEET_NAME) || ss.insertSheet(CHECKIN_SHEET_NAME, Math.min(1, ss.getSheets().length));
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CHECKIN_HEADERS);
    sheet.getRange(1, 1, 1, CHECKIN_HEADERS.length).setFontWeight('bold').setBackground('#FFC83D');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < CHECKIN_HEADERS.length) {
    sheet.getRange(1, 1, 1, CHECKIN_HEADERS.length).setValues([CHECKIN_HEADERS]).setFontWeight('bold').setBackground('#FFC83D');
  }
  return sheet;
}

// 「滿意度調查」工作表：不存在時建立在「報到系統」後面
function getSurveySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SURVEY_SHEET_NAME);
  if (!sheet) {
    var log = ss.getSheetByName(CHECKIN_SHEET_NAME);
    sheet = ss.insertSheet(SURVEY_SHEET_NAME, log ? log.getIndex() : ss.getSheets().length);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SURVEY_HEADERS);
    sheet.getRange(1, 1, 1, SURVEY_HEADERS.length).setFontWeight('bold').setBackground('#FFC83D');
    sheet.setFrozenRows(1);
  } else if (sheet.getRange(1, 1, 1, SURVEY_HEADERS.length).getValues()[0].join('|') !== SURVEY_HEADERS.join('|')) {
    // 題目有改時更新標題列（舊的測試資料請自行刪除）
    sheet.getRange(1, 1, 1, SURVEY_HEADERS.length).setValues([SURVEY_HEADERS]).setFontWeight('bold').setBackground('#FFC83D');
  }
  return sheet;
}

function clean_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

// 避免以 = + - @ 開頭的內容在試算表中被當成公式執行
function safe_(v) {
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 第一次部署前可手動執行一次，完成授權並建立工作表
function setup() {
  getSheet_();
  getCheckinSheet_();
  getSurveySheet_();
}
