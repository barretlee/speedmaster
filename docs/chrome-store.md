# SpeedMaster – Chrome Web Store  Draft

This document contains bilingual copy (English + 简体中文) for Chrome Web Store submission. Replace links or contact info with actual details before publishing.

---

## English

### Basic Info
- **Name**: SpeedMaster – Universal Media Playback Controller
- **Category**: Productivity / Accessibility
- **Languages**: English (default), 中文 (Simplified Chinese)
- **Privacy**: No data collection. Uses `chrome.storage` solely to store user preferences locally or via sync.

### Short Description (≤132 characters)
Control audio/video speed anywhere via a modern floating widget, popup controls, site blacklist, and instant boost mode.

### Detailed Description
#### Overview
SpeedMaster unifies media control across the web. Whether you’re studying, catching up on podcasts, or watching movies, the floating overlay and popup let you adjust playback speed, enable Boost mode, and manage per-site preferences.

#### Key Features
- **0.5×–15× speed range** with a single-tap **Boost mode 🚀**, and a configurable maximum cap.
- **Overlay + popup**: enable the floating widget or keep things in the toolbar—switch any time.
- **Per-site control**: disable/enable SpeedMaster on specific domains instantly.
- **Themes & language**: dark/light/auto themes; UI toggles between English and Simplified Chinese on the fly.
- **Dynamic badge**: the toolbar badge reflects the current tab’s playback speed (e.g., `1.5`).

#### Why SpeedMaster?
- Works everywhere (MV3, `<all_urls>` host permission).
- 100% on-device logic; no external data transmission.
- Glassmorphism-inspired visuals with soft gradients and subtle shadows.
- Packaged via Webpack for reliable, versioned releases.

#### How to Use
1. Install the extension and open any page with audio/video.
2. Use the toolbar icon for the compact popup; optionally enable the on-page overlay in settings.
3. Tap **Boost mode** to jump to high speed, or restore normal playback with one click.
4. Adjust default theme, location, max speed, and language in the options page.

#### Permissions
- `storage`: Persists theme, language, overlay placement, and site blacklist via `chrome.storage.sync/local`. Without it, every refresh would reset preferences.
- `tabs`: Required only to obtain the active tab ID so the extension can update the toolbar badge with the current playback speed. No tab content is read or modified.
- `host_permissions (<all_urls>)`: Needed to locate `<audio>` / `<video>` elements on any site in order to adjust playback speed.

#### Security & Offline Operation
- All code ships with the extension bundle; no remote scripts or resources are loaded at runtime.
- Network requests are never made—the extension works entirely on-device.
- Boost mode and overlay interactions operate purely through the DOM APIs provided by the page.

#### Support
- GitHub Issues: https://github.com/barretlee/speedmaster/issues
- Email (optional): barret.china@gmail.com


---

## 中文（简体）

### 基本信息
- **名称**：SpeedMaster – 全能倍速控制器
- **分类**：效率 / 无障碍
- **语言**：英文（默认）+ 简体中文
- **隐私政策**：不采集任何用户数据，只使用 `chrome.storage` 在本地/同步空间保存偏好。

### 简介（≤132 字）
现代化浮窗 + 弹出面板控制网页音视频倍速，支持站点黑名单与一键超速播放 🚀。

### 详细描述
#### 功能概览
无论是网课、播客还是影片，SpeedMaster 都能帮你在任意网站上调整播放节奏。轻盈的浮窗与工具栏面板可同步管理倍速、Boost 模式和站点配置。

#### 核心亮点
- **0.5×–15× 全范围倍速**，可自定义最高上限，并支持「超速播放 🚀」一键加速。
- **双界面模式**：网页浮窗 + 工具栏弹出页可随时切换，满足不同浏览习惯。
- **站点级管理**：针对单个域名快速禁用或启用控制器。
- **主题与语言**：深色/浅色/跟随系统主题；界面可在英文与中文之间即时切换。
- **状态徽标**：工具栏徽标实时显示当前标签的倍速（如 `1.5`）。

#### 为什么选择 SpeedMaster？
- 覆盖所有站点（MV3 + `<all_urls>` 权限），不受平台限制。
- 操作完全本地化，绝不上传或分享任何数据。
- 采用玻璃拟态与柔和渐变风格，兼顾可读性与现代感。
- 通过 Webpack 打包，保证稳定的版本管理与发布流程。

#### 使用步骤
1. 安装扩展后，访问任意包含音视频的网页。
2. 点击扩展图标打开弹出面板，或在设置中启用网页浮窗。
3. 使用「超速播放」快速提升倍速，再次点击即可恢复常速。
4. 在设置页自定义默认主题、默认位置、最高倍速和界面语言。

#### 权限说明
- `storage`：通过 `chrome.storage` 持久化主题、语言、浮窗位置以及站点黑名单，否则刷新页面会丢失设置。
- `tabs`：仅用于获取当前页面的 tabId，以更新工具栏徽标上的倍速信息，不读取页面内容。
- `host_permissions (<all_urls>)`：需要访问任意站点的 `<audio>` / `<video>` 元素，以便进行倍速控制。

#### 安全与离线能力
- 所有代码均随扩展打包，不会动态加载远程脚本。
- 扩展不会发起任何网络请求，所有逻辑均在本地完成。
- 超速播放、浮窗操作均基于页面 DOM API，无额外依赖。

#### 支持与反馈
- GitHub Issues: https://github.com/barretlee/speedmaster/issues
- 邮箱（可选）：barret.china@gmail.com

> 提醒：提交 Chrome Web Store 时，请准备 128×128、440×280、1280×800 等要求的素材文件。
