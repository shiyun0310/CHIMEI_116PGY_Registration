# 奇美醫院116學年度西醫PGY醫師招募說明會

活動網站（純靜態 HTML/CSS/JS，可直接用 GitHub Pages 發佈）。

- `index.html`：頁面內容（活動資訊、議程、分科互動交流、交通地點）
- `assets/css/style.css`：樣式與動畫（響應式，支援手機／電腦）
- `assets/js/main.js`：倒數計時、分科分頁、加入行事曆、報名表送出

## 報名表

報名表在頁面中的「報名表」區塊，資料透過 Google Apps Script 寫入 Google 試算表。

- 後端程式：`gas/Code.gs`
- 設定步驟：`gas/README.md`
- 部署後把網址填到 `assets/js/main.js` 最上方的 `GAS_URL`

## 發佈

GitHub → Settings → Pages → Source 選 `Deploy from a branch`，分支選 `main`、資料夾 `/ (root)`。
