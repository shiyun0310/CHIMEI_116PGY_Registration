# 奇美醫院116學年度西醫PGY醫師招募說明會

活動網站（純靜態 HTML/CSS/JS，可直接用 GitHub Pages 發佈）。

- `index.html`：頁面內容（活動資訊、議程、分科互動交流、交通地點）
- `assets/css/style.css`：樣式與動畫（響應式，支援手機／電腦）
- `assets/js/main.js`：倒數計時、分科分頁、加入行事曆

## 設定報名連結

在 `assets/js/main.js` 最上方填入 `REGISTER_URL`（例如 Google 表單網址），頁面就會自動出現「立即報名」按鈕。

## 發佈

GitHub → Settings → Pages → Source 選 `Deploy from a branch`，分支選 `main`、資料夾 `/ (root)`。
