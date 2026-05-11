(function () {
  const A = window.__Caliper;
  const P = (A.panel = {});

  // Exposed so overlay.js's ensureRoot can inject these styles together
  // with the overlay styles into the shadow root in a single <style> block.
  P.styles = `
    .panel {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 280px;
      max-height: calc(100vh - 32px);
      background: rgba(28, 28, 30, 0.92);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.34), 0 0 0 0.5px rgba(0, 0, 0, 0.5);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      line-height: 1.4;
      pointer-events: auto;
      user-select: text;
      display: flex;
      flex-direction: column;
      animation: ux-fade-in 140ms ease-out;
      overflow: hidden;
      box-sizing: border-box;
    }
    .panel * { box-sizing: border-box; }
    @keyframes ux-fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      gap: 8px;
      background: rgba(255, 255, 255, 0.02);
    }
    .panel-tag {
      font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.85);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }
    .panel-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      background: transparent;
      color: rgba(255, 255, 255, 0.55);
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background 80ms ease, color 80ms ease;
      flex-shrink: 0;
    }
    .panel-close:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }
    .panel-body {
      overflow-y: auto;
      flex: 1;
      padding: 4px 0 6px 0;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.12) transparent;
    }
    .panel-body::-webkit-scrollbar { width: 6px; }
    .panel-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.12);
      border-radius: 3px;
    }
    .panel-section { padding: 4px 0; }
    .panel-section + .panel-section {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .panel-section-title {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255, 255, 255, 0.42);
      padding: 8px 12px 4px;
    }
    .panel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 5px 12px;
      cursor: copy;
      transition: background 80ms ease;
      min-height: 24px;
      position: relative;
    }
    .panel-row:hover { background: rgba(255, 255, 255, 0.06); }
    .panel-row:active { background: rgba(13, 153, 255, 0.18); }
    .panel-row[data-editing="true"] {
      background: rgba(13, 153, 255, 0.10);
      cursor: default;
    }
    .panel-row[data-editing="true"]:hover { background: rgba(13, 153, 255, 0.14); }
    .panel-row .label {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.55);
      flex-shrink: 0;
    }
    .panel-row .value {
      font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace;
      font-size: 11px;
      color: #ffffff;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 180px;
      min-width: 0;
    }
    .panel-row .row-actions {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      flex-shrink: 0;
    }
    .panel-row .row-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      padding: 0;
      margin: 0;
      background: transparent;
      color: rgba(255, 255, 255, 0.45);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      transition: background 80ms ease, color 80ms ease, opacity 80ms ease;
    }
    .panel-row .row-btn:hover { background: rgba(255, 255, 255, 0.10); color: #ffffff; }
    .panel-row .row-edit { opacity: 0; }
    .panel-row:hover .row-edit { opacity: 1; }
    .panel-row[data-editing="true"] .row-edit { display: none; }
    .panel-row .row-revert { display: none; color: #FF4D4D; }
    .panel-row[data-overridden="true"] .row-revert { display: inline-flex; }
    .panel-row[data-editing="true"] .row-revert { display: none; }
    .panel-row[data-overridden="true"] .value { color: #ffffff; }
    .panel-row[data-overridden="true"] .label::after {
      content: '';
      display: inline-block;
      width: 5px;
      height: 5px;
      margin-left: 5px;
      border-radius: 50%;
      background: #0D99FF;
      vertical-align: middle;
    }
    .swatch {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 3px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      flex-shrink: 0;
      background-image:
        linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%),
        linear-gradient(-45deg, rgba(255,255,255,0.15) 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.15) 75%),
        linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.15) 75%);
      background-size: 8px 8px;
      background-position: 0 0, 0 4px, 4px -4px, -4px 0;
      position: relative;
      cursor: inherit;
    }
    .panel-row[data-editing="true"] .swatch { cursor: pointer; }
    .swatch::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--swatch-color, transparent);
    }
    .swatch input[type="color"] {
      position: absolute;
      inset: 0;
      opacity: 0;
      width: 100%;
      height: 100%;
      padding: 0;
      border: none;
      cursor: pointer;
    }
    .panel-input {
      font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace;
      font-size: 11px;
      line-height: 1.2;
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 4px;
      padding: 2px 6px;
      width: 92px;
      text-align: right;
      outline: none;
      -moz-appearance: textfield;
      box-sizing: border-box;
    }
    .panel-input::-webkit-outer-spin-button,
    .panel-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .panel-input:focus {
      border-color: #0D99FF;
      background: rgba(13, 153, 255, 0.12);
    }
    .panel-input.invalid {
      border-color: #FF4D4D;
    }
    .panel-select {
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 11px;
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 4px;
      padding: 2px 22px 2px 6px;
      outline: none;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='none' stroke='white' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/></svg>");
      background-repeat: no-repeat;
      background-position: right 6px center;
      max-width: 140px;
    }
    .panel-select:focus { border-color: #0D99FF; }
    .panel-select option {
      background: #1c1c1e;
      color: #ffffff;
    }
    .compound-row { flex-direction: column; align-items: stretch; gap: 4px; }
    .compound-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: auto auto auto;
      gap: 4px;
      align-items: center;
      padding-top: 2px;
    }
    .compound-grid .compound-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba(255, 255, 255, 0.42);
      text-align: center;
      grid-column: 2;
      grid-row: 2;
    }
    .compound-grid .panel-input { width: 100%; text-align: center; padding: 2px 4px; }
    .compound-grid .side-t { grid-column: 2; grid-row: 1; }
    .compound-grid .side-l { grid-column: 1; grid-row: 2; }
    .compound-grid .side-r { grid-column: 3; grid-row: 2; }
    .compound-grid .side-b { grid-column: 2; grid-row: 3; }
    .compound-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .compound-header .label { font-size: 11px; color: rgba(255, 255, 255, 0.55); }
    .panel-footer {
      display: flex;
      gap: 10px;
      padding: 8px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 10px;
      color: rgba(255, 255, 255, 0.42);
      background: rgba(255, 255, 255, 0.02);
      align-items: center;
      justify-content: space-between;
    }
    .panel-footer .hint {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .panel-footer kbd {
      display: inline-block;
      padding: 1px 5px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      font-family: ui-monospace, 'SF Mono', monospace;
      font-size: 9px;
      color: rgba(255, 255, 255, 0.7);
    }
    .panel-reset-all {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 500;
      color: #0D99FF;
      background: rgba(13, 153, 255, 0.10);
      border: 1px solid rgba(13, 153, 255, 0.28);
      border-radius: 4px;
      padding: 3px 8px;
      cursor: pointer;
      transition: background 80ms ease, border-color 80ms ease;
    }
    .panel-reset-all:hover {
      background: rgba(13, 153, 255, 0.18);
      border-color: rgba(13, 153, 255, 0.46);
    }
    .toast {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(28, 28, 30, 0.96);
      color: #fff;
      font-family: 'Inter', -apple-system, sans-serif;
      font-size: 11px;
      font-weight: 500;
      padding: 7px 12px;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.32);
      pointer-events: none;
      animation: ux-fade-in 100ms ease-out;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .toast .check {
      width: 10px;
      height: 10px;
      color: #0D99FF;
    }
  `;

  // Defensive inline styles applied directly to the panel root element.
  // Even if the class-based CSS in the shadow stylesheet ever fails to apply
  // for any reason, the panel will still be correctly positioned and sized.
  const PANEL_INLINE_STYLES =
    'all: initial;' +
    'position: fixed;' +
    'top: 16px;' +
    'right: 16px;' +
    'width: 280px;' +
    'max-height: calc(100vh - 32px);' +
    'pointer-events: auto;' +
    'box-sizing: border-box;' +
    'display: flex;' +
    'flex-direction: column;' +
    'overflow: hidden;' +
    'border-radius: 10px;' +
    'background: rgba(28, 28, 30, 0.92);' +
    'color: #ffffff;' +
    'font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;' +
    'font-size: 12px;' +
    'line-height: 1.4;' +
    'border: 1px solid rgba(255, 255, 255, 0.08);' +
    'box-shadow: 0 12px 32px rgba(0, 0, 0, 0.34);' +
    'z-index: 1;';

  // Side keys used for padding/margin compound editing. Order matches the
  // visual grid (top / right / bottom / left) and CSS shorthand.
  const SIDES = ['top', 'right', 'bottom', 'left'];

  let panelEl = null;
  let toastEl = null;
  let toastTimer = null;
  // Track which element the panel currently shows so populate() can preserve
  // scrollTop on re-renders for the same element (mousemove changing hover,
  // window resize, responsive override change, etc.) but reset to top when
  // the user switches selection.
  let lastEl = null;

  // Active edit session, or null. Lives across render frames so the input
  // doesn't get yanked from under the user when the panel re-renders.
  //
  // Simple kinds (numeric/select/color):
  //   { el, prop, kind, rowEl, inputEl, startSnapshot, debounceTimer }
  //   startSnapshot = { hadOverride, priorCurrent }
  //
  // Compound kind (padding/margin):
  //   { el, prop:'padding'|'margin', kind:'compound', rowEl,
  //     inputs: {top, right, bottom, left}, sides: {top: snap, ...},
  //     debounceTimer }
  //   per-side snap = { hadOverride, priorCurrent, dirty }
  let edit = null;

  P.show = function (el) {
    if (!A.shadow) return;
    if (!panelEl) {
      panelEl = buildPanel();
      A.shadow.appendChild(panelEl);
    }
    populate(el);
  };

  P.hide = function () {
    // Drop any in-flight edit state. Critically: cancel the pending
    // debounce timer FIRST -- otherwise it can fire after the panel is
    // gone (or after main.deactivate's revertAll has restored the page)
    // and re-stamp a now-stale override, leaving the page mid-edit even
    // though the inspector is off.
    if (edit) {
      clearTimeout(edit.debounceTimer);
      edit = null;
    }
    if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
    panelEl = null;
    lastEl = null;
  };

  // Commit any active edit session without tearing down the panel. Called
  // before deselection paths (close button, switching elements) so the
  // user's typed value isn't silently discarded.
  P.commitPending = function () {
    if (edit) commitEdit();
  };

  P.flash = function (text) {
    if (!A.shadow) return;
    if (toastEl) toastEl.remove();
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.innerHTML =
      '<svg class="check" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5 L5 9.5 L10 3"/></svg>';
    const t = document.createElement('span');
    t.textContent = text;
    toastEl.appendChild(t);
    A.shadow.appendChild(toastEl);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toastEl) {
        toastEl.remove();
        toastEl = null;
      }
    }, 1100);
  };

  function buildPanel() {
    const wrap = document.createElement('div');
    wrap.className = 'panel';
    wrap.style.cssText = PANEL_INLINE_STYLES;
    wrap.innerHTML = `
      <header class="panel-header">
        <div class="panel-tag" title=""></div>
        <button class="panel-close" aria-label="Close">
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <path d="M3 3 L11 11 M11 3 L3 11"/>
          </svg>
        </button>
      </header>
      <div class="panel-body"></div>
      <footer class="panel-footer"></footer>
    `;
    wrap.querySelector('.panel-close').addEventListener('click', () => {
      // Preserve user edits before deselecting. If the user wants to drop
      // the override entirely they can click ↺ on the row or "Reset all".
      P.commitPending();
      P.hide();
      A.state.selected = null;
      if (A.main && A.main.requestRender) A.main.requestRender();
    });
    return wrap;
  }

  function populate(el) {
    // If editing a different element, commit pending edit first so we
    // don't lose the user's value. Then proceed with a clean rebuild.
    if (edit && edit.el !== el) commitEdit();

    const U = A.utils;
    const box = U.getBox(el);
    const cs = box.cs;

    const tag = panelEl.querySelector('.panel-tag');
    const path = U.tagPath(el);
    tag.textContent = path;
    tag.title = path;

    const body = panelEl.querySelector('.panel-body');
    const isSameEl = lastEl === el;
    const sections = buildDescriptors(el, box, cs);

    if (edit && edit.el === el && body.firstChild) {
      // Active edit on this element: refresh in place so the input keeps
      // focus and selection. The editing row itself is skipped -- the
      // user's typed value, not the recomputed display, is what should
      // show there.
      refreshInPlace(body, sections, el);
    } else {
      const scrollTop = isSameEl ? body.scrollTop : 0;
      rebuildBody(body, sections, el);
      body.scrollTop = scrollTop;
    }

    rebuildFooter();
    lastEl = el;
  }

  // ============================================================
  //  Descriptors
  // ============================================================

  function buildDescriptors(el, box, cs) {
    const U = A.utils;
    const O = A.overrides;
    const out = [];

    // ---- Layout
    const layout = [
      d({ label: 'W', kind: 'numeric', prop: 'width',
          value: `${U.fmt(box.w)}px`, raw: U.fmt(box.w), unit: 'px', min: 0 }),
      d({ label: 'H', kind: 'numeric', prop: 'height',
          value: `${U.fmt(box.h)}px`, raw: U.fmt(box.h), unit: 'px', min: 0 }),
      d({ label: 'X', kind: 'plain', value: `${U.fmt(box.rect.left)}px` }),
      d({ label: 'Y', kind: 'plain', value: `${U.fmt(box.rect.top)}px` }),
      d({ label: 'Display', kind: 'plain', value: cs.display }),
    ];
    if (['flex', 'inline-flex', 'grid', 'inline-grid'].includes(cs.display)) {
      const gapVal = cs.gap === 'normal' ? '0' : cs.gap;
      const gapPx = parseFloat(gapVal) || 0;
      layout.push(d({ label: 'Gap', kind: 'numeric', prop: 'gap',
        value: cs.gap === 'normal' ? '0' : cs.gap, raw: U.fmt(gapPx), unit: 'px', min: 0 }));
    }
    out.push({ title: 'Layout', rows: layout });

    // ---- Spacing
    const spacing = [];
    const padOverridden = O.hasAny(el, ['padding-top','padding-right','padding-bottom','padding-left']);
    const padNonZero = box.padding.top || box.padding.right || box.padding.bottom || box.padding.left;
    if (padNonZero || padOverridden) {
      spacing.push(d({
        label: 'Padding', kind: 'compound', prop: 'padding',
        value: U.shorthand(box.padding) + 'px',
        sides: { top: box.padding.top, right: box.padding.right,
                 bottom: box.padding.bottom, left: box.padding.left },
      }));
    }
    const marOverridden = O.hasAny(el, ['margin-top','margin-right','margin-bottom','margin-left']);
    const marNonZero = box.margin.top || box.margin.right || box.margin.bottom || box.margin.left;
    if (marNonZero || marOverridden) {
      spacing.push(d({
        label: 'Margin', kind: 'compound', prop: 'margin',
        value: U.shorthand(box.margin) + 'px',
        sides: { top: box.margin.top, right: box.margin.right,
                 bottom: box.margin.bottom, left: box.margin.left },
      }));
    }
    out.push({ title: 'Spacing', rows: spacing });

    // ---- Typography
    if (U.hasText(el)) {
      const rootSize =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const fontPx = parseFloat(cs.fontSize);
      const fontRem = (fontPx / rootSize).toFixed(fontPx / rootSize >= 1 ? 2 : 3);
      const text = U.directText(el);
      const preview = text.length > 40 ? text.slice(0, 40) + '…' : text;
      const bg = U.effectiveBackground(el);
      const ratio = U.contrastRatio(cs.color, bg);

      const typo = [];
      if (preview) typo.push(d({ label: 'Text', kind: 'plain', value: `"${preview}"` }));
      typo.push(d({ label: 'Font', kind: 'plain', value: U.firstFont(cs.fontFamily) }));
      typo.push(d({ label: 'Size', kind: 'numeric', prop: 'font-size',
        value: `${U.fmt(fontPx)}px · ${fontRem}rem`, raw: U.fmt(fontPx), unit: 'px', min: 0 }));
      typo.push(d({ label: 'Weight', kind: 'select', prop: 'font-weight',
        value: U.weightName(cs.fontWeight),
        raw: String(parseInt(cs.fontWeight, 10) || 400),
        options: [
          ['100','Thin 100'],['200','Extra Light 200'],['300','Light 300'],
          ['400','Regular 400'],['500','Medium 500'],['600','Semi Bold 600'],
          ['700','Bold 700'],['800','Extra Bold 800'],['900','Black 900'],
        ],
      }));
      // line-height of "normal" computes to a number in cs.lineHeight on
      // many browsers but to the literal "normal" string when explicitly
      // set. Treat both as read-only -- editing a numeric px when the
      // author set 1.5em would silently break the em scaling.
      if (cs.lineHeight === 'normal' || Number.isNaN(parseFloat(cs.lineHeight))) {
        typo.push(d({ label: 'Line', kind: 'plain', value: 'normal' }));
      } else {
        const lineRaw = parseFloat(cs.lineHeight);
        typo.push(d({ label: 'Line', kind: 'numeric', prop: 'line-height',
          value: `${U.fmt(lineRaw)}px`, raw: U.fmt(lineRaw), unit: 'px', min: 0 }));
      }
      if (cs.letterSpacing === 'normal') {
        typo.push(d({ label: 'Letter', kind: 'plain', value: '0' }));
      } else {
        const ls = parseFloat(cs.letterSpacing);
        typo.push(d({ label: 'Letter', kind: 'numeric', prop: 'letter-spacing',
          value: cs.letterSpacing, raw: U.fmt(ls), unit: 'px' }));
      }
      typo.push(d({ label: 'Color', kind: 'color', prop: 'color',
        value: U.rgbaToHex(cs.color) || cs.color, raw: cs.color }));
      typo.push(d({ label: 'Align', kind: 'select', prop: 'text-align',
        value: cs.textAlign, raw: cs.textAlign,
        options: [['left','left'],['center','center'],['right','right'],
                  ['justify','justify'],['start','start'],['end','end']],
      }));
      if (ratio !== null) {
        typo.push(d({ label: 'Contrast', kind: 'graded', value: ratio.toFixed(2), raw: ratio }));
      }
      out.push({ title: 'Typography', rows: typo });
    }

    // ---- Fill
    const fill = [];
    const bg = cs.backgroundColor;
    const hasBg = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
    if (hasBg || O.has(el, 'background-color')) {
      fill.push(d({ label: 'Fill', kind: 'color', prop: 'background-color',
        value: U.rgbaToHex(bg) || bg, raw: bg }));
    }
    out.push({ title: 'Fill', rows: fill });

    // ---- Border
    const border = [];
    const bw = parseFloat(cs.borderTopWidth);
    if (bw > 0) {
      border.push(d({ label: 'Border', kind: 'plain',
        value: `${U.fmt(bw)}px ${cs.borderTopStyle}` }));
      border.push(d({ label: 'Stroke', kind: 'plain',
        value: U.rgbaToHex(cs.borderTopColor) || cs.borderTopColor,
        swatch: cs.borderTopColor }));
    }
    const radius = cs.borderRadius;
    if ((radius && radius !== '0px') || A.overrides.has(el, 'border-radius')) {
      if (radius && /^[\d.]+px$/.test(radius)) {
        const r = parseFloat(radius);
        border.push(d({ label: 'Radius', kind: 'numeric', prop: 'border-radius',
          value: radius, raw: U.fmt(r), unit: 'px', min: 0 }));
      } else {
        border.push(d({ label: 'Radius', kind: 'plain', value: radius }));
      }
    }
    out.push({ title: 'Border', rows: border });

    // ---- Effects
    const fx = [];
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      fx.push(d({ label: 'Shadow', kind: 'plain', value: cs.boxShadow }));
    }
    const op = parseFloat(cs.opacity);
    if (op < 1 || A.overrides.has(el, 'opacity')) {
      fx.push(d({ label: 'Opacity', kind: 'numeric', prop: 'opacity',
        value: `${Math.round(op * 100)}%`, raw: op.toFixed(2), unit: '',
        min: 0, max: 1, step: 0.1 }));
    }
    out.push({ title: 'Effects', rows: fx });

    return out;
  }

  function d(o) {
    // Default editable to true for any kind that carries a prop.
    if (o.editable === undefined) o.editable = !!o.prop;
    return o;
  }

  // ============================================================
  //  Body rendering
  // ============================================================

  function rebuildBody(body, sections, el) {
    body.replaceChildren();
    for (const sec of sections) {
      if (!sec.rows || sec.rows.length === 0) continue;
      body.appendChild(buildSection(sec.title, sec.rows, el));
    }
  }

  function buildSection(title, rows, el) {
    const s = document.createElement('div');
    s.className = 'panel-section';
    const t = document.createElement('div');
    t.className = 'panel-section-title';
    t.textContent = title;
    s.appendChild(t);
    for (const desc of rows) {
      s.appendChild(buildRow(desc, el));
    }
    return s;
  }

  // Refresh the panel body without replacing the DOM that hosts the
  // active edit input. For every existing row we find the matching
  // descriptor by label and update value text, swatch, and override
  // affordances. Rows that should disappear or appear between renders
  // are NOT handled here -- during an edit session the visible row set
  // is stable in practice (you can't add/remove sections by editing
  // a single value), and rebuilding would yank the input.
  function refreshInPlace(body, sections, el) {
    const descByLabel = new Map();
    for (const sec of sections) {
      for (const row of sec.rows) descByLabel.set(row.label, row);
    }
    const rows = body.querySelectorAll('.panel-row');
    rows.forEach((rowEl) => {
      const label = rowEl.getAttribute('data-label');
      const desc = descByLabel.get(label);
      if (!desc) return;
      // Skip the actively-edited row.
      if (edit && edit.rowEl === rowEl) {
        // Even on the editing row, the override-marker dot should reflect
        // the live override state.
        rowEl.setAttribute('data-overridden', isOverridden(el, desc) ? 'true' : 'false');
        return;
      }
      updateRowDisplay(rowEl, desc, el);
    });
  }

  function updateRowDisplay(rowEl, desc, el) {
    const valueEl = rowEl.querySelector('.value');
    if (valueEl) {
      // Plain text + swatch refresh for non-color rows
      if (desc.kind === 'color' || desc.swatch) {
        const sw = valueEl.querySelector('.swatch');
        if (sw) sw.style.setProperty('--swatch-color', desc.raw || desc.swatch || 'transparent');
        const txt = valueEl.querySelector('.value-text');
        if (txt) txt.textContent = desc.value;
      } else if (desc.kind === 'graded') {
        const num = valueEl.querySelector('.value-text');
        if (num) num.textContent = desc.value;
      } else {
        // Plain / numeric / select / compound: simple text update.
        const txt = valueEl.querySelector('.value-text');
        if (txt) txt.textContent = desc.value;
      }
      valueEl.title = desc.value;
    }
    rowEl.setAttribute('data-overridden', isOverridden(el, desc) ? 'true' : 'false');
  }

  function isOverridden(el, desc) {
    const O = A.overrides;
    if (desc.kind === 'compound' && desc.prop) {
      return O.hasAny(el, SIDES.map((s) => `${desc.prop}-${s}`));
    }
    return !!(desc.prop && O.has(el, desc.prop));
  }

  // ============================================================
  //  Row builder
  // ============================================================

  function buildRow(desc, el) {
    const row = document.createElement('div');
    row.className = 'panel-row';
    row.setAttribute('data-label', desc.label);
    row.setAttribute('data-kind', desc.kind);
    if (desc.prop) row.setAttribute('data-prop', desc.prop);
    if (isOverridden(el, desc)) row.setAttribute('data-overridden', 'true');

    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = desc.label;
    row.appendChild(labelEl);

    const valueEl = buildValueCell(desc);
    row.appendChild(valueEl);

    const actions = document.createElement('span');
    actions.className = 'row-actions';
    if (desc.editable && desc.prop) {
      actions.appendChild(buildRevertBtn(row, desc, el));
      actions.appendChild(buildEditBtn(row, desc, el));
    } else if (desc.kind === 'color' && desc.prop) {
      actions.appendChild(buildRevertBtn(row, desc, el));
    }
    row.appendChild(actions);

    // Click on the row body (away from buttons / inputs / swatch) copies.
    row.addEventListener('click', (e) => {
      if (row.getAttribute('data-editing') === 'true') return;
      const target = e.target;
      if (target.closest('.row-btn')) return;
      if (target.closest('input')) return;
      if (target.closest('.swatch')) return;
      copy(desc.value);
    });

    return row;
  }

  function buildValueCell(desc) {
    const v = document.createElement('span');
    v.className = 'value';
    v.title = desc.value;
    if (desc.kind === 'color' || desc.swatch) {
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      swatch.style.setProperty('--swatch-color', desc.raw || desc.swatch || 'transparent');
      v.appendChild(swatch);
      const t = document.createElement('span');
      t.className = 'value-text';
      t.textContent = desc.value;
      v.appendChild(t);
    } else if (desc.kind === 'graded') {
      const ratio = desc.raw;
      const grade = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail';
      const color = ratio >= 7 ? '#34c759' : ratio >= 4.5 ? '#ffd60a' : '#ff453a';
      const num = document.createElement('span');
      num.className = 'value-text';
      num.textContent = desc.value;
      const badge = document.createElement('span');
      badge.textContent = grade;
      badge.style.cssText =
        `color: ${color}; font-weight: 600; font-size: 10px; padding: 1px 5px; ` +
        `background: ${color}1f; border-radius: 3px;`;
      v.appendChild(num);
      v.appendChild(badge);
      v.title = `${desc.value} (${grade})`;
    } else {
      const t = document.createElement('span');
      t.className = 'value-text';
      t.textContent = desc.value;
      v.appendChild(t);
    }
    return v;
  }

  function buildEditBtn(row, desc, el) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'row-btn row-edit';
    btn.setAttribute('aria-label', `Edit ${desc.label}`);
    btn.title = `Edit ${desc.label}`;
    btn.innerHTML =
      '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M8.5 1.5l2 2-6 6-2.5.5.5-2.5 6-6z"/>' +
      '</svg>';
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      beginEdit(el, desc, row);
    });
    return btn;
  }

  function buildRevertBtn(row, desc, el) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'row-btn row-revert';
    btn.setAttribute('aria-label', `Reset ${desc.label}`);
    btn.title = `Reset ${desc.label}`;
    btn.innerHTML =
      '<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M2 6a4 4 0 1 0 1.2-2.8"/>' +
      '<path d="M2 2v2.5h2.5"/>' +
      '</svg>';
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      revertRow(el, desc);
    });
    return btn;
  }

  // ============================================================
  //  Per-row revert
  // ============================================================

  function revertRow(el, desc) {
    const O = A.overrides;
    if (desc.kind === 'compound' && desc.prop) {
      let n = 0;
      for (const s of SIDES) {
        if (O.has(el, `${desc.prop}-${s}`)) {
          O.revert(el, `${desc.prop}-${s}`);
          n++;
        }
      }
      if (n) P.flash(`Reset ${desc.label}`);
    } else if (desc.prop && O.has(el, desc.prop)) {
      O.revert(el, desc.prop);
      P.flash(`Reset ${desc.label}`);
    }
    if (A.main && A.main.requestRender) A.main.requestRender();
  }

  // ============================================================
  //  Footer
  // ============================================================

  function rebuildFooter() {
    const footer = panelEl.querySelector('.panel-footer');
    if (!footer) return;
    footer.replaceChildren();
    const count = A.overrides ? A.overrides.totalCount() : 0;
    if (count > 0) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'panel-reset-all';
      btn.innerHTML =
        '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M2 6a4 4 0 1 0 1.2-2.8"/>' +
        '<path d="M2 2v2.5h2.5"/>' +
        '</svg>' +
        `<span>Reset all (${count})</span>`;
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Cancel any in-flight edit first; otherwise the next preview
        // tick would re-apply the just-reverted value.
        if (edit) {
          clearTimeout(edit.debounceTimer);
          edit = null;
        }
        const n = A.overrides.totalCount();
        A.overrides.revertAll();
        P.flash(`Reset ${n} override${n === 1 ? '' : 's'}`);
        if (A.main && A.main.requestRender) A.main.requestRender();
      });
      footer.appendChild(btn);

      const esc = document.createElement('span');
      esc.className = 'hint';
      esc.innerHTML = '<kbd>Esc</kbd> · deselect';
      footer.appendChild(esc);
    } else {
      const hover = document.createElement('span');
      hover.className = 'hint';
      hover.textContent = 'Hover any element · distance';
      footer.appendChild(hover);
      const esc = document.createElement('span');
      esc.className = 'hint';
      esc.innerHTML = '<kbd>Esc</kbd> · deselect';
      footer.appendChild(esc);
    }
  }

  // ============================================================
  //  Edit lifecycle -- simple kinds
  // ============================================================

  function beginEdit(el, desc, rowEl) {
    // Commit any other in-flight edit before starting this one.
    if (edit && (edit.el !== el || edit.prop !== desc.prop)) commitEdit();
    if (desc.kind === 'compound') return beginCompoundEdit(el, desc, rowEl);

    const O = A.overrides;
    const had = O.has(el, desc.prop);
    const startSnapshot = {
      hadOverride: had,
      priorCurrent: had ? O.get(el, desc.prop).currentValue : '',
    };

    edit = {
      el, prop: desc.prop, kind: desc.kind, rowEl,
      inputEl: null, startSnapshot, debounceTimer: null,
      // Unit is needed at commit time to reconstruct a CSS value from the
      // bare number in the input. Default '' (not 'px') so opacity and
      // other unitless properties stay correct.
      unit: desc.unit !== undefined ? desc.unit : 'px',
    };

    rowEl.setAttribute('data-editing', 'true');
    const valueEl = rowEl.querySelector('.value');

    if (desc.kind === 'numeric') {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.className = 'panel-input';
      input.value = desc.raw;
      attachNumericHandlers(input, desc);
      valueEl.replaceChildren(input);
      edit.inputEl = input;
      input.focus();
      input.select();
    } else if (desc.kind === 'select') {
      const select = document.createElement('select');
      select.className = 'panel-select';
      for (const [val, label] of desc.options) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (val === desc.raw) opt.selected = true;
        select.appendChild(opt);
      }
      attachSelectHandlers(select, desc);
      valueEl.replaceChildren(select);
      edit.inputEl = select;
      select.focus();
    } else if (desc.kind === 'color') {
      const wrap = document.createElement('span');
      wrap.style.display = 'inline-flex';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '6px';

      const swatch = document.createElement('label');
      swatch.className = 'swatch';
      const startHex = currentHexForColor(desc.raw);
      swatch.style.setProperty('--swatch-color', startHex);
      const colorIn = document.createElement('input');
      colorIn.type = 'color';
      colorIn.value = startHex;
      swatch.appendChild(colorIn);

      const hexIn = document.createElement('input');
      hexIn.type = 'text';
      hexIn.className = 'panel-input';
      hexIn.value = startHex;
      hexIn.style.width = '80px';

      attachColorHandlers(hexIn, colorIn, swatch, desc);
      wrap.appendChild(swatch);
      wrap.appendChild(hexIn);
      valueEl.replaceChildren(wrap);
      edit.inputEl = hexIn;
      edit.colorEl = colorIn;
      edit.swatchEl = swatch;
      hexIn.focus();
      hexIn.select();
    }
  }

  // Debounced live preview during keystroke editing.
  function schedulePreview(value) {
    if (!edit) return;
    clearTimeout(edit.debounceTimer);
    edit.debounceTimer = setTimeout(() => {
      if (!edit) return;
      A.overrides.preview(edit.el, edit.prop, value);
      if (A.main && A.main.requestRender) A.main.requestRender();
    }, 30);
  }

  function attachNumericHandlers(input, desc) {
    const min = desc.min !== undefined ? desc.min : -Infinity;
    const max = desc.max !== undefined ? desc.max : Infinity;
    const step = desc.step || 1;
    const unit = desc.unit || '';

    const apply = (n) => {
      if (!Number.isFinite(n)) return null;
      const clamped = Math.max(min, Math.min(max, n));
      const formatted = formatNum(clamped);
      schedulePreview(formatted + unit);
      return formatted;
    };

    input.addEventListener('input', () => {
      input.classList.remove('invalid');
      const n = parseFloat(input.value);
      if (input.value.trim() === '' || !Number.isFinite(n)) {
        input.classList.add('invalid');
        return;
      }
      apply(n);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? 1 : -1;
        const delta = e.shiftKey ? step * 10 : e.altKey ? step / 10 : step;
        const cur = parseFloat(input.value);
        const next = (Number.isFinite(cur) ? cur : (parseFloat(desc.raw) || 0)) + dir * delta;
        const formatted = apply(next);
        if (formatted !== null) input.value = formatted;
      }
    });

    input.addEventListener('blur', () => {
      if (!edit || edit.inputEl !== input) return;
      commitEdit();
    });
  }

  function attachSelectHandlers(select, desc) {
    select.addEventListener('change', () => {
      schedulePreview(select.value);
    });
    select.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
      }
    });
    select.addEventListener('blur', () => {
      if (!edit || edit.inputEl !== select) return;
      commitEdit();
    });
  }

  function attachColorHandlers(hexIn, colorIn, swatch, desc) {
    const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
    const apply = (hex) => {
      schedulePreview(hex);
      swatch.style.setProperty('--swatch-color', hex);
    };
    hexIn.addEventListener('input', () => {
      const v = hexIn.value.trim();
      if (!HEX.test(v)) {
        hexIn.classList.add('invalid');
        return;
      }
      hexIn.classList.remove('invalid');
      colorIn.value = expandHex(v);
      apply(v);
    });
    colorIn.addEventListener('input', () => {
      hexIn.value = colorIn.value;
      hexIn.classList.remove('invalid');
      apply(colorIn.value);
    });
    const onCommit = () => {
      if (!edit || edit.inputEl !== hexIn) return;
      if (!HEX.test(hexIn.value.trim())) {
        // Roll back to start value silently rather than commit garbage.
        cancelEdit();
        return;
      }
      commitEdit();
    };
    hexIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
      else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
      }
    });
    hexIn.addEventListener('blur', (e) => {
      // The native color picker steals focus on open. Don't commit when
      // focus moves into the color picker -- it'll come back here on close.
      if (e.relatedTarget === colorIn) return;
      setTimeout(onCommit, 0);
    });
  }

  function expandHex(h) {
    if (/^#[0-9a-f]{3}$/i.test(h)) {
      return '#' + h.slice(1).split('').map((c) => c + c).join('');
    }
    return h;
  }

  function currentHexForColor(raw) {
    const hex = A.utils.rgbaToHex(raw);
    // rgbaToHex may return an 8-digit (with alpha) hex; native picker
    // can't represent alpha, so truncate.
    if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    if (/^#[0-9a-f]{8}$/i.test(hex)) return hex.slice(0, 7);
    if (/^#[0-9a-f]{3}$/i.test(hex)) return expandHex(hex);
    return '#000000';
  }

  function formatNum(n) {
    const r = Math.round(n * 100) / 100;
    return Number.isInteger(r) ? String(r) : String(r);
  }

  // Finalize the active edit using whatever value is currently in the
  // input. For simple kinds this is a no-op beyond clearing the edit
  // state, because every keystroke already wrote a preview. For invalid
  // input states (NaN, empty), fall back to the start snapshot.
  function commitEdit() {
    if (!edit) return;
    clearTimeout(edit.debounceTimer);
    if (edit.kind === 'compound') return commitCompoundEdit();

    const O = A.overrides;
    const input = edit.inputEl;
    const el = edit.el;
    const prop = edit.prop;

    let finalValue = null;

    if (edit.kind === 'numeric') {
      const n = parseFloat(input.value);
      if (Number.isFinite(n)) {
        finalValue = formatNum(n) + edit.unit;
      }
    } else if (edit.kind === 'select') {
      finalValue = input.value;
    } else if (edit.kind === 'color') {
      const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
      const v = input.value.trim();
      if (HEX.test(v)) finalValue = v;
    }

    if (finalValue !== null) {
      A.overrides.commit(el, prop, finalValue);
    } else {
      // Invalid: restore start state.
      if (edit.startSnapshot.hadOverride) {
        A.overrides.commit(el, prop, edit.startSnapshot.priorCurrent);
      } else {
        A.overrides.revert(el, prop);
      }
    }

    const rowEl = edit.rowEl;
    edit = null;
    if (rowEl) rowEl.removeAttribute('data-editing');
    if (A.main && A.main.requestRender) A.main.requestRender();
  }

  function cancelEdit() {
    if (!edit) return;
    clearTimeout(edit.debounceTimer);
    if (edit.kind === 'compound') return cancelCompoundEdit();

    const O = A.overrides;
    if (edit.startSnapshot.hadOverride) {
      O.commit(edit.el, edit.prop, edit.startSnapshot.priorCurrent);
    } else {
      O.revert(edit.el, edit.prop);
    }

    const rowEl = edit.rowEl;
    edit = null;
    if (rowEl) rowEl.removeAttribute('data-editing');
    if (A.main && A.main.requestRender) A.main.requestRender();
  }

  // ============================================================
  //  Edit lifecycle -- compound (padding/margin)
  // ============================================================

  function beginCompoundEdit(el, desc, rowEl) {
    const O = A.overrides;
    const sides = {};
    for (const s of SIDES) {
      const prop = `${desc.prop}-${s}`;
      const had = O.has(el, prop);
      sides[s] = {
        hadOverride: had,
        priorCurrent: had ? O.get(el, prop).currentValue : '',
        dirty: false,
      };
    }

    edit = {
      el, prop: desc.prop, kind: 'compound', rowEl,
      inputs: {}, sides, debounceTimer: null,
    };

    rowEl.setAttribute('data-editing', 'true');
    rowEl.classList.add('compound-row');

    const header = document.createElement('div');
    header.className = 'compound-header';
    const lbl = document.createElement('span');
    lbl.className = 'label';
    lbl.textContent = desc.label;
    const val = document.createElement('span');
    val.className = 'value';
    val.style.fontSize = '10px';
    val.style.color = 'rgba(255,255,255,0.42)';
    val.textContent = '(editing)';
    header.appendChild(lbl);
    header.appendChild(val);

    const grid = document.createElement('div');
    grid.className = 'compound-grid';

    const middle = document.createElement('span');
    middle.className = 'compound-label';
    middle.textContent = desc.label;
    grid.appendChild(middle);

    for (const s of SIDES) {
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.className = `panel-input side-${s[0]}`;
      input.value = A.utils.fmt(desc.sides[s]);
      input.setAttribute('data-side', s);
      attachCompoundSideHandlers(input, s, desc);
      grid.appendChild(input);
      edit.inputs[s] = input;
    }

    rowEl.replaceChildren(header, grid);
    edit.inputs.top.focus();
    edit.inputs.top.select();
  }

  function attachCompoundSideHandlers(input, side, desc) {
    const apply = (n) => {
      if (!Number.isFinite(n)) return;
      edit.sides[side].dirty = true;
      const value = `${formatNum(n)}px`;
      clearTimeout(edit.debounceTimer);
      edit.debounceTimer = setTimeout(() => {
        if (!edit) return;
        A.overrides.preview(edit.el, `${desc.prop}-${side}`, value);
        if (A.main && A.main.requestRender) A.main.requestRender();
      }, 30);
    };
    input.addEventListener('input', () => {
      const n = parseFloat(input.value);
      if (input.value.trim() === '' || !Number.isFinite(n)) {
        input.classList.add('invalid');
        return;
      }
      input.classList.remove('invalid');
      apply(n);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? 1 : -1;
        const delta = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
        const cur = parseFloat(input.value);
        const next = (Number.isFinite(cur) ? cur : 0) + dir * delta;
        input.value = formatNum(Math.max(0, next));
        apply(parseFloat(input.value));
      }
    });
    input.addEventListener('blur', (e) => {
      // If focus moved to another input within the same compound editor,
      // don't commit -- the edit session continues.
      if (!edit) return;
      const movedTo = e.relatedTarget;
      if (movedTo && edit.inputs && Object.values(edit.inputs).includes(movedTo)) return;
      setTimeout(() => {
        if (edit && edit.kind === 'compound') commitEdit();
      }, 0);
    });
  }

  function commitCompoundEdit() {
    if (!edit) return;
    clearTimeout(edit.debounceTimer);
    const O = A.overrides;
    const el = edit.el;
    const propRoot = edit.prop;
    for (const s of SIDES) {
      const input = edit.inputs[s];
      if (!input) continue;
      const n = parseFloat(input.value);
      if (Number.isFinite(n)) {
        // Only WRITE if the user actually touched this side; otherwise
        // leave whatever state was there (could be a prior override that
        // shouldn't be re-stamped, or untouched original CSS).
        if (edit.sides[s].dirty) {
          O.commit(el, `${propRoot}-${s}`, `${formatNum(n)}px`);
        }
      }
    }
    const rowEl = edit.rowEl;
    edit = null;
    if (rowEl) {
      rowEl.removeAttribute('data-editing');
      rowEl.classList.remove('compound-row');
    }
    if (A.main && A.main.requestRender) A.main.requestRender();
  }

  function cancelCompoundEdit() {
    if (!edit) return;
    clearTimeout(edit.debounceTimer);
    const O = A.overrides;
    const el = edit.el;
    const propRoot = edit.prop;
    for (const s of SIDES) {
      const snap = edit.sides[s];
      if (!snap.dirty) continue;
      if (snap.hadOverride) {
        O.commit(el, `${propRoot}-${s}`, snap.priorCurrent);
      } else {
        O.revert(el, `${propRoot}-${s}`);
      }
    }
    const rowEl = edit.rowEl;
    edit = null;
    if (rowEl) {
      rowEl.removeAttribute('data-editing');
      rowEl.classList.remove('compound-row');
    }
    if (A.main && A.main.requestRender) A.main.requestRender();
  }

  // ============================================================
  //  Copy
  // ============================================================

  function copy(text) {
    try {
      navigator.clipboard.writeText(text).then(
        () => P.flash(`Copied ${text}`),
        () => fallbackCopy(text)
      );
    } catch (_) {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      P.flash(`Copied ${text}`);
    } catch (_) {}
    ta.remove();
  }
})();
