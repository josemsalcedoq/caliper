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
// Capture the restoration promise so message handlers can await it before
// reading debugTabs. Without this, a popup query that wakes the service
// worker can race with the storage.session.get I/O and read an empty
// Map, falsely reporting responsive mode as inactive.
const ready = restoreDebugTabs();

async function setResponsive(tabId, opts, _retried = false) {
  await ready;
  const target = { tabId };
  // Defensive clamp: the popup already clamps but a future caller might
  // not, and CDP at extreme values renders unusably wide pages.
  const width = Math.min(Math.max(50, opts.width | 0), 4000);
  const height = Math.min(Math.max(50, opts.height | 0), 4000);
  const dpr = opts.dpr || 1;
  const mobile = !!opts.mobile;

  // Capture the original window outer width on first apply -- after the
  // override is in effect we can't reliably read the real browser-window
  // width from the page, so we keep it cached for subsequent preset changes.
  // Fall back to chrome.windows.get when the popup couldn't supply it
  // (typically because the content script isn't loaded yet) so the centre
  // calculation still works.
  const existing = debugTabs.get(tabId);
  let originalOuterW = existing?.originalOuterW || opts.outerW || 0;
  if (!originalOuterW) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const win = await chrome.windows.get(tab.windowId);
      originalOuterW = win.width || 0;
    } catch (_) {}
  }

  if (!debugTabs.has(tabId)) {
    try {
      await chrome.debugger.attach(target, '1.3');
    } catch (err) {
      const msg = String(err && err.message || err);
      if (!msg.includes('already attached')) throw err;
    }
  }
  try {
    await chrome.debugger.sendCommand(target, 'Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: dpr,
      mobile,
    });
  } catch (err) {
    // Stale entry: our Map said this tab was attached but Chrome had
    // already detached the session (typical after an extension reload --
    // Chrome auto-detaches debugger sessions, then our restored state
    // disagrees with reality). Drop the stale entry and retry from a
    // clean slate so the user doesn't see a raw 'Debugger is not
    // attached' error in the popup.
    const msg = String(err && err.message || err);
    // Retry exactly once. Beyond that, throw -- if attach succeeded but
    // sendCommand keeps reporting 'not attached', something stranger is
    // wrong (Chrome auto-detaching during the call) and looping forever
    // would freeze the SW.
    if (!_retried && (msg.includes('not attached') || msg.includes('Debugger is not attached'))) {
      debugTabs.delete(tabId);
      await persistDebugTabs();
      return setResponsive(tabId, opts, true);
    }
    throw err;
  }
  debugTabs.set(tabId, { width, height, dpr, mobile, originalOuterW });
  await persistDebugTabs();

  // Visually centre the rendered viewport in the actual browser window. The
  // grey letterbox of DevTools' Device Mode is part of its own UI overlay
  // and not exposed via CDP -- this transform-based approach gives roughly
  // the same balance (page in the middle) without the grey side panels.
  if (originalOuterW > width) {
    const offsetX = Math.floor((originalOuterW - width) / 2);
    chrome.tabs
      .sendMessage(tabId, { type: 'caliper/responsive-frame', offsetX }, { frameId: 0 })
      .catch(() => {});
  }
}

async function clearResponsive(tabId) {
  await ready;
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
  chrome.tabs
    .sendMessage(tabId, { type: 'caliper/responsive-frame-clear' }, { frameId: 0 })
    .catch(() => {});
}

// User dismissed the yellow "is being debugged" banner, DevTools opened, the
// renderer crashed, etc. Drop our state and clear the visual frame in the
// page -- otherwise the CSS transform on <html> stays applied while CDP has
// already reverted the viewport override, leaving the page shifted offscreen.
chrome.debugger.onDetach.addListener((source) => {
  if (source.tabId !== undefined) {
    debugTabs.delete(source.tabId);
    persistDebugTabs();
    chrome.tabs
      .sendMessage(source.tabId, { type: 'caliper/responsive-frame-clear' }, { frameId: 0 })
      .catch(() => {});
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (debugTabs.has(tabId)) {
    debugTabs.delete(tabId);
    persistDebugTabs();
  }
});

// Re-apply the centering frame after page reloads or in-tab navigations.
// CDP overrides survive across loads (Chrome keeps them per debugger
// session) but our <style> tag injected into <html> is wiped when the DOM
// rebuilds. Without this, every reload anchors the page back to the
// upper-left.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') return;
  // Wait for state restoration. If this listener fires immediately after
  // SW wake-up (e.g., a tab finishes loading right as the SW comes back),
  // debugTabs would otherwise be empty and we'd silently skip the
  // re-application -- the centring frame would be missing for that tab.
  await ready;
  const state = debugTabs.get(tabId);
  if (!state || !state.originalOuterW) return;
  if (state.originalOuterW <= state.width) return;
  const offsetX = Math.floor((state.originalOuterW - state.width) / 2);
  chrome.tabs
    .sendMessage(tabId, { type: 'caliper/responsive-frame', offsetX }, { frameId: 0 })
    .catch(() => {});
});

// Recompute the frame when the user resizes the browser window so the
// responsive viewport keeps tracking the center.
chrome.windows.onBoundsChanged.addListener(async (win) => {
  // Same race as onUpdated: a window resize that fires during SW wake-up
  // would read an empty debugTabs and skip recompute, leaving the frame
  // offsetX stale until the next user action triggers a recompute.
  await ready;
  try {
    const tabs = await chrome.tabs.query({ windowId: win.id });
    for (const tab of tabs) {
      if (!debugTabs.has(tab.id)) continue;
      const state = debugTabs.get(tab.id);
      const newOuterW = win.width;
      if (newOuterW <= state.width) {
        chrome.tabs
          .sendMessage(tab.id, { type: 'caliper/responsive-frame-clear' }, { frameId: 0 })
          .catch(() => {});
        continue;
      }
      const offsetX = Math.floor((newOuterW - state.width) / 2);
      debugTabs.set(tab.id, { ...state, originalOuterW: newOuterW });
      await persistDebugTabs();
      chrome.tabs
        .sendMessage(tab.id, { type: 'caliper/responsive-frame', offsetX }, { frameId: 0 })
        .catch(() => {});
    }
  } catch (_) {}
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
    ready.then(() => {
      const state = debugTabs.get(tabId);
      sendResponse({ active: !!state, ...(state || {}) });
    });
    return true; // keep the port open for async response
  }

  // Pull-side counterpart of the push via tabs.onUpdated. Content scripts
  // ask for current state on load; this closes the race when the push
  // fires before the receiver's onMessage listener exists.
  if (msg?.type === 'caliper/responsive-self-state' && tabId) {
    ready.then(() => {
      const state = debugTabs.get(tabId);
      if (!state || !state.originalOuterW || state.originalOuterW <= state.width) {
        sendResponse({ active: false });
        return;
      }
      const offsetX = Math.floor((state.originalOuterW - state.width) / 2);
      sendResponse({ active: true, offsetX });
    });
    return true;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
});
