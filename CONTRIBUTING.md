# Contributing to snapdiff

Thanks for your interest in contributing! Here are some guidelines.

## Getting Started

```bash
git clone https://github.com/zixuan57/snapdiff.git
cd snapdiff/packages/cli
npm install
npm run build
```

## Development Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Build: `npm run build`
4. Test manually: `node dist/index.js --help`
5. Commit and push
6. Open a pull request

## Pull Request Guidelines

- Keep PRs focused on a single concern
- Update the README if your change affects the public API
- Make sure `npm run build` passes
- Use conventional commit messages (e.g. `feat:`, `fix:`, `chore:`, `docs:`)

## Code Style

- TypeScript, targeting ES2022
- Follow the existing code conventions
- Use meaningful variable names

## Questions?

Open a [GitHub Discussion](https://github.com/zixuan57/snapdiff/discussions).
