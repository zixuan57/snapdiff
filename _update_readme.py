import re
cli = open('D:/Codex/Work/snapdiff/packages/cli/README.md', 'r', encoding="utf-8").read()
demo = '<img src="https://raw.githubusercontent.com/zixuan57/snapdiff/main/packages/cli/demo.svg" alt="snapdiff demo" width="800">\n\n---\n\n## \u5feb\u901f\u5f00\u59cb'
cli = cli.replace('---\n\n## \u5feb\u901f\u5f00\u59cb', demo)
open('D:/Codex/Work/snapdiff/packages/cli/README.md', 'w', encoding="utf-8").write(cli)
print('Updated CLI README')

root = open('D:/Codex/Work/snapdiff/README.md', 'r', encoding="utf-8").read()
if demo not in root:
    root = root.replace('---\n\n## \u5feb\u901f\u5f00\u59cb', demo)
    open('D:/Codex/Work/snapdiff/README.md', 'w', encoding="utf-8").write(root)
    print('Updated root README')
else:
    print('Root README already has demo')
