(function () {
  const A = window.__Caliper;
  const S = A.state;

  let renderQueued = false;
  let cursorStyleEl = null;
  let listenersAttached = false;

  A.main = {
    activate,
    deactivate,
    requestRender: scheduleRender,
  };

  function activate() {
    if (S.active) return;
    S.active = true;
    A.overlay.ensureRoot();
    addCursorStyle();
    attachListeners();
    notify(true);
  }

  function deactivate(opts = {}) {
    if (!S.active) return;
    S.active = false;
    S.hovered = null;
    S.selected = null;
    detachListeners();
    A.panel.hide();
    A.overlay.tearDown();
    removeCursorStyle();
    notify(false);
    // When deactivation originates locally (Esc / popup toggle while active),
    // ask the service worker to broadcast to every frame in the tab so they
    // turn off in lockstep. Receivers pass {broadcast: false} to avoid loops.
    if (opts.broadcast !== false) {
      try {
        chrome.runtime.sendMessage({ type: 'caliper/global-deactivate' });
      } catch (_) {}
    }
  }

  function attachListeners() {
    if (listenersAttached) return;
    listenersAttached = true;
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mouseup', onMouseUp, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('scroll', scheduleRender, true);
    window.addEventListener('resize', scheduleRender);
  }

  function detachListeners() {
    if (!listenersAttached) return;
    listenersAttached = false;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('auxclick', onClick, true);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('contextmenu', onContextMenu, true);
    window.removeEventListener('scroll', scheduleRender, true);
    window.removeEventListener('resize', scheduleRender);
  }

  function addCursorStyle() {
    if (cursorStyleEl) return;
    cursorStyleEl = document.createElement('style');
    cursorStyleEl.id = 'caliper-cursor';
    cursorStyleEl.textContent =
      '*, *::before, *::after { cursor: crosshair !important; }';
    document.documentElement.appendChild(cursorStyleEl);
  }

  function removeCursorStyle() {
    if (cursorStyleEl && cursorStyleEl.parentNode)
      cursorStyleEl.parentNode.removeChild(cursorStyleEl);
    cursorStyleEl = null;
  }

  function onMouseMove(e) {
    if (!S.active) return;
    const target = A.utils.elementAt(e.clientX, e.clientY);
    if (!target || target === S.hovered) return;
    S.hovered = target;
    scheduleRender();
  }

  function onClick(e) {
    if (!S.active) return;
    if (A.utils.isOurEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.button !== undefined && e.button !== 0) return;
    const target = A.utils.elementAt(e.clientX, e.clientY);
    if (!target) return;
    if (S.selected === target) {
      S.selected = null;
      A.panel.hide();
    } else {
      S.selected = target;
    }
    scheduleRender();
  }

  function onMouseDown(e) {
    if (!S.active) return;
    if (A.utils.isOurEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function onMouseUp(e) {
    if (!S.active) return;
    if (A.utils.isOurEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function onContextMenu(e) {
    if (!S.active) return;
    if (A.utils.isOurEl(e.target)) return;
    e.preventDefault();
  }

  function onKeyDown(e) {
    if (!S.active) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (S.selected) {
        S.selected = null;
        A.panel.hide();
        scheduleRender();
      } else {
        deactivate();
      }
    }
  }

  function scheduleRender() {
    if (!S.active) return;
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      render();
    });
  }

  function render() {
    if (S.selected && !document.contains(S.selected)) {
      S.selected = null;
      A.panel.hide();
    }
    if (S.hovered && !document.contains(S.hovered)) {
      S.hovered = null;
    }
    if (!S.active) return;
    A.overlay.clear();
    if (S.selected) {
      A.overlay.renderSelection(S.selected);
      // Distance is now always shown when the cursor is over a different
      // element than the selection -- no Alt modifier required. The hovered
      // element gets its own outline + dimension pill so the user can see
      // the two endpoints of the measurement at a glance.
      if (S.hovered && S.hovered !== S.selected) {
        A.overlay.renderHover(S.hovered);
        A.overlay.renderDistance(S.selected, S.hovered);
      }
      A.panel.show(S.selected);
    } else if (S.hovered) {
      A.overlay.renderHover(S.hovered);
    }
  }

  function notify(active) {
    try {
      chrome.runtime.sendMessage({ type: 'caliper/state', active });
    } catch (_) {
      /* no-op */
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'caliper/toggle') {
      // The toggle is broadcast by the SW/popup to every frame in the tab,
      // so each frame already learns about the state change directly. Skip
      // the global re-broadcast on deactivate to avoid a duplicate wave.
      if (S.active) deactivate({ broadcast: false });
      else activate();
      sendResponse({ active: S.active });
      return;
    }
    if (msg?.type === 'caliper/query-state') {
      sendResponse({ active: S.active });
      return;
    }
    if (msg?.type === 'caliper/deactivate') {
      deactivate({ broadcast: false });
      sendResponse({ active: false });
      return;
    }
  });
})();
