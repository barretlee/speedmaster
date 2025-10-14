# SpeedMaster Privacy Summary / SpeedMaster 隐私说明

This document outlines what data the extension handles and how it operates. The same information is presented in both English and Simplified Chinese.

---

## English

### Data Collection
- SpeedMaster does **not** collect, transmit, or store any personal data outside of the user’s own browser profile.
- No analytics, telemetry, or third-party tracking libraries are included.

### Local Storage Usage
- Preferences such as default theme, language, overlay location, and blocked domains are stored via `chrome.storage.sync` (or `chrome.storage.local` if sync is unavailable).
- These values never leave the user’s device except when Chrome Sync is enabled by the user.

### Permissions Justification
- `storage`: required only to remember user preferences between sessions.
- `tabs`: used to access the current tab ID so the toolbar badge can show the active playback speed; no page content is read.
- `host_permissions (<all_urls>)`: needed to locate `<audio>` / `<video>` elements on any site in order to control playback speed.

### Network Activity
- The extension performs **no** network requests of its own.
- All scripts and assets are bundled with the extension; no remote code or CDN resources are loaded at runtime.

### Contact
- GitHub Issues: https://github.com/barretlee/speedmaster/issues
- Email (optional): barret.china@gmail.com

---

## 简体中文

### 数据收集
- SpeedMaster **不会** 收集、传输或在本地之外保存任何用户数据。
- 扩展不包含分析、埋点或第三方跟踪库。

### 本地存储用途
- 默认主题、语言、浮窗位置、禁用站点等偏好会通过 `chrome.storage.sync`（若不可用则使用 `chrome.storage.local`） 保存，仅为保留设置使用。
- 除非用户启用 Chrome 同步，否则这些数据不会离开本地设备。

### 权限说明
- `storage`：用于在浏览器刷新或重启后记住用户设置。
- `tabs`：只为获取当前标签页的 ID，以更新工具栏徽标上的倍速信息，不读取网页内容。
- `host_permissions (<all_urls>)`：用于定位各网站中的 `<audio>` / `<video>` 元素，进而调整播放速度。

### 网络行为
- 扩展自身不会发起任何网络请求。
- 所有脚本与资源均随扩展打包，不加载外部脚本或 CDN 资源。

### 联系方式
- GitHub Issues: https://github.com/barretlee/speedmaster/issues
- 邮箱：barret.china@gmail.com

---

_Last updated: 2024-XX-XX_
