import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

import { Command } from "commander";
import pc from "picocolors";
import { initCommand } from "./commands/init.js";
import { captureCommand } from "./commands/capture.js";
import { diffCommand } from "./commands/diff.js";
import { approveCommand } from "./commands/approve.js";
import { statusCommand } from "./commands/status.js";

process.on("unhandledRejection", (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(pc.red("\n  \u26a0 \u610f\u5916\u9519\u8bef: " + msg));
  console.error(pc.dim("  \u5982\u9700\u5e2e\u52a9\uff0c\u8bf7\u63d0\u4f9b\u4ee5\u4e0a\u5b8c\u6574\u8f93\u51fa\u6765\u6392\u67e5\u95ee\u9898\u3002"));
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error(pc.red("\n  \u26a0 \u610f\u5916\u9519\u8bef: " + err.message));
  console.error(pc.dim("  \u5982\u9700\u5e2e\u52a9\uff0c\u8bf7\u63d0\u4f9b\u4ee5\u4e0a\u5b8c\u6574\u8f93\u51fa\u6765\u6392\u67e5\u95ee\u9898\u3002"));
  process.exit(1);
});

const isInteractive = process.stdin.isTTY;
const program = new Command();

program
  .name("snapdiff")
  .description(pc.cyan("\u4e00\u884c\u547d\u4ee4\u7684\u89c6\u89c9\u56de\u5f52\u6d4b\u8bd5\u5de5\u5177"))
  .version(pkg.version);

program
  .command("init")
  .description("\u521d\u59cb\u5316 snapdiff \u914d\u7f6e\uff08\u4ea4\u4e92\u5f0f\u5411\u5bfc\uff0c\u81ea\u52a8\u5b8c\u6210\u9996\u6b21\u622a\u56fe\uff09")
  .option("--ci", "\u540c\u65f6\u751f\u6210 GitHub Action \u914d\u7f6e\u6587\u4ef6")
  .option("--yes", "\u8df3\u8fc7\u4ea4\u4e92\u63d0\u95ee\uff0c\u4f7f\u7528\u9ed8\u8ba4\u503c")
  .addHelpText("after", pc.dim("\n\u793a\u4f8b:\n  $ snapdiff init\n  $ snapdiff init --yes      \u975e\u4ea4\u4e92\u5f0f\uff0c\u5feb\u901f\u521d\u59cb\u5316\n  $ snapdiff init --yes --ci  \u975e\u4ea4\u4e92\u5f0f + CI \u914d\u7f6e\n"))
  .action((opts) => {
    if (!isInteractive && !opts.yes) opts.yes = true;
    initCommand(opts);
  });

program
  .command("capture")
  .description("\u622a\u53d6\u5f53\u524d\u9875\u9762\u4f5c\u4e3a\u57fa\u7ebf\u622a\u56fe")
  .argument("[url]", "\u9875\u9762 URL")
  .option("-n, --name <name>", "\u622a\u56fe\u540d\u79f0")
  .option("-s, --selector <selector>", "\u7b49\u9875\u9762\u4e2d\u8be5\u5143\u7d20\u51fa\u73b0\u540e\u518d\u622a\u56fe\uff0c\u5982 #app-root")
  .option("-w, --width <width>", "\u89c6\u53e3\u5bbd\u5ea6", "1440")
  .option("-h, --height <height>", "\u89c6\u53e3\u9ad8\u5ea6", "900")
  .addHelpText("after", pc.dim("\n\u793a\u4f8b:\n  $ snapdiff capture                             \u4ece\u914d\u7f6e\u6587\u4ef6\u6279\u91cf\u622a\u53d6\n  $ snapdiff capture https://ex.com -n my-page   \u622a\u53d6\u5355\u4e2a\u9875\u9762\n  $ snapdiff capture https://ex.com -n home -s #main\n"))
  .action(captureCommand);

program
  .command("diff")
  .description("\u5bf9\u6bd4\u5f53\u524d\u9875\u9762\u4e0e\u57fa\u7ebf\u622a\u56fe")
  .argument("[url]", "\u9875\u9762 URL")
  .option("-n, --name <name>", "\u622a\u56fe\u540d\u79f0")
  .option("-t, --threshold <threshold>", "\u5141\u8bb8\u7684\u5dee\u5f02\u9608\u503c\u767e\u5206\u6bd4\uff0c\u8d85\u51fa\u5373\u5224\u5b9a\u4e3a\u5931\u8d25", "0.1")
  .addHelpText("after", pc.dim("\n\u793a\u4f8b:\n  $ snapdiff diff                               \u5bf9\u6bd4\u914d\u7f6e\u6587\u4ef6\u4e2d\u7684\u6240\u6709\u9875\u9762\n  $ snapdiff diff https://ex.com -n my-page     \u5bf9\u6bd4\u5355\u4e2a\u9875\u9762\n  $ snapdiff diff -t 0.5                        \u8bbe\u7f6e\u66f4\u5bbd\u677e\u7684\u9608\u503c\n"))
  .action(diffCommand);

program
  .command("approve")
  .description("\u63a5\u53d7\u5f53\u524d\u5dee\u5f02\u4e3a\u65b0\u57fa\u7ebf\uff08\u8986\u76d6\u65e7\u57fa\u7ebf\uff09")
  .argument("<name>", "\u622a\u56fe\u540d\u79f0\uff08\u5fc5\u586b\uff09")
  .addHelpText("after", pc.dim("\n\u793a\u4f8b:\n  $ snapdiff approve my-page   \u5c06\u6211\u9875\u9762\u7684\u65b0\u72b6\u6001\u8bbe\u4e3a\u57fa\u7ebf\n"))
  .action(approveCommand);

program
  .command("status")
  .description("\u67e5\u770b\u6240\u6709\u57fa\u7ebf\u72b6\u6001\uff08\u8868\u683c\u5c55\u793a\uff09")
  .addHelpText("after", pc.dim("\n\u793a\u4f8b:\n  $ snapdiff status   \u67e5\u770b\u54ea\u4e9b\u9875\u9762\u6709\u57fa\u7ebf\uff0c\u54ea\u4e9b\u8fd8\u672a\u622a\u53d6\n"))
  .action(statusCommand);

program.addHelpText("afterAll", "\n" + pc.bold("\u5feb\u901f\u5f00\u59cb") + ":\n  $ snapdiff init                    \u9996\u6b21\u8fd0\u884c\uff0c\u8d70\u4e00\u904d\u5411\u5bfc\n  $ snapdiff diff                    \u6539\u5b8c\u4ee3\u7801\u540e\u5bf9\u6bd4\u53d8\u5316\n\n" + pc.bold("\u5178\u578b\u5de5\u4f5c\u6d41") + ":\n  1. " + pc.dim("snapdiff init") + "             \u521d\u59cb\u5316\u9879\u76ee\uff0c\u81ea\u52a8\u622a\u53d6\u9996\u5f20\u57fa\u7ebf\n  2. " + pc.dim("\u4fee\u6539\u4ee3\u7801") + "                    \u6539\u4f60\u7684 CSS/\u7ec4\u4ef6/\u9875\u9762\n  3. " + pc.dim("snapdiff diff") + "             \u5bf9\u6bd4\u53d8\u5316\uff0c\u67e5\u770b\u5dee\u5f02\n  4. " + pc.dim("snapdiff approve <name>") + "  \u786e\u8ba4\u53d8\u66f4\uff0c\u66f4\u65b0\u57fa\u7ebf\n\n" + pc.dim("\u5b8c\u6574\u6587\u6863: https://github.com/zixuan57/snapdiff") + "\n");

program.parse(process.argv);
