(function () {
  const A = window.__UXAlign;
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
      direction: rtl;
      text-align: left;
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
    }
    .panel-row:hover { background: rgba(255, 255, 255, 0.06); }
    .panel-row:active { background: rgba(13, 153, 255, 0.18); }
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
    }
    .swatch::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: var(--swatch-color, transparent);
    }
    .panel-footer {
      display: flex;
      gap: 10px;
      padding: 8px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 10px;
      color: rgba(255, 255, 255, 0.42);
      background: rgba(255, 255, 255, 0.02);
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

  let panelEl = null;
  let toastEl = null;
  let toastTimer = null;

  P.show = function (el) {
    if (!A.shadow) return;
    if (!panelEl) {
      panelEl = buildPanel();
      A.shadow.appendChild(panelEl);
    }
    populate(el);
  };

  P.hide = function () {
    if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
    panelEl = null;
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
      <footer class="panel-footer">
        <span class="hint">Hover any element · distance</span>
        <span class="hint"><kbd>Esc</kbd> · deselect</span>
      </footer>
    `;
    wrap.querySelector('.panel-close').addEventListener('click', () => {
      P.hide();
      A.state.selected = null;
      if (A.main && A.main.requestRender) A.main.requestRender();
    });
    return wrap;
  }

  function populate(el) {
    const U = A.utils;
    const box = U.getBox(el);
    const cs = box.cs;

    const tag = panelEl.querySelector('.panel-tag');
    const path = U.tagPath(el);
    tag.textContent = path;
    tag.title = path;

    const body = panelEl.querySelector('.panel-body');
    body.replaceChildren();

    // Layout
    const layoutRows = [
      row('W', `${U.fmt(box.w)}px`),
      row('H', `${U.fmt(box.h)}px`),
      // Viewport-relative position -- what designers compare against a Figma
      // frame. box.x / box.y are document-relative; box.rect.* are viewport.
      row('X', `${U.fmt(box.rect.left)}px`),
      row('Y', `${U.fmt(box.rect.top)}px`),
      row('Display', cs.display),
    ];
    if (['flex', 'inline-flex', 'grid', 'inline-grid'].includes(cs.display)) {
      layoutRows.push(row('Gap', cs.gap === 'normal' ? '0' : cs.gap));
    }
    body.appendChild(section('Layout', layoutRows));

    // Spacing
    const spacingRows = [];
    const padNonZero =
      box.padding.top || box.padding.right || box.padding.bottom || box.padding.left;
    const marNonZero =
      box.margin.top || box.margin.right || box.margin.bottom || box.margin.left;
    if (padNonZero) spacingRows.push(row('Padding', U.shorthand(box.padding) + 'px'));
    if (marNonZero) spacingRows.push(row('Margin', U.shorthand(box.margin) + 'px'));
    if (spacingRows.length) body.appendChild(section('Spacing', spacingRows));

    // Typography (only if element has direct text)
    if (U.hasText(el)) {
      body.appendChild(
        section('Typography', [
          row('Font', U.firstFont(cs.fontFamily)),
          row('Size', `${U.fmt(parseFloat(cs.fontSize))}px`),
          row('Weight', U.weightName(cs.fontWeight)),
          row(
            'Line',
            cs.lineHeight === 'normal' ? 'normal' : `${U.fmt(parseFloat(cs.lineHeight))}px`
          ),
          row(
            'Letter',
            cs.letterSpacing === 'normal' ? '0' : cs.letterSpacing
          ),
          rowColor('Color', cs.color),
          row('Align', cs.textAlign),
        ])
      );
    }

    // Fill
    const fillRows = [];
    const bg = cs.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      fillRows.push(rowColor('Fill', bg));
    }
    if (fillRows.length) body.appendChild(section('Fill', fillRows));

    // Border
    const borderRows = [];
    const bw = parseFloat(cs.borderTopWidth);
    if (bw > 0) {
      borderRows.push(row('Border', `${U.fmt(bw)}px ${cs.borderTopStyle}`));
      borderRows.push(rowColor('Stroke', cs.borderTopColor));
    }
    if (cs.borderRadius && cs.borderRadius !== '0px') {
      borderRows.push(row('Radius', cs.borderRadius));
    }
    if (borderRows.length) body.appendChild(section('Border', borderRows));

    // Effects
    const fxRows = [];
    if (cs.boxShadow && cs.boxShadow !== 'none') fxRows.push(row('Shadow', cs.boxShadow));
    const op = parseFloat(cs.opacity);
    if (op < 1) fxRows.push(row('Opacity', `${Math.round(op * 100)}%`));
    if (fxRows.length) body.appendChild(section('Effects', fxRows));
  }

  function section(title, rows) {
    const s = document.createElement('div');
    s.className = 'panel-section';
    const t = document.createElement('div');
    t.className = 'panel-section-title';
    t.textContent = title;
    s.appendChild(t);
    rows.forEach((r) => r && s.appendChild(r));
    return s;
  }

  function row(label, value) {
    const r = document.createElement('div');
    r.className = 'panel-row';
    const l = document.createElement('span');
    l.className = 'label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'value';
    v.textContent = value;
    v.title = value;
    r.appendChild(l);
    r.appendChild(v);
    r.addEventListener('click', () => copy(value));
    return r;
  }

  function rowColor(label, raw) {
    const hex = A.utils.rgbaToHex(raw) || raw;
    const r = document.createElement('div');
    r.className = 'panel-row';
    const l = document.createElement('span');
    l.className = 'label';
    l.textContent = label;
    const v = document.createElement('span');
    v.className = 'value';
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.setProperty('--swatch-color', raw);
    const txt = document.createElement('span');
    txt.textContent = hex;
    v.appendChild(swatch);
    v.appendChild(txt);
    v.title = hex;
    r.appendChild(l);
    r.appendChild(v);
    r.addEventListener('click', () => copy(hex));
    return r;
  }

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
