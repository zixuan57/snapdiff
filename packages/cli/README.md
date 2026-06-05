<p align="center">
  <h1 align="center">snapdiff</h1>
  <p align="center">一行命令的视觉回归测试工具</p>
  <p align="center">
    <a href="https://www.npmjs.com/package/snapdiff-cli"><img src="https://img.shields.io/npm/v/snapdiff-cli" alt="npm"></a>
    <a href="https://github.com/zixuan57/snapdiff"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license"></a>
  </p>
</p>

---

## 概述

**snapdiff** 是一个基于 Playwright + pixelmatch 的视觉回归测试工具。你在改代码前截一张基线截图，改完代码后再截一张，它会告诉你**哪些地方变了、变了多少**，并生成可直观对比的 HTML 报告。

适合场景：

- 改 CSS/组件后检查是否有意外的布局变化
- PR 提交前自动对比视觉差异
- CI 流水线中集成视觉回归检查

<img src="https://raw.githubusercontent.com/zixuan57/snapdiff/main/packages/cli/demo.svg" alt="snapdiff demo" width="800">

---

## 快速开始

```bash
# 初始化项目（交互式向导，自动完成首次截图）
npx snapdiff-cli init

# 修改代码后，对比变化
npx snapdiff-cli diff

# 查看基线状态
npx snapdiff-cli status

# 确认变更，更新基线
npx snapdiff-cli approve <name>
```

第一次运行 `init` 会自动：

1. 创建配置文件 `snapdiff.config.json`
2. 截取首张基线截图
3. 将 `.snapdiff/diffs/` 和 `.snapdiff/reports/` 加入 `.gitignore`

---

## 命令参考

### `init`

初始化 snapdiff 配置（交互式向导，自动完成首次截图）。

```bash
npx snapdiff-cli init              # 交互式
npx snapdiff-cli init --yes         # 非交互式，使用默认值
npx snapdiff-cli init --yes --ci    # 非交互式 + 生成 CI 配置文件
```

如果 stdin 不是终端（例如在 CI 环境中），`init` 会自动切换为非交互模式。

### `capture`

截取当前页面作为基线截图。

```bash
# 从配置文件批量截取
npx snapdiff-cli capture

# 截取单个页面
npx snapdiff-cli capture https://example.com --name my-page

# 指定选择器：等待元素出现后再截图
npx snapdiff-cli capture https://example.com --name home --selector "#app-root"

# 自定义视口大小
npx snapdiff-cli capture https://example.com --name mobile -w 375 -h 812
```

多页面模式下自动 **3 并发** 并行截图。

### `diff`

对比当前页面与基线截图。

```bash
# 对比配置文件中的所有页面（并行截图 + HTML 报告）
npx snapdiff-cli diff

# 对比单个页面
npx snapdiff-cli diff https://example.com --name my-page

# 设置更宽松的阈值（允许 0.5% 以内的差异）
npx snapdiff-cli diff -t 0.5
```

运行后自动生成 **HTML 报告** 到 `.snapdiff/reports/` 目录，可直接用浏览器打开查看。

### `approve`

接受当前差异为新基线（覆盖旧基线）。

```bash
npx snapdiff-cli approve my-page
```

即使配置文件中没有定义该页面，也会尝试从基线元数据中恢复 URL。

### `status`

查看所有基线状态（表格展示）。

```bash
npx snapdiff-cli status
```

输出示例：

```
  📸 snapdiff 基线状态

  名称                     URL                                      基线时间                   状态
  ──────────────────────────────────────────────────────────────────────────────────────────
  homepage                 https://example.com                      2026/6/5 10:30      ✅ 正常
  pricing                  https://example.com/pricing              2026/6/5 10:31      ✅ 正常
  dashboard                https://example.com/dashboard            —                     ⚠ 未截取
```

---

## 配置文件

在项目根目录创建 `snapdiff.config.json`：

```json
{
  "snaps": [
    {
      "name": "homepage",
      "url": "https://example.com",
      "viewport": { "width": 1440, "height": 900 },
      "threshold": 0.1
    },
    {
      "name": "pricing",
      "url": "https://example.com/pricing",
      "selector": "#app-root",
      "viewport": { "width": 1440, "height": 900 },
      "threshold": 0.1
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | 是 | 截图名称，用于标识 |
| `url` | string | 是 | 页面 URL |
| `selector` | string | 否 | 等待该 CSS 选择器出现后再截图 |
| `viewport` | object | 否 | 视口大小，默认 `{ width: 1440, height: 900 }` |
| `threshold` | number | 否 | 差异阈值百分比，默认 `0.1`，超出则判定失败 |

---

## 目录结构

```
项目根目录/
├── snapdiff.config.json       # 配置文件
├── .gitignore                 # 自动添加 .snapdiff/diffs/ 和 .snapdiff/reports/
└── .snapdiff/
    ├── baselines/              # 基线截图（需纳入 git 管理）
    │   ├── homepage.png
    │   └── homepage.json       # 元数据（URL、视口、时间等）
    ├── diffs/                  # 差异对比图（已加入 .gitignore）
    │   └── homepage-1234567890-diff.png
    └── reports/                # HTML 报告（已加入 .gitignore）
        └── report-1234567890.html
```

基线截图纳入 git 管理，这样 PR diff 里可以直接看到图片变化。差异图和报告不纳入 git。

---

## CI 集成

### GitHub Actions

```yaml
# .github/workflows/snapdiff.yml
name: Visual Regression Test
on: [pull_request]
jobs:
  snapdiff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx snapdiff-cli diff
```

也可以通过 `init --ci` 自动生成：

```bash
npx snapdiff-cli init --yes --ci
```

---

## 技术栈

| 组件 | 用途 |
|---|---|
| [Playwright](https://playwright.dev) | 浏览器截图引擎 |
| [pixelmatch](https://github.com/mapbox/pixelmatch) | 像素级对比 |
| [pngjs](https://github.com/lukeapage/pngjs) | PNG 图片处理 |
| [commander](https://github.com/tj/commander.js) | CLI 框架 |

---

## 开发

```bash
git clone <repo>
cd snapdiff

# 依赖已内置于 CLI 包
cd packages/cli
npm install
npm run build

# 本地测试
node dist/index.js --help
```

---

## 许可证

MIT
