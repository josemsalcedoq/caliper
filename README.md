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
- **Move the cursor** to another element after locking a selection → measured distance between the two on each axis is drawn instantly. No modifier key required.
- **Click any panel row** → copies the value to the clipboard.
- **Esc** → deselect, then exit.

Everything is rendered in a closed Shadow DOM, so the page's CSS can never leak into the inspector and vice versa.

## Install

The same source folder loads into Chrome, Edge, Firefox and Safari. Pick your browser:

### Chrome / Edge / Brave (developer mode)

1. Open `chrome://extensions/` (or `edge://extensions/`).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this folder.
4. Refresh any tabs you had open before installing.

Customize the keyboard shortcut at `chrome://extensions/shortcuts`.

### Firefox 121+ (temporary add-on)

Firefox 121 is the minimum because earlier MV3 builds didn't support the `service_worker` background.

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Pick any file inside this folder (e.g. `manifest.json`).
4. The add-on stays loaded until you restart Firefox.

Customize the keyboard shortcut at `about:addons` → ⚙ → **Manage Extension Shortcuts**.

### Safari 16.4+ (Xcode wrapper)

Apple requires every Safari extension to ship inside a host app, so there's no "load unpacked" — but the conversion is automatic:

1. From Terminal:
   ```
   xcrun safari-web-extension-converter /path/to/ux-align
   ```
2. Xcode opens with a generated wrapper project. Build & run it (⌘R) once.
3. Safari → Settings → **Extensions** → enable **UX Align**.
4. Safari → Develop menu → enable **Allow Unsigned Extensions** (resets on every Safari restart unless you sign with an Apple Developer ID).

Caveat: Safari often ignores manifest-declared keyboard shortcuts. Use the toolbar icon, or assign a shortcut in System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts → Safari.

## Use it

- **Toolbar icon** → opens the popup with status and a big "Activate inspector" button.
- **Default keyboard shortcut**:
  - macOS: `⌘ + Shift + U`
  - Windows / Linux: `Ctrl + Shift + U`

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

## Iframes

The inspector runs in **every frame** (top + each iframe, including cross-origin ones with `<all_urls>` permission). Each frame inspects independently:

- Hovering inside an iframe shows the dimension pill within that iframe.
- Clicking inside an iframe selects an element there and shows the panel inside that iframe.
- Distance lines stay within a single frame.
- Pressing **Esc** in any frame deactivates the inspector across **all** frames in the tab (the service worker relays it).

Iframes that lazy-load *after* you activate the inspector will start with the inspector off. Toggle off and on to resync.

## Limitations

- Selecting in multiple frames at once produces multiple panels (one per frame). Distance measurements never cross a frame boundary — design tradeoff to avoid cross-origin postMessage plumbing in v0.2.
- Sandboxed iframes that disallow scripts (`<iframe sandbox>` without `allow-scripts`) can't be inspected — Chrome doesn't inject content scripts there.
- No persistence of selection across reloads.
- No comparison against a Figma file (planned for a later version).
- Safari ignores manifest-declared keyboard shortcuts; assign one in System Settings if you want one.

## License

TBD.
