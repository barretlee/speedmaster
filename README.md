# SpeedMaster Chrome Extension

[中文版](./README.zh-CN.md)

SpeedMaster delivers a unified, accessible controller for any audio or video element in the browser. The project started as a Tampermonkey userscript and has evolved into a modular Chrome extension with localisation, theming, and a streamlined build pipeline ready for publishing.

<img width="400" alt="image" src="https://github.com/user-attachments/assets/c82d3321-49b7-4374-b47e-e68a41d716e5" />


## Highlights
- Adjust playback speed from 0.5× up to 15×, with a one-tap **Boost mode** that pushes media to 15× until you restore normal speed.
- Floating controller on the page or a compact popup panel – switch where it appears by default and toggle the overlay at any time.
- Per-site enable/disable switch plus an exclusion list that applies to subdomains; manage it from the popup or the options page.
- Dark/light themes, automatic system detection, and full bilingual support (English · 简体中文) with an instant language toggle.
- Badge feedback on the toolbar (`ON` vs `--`) so you can see whether the current tab is under control.
- Webpack-powered build that bundles scripts, copies static assets, and generates a release-friendly package in `/dist`.

## Installation (Development Build)
1. Clone the repository.
   ```bash
   git clone https://github.com/barretlee/speedmaster.git
   cd speedmaster
   ```
2. (Optional) Install dependencies if you plan to use the build pipeline.
   ```bash
   npm install
   ```
3. Load the unpacked extension in Chrome:
   - Open `chrome://extensions/`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and choose the `extension/` directory for the live source version, or the `dist/` directory after running a production build.

## Usage
- Open any page with an `<audio>` or `<video>` element; the overlay controller appears (unless the site has been disabled in your settings).
- Click the SpeedMaster toolbar icon for the popup when you prefer a compact controller. The panel lets you:
  - Toggle Boost mode / return to normal speed.
  - Show or hide the page overlay.
  - Disable or enable the current site with one tap.
  - Flip between light/dark themes and jump to the options page.
- The badge shows `ON` when media is attached, `--` otherwise.
- When you disable a site, the popup dims the controls and the overlay button is temporarily unavailable until you re-enable it.

## Configuration
- Head to the extension **Options** page to customise:
  - Maximum speed cap (0.5×–15×).
  - Default control location (page overlay, popup only, or both).
  - Default theme (dark, light, or follow system).
  - Interface language (English / 简体中文).
  - Excluded domains list, with quick add/remove actions.
- All settings are stored via `chrome.storage.sync` when available, falling back to local storage otherwise, and changes propagate instantly to the popup and overlay.

## Building for Release
The project ships with a Webpack configuration that minimises scripts and copies static assets into `dist/`.

```bash
npm install        # install dev dependencies once
npm run build      # produces the distributable package inside ./dist
```

The generated `dist/` folder mirrors the extension structure, making it suitable for Chrome Web Store submission (after adding store assets such as icons and promo images).

## Project Structure
```
.
├── extension/                 # Source extension loaded during development
│   ├── assets/                # SVG icons referenced at runtime
│   ├── content/               # Content scripts and controller logic
│   ├── popup/                 # Popup UI (JS + CSS + HTML)
│   ├── options/               # Options page UI
│   ├── shared/                # Reusable modules (storage, i18n, domains)
│   ├── background.js          # Badge updates via service worker
│   └── manifest.json
├── dist/ (generated)          # Output of `npm run build`
├── docs/
│   └── conversion-notes.md    # Migration notes from userscript to extension
├── webpack.config.js
├── package.json
├── README.md                  # English readme (default)
└── README.zh-CN.md            # Chinese readme
```

## Acknowledgements
- Licensed under MIT
