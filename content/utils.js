(function () {
  const A = window.__Caliper;
  const U = (A.utils = {});

  U.fmt = (n) => {
    if (n === null || n === undefined || Number.isNaN(n)) return '0';
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  };

  U.parsePx = (s) => parseFloat(s) || 0;

  U.rgbaToHex = (str) => {
    if (!str) return '';
    const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
    if (!m) return str;
    const [, r, g, b, a] = m;
    const hex =
      '#' +
      [r, g, b]
        .map((v) => parseInt(v, 10).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    if (a !== undefined && parseFloat(a) < 1) {
      const aHex = Math.round(parseFloat(a) * 255).toString(16).padStart(2, '0').toUpperCase();
      return hex + aHex;
    }
    return hex;
  };

  U.weightName = (w) => {
    const n = parseInt(w, 10) || 400;
    const map = {
      100: 'Thin',
      200: 'Extra Light',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'Semi Bold',
      700: 'Bold',
      800: 'Extra Bold',
      900: 'Black',
    };
    return map[n] ? `${map[n]} ${n}` : String(n);
  };

  U.firstFont = (family) => {
    if (!family) return '';
    const first = family.split(',')[0].trim();
    return first.replace(/^['"]|['"]$/g, '');
  };

  U.tagDescriptor = (el) => {
    const tag = el.tagName.toLowerCase();
    if (el.id) return tag + '#' + el.id;
    // Component frameworks (React, Vue, Svelte) tend to ship with hashed
    // class names that aren't useful in a breadcrumb -- but data-testid is
    // the stable, human-meaningful identifier teams already maintain.
    const testId = el.getAttribute('data-testid');
    if (testId) return `${tag}[data-testid="${testId}"]`;
    if (el.classList.length) {
      return tag + '.' + Array.from(el.classList).slice(0, 2).join('.');
    }
    return tag;
  };

  U.tagPath = (el) => {
    if (!el) return '';
    // Two segments is enough context (parent › self) and short enough that
    // we don't need the direction:rtl hack to truncate from the start --
    // standard text-overflow: ellipsis works.
    const parts = [];
    let cur = el;
    while (cur && cur !== document.documentElement && parts.length < 2) {
      parts.unshift(U.tagDescriptor(cur));
      cur = cur.parentElement;
    }
    return parts.join(' › ');
  };

  U.isOurEl = (el) => {
    if (!el) return false;
    if (A.hostEl && (el === A.hostEl || A.hostEl.contains(el))) return true;
    if (A.shadow && el.getRootNode && el.getRootNode() === A.shadow) return true;
    return false;
  };

  U.elementAt = (x, y) => {
    const els = document.elementsFromPoint(x, y);
    for (const e of els) {
      if (!U.isOurEl(e)) return e;
    }
    return null;
  };

  U.getBox = (el) => {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      rect,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      w: rect.width,
      h: rect.height,
      padding: {
        top: U.parsePx(cs.paddingTop),
        right: U.parsePx(cs.paddingRight),
        bottom: U.parsePx(cs.paddingBottom),
        left: U.parsePx(cs.paddingLeft),
      },
      margin: {
        top: U.parsePx(cs.marginTop),
        right: U.parsePx(cs.marginRight),
        bottom: U.parsePx(cs.marginBottom),
        left: U.parsePx(cs.marginLeft),
      },
      border: {
        top: U.parsePx(cs.borderTopWidth),
        right: U.parsePx(cs.borderRightWidth),
        bottom: U.parsePx(cs.borderBottomWidth),
        left: U.parsePx(cs.borderLeftWidth),
      },
      cs,
    };
  };

  U.shorthand = (sides) => {
    const { top, right, bottom, left } = sides;
    if (top === right && right === bottom && bottom === left) return `${U.fmt(top)}`;
    if (top === bottom && left === right) return `${U.fmt(top)} ${U.fmt(right)}`;
    return `${U.fmt(top)} ${U.fmt(right)} ${U.fmt(bottom)} ${U.fmt(left)}`;
  };

  U.hasText = (el) => {
    if (!el) return false;
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) return true;
    }
    return false;
  };

  // Direct text content (text nodes only, no descendants), collapsed and trimmed.
  U.directText = (el) => {
    if (!el) return '';
    let out = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) out += node.textContent;
    }
    return out.replace(/\s+/g, ' ').trim();
  };

  // Walk up the ancestor chain and return the first non-transparent
  // background color. Falls back to white. Used for contrast checks --
  // ignores partial alpha for simplicity.
  U.effectiveBackground = (el) => {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      const bg = cs.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i);
        if (m && (m[4] === undefined || parseFloat(m[4]) > 0.5)) return bg;
      }
      cur = cur.parentElement;
    }
    return 'rgb(255, 255, 255)';
  };

  // WCAG 2.1 relative luminance contrast ratio between two CSS color strings.
  U.contrastRatio = (a, b) => {
    const rel = (str) => {
      const m = str.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (!m) return null;
      const lin = (c) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * lin(+m[1]) + 0.7152 * lin(+m[2]) + 0.0722 * lin(+m[3]);
    };
    const la = rel(a);
    const lb = rel(b);
    if (la === null || lb === null) return null;
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
})();
