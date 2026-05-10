(function () {
  const A = window.__Caliper;
  const S = A.state;

  // Pixels of cursor movement between mousedown and mouseup that flip the
  // gesture from "click" (-> select element) to "drag" (-> draw free ruler).
  // 4px filters hand jitter while still feeling instantly responsive.
  const DRAG_THRESHOLD = 4;

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
    S.ruler = null;
    S.dragStart = null;
    S.dragging = false;
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
    document.addEventListener('mouseleave', onMouseLeave, true);
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
    document.removeEventListener('mouseleave', onMouseLeave, true);
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
    // While a drag is in flight, every mousemove updates the ruler endpoint
    // and we suppress hover updates -- the user is committed to measuring
    // a region, not pointing at an element.
    if (S.dragStart) {
      // Threshold check is in *client* coords so that a wheel-scroll while
      // the mouse is held down (cursor stationary on screen, document
      // moving underneath) does not look like cursor movement and
      // mis-fire a ruler. The ruler endpoint itself stays in document
      // coords so the line stays anchored to the page when the user
      // scrolls afterwards.
      const moved = Math.hypot(
        e.clientX - S.dragStart.cx,
        e.clientY - S.dragStart.cy,
      );
      if (moved > DRAG_THRESHOLD) {
        S.dragging = true;
        S.ruler = {
          x1: S.dragStart.x,
          y1: S.dragStart.y,
          x2: e.clientX + window.scrollX,
          y2: e.clientY + window.scrollY,
        };
        scheduleRender();
        return;
      }
    }
    const target = A.utils.elementAt(e.clientX, e.clientY);
    if (!target || target === S.hovered) return;
    S.hovered = target;
    scheduleRender();
  }

  // Cursor left the document (URL bar, another tab, into a child iframe).
  // Drop the transient hover. Cancel any drag in flight too -- the matching
  // mouseup may never reach us, leaving the gesture stuck. The already-drawn
  // ruler stays so the user can still read the last measurement.
  function onMouseLeave(e) {
    if (!S.active) return;
    if (e.target !== document.documentElement && e.target !== document) return;
    if (S.hovered) S.hovered = null;
    if (S.dragStart) {
      S.dragStart = null;
      S.dragging = false;
    }
    scheduleRender();
  }

  function onClick(e) {
    if (!S.active) return;
    if (A.utils.isOurEl(e.target)) return;
    // Selection is decided in mouseup (where we know whether the gesture
    // was a click or a drag). The click event still fires after a click,
    // so we just preventDefault here to suppress link navigation, form
    // submission and other native click behaviour while inspecting.
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
  }

  function onMouseDown(e) {
    if (!S.active) return;
    if (A.utils.isOurEl(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== 0) return;
    // Track the gesture in two coordinate spaces. Document coords (x,y)
    // anchor the ruler to the page so it stays put when the user later
    // scrolls. Client coords (cx,cy) feed the drag-threshold check, so
    // scrolling while the mouse is held down does NOT look like cursor
    // movement -- previously the threshold compared in doc coords and the
    // wheel-scroll component leaked into the gesture, mis-firing a ruler
    // on what the user intended as a click after a quick scroll.
    S.dragStart = {
      x: e.clientX + window.scrollX,
      y: e.clientY + window.scrollY,
      cx: e.clientX,
      cy: e.clientY,
    };
    S.dragging = false;
  }

  function onMouseUp(e) {
    if (!S.active) return;
    if (A.utils.isOurEl(e.target)) {
      S.dragStart = null;
      S.dragging = false;
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const wasDrag = S.dragging;
    const hadDragStart = !!S.dragStart;
    S.dragStart = null;
    S.dragging = false;

    if (wasDrag) {
      // Ruler is drawn from the last mousemove. Leave it on screen so the
      // user can read the value, screenshot it, etc. Cleared by Esc, by
      // clicking on an element, or by starting another drag.
      return;
    }
    if (!hadDragStart || (e.button !== undefined && e.button !== 0)) return;

    // Click resolved: pick an element. Clicking always clears any ruler.
    const target = A.utils.elementAt(e.clientX, e.clientY);
    if (!target) return;
    S.ruler = null;
    if (S.selected === target) {
      S.selected = null;
      A.panel.hide();
    } else {
      S.selected = target;
    }
    scheduleRender();
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
      // Three-step Esc cycle so each press has an obvious effect:
      // ruler -> selection -> off.
      if (S.ruler) {
        S.ruler = null;
        scheduleRender();
      } else if (S.selected) {
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
      // Hover overlay + auto-distance suppressed during drag: the user has
      // committed to measuring a free region, not pointing at elements.
      if (!S.dragging && S.hovered && S.hovered !== S.selected) {
        A.overlay.renderHover(S.hovered);
        A.overlay.renderDistance(S.selected, S.hovered);
      }
      A.panel.show(S.selected);
    } else if (!S.dragging && S.hovered) {
      A.overlay.renderHover(S.hovered);
    }
    if (S.ruler) {
      A.overlay.renderRuler(S.ruler);
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
    // Viewport metrics for the popup's resize controls. Responds whether
    // the inspector is active or not -- viewport resizing is independent
    // of inspector state.
    if (msg?.type === 'caliper/get-viewport') {
      sendResponse({
        innerW: window.innerWidth,
        innerH: window.innerHeight,
        outerW: window.outerWidth,
        outerH: window.outerHeight,
        dpr: window.devicePixelRatio || 1,
      });
      return;
    }

    // Visual centering for the responsive viewport. We can't paint outside
    // the document (the area to the left/right of the rendered viewport is
    // the browser's canvas surface, not ours), so we just translate <html>
    // to roughly the centre of the actual window. DevTools' grey letterbox
    // is part of its own UI overlay and isn't reachable from CDP.
    if (msg?.type === 'caliper/responsive-frame') {
      applyResponsiveFrame(msg.offsetX);
      return;
    }
    if (msg?.type === 'caliper/responsive-frame-clear') {
      clearResponsiveFrame();
      return;
    }
  });

  // Proactively pull responsive state from the SW on every content-script
  // load. The SW's push via tabs.onUpdated runs into a real race after
  // page navigation: 'status: complete' can fire before this listener has
  // been registered, the sendMessage rejects, the .catch() swallows it
  // silently, and the frame never lands. A pull on init closes that
  // window. Same path also covers the post-extension-reload case where
  // the SW restored its state from session storage but the page DOM has
  // no <style> tag yet.
  (async function syncResponsiveOnLoad() {
    if (window.top !== window.self) return;
    try {
      const state = await chrome.runtime.sendMessage({
        type: 'caliper/responsive-self-state',
      });
      if (state?.active && state.offsetX) {
        applyResponsiveFrame(state.offsetX);
      }
    } catch (_) {}
  })();

  function applyResponsiveFrame(offsetX) {
    // Only the top frame centres the page. Iframes have their own content
    // script and would otherwise transform their own <body>, shifting the
    // iframe's content outside the iframe's clip box (effectively hiding
    // it). The SW also sends with { frameId: 0 } as a second guard.
    if (window.top !== window.self) return;

    let style = document.getElementById('caliper-responsive-frame');
    if (!style) {
      style = document.createElement('style');
      style.id = 'caliper-responsive-frame';
      document.documentElement.appendChild(style);
    }
    // Transform <body>, NOT <html>. Earlier we transformed <html>, which
    // looked right standalone -- but combined with the inspector it broke
    // alignment. Reasoning:
    //
    //   1. CSS spec: an element with `transform` becomes a containing block
    //      for its position:absolute descendants.
    //   2. Our shadow host is position:absolute and a direct child of
    //      <html>. With <html> transformed, the host's containing block
    //      switches from the viewport to the transformed <html>.
    //   3. Overlay children inside the host are positioned using
    //      `left: ${rect.left}px`, where rect.left already includes
    //      ancestor transforms (per getBoundingClientRect spec).
    //   4. Result: the offsetX is applied twice -- once via rect.left, once
    //      via the host's now-transformed containing block. Outlines render
    //      offsetX pixels off from the elements they measure.
    //
    // Transforming <body> sidesteps the whole thing because the host is a
    // sibling of <body>, not a descendant. The host stays in the original
    // viewport coordinate system; rect.left from a transformed-body
    // descendant gives the correct visual position; one application of the
    // offset, alignment intact.
    style.textContent = `
      body {
        transform: translateX(${offsetX}px) !important;
        transform-origin: top left !important;
        transition: transform 140ms ease !important;
      }
    `;
  }

  function clearResponsiveFrame() {
    const s = document.getElementById('caliper-responsive-frame');
    if (s) s.remove();
  }
})();
