# SpeedMaster Chrome 插件

SpeedMaster 为网页上的音视频元素提供统一的控制面板。项目起源于 Tampermonkey 脚本，如今升级为模块化的 Chrome 扩展，支持主题切换、双语言界面以及面向发布的打包流程。

## 功能亮点
- 倍速范围覆盖 0.5×–15×，一键开启 **超级加速**（15×），再次点击即可恢复常速。
- 支持网页浮窗与工具栏弹出面板两种形态，可随时切换浮窗显示。
- 提供站点级启用/禁用开关，排除列表同时覆盖所有子域名，可在弹出页或设置页管理。
- 深色/明亮/自动主题即时生效，界面语言支持英文与简体中文自由切换。
- 工具栏徽标实时提示控制状态：`ON` 表示已接管媒体，`--` 表示当前标签未连接。
- 内置 Webpack 打包流程，输出 `dist/` 目录，方便上架 Chrome Web Store。

## 安装（开发模式）
1. 克隆仓库：
   ```bash
   git clone https://github.com/your-username/speedmaster.git
   cd speedmaster
   ```
2. （可选）如需启用打包流程，先安装依赖：
   ```bash
   npm install
   ```
3. 在 Chrome 中加载未打包的扩展：
   - 打开 `chrome://extensions/`
   - 开启 **开发者模式**
   - 点击 **加载已解压的扩展程序**，选择 `extension/`（源码版本）或运行构建后产生的 `dist/`

## 使用方式
- 访问任意包含 `<audio>` 或 `<video>` 的网页，若站点未被禁用，悬浮控制器会自动出现。
- 点击工具栏图标打开弹出面板，可执行：
  - 启用/关闭超级加速模式。
  - 打开或隐藏网页浮窗。
  - 一键禁用/启用当前站点。
  - 切换明暗主题或进入设置页。
- 工具栏徽标 `ON` 表示控制器已接入媒体，`--` 表示待连接。
- 当站点被禁用时，弹出面板会置灰并提示“该站点启用”操作，网页浮窗按钮暂不可用。

## 配置选项
- 在扩展 **选项页** 可配置：
  - 最高倍速（0.5×–15×）。
  - 控制面板默认位置（网页浮窗 / 仅弹出页 / 二者皆有）。
  - 默认主题（暗色 / 明亮 / 跟随系统）。
  - 界面语言（English / 中文）。
  - 排除站点列表，支持快速添加与移除。
- 所有配置优先保存在 `chrome.storage.sync`，若不可用则回退到本地存储，并实时同步到弹出页与网页浮窗。

## 构建与发布
项目内置 Webpack 配置，可对脚本进行压缩并复制静态资源到 `dist/`。

```bash
npm install        # 安装依赖
npm run build      # 在 ./dist 生成可发布的扩展
```

生成的 `dist/` 目录结构与扩展一致，可直接用于 Chrome Web Store 提交（发布前请补充商店图标与宣传图）。

## 项目结构
```
.
├── extension/                 # 开发阶段加载的源码
│   ├── assets/                # 运行时引用的 SVG 图标
│   ├── content/               # 网页注入脚本与控制器逻辑
│   ├── popup/                 # 弹出页 UI（JS/CSS/HTML）
│   ├── options/               # 设置页 UI
│   ├── shared/                # 复用模块（存储、国际化、域名工具）
│   ├── background.js          # Service worker，用于刷新徽标
│   └── manifest.json
├── dist/ (构建产物)          # `npm run build` 输出
├── docs/
│   └── conversion-notes.md    # 从脚本到扩展的迁移记录
├── webpack.config.js
├── package.json
├── README.md                  # 英文版说明
└── README.zh-CN.md            # 中文说明
```

## 致谢
- 原脚本作者 [@barretlee](https://github.com/barretlee)
- 项目许可证：MIT

英文说明请参阅 [README.md](./README.md)。
