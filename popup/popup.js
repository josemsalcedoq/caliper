const toggleBtn = document.getElementById('toggle');
const labelEl = toggleBtn.querySelector('.label');
const kbdEl = document.getElementById('kbd');
const statusMsg = document.getElementById('status-msg');
const shortcutLink = document.getElementById('shortcut-link');

function isInjectable(url) {
  if (!url) return false;
  if (/^(chrome|edge|about|chrome-extension|view-source|devtools):/.test(url)) return false;
  if (url.startsWith('https://chrome.google.com/webstore')) return false;
  if (url.startsWith('https://chromewebstore.google.com')) return false;
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
        'Chrome blocks extensions on internal pages (chrome://, extension store, etc.). Try it on any normal website.';
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
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
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

async function setResponsive(targetW, targetH, mobile) {
  const tab = await getActiveTab();
  if (!tab || !isInjectable(tab.url)) return;
  const r = await chrome.runtime.sendMessage({
    type: 'caliper/responsive-set',
    tabId: tab.id,
    width: Math.max(50, targetW | 0),
    height: Math.max(50, targetH | 0),
    mobile: !!mobile,
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

async function refreshResponsiveState() {
  const tab = await getActiveTab();
  if (!tab || !isInjectable(tab.url)) {
    viewportSection.classList.add('is-disabled');
    currentSizeEl.textContent = '—';
    return;
  }
  viewportSection.classList.remove('is-disabled');
  const status = await getResponsiveStatus(tab.id);
  if (status?.active) {
    currentSizeEl.innerHTML =
      `<span class="hot">●</span> Responsive ${status.width} × ${status.height}` +
      (status.mobile ? ' · mobile' : '');
    if (document.activeElement !== customW) customW.value = status.width;
    if (document.activeElement !== customH) customH.value = status.height;
    return;
  }
  const info = await getViewportInfo();
  if (info) {
    currentSizeEl.textContent = `Currently ${info.innerW} × ${info.innerH}`;
    if (document.activeElement !== customW) customW.value = info.innerW;
    if (document.activeElement !== customH) customH.value = info.innerH;
  } else {
    currentSizeEl.textContent = '—';
  }
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

refresh();
loadShortcut();
refreshResponsiveState();
