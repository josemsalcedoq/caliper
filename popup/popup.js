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

refresh();
loadShortcut();
