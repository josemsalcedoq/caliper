(function () {
  const A = window.__UXAlign;
  const O = (A.overlay = {});

  const OVERLAY_STYLES = `
    :host {
      all: initial;
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      pointer-events: none;
      z-index: 2147483647;
    }
    .layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    }
    .outline {
      position: absolute;
      box-shadow: 0 0 0 1px #0D99FF, 0 0 0 2px rgba(13,153,255,0.18);
      pointer-events: none;
      border-radius: 0;
    }
    .pad {
      position: absolute;
      background: rgba(155, 235, 178, 0.45);
      pointer-events: none;
    }
    .mar {
      position: absolute;
      background: rgba(248, 207, 156, 0.45);
      pointer-events: none;
    }
    .pill {
      position: absolute;
      background: #0D99FF;
      color: #ffffff;
      font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace;
      font-size: 11px;
      font-weight: 500;
      line-height: 1;
      letter-spacing: -0.01em;
      padding: 4px 6px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      transform: translate(-50%, -50%);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
    }
    .pill.measure {
      background: #FF4D4D;
    }
    .dline {
      position: absolute;
      background: #FF4D4D;
      pointer-events: none;
    }
    .dcap {
      position: absolute;
      background: #FF4D4D;
      pointer-events: none;
    }
  `;

  function ensureRoot() {
    if (A.hostEl) return;
    const host = document.createElement('div');
    host.id = 'ux-align-root';
    host.style.cssText =
      'all: initial; position: absolute; top: 0; left: 0; width: 0; height: 0; pointer-events: none; z-index: 2147483647;';
    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    const panelCSS = (A.panel && A.panel.styles) || '';
    style.textContent = OVERLAY_STYLES + '\n' + panelCSS;
    shadow.appendChild(style);

    const layers = {
      box: createLayer(shadow, 'box'),
      distance: createLayer(shadow, 'distance'),
    };

    document.documentElement.appendChild(host);
    A.hostEl = host;
    A.shadow = shadow;
    A.layers = layers;
  }

  function createLayer(shadow, name) {
    const div = document.createElement('div');
    div.className = 'layer ' + name;
    shadow.appendChild(div);
    return div;
  }

  O.ensureRoot = ensureRoot;

  O.clear = function () {
    if (!A.layers) return;
    A.layers.box.replaceChildren();
    A.layers.distance.replaceChildren();
  };

  O.tearDown = function () {
    if (A.hostEl && A.hostEl.parentNode) A.hostEl.parentNode.removeChild(A.hostEl);
    A.hostEl = null;
    A.shadow = null;
    A.layers = null;
  };

  function makeOutline(box) {
    const el = document.createElement('div');
    el.className = 'outline';
    el.style.left = box.x + 'px';
    el.style.top = box.y + 'px';
    el.style.width = box.w + 'px';
    el.style.height = box.h + 'px';
    return el;
  }

  function makePill(text, x, y, kind = '') {
    const el = document.createElement('div');
    el.className = 'pill' + (kind ? ' ' + kind : '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    return el;
  }

  function makeRect(cls, x, y, w, h) {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    return el;
  }

  function pillBelowOrAbove(box) {
    const viewportBottom = window.scrollY + window.innerHeight;
    const below = box.y + box.h + 14;
    if (below + 8 > viewportBottom) return box.y - 14;
    return below;
  }

  O.renderHover = function (el) {
    ensureRoot();
    if (!el) return;
    const box = window.__UXAlign.utils.getBox(el);
    const layer = A.layers.box;
    layer.replaceChildren();
    layer.appendChild(makeOutline(box));
    const fmt = window.__UXAlign.utils.fmt;
    const text = `${fmt(box.w)} × ${fmt(box.h)}`;
    layer.appendChild(makePill(text, box.x + box.w / 2, pillBelowOrAbove(box)));
  };

  O.renderSelection = function (el) {
    ensureRoot();
    if (!el) return;
    const U = window.__UXAlign.utils;
    const box = U.getBox(el);
    const layer = A.layers.box;
    layer.replaceChildren();

    const { padding, margin } = box;

    // Margin (orange-tinted) — outside the element
    if (margin.top > 0)
      layer.appendChild(makeRect('mar', box.x, box.y - margin.top, box.w, margin.top));
    if (margin.bottom > 0)
      layer.appendChild(makeRect('mar', box.x, box.y + box.h, box.w, margin.bottom));
    if (margin.left > 0)
      layer.appendChild(
        makeRect('mar', box.x - margin.left, box.y - margin.top, margin.left, box.h + margin.top + margin.bottom)
      );
    if (margin.right > 0)
      layer.appendChild(
        makeRect('mar', box.x + box.w, box.y - margin.top, margin.right, box.h + margin.top + margin.bottom)
      );

    // Padding (green-tinted) — inside the element
    if (padding.top > 0) layer.appendChild(makeRect('pad', box.x, box.y, box.w, padding.top));
    if (padding.bottom > 0)
      layer.appendChild(makeRect('pad', box.x, box.y + box.h - padding.bottom, box.w, padding.bottom));
    if (padding.left > 0)
      layer.appendChild(
        makeRect('pad', box.x, box.y + padding.top, padding.left, box.h - padding.top - padding.bottom)
      );
    if (padding.right > 0)
      layer.appendChild(
        makeRect(
          'pad',
          box.x + box.w - padding.right,
          box.y + padding.top,
          padding.right,
          box.h - padding.top - padding.bottom
        )
      );

    layer.appendChild(makeOutline(box));
    const text = `${U.fmt(box.w)} × ${U.fmt(box.h)}`;
    layer.appendChild(makePill(text, box.x + box.w / 2, pillBelowOrAbove(box)));
  };

  O.renderDistance = function (fromEl, toEl) {
    ensureRoot();
    if (!fromEl || !toEl || fromEl === toEl) return;
    const U = window.__UXAlign.utils;
    const a = U.getBox(fromEl);
    const b = U.getBox(toEl);
    const layer = A.layers.distance;
    layer.replaceChildren();

    // X axis
    let xGap = null;
    if (b.x >= a.x + a.w) {
      xGap = { x1: a.x + a.w, x2: b.x, value: b.x - (a.x + a.w) };
    } else if (b.x + b.w <= a.x) {
      xGap = { x1: b.x + b.w, x2: a.x, value: a.x - (b.x + b.w) };
    }
    if (xGap && xGap.value > 0) {
      const overlapTop = Math.max(a.y, b.y);
      const overlapBot = Math.min(a.y + a.h, b.y + b.h);
      const y =
        overlapTop < overlapBot ? (overlapTop + overlapBot) / 2 : a.y + a.h / 2;
      const w = xGap.x2 - xGap.x1;
      layer.appendChild(makeRect('dline', xGap.x1, y, w, 1));
      layer.appendChild(makeRect('dcap', xGap.x1, y - 3, 1, 7));
      layer.appendChild(makeRect('dcap', xGap.x2 - 1, y - 3, 1, 7));
      layer.appendChild(makePill(`${U.fmt(xGap.value)}`, xGap.x1 + w / 2, y - 14, 'measure'));
    }

    // Y axis
    let yGap = null;
    if (b.y >= a.y + a.h) {
      yGap = { y1: a.y + a.h, y2: b.y, value: b.y - (a.y + a.h) };
    } else if (b.y + b.h <= a.y) {
      yGap = { y1: b.y + b.h, y2: a.y, value: a.y - (b.y + b.h) };
    }
    if (yGap && yGap.value > 0) {
      const overlapL = Math.max(a.x, b.x);
      const overlapR = Math.min(a.x + a.w, b.x + b.w);
      const x = overlapL < overlapR ? (overlapL + overlapR) / 2 : a.x + a.w / 2;
      const h = yGap.y2 - yGap.y1;
      layer.appendChild(makeRect('dline', x, yGap.y1, 1, h));
      layer.appendChild(makeRect('dcap', x - 3, yGap.y1, 7, 1));
      layer.appendChild(makeRect('dcap', x - 3, yGap.y2 - 1, 7, 1));
      layer.appendChild(makePill(`${U.fmt(yGap.value)}`, x + 18, yGap.y1 + h / 2, 'measure'));
    }
  };
})();
