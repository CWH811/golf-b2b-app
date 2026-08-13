# One-click commit & push

Use the VS Code task named `One-Click Commit & Push` to stage tracked files, commit them, push the current branch, and create an annotated rollback tag.

## How to run
- Open the VS Code Command Palette.
- Run `Tasks: Run Task`.
- Select `One-Click Commit & Push`.
- Enter a commit message when prompted.

## Keyboard shortcut suggestion
- Use the VS Code command palette shortcut for `Tasks: Run Task`, such as `Ctrl+Shift+B` in many default setups.

## Safety notes
- The script only stages tracked changes: `git add -u`.
- It does not add new untracked files automatically unless you manually `git add` them first.
- Do not include secrets or tokens in commit messages or tag names.
- Review the git diff before pushing if you are using the task on a shared branch.
