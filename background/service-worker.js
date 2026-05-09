const BADGE_ON = '●';
const BADGE_COLOR = '#0D99FF';

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
    await chrome.tabs.sendMessage(tab.id, { type: 'uxalign/toggle' });
  } catch (_) {
    /* content script not present yet — user can refresh the page */
  }
}

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'toggle-uxalign') toggleActiveTab();
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!sender.tab?.id) return;
  const tabId = sender.tab.id;

  if (msg?.type === 'uxalign/state') {
    if (msg.active) {
      chrome.action.setBadgeText({ tabId, text: BADGE_ON });
      chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
    return;
  }

  // Any frame requesting a global deactivate -> tell every frame in the tab
  // to deactivate. Receivers handle this idempotently and don't re-broadcast.
  if (msg?.type === 'uxalign/global-deactivate') {
    chrome.tabs.sendMessage(tabId, { type: 'uxalign/deactivate' }).catch(() => {});
    return;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
});
