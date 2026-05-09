# UX Align

> Inspect any web UI like Figma — measure, align, and verify pixel-perfect implementations without opening DevTools.

A Chrome extension that turns the page into a Figma-like inspect surface: hover any element to see its size, click to open a side panel with all CSS-relevant properties grouped, and hold `Alt` to measure the distance between two elements.

## Features (v0.1)

- **Hover** any element → outline + dimension pill (`width × height`).
- **Click** an element → lock it, open the side panel showing:
  - Layout — `W`, `H`, `display`, `gap`
  - Spacing — `padding`, `margin` (also visualized as colored layers on the page)
  - Typography — font, size, weight, line height, letter spacing, color, alignment
  - Fill — background color (with swatch + hex)
  - Border — width, style, color, radius
  - Effects — shadow, opacity
- **Alt + hover** another element → measured distance between the two on each axis (the Figma magic).
- **Click any panel row** → copies the value to the clipboard.
- **Esc** → deselect, then exit.

Everything is rendered in a closed Shadow DOM, so the page's CSS can never leak into the inspector and vice versa.

## Install (developer mode)

1. Open `chrome://extensions/` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select this folder (`ux-align/`).
5. The UX Align icon appears in the toolbar.

> If you had a tab open before installing, **refresh the tab** so the content script gets injected.

## Use it

- **Toolbar icon** → opens the popup with status and a big "Activate inspector" button.
- **Keyboard shortcut**:
  - macOS: `⌘ + Shift + U`
  - Windows / Linux: `Ctrl + Shift + U`
  - Customize at `chrome://extensions/shortcuts`.

When active, a blue dot (`●`) appears on the extension badge and the page cursor switches to a crosshair.

## Project layout

```
ux-align/
├── manifest.json              MV3 manifest
├── background/
│   └── service-worker.js      keyboard command + badge state
├── content/
│   ├── state.js               shared namespace
│   ├── utils.js               formatting, color, geometry helpers
│   ├── overlay.js             outlines, box-model, distance lines (Shadow DOM)
│   ├── panel.js               side panel + click-to-copy + toast
│   └── main.js                event wiring + state machine
├── popup/
│   ├── popup.html / .css / .js
└── icons/
    ├── icon-{16,32,48,128}.png
    └── generate.py            regenerate icons (stdlib only)
```

## Regenerate icons

```bash
python3 icons/generate.py
```

## Limitations of v0.1

- Top frame only (no iframes).
- No persistence of selection across reloads.
- No comparison against a Figma file (planned for a later version).
- Chrome only. Firefox / Safari ports come after the model stabilizes.

## License

TBD.
