# SpeedMaster Tampermonkey → Chrome Extension 转换记录

## 背景
- 原始脚本位于 `tampermonkey.js`，通过油猴运行，依赖 GM_* API 和脚本菜单。
- 目标：产出一个模块化的 Chrome 扩展，保留核心功能（面板控制、倍速调节、广告快进、域名排除、可拖拽/最小化）并提供可维护的结构。

## 工作流程
1. **功能盘点**
   - 浏览原脚本，梳理功能：控制面板 UI、拖拽、最小化、域名排除配置、MutationObserver/轮询检测媒体元素等。
   - 标记 Tampermonkey 特有能力（GM 注册菜单、存储 API）。
2. **架构设计**
   - 规划扩展目录：`extension/`（manifest、content script、options）、`shared/`（跨页面复用模块）、`docs/`。
   - 将样式抽离到独立 CSS，脚本拆分为常量、控制器、媒体监听、存储、域名工具等模块。
3. **实现内容脚本**
   - `content/main.js`：入口，动态加载模块，容错初始化。
   - `content/app.js`：协调整体流程（域名排除判断、媒体侦测、控制器生命周期、存储同步）。
   - `content/controller.js`：重写 UI 构建逻辑，使用原生 DOM 操作，保留拖拽/最小化/ARIA 细节。
   - `content/media.js`：统一媒体元素侦测（MutationObserver + 定时轮询）。
   - `content/constants.js`：播放速率、步进值等常量。
4. **实现共享模块**
   - `shared/storage.js`：封装 `chrome.storage` 访问，提供增删改查与监听。
   - `shared/domains.js`：域名归一化与匹配逻辑，复用在内容脚本与选项页。
5. **选项页与配置**
   - `options/index.html/.css/.js`：提供排除域名的可视化管理。
   - 引入 `onExcludedDomainsChange` 保证实时同步。
6. **Manifest 与资源配置**
   - 编写 `manifest.json`（MV3、全域匹配、注入 CSS、注册 options page/弹出页、获取 storage 与 tabs 权限）。
7. **文档与 README**
   - 编写本记录文档（涵盖设计与执行过程）。
   - 分离 README（英文默认版 + 中文版），覆盖使用说明、构建流程与发布指引。
8. **弹出页控制器**
   - 新增扩展弹出页 UI，与内容脚本通过消息通信，实现无覆盖的倍速控制。
   - 引入主题单键切换、站点黑名单一键增删、紧凑布局。
   - 适配暗色/明色主题，提供独立样式资源。
9. **设置中心**
   - 扩展选项页，增加最高倍速、显示位置（网页/弹出/同时）与默认主题配置。
   - 通过 `chrome.storage` 统一同步弹出页与内容脚本的配置状态。
10. **全局状态反馈**
    - 新增背景 service worker，根据内容脚本上报的状态刷新工具栏徽标（ON/--）。
    - 内容脚本在媒体、配置变动时会广播最新状态，确保 Popup 与徽标一致。
11. **国际化支持**
    - 新增 `shared/i18n.js`，集中维护英文与简体中文文案。
    - 控制面板、弹出页、设置页均支持运行时语言切换，默认英文，可在选项页选择界面语言。
12. **构建与发布流程**
    - 引入 Webpack + Babel + CopyWebpackPlugin 构建链，生成压缩后的 `dist/` 扩展包。
    - 提供 `npm run build` / `npm run build:extension` 脚本，便于发布到 Chrome Web Store。

## 功能差异与兼容性说明
- **菜单配置**：Tampermonkey 的 `GM_registerMenuCommand` 由扩展选项页替代，提供更直观的列表管理。
- **持久化方案**：使用 `chrome.storage.sync`（若不可用则回退到 `chrome.storage.local`）替代 GM 存储，域名数据自动去重。
- **UI 构建**：弃用 `innerHTML` 拼接，改为显式 DOM 构建，提高安全性与可维护性。
- **模块组织**：核心逻辑分层，便于后续扩展（例如多媒体支持、快捷键等）。
- **页面 vs. 弹出页**：新增弹出页控制器，并允许在设置中选择展示位置。
- **主题与配置**：最高倍速、显示位置和主题统一通过选项页管理，实时同步到控制面板与弹出页。
- **视觉同步**：弹出页主题切换直接落地页面浮窗，徽标状态提示当前标签是否已连接媒体。
- **广告跳过**：默认加速改为 15x，并避免被最高倍速设置限制。
- **多语言界面**：新增双语言支持，可随时切换英文或中文界面。

## 后续建议
- 增加自动化测试（例如使用 Puppeteer/E2E 验证控制面板行为）。
- 引入打包构建流程（如 Vite + Rollup）以支持更多现代语法/样式工具链。
- 提供图标资源与国际化翻译文件，提升发布体验。

## 迭代沟通沉淀

### 2024-XX-XX 初版迭代
- 将 Tampermonkey 脚本拆分为 MV3 结构，补齐 `content`/`options`/`shared` 模块、`manifest`、选项页等基础骨架。
- 完成 README（中英双语）与 `docs/conversion-notes.md` 初稿，记录从油猴到扩展的迁移。

### 2024-XX-XX 弹出页与国际化增强
- 重构 popup：引入主题切换、站点黑名单快捷键、紧凑布局；按钮根据状态显示“显示/隐藏浮窗”“禁用/启用站点”。
- 实现 `shared/i18n.js`，内容脚本、选项页、弹出页支持中英文随时切换；默认语言跟随浏览器环境。
- popup 状态同步：监听 `state-update` 消息，实时刷新媒体状态与按钮文案。

### 2024-XX-XX 媒体检测与浮窗交互
- 内容脚本增加 `findMediaElement` 回退逻辑，确保异步加载的视频/音频可被控制，避免“无可控媒体”误报。
- 修复浮窗开关在站点被屏蔽时的提示与禁用逻辑；屏蔽/恢复站点后自动刷新状态。

### 2024-XX-XX UI & 视觉调整
- Popup 和浮窗按钮尺寸统一，移除默认 outline，dropdown 高度与按钮对齐。
- Boost 模式文案统一为 “Boost mode 🚀 / 超速播放 🚀”。
- 重绘工具栏图标（太阳/月亮、齿轮、浮窗、站点）为统一线性风格，提升视觉一致性。

### 2024-XX-XX 徽标/Badge 优化
- Service worker 根据控制状态更新徽标：无媒体时清空、1x 显示 `ON`、其他倍速显示具体数值。
- 默认 badge 背景色：绿色表示连接成功、灰色表示未连接。

### 2024-XX-XX 构建与发布准备
- 引入 Webpack + Babel + CopyWebpackPlugin，`npm run build(:extension)` 生成 `dist/` 产物。
- README 英文为默认说明，新增 `README.zh-CN.md`。
- 约定未能在沙箱内执行 `npm install`，本地需自行安装依赖再执行 `npm run build`。

> 注：日期可根据实际提交或沟通时间补充；以上记录按照对话要点整理。
