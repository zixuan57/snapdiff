<p align="center">
  <h1 align="center">snapdiff</h1>
  <p align="center">Zero-config CLI for visual regression testing. Powered by <a href="https://playwright.dev">Playwright</a> + <a href="https://github.com/mapbox/pixelmatch">pixelmatch</a>.</p>
  <p align="center">
    <a href="https://www.npmjs.com/package/snapdiff-cli"><img src="https://img.shields.io/npm/v/snapdiff-cli" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/snapdiff-cli"><img src="https://img.shields.io/npm/dm/snapdiff-cli" alt="npm downloads"></a>
    <img src="https://img.shields.io/github/actions/workflow/status/zixuan57/snapdiff/ci.yml?branch=main" alt="CI">
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license"></a>
  </p>
</p>

---

snapdiff is a visual regression testing CLI. Take a baseline screenshot before you change code, then compare after ? it tells you **what changed and by how much**, with an interactive HTML report.

**Ideal for:**
- Checking for unintended layout changes after CSS/component edits
- Automated visual diff on every PR
- CI pipeline integration

<img src="https://raw.githubusercontent.com/zixuan57/snapdiff/main/packages/cli/demo.svg" alt="snapdiff demo" width="800">

---

## Quick Start

```bash
# Initialize (interactive wizard, auto-captures first baseline)
npx snapdiff-cli init

# After code changes, compare against baseline
npx snapdiff-cli diff

# Check baseline status
npx snapdiff-cli status

# Accept changes as new baseline
npx snapdiff-cli approve <name>
```

Running `init` for the first time will:

1. Create `snapdiff.config.json`
2. Take the first baseline screenshot automatically
3. Add `.snapdiff/diffs/` and `.snapdiff/reports/` to `.gitignore`

---

## Features

| Feature | Description |
|---------|-------------|
| **Zero config** | `snapdiff init` sets up everything ? config file, first capture, .gitignore |
| **Pixel-level diff** | Uses [pixelmatch](https://github.com/mapbox/pixelmatch) for accurate comparison |
| **HTML report** | Side-by-side view of baseline / current / diff, auto-generated |
| **Parallel capture** | Captures 3 pages concurrently |
| **Mask regions** | Exclude dynamic areas (ads, animations) from comparison |
| **CI ready** | Built-in GitHub Action, works with any CI pipeline |
| **Multi-page** | Capture and diff entire site configurations from a single config file |
| **Auto-cleanup** | Old reports older than 7 days are removed automatically |

---

## Commands

### `init`

Initialize a snapdiff project (interactive wizard, auto-captures first screenshot).

```bash
npx snapdiff-cli init              # Interactive
npx snapdiff-cli init --yes         # Non-interactive, use defaults
npx snapdiff-cli init --yes --ci    # Non-interactive + generate CI config
```

`init` auto-detects whether stdin is a terminal. In CI environments (non-TTY), it switches to non-interactive mode automatically.

### `capture`

Capture and save baseline screenshots.

```bash
# Capture all pages from the config file
npx snapdiff-cli capture

# Capture a single page
npx snapdiff-cli capture https://example.com --name my-page

# Wait for a CSS selector to appear before capturing
npx snapdiff-cli capture https://example.com --name home --selector "#app-root"

# Custom viewport
npx snapdiff-cli capture https://example.com --name mobile -w 375 -h 812
```

Multi-page mode uses **3 concurrent workers** automatically.

### `diff`

Compare current pages against their baselines.

```bash
# Diff all pages from the config file
npx snapdiff-cli diff

# Diff a single page
npx snapdiff-cli diff https://example.com --name my-page

# Set a more permissive threshold (allow 0.5% diff)
npx snapdiff-cli diff -t 0.5
```

Generates an **HTML report** in `.snapdiff/reports/` with baseline / current / diff side-by-side. Reports older than 7 days are auto-cleaned.

### `approve`

Accept the current diff as the new baseline (overwrites old baseline).

```bash
npx snapdiff-cli approve my-page
```

### `status`

Display all baseline entries in a table.

```bash
npx snapdiff-cli status
```

---

## Config File

Create `snapdiff.config.json` in your project root:

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

### Config Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Snapshot name for identification |
| `url` | string | Yes | Page URL |
| `selector` | string | No | Wait for CSS selector before capture |
| `viewport` | object | No | Viewport size, default `{ width: 1440, height: 900 }` |
| `threshold` | number | No | Diff threshold percentage, default `0.1`. Exceeds threshold = failure |
| `fullPage` | boolean | No | Capture full scrollable page, default `false` |
| `headless` | boolean | No | Headless browser mode, default `true` |
| `maskRegions` | array | No | Mask regions array `[{ x, y, width, height }]`. These areas are excluded from diff comparison |

---

## Directory Structure

```
project-root/
+-- snapdiff.config.json       # Configuration file
+-- .gitignore                 # Automatically includes .snapdiff/*
+-- .snapdiff/
    +-- baselines/              # Baseline images (tracked in git)
    |   +-- homepage.png
    |   +-- homepage.json       # Metadata (URL, viewport, timestamp)
    +-- diffs/                  # Diff comparison images (gitignored)
    |   +-- homepage-1234567890-diff.png
    +-- reports/                # HTML reports (gitignored)
    |   +-- report-1234567890.html
    +-- tmp/                     # Temp screenshots (gitignored)
```

Baseline images are tracked in git so that PR diffs show image changes directly. Diff images and reports are gitignored.

---

## CI Integration

### GitHub Actions

snapdiff ships with a built-in [GitHub Action](https://github.com/zixuan57/snapdiff) that supports both capture and diff modes.

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

Generate this automatically with:

```bash
npx snapdiff-cli init --yes --ci
```

### Other CI

snapdiff runs anywhere Node.js is available. Just install and run:

```bash
npx snapdiff-cli capture   # In a pre-change step
npx snapdiff-cli diff      # In a post-change step
```

---

## Comparison

| Feature | snapdiff | Percy | Chromatic | BackstopJS |
|---------|----------|-------|-----------|------------|
| **Local CLI** | Free, open-source | Limited (cloud-dependent) | Limited (cloud-dependent) | Free |
| **SaaS requirement** | None | Required (cloud rendering) | Required (cloud rendering) | None |
| **Pricing** | Free (open source MIT) | Paid tiers after free quota | Paid tiers after free quota | Free |
| **Self-hosted** | Yes | No (cloud only) | No (cloud only) | Yes |
| **HTML report** | Built-in, local | Web dashboard | Web dashboard | Customizable |
| **Parallel capture** | Yes (3 workers) | Yes | Yes | Yes |
| **Mask regions** | Yes | Yes | Yes | Limited |
| **CI integration** | CLI + GitHub Action | GitHub Action + SDK | GitHub App | CLI + Docker |
| **Setup time** | ~30 seconds | ~5 minutes + account | ~5 minutes + account | ~10 minutes |
| **Full page capture** | Yes | Yes | Yes | Yes |

---

## Tech Stack

| Component | Purpose |
|---|---|
| [Playwright](https://playwright.dev) | Browser automation & screenshot engine |
| [pixelmatch](https://github.com/mapbox/pixelmatch) | Pixel-level image comparison |
| [pngjs](https://github.com/lukeapage/pngjs) | PNG image processing |
| [commander](https://github.com/tj/commander.js) | CLI framework |

---

## Development

```bash
git clone https://github.com/zixuan57/snapdiff.git
cd snapdiff

cd packages/cli
npm install
npm run build

node dist/index.js --help
```

---

## Contributing

Bug reports, feature requests, and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT
