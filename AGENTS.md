<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Canonical workspace policy

This repo (`CWH811/golf-b2b-app`, branch `master`) is developed from a real local git clone — never from a GitHub "Remote Repository" / virtual filesystem view (`vscode-vfs://github+...`). The virtual view cannot run `npm`, tests, or builds, and edits made there create a separate, easily-diverging working copy that causes merge conflicts.

Rules for any agent working in this repo:
1. Always operate on a real local clone (`git clone https://github.com/CWH811/golf-b2b-app.git`), never edit files through a `vscode-vfs://` path.
2. Before starting work: `git pull` (or `git pull --rebase`) to sync with `origin/master`.
3. After finishing work: run tests and build, then `git add -A && git commit -m "..." && git push origin master`.
4. If a `vscode-vfs://` workspace is open alongside the local clone, treat it as read-only for browsing only — do not commit or sync from it.
