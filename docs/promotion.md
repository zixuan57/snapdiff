## Social Media Post - Share snapdiff

### Twitter/X

> snapdiff is now open source! A zero-config CLI for visual regression testing.
> Powered by Playwright + pixelmatch.
>
> One command to capture baselines, one command to diff changes.
> Generates interactive HTML reports.
>
> Free, MIT licensed. No SaaS required.
>
> https://github.com/zixuan57/snapdiff
>
> #visualtesting #playwright #opensource #testing

### Reddit (r/javascript / r/devtools)

Post title: Show HN: snapdiff ? Zero-config visual regression testing CLI (Playwright + pixelmatch)

Body:
> I built snapdiff, a CLI tool for visual regression testing. It's designed to be dead simple:
>
> - `npx snapdiff-cli init` ? creates config and takes first baseline
> - `npx snapdiff-cli diff` ? compares current page vs baseline
> - Generates HTML reports with side-by-side comparison
>
> Key differences from Percy/Chromatic:
> - No SaaS required, runs entirely locally
> - Free and open source (MIT)
> - Works in any CI pipeline
> - Built-in GitHub Action
>
> Would love feedback! https://github.com/zixuan57/snapdiff

### Hacker News

Title: Show HN: Snapdiff ? Zero-config visual regression testing CLI

Body:
> I've been working on a CLI tool called snapdiff that uses Playwright + pixelmatch for visual regression testing.
>
> The idea is simple: take a baseline screenshot before you refactor CSS, then run `snapdiff diff` after and it tells you exactly what changed.
>
> Key features:
> - Zero config: `npx snapdiff-cli init` sets everything up
> - Pixel-level comparison
> - Interactive HTML report
> - Parallel screenshot capture
> - Built-in GitHub Action
>
> Unlike Percy or Chromatic, it doesn't require any SaaS account. Just install and run.
>
> MIT licensed.
>
> https://github.com/zixuan57/snapdiff
