const toggleBtn = document.getElementById('toggle');
const labelEl = toggleBtn.querySelector('.label');
const kbdEl = document.getElementById('kbd');
const statusMsg = document.getElementById('status-msg');
const shortcutLink = document.getElementById('shortcut-link');

// Modern Edge keeps the chrome.* API surface but its internal pages live at
// edge://, not chrome://. Detect via the "Edg/" UA token (Edge Legacy used
// "Edge/" — we want only the Chromium-based one). Brave and other Chromium
// forks keep chrome:// for their settings pages so they don't need a branch.
function isEdge() {
  return /\bEdg\//.test(navigator.userAgent);
}

function shortcutsUrl() {
  return isEdge() ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
}

function isInjectable(url) {
  if (!url) return false;
  if (/^(chrome|edge|about|chrome-extension|view-source|devtools):/.test(url)) return false;
  if (url.startsWith('https://chrome.google.com/webstore')) return false;
  if (url.startsWith('https://chromewebstore.google.com')) return false;
  if (url.startsWith('https://microsoftedge.microsoft.com/addons')) return false;
  return true;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setUI({ status }) {
  toggleBtn.classList.remove('is-on', 'is-disabled');
  toggleBtn.disabled = false;
  statusMsg.hidden = true;

  switch (status) {
    case 'on':
      toggleBtn.classList.add('is-on');
      labelEl.textContent = 'Active — click to stop';
      break;
    case 'off':
      labelEl.textContent = 'Activate inspector';
      break;
    case 'needs-refresh':
      toggleBtn.classList.add('is-disabled');
      toggleBtn.disabled = true;
      labelEl.textContent = 'Refresh page to enable';
      statusMsg.hidden = false;
      statusMsg.textContent =
        'Caliper was loaded after this tab opened. Refresh the page to enable the inspector here.';
      break;
    case 'unsupported':
      toggleBtn.classList.add('is-disabled');
      toggleBtn.disabled = true;
      labelEl.textContent = 'Not available on this page';
      statusMsg.hidden = false;
      statusMsg.textContent =
        'Browsers block extensions on their internal pages (chrome://, edge://, extension stores, etc.). Try it on any normal website.';
      break;
    default:
      // Defensive: unexpected status leaves the label honest about the
      // unknown state instead of stale from the previous render.
      labelEl.textContent = '—';
      break;
  }
}

async function refresh() {
  const tab = await getActiveTab();
  if (!tab || !isInjectable(tab.url)) {
    setUI({ status: 'unsupported' });
    return;
  }
  try {
    // Query the top frame specifically (frameId: 0). Without it the message
    // hits every frame in the tab and the response winner is non-deterministic
    // when frames are out of sync.
    const resp = await chrome.tabs.sendMessage(
      tab.id,
      { type: 'caliper/query-state' },
      { frameId: 0 }
    );
    setUI({ status: resp?.active ? 'on' : 'off' });
  } catch {
    setUI({ status: 'needs-refresh' });
  }
}

async function loadShortcut() {
  try {
    const cmds = await chrome.commands.getAll();
    const c = cmds.find((c) => c.name === 'toggle-caliper');
    kbdEl.textContent = c?.shortcut || '';
  } catch {
    kbdEl.textContent = '';
  }
}

toggleBtn.addEventListener('click', async () => {
  if (toggleBtn.disabled) return;
  const tab = await getActiveTab();
  if (!tab || !isInjectable(tab.url)) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'caliper/toggle' });
  } catch {
    setUI({ status: 'needs-refresh' });
    return;
  }
  setTimeout(() => {
    refresh();
    window.close();
  }, 60);
});

shortcutLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: shortcutsUrl() });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'caliper/state') {
    setUI({ status: msg.active ? 'on' : 'off' });
  }
});

// ---------- Responsive viewport controls ----------
//
// Backed by chrome.debugger -> Emulation.setDeviceMetricsOverride, the same
// API DevTools' Device Mode uses. The browser window stays the same size;
// the page renders at the override dimensions and media queries fire.
// All chrome.debugger work happens in the service worker; the popup just
// sends messages. Mobile presets request mobile=true so pointer:coarse and
// touch-event emulation kick in.

const viewportSection = document.getElementById('viewport-section');
const customW = document.getElementById('custom-w');
const customH = document.getElementById('custom-h');
const currentSizeEl = document.getElementById('current-size');

async function getViewportInfo() {
  const tab = await getActiveTab();
  if (!tab || !isInjectable(tab.url)) return null;
  try {
    return await chrome.tabs.sendMessage(
      tab.id,
      { type: 'caliper/get-viewport' },
      { frameId: 0 }
    );
  } catch {
    return null;
  }
}

async function getResponsiveStatus(tabId) {
  try {
    return await chrome.runtime.sendMessage({
      type: 'caliper/responsive-status',
      tabId,
    });
  } catch {
    return { active: false };
  }
}

// Selected device-pixel-ratio for the responsive mode. Defaults to 1 and
// is mirrored to the active button. Reading the previous selection from
// the SW state lets the popup show the correct active state on reopen.
let currentDpr = 1;

async function setResponsive(targetW, targetH, mobile) {
  const tab = await getActiveTab();
  if (!tab || !isInjectable(tab.url)) return;
  const info = await getViewportInfo();
  // Clamp inputs into a sane range. Without this, a stray '100000' typed
  // in the custom W field reaches CDP intact and renders the page
  // 100,000 pixels wide, breaking layout entirely.
  const w = Math.min(Math.max(50, targetW | 0), 4000);
  const h = Math.min(Math.max(50, targetH | 0), 4000);
  const r = await chrome.runtime.sendMessage({
    type: 'caliper/responsive-set',
    tabId: tab.id,
    width: w,
    height: h,
    mobile: !!mobile,
    dpr: currentDpr,
    outerW: info?.outerW || 0,
  });
  if (!r?.ok) {
    currentSizeEl.textContent = r?.error?.includes('Cannot access')
      ? 'Not available on this page'
      : (r?.error || 'Could not start responsive mode');
    return;
  }
  setTimeout(refreshResponsiveState, 120);
}

async function clearResponsive() {
  const tab = await getActiveTab();
  if (!tab) return;
  await chrome.runtime.sendMessage({
    type: 'caliper/responsive-clear',
    tabId: tab.id,
  });
  setTimeout(refreshResponsiveState, 120);
}

function syncDprButtons() {
  document.querySelectorAll('.dpr').forEach((btn) => {
    btn.classList.toggle('is-active', parseInt(btn.dataset.dpr, 10) === currentDpr);
  });
}

async function refreshResponsiveState() {
  const tab = await getActiveTab();
  if (!tab || !isInjectable(tab.url)) {
    viewportSection.classList.add('is-disabled');
    currentSizeEl.textContent = '—';
    syncDprButtons();
    return;
  }
  viewportSection.classList.remove('is-disabled');
  const status = await getResponsiveStatus(tab.id);
  if (status?.active) {
    if (status.dpr) currentDpr = status.dpr;
    const dprNote = status.dpr && status.dpr !== 1 ? ` · ${status.dpr}×` : '';
    currentSizeEl.innerHTML =
      `<span class="hot">●</span> Responsive ${status.width} × ${status.height}` +
      (status.mobile ? ' · mobile' : '') +
      dprNote;
    if (document.activeElement !== customW) customW.value = status.width;
    if (document.activeElement !== customH) customH.value = status.height;
    syncDprButtons();
    return;
  }
  // Reset DPR when responsive is off so the previously-selected button
  // does not stay highlighted and silently apply a stale value to the
  // next setResponsive call.
  currentDpr = 1;
  const info = await getViewportInfo();
  if (info) {
    currentSizeEl.textContent = `Currently ${info.innerW} × ${info.innerH}`;
    if (document.activeElement !== customW) customW.value = info.innerW;
    if (document.activeElement !== customH) customH.value = info.innerH;
  } else {
    currentSizeEl.textContent = '—';
  }
  syncDprButtons();
}

document.querySelectorAll('.preset[data-w]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const w = parseInt(btn.dataset.w, 10);
    const h = parseInt(btn.dataset.h, 10);
    const mobile = btn.dataset.mobile === 'true';
    if (w > 0 && h > 0) setResponsive(w, h, mobile);
  });
});

const resetBtn = document.querySelector('.preset[data-action="reset"]');
if (resetBtn) resetBtn.addEventListener('click', clearResponsive);

document.getElementById('apply-custom').addEventListener('click', () => {
  const w = parseInt(customW.value, 10);
  const h = parseInt(customH.value, 10);
  if (w > 0 && h > 0) setResponsive(w, h, false);
});

[customW, customH].forEach((input) => {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const w = parseInt(customW.value, 10);
      const h = parseInt(customH.value, 10);
      if (w > 0 && h > 0) setResponsive(w, h, false);
    }
  });
});

// Rotate: swap width and height. If responsive mode isn't active yet we
// just swap the input values so the user can apply manually; if it's
// active we re-issue the responsive command immediately.
document.getElementById('rotate').addEventListener('click', async () => {
  const w = parseInt(customW.value, 10) || 0;
  const h = parseInt(customH.value, 10) || 0;
  if (!w || !h) return;
  customW.value = h;
  customH.value = w;
  const tab = await getActiveTab();
  if (!tab) return;
  const status = await getResponsiveStatus(tab.id);
  if (status?.active) setResponsive(h, w, !!status.mobile);
});

// DPR buttons swap deviceScaleFactor for the next setResponsive call. If
// responsive mode is already active, re-apply with the new DPR right away
// so the change takes effect immediately.
document.querySelectorAll('.dpr').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const next = parseInt(btn.dataset.dpr, 10) || 1;
    if (next === currentDpr) return;
    currentDpr = next;
    syncDprButtons();
    const tab = await getActiveTab();
    if (!tab) return;
    const status = await getResponsiveStatus(tab.id);
    if (status?.active) setResponsive(status.width, status.height, !!status.mobile);
  });
});

// Show the actual installed version. Hardcoding 'v0.1.0' in the markup
// (as it was) silently lied to anyone opening the popup -- 10+ releases
// in and they all read the original literal.
try {
  const v = chrome.runtime.getManifest().version;
  const el = document.getElementById('version');
  if (el && v) el.textContent = `v${v}`;
} catch (_) {}

refresh();
loadShortcut();
refreshResponsiveState();
