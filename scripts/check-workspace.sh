#!/usr/bin/env bash
set -euo pipefail

printf '=== SpecBridge workspace check (read-only) ===\n'
printf 'Directory: %s\n' "$PWD"
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  printf 'ERROR: not in a Git repository\n' >&2; exit 1
fi
printf 'Git root: %s\n' "$(git rev-parse --show-toplevel)"
printf 'Branch: %s\n' "$(git branch --show-current)"
for command_name in node pnpm git gh docker; do
  if command -v "$command_name" >/dev/null 2>&1; then
    printf '[OK] %s\n' "$command_name"
  else
    printf '[MISSING] %s\n' "$command_name"
  fi
done
for filepath in AGENTS.md docs/STATE.md docs/product/PRD.md docs/architecture/API.md .github/PULL_REQUEST_TEMPLATE.md; do
  if [[ -f "$filepath" ]]; then
    printf '[FILE OK] %s\n' "$filepath"
  else
    printf '[FILE MISSING] %s\n' "$filepath"
  fi
done
printf '\nGit status (no secrets displayed):\n'
git status --short
printf '\nConfigured root scripts (names only):\n'
node -e 'const p=require("./package.json"); console.log(Object.keys(p.scripts||{}).join(", "))'
printf '\nNo dependencies installed or services changed by this script.\n'
