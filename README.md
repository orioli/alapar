# Split-Screen Co‑Browsing (MVP) — Minimal Specification

## 0) One‑line goal

Two friends surf together: left panel shows the **local** browser, right panel mirrors the **friend’s** live browsing via an invite link. View‑sync first; optional remote control later.

---

## 1) Scope (MVP)

* **Left panel (Local):** An embedded web view that loads a user‑entered URL.
* **Right panel (Remote):** Live video of the friend’s browser tab (or app window) plus lightweight presence status.
* **Invite link:** Host creates a session → link can be shared (e.g., WhatsApp). Guest clicks to join.
* **Sync rule:** Remote panel updates whenever the friend’s screen changes (real‑time stream). No DOM injection needed.
* **Out of scope (MVP):** Multi‑tab sync, DOM‑level co‑editing, pointer teleport, file transfer, recording.

---

## 1.1) Even‑simpler variant: Two feeds side‑by‑side (no remote user)

**Goal:** Show User A’s LinkedIn feed on the left and User B’s LinkedIn feed on the right, on one machine.

**Feasibility:**

* **Web‑only:** Not possible. LinkedIn blocks iframe embedding via `X-Frame-Options` and CSP. Two authenticated sessions in one origin also conflict with cookies and SSO.
* **Desktop app:** **Electron** (or Tauri) with two independent Chromium **webviews**, each with its own isolated session partition. This allows logging into Account A (left) and Account B (right) simultaneously.
* **Fastest workaround:** Two separate browser profiles manually tiled side‑by‑side.

---

## 2) Technical constraints

* LinkedIn feed cannot be embedded via iframes.
* LinkedIn APIs don’t expose personal feeds without partner agreements.
* Respect ToS: no scraping or hidden automation.

### 2.1) Recommended path for simplified project

* Use Electron split‑view:

  * Left webview partition `persist:userA` → LinkedIn feed.
  * Right webview partition `persist:userB` → LinkedIn feed.
  * Sessions persist and maintain logins separately.
* Minimal controls: reload, back/forward, go‑to‑feed.
* Optional: periodic soft reload.

---

## 3) Architecture

**Electron starter**

**Folder structure:**

```
project/
├── package.json
├── main.js
├── preload.js
├── index.html
└── renderer.js
```

**package.json**

```json
{
  "name": "split-browse",
  "version": "0.1.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "^31.0.0"
  }
}
```

**main.js**

```js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

**index.html**

```html
<!doctype html>
<html>
  <body style="margin:0;display:grid;grid-template-columns:1fr 1fr;height:100vh;">
    <webview id="left" partition="persist:userA" style="border:0" src="https://www.linkedin.com/feed/"></webview>
    <webview id="right" partition="persist:userB" style="border:0" src="https://www.linkedin.com/feed/"></webview>
  </body>
</html>
```

**preload.js** (optional)

```js
// empty for now, later can expose safe APIs
```

**renderer.js** (optional)

```js
// hooks for buttons / reloading webviews
```

---

## 4) Run instructions

1. Install deps: `npm install`
2. Start app: `npm start`
3. Log into LinkedIn Account A on the left pane.
4. Log into LinkedIn Account B on the right pane.
5. Feeds now display side‑by‑side, independent sessions.

---

## 5) Next steps

* Add navigation bar with reload/back/forward buttons.
* Add resize handles.
* Optional session persistence across restarts.
* Later, extend with remote invite (original co‑browse MVP).
