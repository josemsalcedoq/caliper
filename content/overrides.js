// Per-element, per-property inline-style overrides for the editable panel.
// Session-only: cleared on deactivate / page unload. No persistence.
// Writes go in as inline !important so they win against author CSS in most
// cases; the original value AND priority are snapshotted on first write so
// revert returns the element to its exact prior state (including the case
// where the author had their own inline !important).
//
// Out of v1: rgba/hsla alpha editing -- color writes accept 3/6-digit hex
// only. Compound properties (box-shadow, transform, font shorthand) are
// not editable; per-side spacing (padding-top etc.) is handled by the
// panel's compound mini-editor and goes through the same single-property
// API here.
(function () {
  const A = window.__Caliper;
  const O = (A.overrides = {});

  // Map<Element, Map<prop, snapshot>>
  // snapshot = { originalValue, originalPriority, currentValue }
  const store = new Map();

  function ensureEntry(el, prop) {
    let inner = store.get(el);
    if (!inner) {
      inner = new Map();
      store.set(el, inner);
    }
    if (!inner.has(prop)) {
      inner.set(prop, {
        originalValue: el.style.getPropertyValue(prop),
        originalPriority: el.style.getPropertyPriority(prop),
        currentValue: '',
      });
    }
    return inner.get(prop);
  }

  function writeStyle(el, prop, value) {
    el.style.setProperty(prop, value, 'important');
  }

  function restoreStyle(el, prop, entry) {
    if (entry.originalValue) {
      el.style.setProperty(prop, entry.originalValue, entry.originalPriority);
    } else {
      el.style.removeProperty(prop);
    }
  }

  // Apply a value, snapshotting the pre-override state on first write for
  // this (el, prop). Used both for commits and for keystroke-level live
  // preview -- the snapshot is captured once, so a long edit session can
  // be unwound by a single revert.
  O.set = function (el, prop, value) {
    const entry = ensureEntry(el, prop);
    entry.currentValue = value;
    writeStyle(el, prop, value);
  };

  // Alias used by the panel's edit flow to make intent explicit at call
  // sites (preview during typing vs. commit on Enter/blur). Semantically
  // identical to set() today; kept separate so we can later add e.g.
  // throttled non-snapshotting previews without touching callers.
  O.preview = O.set;
  O.commit = O.set;

  O.revert = function (el, prop) {
    const inner = store.get(el);
    if (!inner) return;
    const entry = inner.get(prop);
    if (!entry) return;
    restoreStyle(el, prop, entry);
    inner.delete(prop);
    if (inner.size === 0) store.delete(el);
  };

  // Revert every override across every element. Iterates a copy of the
  // entries because revert() mutates the store. Skip elements that are no
  // longer in the document -- their inline style cannot be restored, and
  // doing so would resurrect nothing anyway. The entry is dropped either
  // way via the trailing clear().
  O.revertAll = function () {
    for (const [el, inner] of store) {
      if (!document.contains(el)) continue;
      for (const [prop, entry] of inner) {
        restoreStyle(el, prop, entry);
      }
    }
    store.clear();
  };

  O.has = function (el, prop) {
    const inner = store.get(el);
    return !!(inner && inner.has(prop));
  };

  O.get = function (el, prop) {
    const inner = store.get(el);
    return inner ? inner.get(prop) : undefined;
  };

  O.hasAny = function (el, props) {
    for (const p of props) if (O.has(el, p)) return true;
    return false;
  };

  O.totalCount = function () {
    let total = 0;
    for (const inner of store.values()) total += inner.size;
    return total;
  };

  // Drop entries whose element is no longer attached to the document. The
  // main render loop already guards against stale S.selected; this is the
  // matching guard for stored overrides so the footer counter and ↺ icons
  // don't reference dead nodes after SPA route changes.
  O.prune = function () {
    const dead = [];
    for (const el of store.keys()) {
      if (!document.contains(el)) dead.push(el);
    }
    for (const el of dead) store.delete(el);
  };

  O.clear = O.revertAll;
})();
