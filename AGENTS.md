# Repository Guidelines

## Project Structure & Module Organization
SpeedMaster’s loadable source lives in `extension/`. Key areas include `content/` for the controller entry (`main.js`, `app.js`), `shared/` for storage, i18n, and domain utilities, `popup/` and `options/` for UI scripts, and `assets/` for SVG icons used across the extension. `background.js` keeps the toolbar badge in sync. Production artifacts are emitted to `dist/` via Webpack; delete and rebuild rather than editing them. Historic notes around the userscript migration sit under `docs/`, and `tampermonkey.js` remains as a legacy reference.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Run `npm run build` for a production-ready bundle in `dist/`. Use `npm run build:watch` while iterating to keep scripts rebuilding in development mode. `npm run build:zip` creates a versioned archive beside the repo root, and `npm run build:extension` is a compatibility alias for automation. Load the unpacked extension from `extension/` during local testing.

## Coding Style & Naming Conventions
The codebase is modern ES modules with explicit imports; avoid CommonJS patterns. Use two-space indentation, trailing semicolons, and single quotes for strings. Name functions and variables in camelCase, reserve PascalCase for constructor-like helpers, and keep constants in SCREAMING_SNAKE_CASE (`SPEED_STEP`, `DEFAULT_SETTINGS`). Prefer optional chaining, template literals, and pure functions. Align CSS class names with their usage in `controller.css` and `popup.css`, keeping BEM-style fragments consistent with DOM hooks.

## Testing Guidelines
Run the end-to-end suite with `npm run test:extension` (requires `npx playwright install` the first time). The Playwright flow loads the unpacked extension, serves `test/fixtures/media-page.html`, and verifies the overlay can boost to 15× and reset. Keep workers at 1 so the persistent Chromium profile remains isolated. For manual smoke checks, still load `extension/` via `chrome://extensions` and confirm storage-backed flows (popup, options) behave as expected after code changes. Document any extra exploratory steps in your pull request notes so reviewers can follow along.

## Commit & Pull Request Guidelines
Commits follow a Conventional Commit prefix (`feat:`, `fix:`, `doc:`, `chore:`); add scopes when it clarifies impact (`feat(content):`). Squash incidental WIP commits before submitting a PR. Each pull request should link relevant issues, summarise behavioural changes, and include before/after screenshots or short clips for UI updates. Call out localisation updates and any follow-up tasks. Request review from maintainers familiar with the touched surface area.

## Release & Localization Tips
Before packaging, ensure English and Chinese translations remain aligned in `shared/i18n.js` and UI templates. Bump the version in `extension/manifest.json`, run `npm run build`, and spot-check the generated `dist/` output inside Chrome. Regenerate release archives with `npm run build:zip`, and confirm icon assets in `extension/assets/` match Chrome Web Store requirements.
