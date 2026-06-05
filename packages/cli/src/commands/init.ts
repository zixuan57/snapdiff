import { ensureDirs, captureSnapshot, baselineImagePath, saveBaselineMeta } from "@snapdiff/core";
import path from "node:path";
import { writeFile, mkdir, readFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import pc from "picocolors";

export async function initCommand(options: { ci?: boolean; yes?: boolean }) {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "snapdiff.config.json");

  if (existsSync(configPath)) {
    console.log(pc.yellow("⚠  snapdiff.config.json 已存在，跳过初始化。"));
    return;
  }

  const projectName = path.basename(cwd);

  if (options.yes) {
    // Non-interactive mode: use defaults
    await createConfig(cwd, configPath, {
      name: projectName,
      url: "http://localhost:3000",
      selector: "",
    });
    await setupGitignore(cwd);
    await takeFirstBaseline(cwd, configPath);
    await maybeSetupCi(cwd, options.ci);
    printNextSteps(cwd);
    return;
  }

  // Interactive mode
  console.log(pc.cyan("\n  ⚡ snapdiff 初始化向导\n"));

  const answers = await askQuestions([
    { key: "name", question: "? 项目名称", default: projectName },
    { key: "url", question: "? 要监控的页面 URL", default: "http://localhost:3000" },
    { key: "selector", question: "? 页面加载完成后的等待元素（可选，留空则等待网络空闲）", default: "" },
  ]);

  await createConfig(cwd, configPath, answers);
  await setupGitignore(cwd);
  await takeFirstBaseline(cwd, configPath);

  if (options.ci) {
    await maybeSetupCi(cwd, true);
  }

  printNextSteps(cwd);
}

async function askQuestions(questions: Array<{ key: string; question: string; default: string }>): Promise<Record<string, string>> {
  const answers: Record<string, string> = {};
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  for (const q of questions) {
    const prompt = q.default ? `${pc.dim(q.question)} (${q.default}): ` : `${q.question}: `;
    const answer = await rl.question(prompt);
    answers[q.key] = answer || q.default;
  }

  rl.close();
  return answers;
}

async function createConfig(
  cwd: string,
  configPath: string,
  answers: Record<string, string>
) {
  const config = {
    snaps: [
      {
        name: answers.name,
        url: answers.url,
        ...(answers.selector ? { selector: answers.selector } : {}),
        viewport: { width: 1440, height: 900 },
        threshold: 0.1,
      },
    ],
  };

  await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  console.log(pc.green(`  ✔ 已创建 ${configPath}`));
}

async function setupGitignore(cwd: string) {
  const gitignorePath = path.join(cwd, ".gitignore");
  const diffDirEntry = "\n# snapdiff: 临时 diff 截图（不看 git）\n.snapdiff/diffs/\n.snapdiff/reports/\n";

  try {
    if (existsSync(gitignorePath)) {
      const existing = await readFile(gitignorePath, "utf-8");
      if (!existing.includes(".snapdiff/diffs/")) {
        await appendFile(gitignorePath, diffDirEntry);
        console.log(pc.green("  ✔ 已将 .snapdiff/diffs/ 和 .snapdiff/reports/ 添加到 .gitignore"));
      }
    } else {
      await writeFile(gitignorePath, diffDirEntry, "utf-8");
      console.log(pc.green("  ✔ 已创建 .gitignore"));
    }
  } catch {
    // .gitignore 不是关键功能，忽略错误
  }
}

async function takeFirstBaseline(cwd: string, configPath: string) {
  const config = JSON.parse(await readFile(configPath, "utf-8"));

  await ensureDirs(cwd);
  console.log(pc.cyan("\n  正在截取基线..."));

  try {
    const { imagePath, meta } = await captureSnapshot({
      config: config.snaps[0],
      outputPath: baselineImagePath(cwd, config.snaps[0].name),
    });
    await saveBaselineMeta(cwd, config.snaps[0].name, meta);
    console.log(pc.green(`  ✔ ${config.snaps[0].url} ── 基线已保存`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(pc.yellow(`  ⚠ 首次截图失败: ${msg}`));
    console.log(`     稍后可以手动运行 ${pc.bold("npx snapdiff capture")}`);
  }
}

async function maybeSetupCi(cwd: string, ci: boolean | undefined) {
  if (!ci) return;
  const ciDir = path.join(cwd, ".github", "workflows");
  if (!existsSync(ciDir)) {
    await mkdir(ciDir, { recursive: true });
  }
  const ciYaml = `name: Visual Regression Test
on: [pull_request]
jobs:
  snapdiff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx snapdiff diff
`;
  await writeFile(path.join(ciDir, "snapdiff.yml"), ciYaml, "utf-8");
  console.log(pc.green("  ✔ 已创建 .github/workflows/snapdiff.yml"));
}

function printNextSteps(cwd: string) {
  console.log(pc.cyan("\n  下一步："));
  console.log(`    ▸ 修改代码后运行  ${pc.bold("npx snapdiff diff")}`);
  console.log(`    ▸ 查看基线状态    ${pc.bold("npx snapdiff status")}`);
  console.log(`    ▸ 非交互式初始化  ${pc.bold("npx snapdiff init --yes")}`);
  console.log();
}

