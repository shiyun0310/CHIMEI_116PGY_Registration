/**
 * 奇美醫院 116 學年度 PGY 招募說明會｜報名表 — Google Apps Script 後端
 *
 * 用法：在 Google 試算表中「擴充功能 → Apps Script」，貼上本檔，
 * 部署為「網頁應用程式」（執行身分：我；存取權：所有人），
 * 再把部署網址填到網站 assets/js/main.js 的 GAS_URL。詳見 gas/README.md。
 */

// ===== 設定 =====
var SHEET_NAME = '報名資料';
var SEND_CONFIRMATION = true;   // 報名成功後寄確認信給報名者
var NOTIFY_EMAIL = '';          // 有新報名時通知承辦人（留空則不通知）

var EVENT_INFO = '日期：115年11月29日（星期日）\n' +
                 '時間：13:00 ~ 17:15（13:00 開始報到）\n' +
                 '地點：奇美醫院第五醫療大樓5樓國際會議廳';

var HEADERS = ['報名時間', '姓名', '電子郵件', '就讀學校', '學制',
               '得知管道', '推薦人姓名', '想進一步了解的部分'];

var SCHOOLS = ['國立臺灣大學', '國立陽明交通大學', '國立成功大學', '臺北醫學大學', '長庚大學',
               '中國醫藥大學', '高雄醫學大學', '中山醫學大學', '輔仁大學', '慈濟大學',
               '馬偕醫學院', '國防醫學院', '國立清華大學', '國立中興大學', '國立中山大學', '國外醫學校'];
var PROGRAMS = ['七年制醫學系', '六年制醫學系', '中西醫雙主修', '學士後醫學系'];
var SOURCES = ['學校公告', '同學推薦', '學長姐推薦', '奇美醫院官方網站／社群', '其他'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var p = (e && e.parameter) || {};
    var f = {
      name: clean_(p.name, 50),
      email: clean_(p.email, 120).toLowerCase(),
      school: clean_(p.school, 50),
      schoolOther: clean_(p.schoolOther, 100),
      program: clean_(p.program, 30),
      source: clean_(p.source, 30),
      referrer: clean_(p.referrer, 50),
      sourceOther: clean_(p.sourceOther, 100),
      interest: clean_(p.interest, 1000)
    };

    // ---- 驗證 ----
    if (clean_(p.website, 10)) return json_({ ok: true }); // honeypot
    if (!f.name) return json_({ ok: false, error: '請填寫姓名' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return json_({ ok: false, error: '電子郵件格式不正確' });
    if (SCHOOLS.indexOf(f.school) < 0) return json_({ ok: false, error: '請選擇就讀學校' });
    if (f.school === '國外醫學校' && !f.schoolOther) return json_({ ok: false, error: '請填寫國外醫學校名稱' });
    if (PROGRAMS.indexOf(f.program) < 0) return json_({ ok: false, error: '請選擇學制' });
    if (f.source && SOURCES.indexOf(f.source) < 0) f.source = '';

    var school = f.school === '國外醫學校' ? '國外醫學校：' + f.schoolOther : f.school;
    var source = f.source === '其他' && f.sourceOther ? '其他：' + f.sourceOther : f.source;
    var referrer = f.source === '學長姐推薦' ? f.referrer : '';

    lock.waitLock(10000);
    var sheet = getSheet_();
    sheet.appendRow([new Date(), f.name, f.email, school, f.program, source, referrer, f.interest]
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

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#FFC83D');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('yyyy/mm/dd hh:mm:ss');
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
}
