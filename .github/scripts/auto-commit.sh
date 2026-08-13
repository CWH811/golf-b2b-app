#!/usr/bin/env bash
set -euo pipefail
# Stage tracked changes only (don't add unknown files automatically unless explicitly allowed)
# Create a commit if there are staged or modified tracked files, then push and create an annotated tag as rollback.
# Usage: auto-commit.sh "Commit message"
msg="${1:-chore: automated commit (one-click)}"
# Add tracked changes and deletions only
git add -u
# If there are no changes, exit successfully
if git diff --cached --quiet; then
  echo "No tracked changes to commit."
  exit 0
fi
# Commit
git commit -m "$msg"
# Push
git push
# Create lightweight rollback tag with timestamp
tag="rollback-$(date +%Y%m%d%H%M%S)"
git tag -a "$tag" -m "Rollback point created by one-click commit"
git push origin "$tag"

echo "Committed, pushed, and created tag $tag"
