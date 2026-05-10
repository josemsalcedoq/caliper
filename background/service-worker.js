const BADGE_ON = '●';
const BADGE_COLOR = '#0D99FF';

// ----- Responsive viewport (Chrome DevTools Protocol via chrome.debugger) -----
//
// We track per-tab debugger state in memory and mirror it to chrome.storage.session
// so the state survives service-worker suspension. The actual device-metrics
// override lives inside Chrome's renderer for the tab and persists through
// page navigations until we explicitly clear it or the tab is closed.

const debugTabs = new Map(); // tabId(int) -> { width, height, dpr, mobile }

async function persistDebugTabs() {
  const obj = {};
  for (const [k, v] of debugTabs) obj[String(k)] = v;
  try {
    await chrome.storage.session.set({ debugTabs: obj });
  } catch (_) {}
}

async function restoreDebugTabs() {
  try {
    const data = await chrome.storage.session.get('debugTabs');
    if (data?.debugTabs) {
      for (const [k, v] of Object.entries(data.debugTabs)) {
        debugTabs.set(parseInt(k, 10), v);
      }
    }
  } catch (_) {}
}
restoreDebugTabs();

async function setResponsive(tabId, opts) {
  const target = { tabId };
  const width = opts.width | 0;
  const height = opts.height | 0;
  const dpr = opts.dpr || 1;
  const mobile = !!opts.mobile;

  if (!debugTabs.has(tabId)) {
    try {
      await chrome.debugger.attach(target, '1.3');
    } catch (err) {
      const msg = String(err && err.message || err);
      if (!msg.includes('already attached')) throw err;
    }
  }
  await chrome.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile,
  });
  debugTabs.set(tabId, { width, height, dpr, mobile });
  await persistDebugTabs();
}

async function clearResponsive(tabId) {
  if (!debugTabs.has(tabId)) return;
  const target = { tabId };
  try {
    await chrome.debugger.sendCommand(target, 'Emulation.clearDeviceMetricsOverride');
  } catch (_) {}
  try {
    await chrome.debugger.detach(target);
  } catch (_) {}
  debugTabs.delete(tabId);
  await persistDebugTabs();
}

// User dismissed the yellow "is being debugged" banner, DevTools opened, the
// renderer crashed, etc. Drop our state so the popup reflects reality on the
// next query.
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId !== undefined) {
    debugTabs.delete(source.tabId);
    persistDebugTabs();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (debugTabs.has(tabId)) {
    debugTabs.delete(tabId);
    persistDebugTabs();
  }
});

function isInjectable(url) {
  if (!url) return false;
  if (/^(chrome|edge|about|chrome-extension|view-source|devtools):/.test(url)) return false;
  if (url.startsWith('https://chrome.google.com/webstore')) return false;
  if (url.startsWith('https://chromewebstore.google.com')) return false;
  return true;
}

async function toggleActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isInjectable(tab.url)) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'caliper/toggle' });
  } catch (_) {
    /* content script not present yet — user can refresh the page */
  }
}

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'toggle-caliper') toggleActiveTab();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Messages from the popup carry an explicit tabId; messages from a content
  // script come with sender.tab.id. The responsive controls live in the popup.
  const tabId = msg?.tabId ?? sender.tab?.id;

  if (msg?.type === 'caliper/state' && tabId) {
    if (msg.active) {
      chrome.action.setBadgeText({ tabId, text: BADGE_ON });
      chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
    return;
  }

  if (msg?.type === 'caliper/global-deactivate' && tabId) {
    chrome.tabs.sendMessage(tabId, { type: 'caliper/deactivate' }).catch(() => {});
    return;
  }

  if (msg?.type === 'caliper/responsive-set' && tabId) {
    setResponsive(tabId, msg)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message || err) }));
    return true; // async
  }

  if (msg?.type === 'caliper/responsive-clear' && tabId) {
    clearResponsive(tabId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message || err) }));
    return true;
  }

  if (msg?.type === 'caliper/responsive-status' && tabId) {
    const state = debugTabs.get(tabId);
    sendResponse({ active: !!state, ...(state || {}) });
    return;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
});
