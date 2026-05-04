#!/usr/bin/env bash
# Fail if forbidden Tailwind palette / arbitrary hex patterns appear under components/.
# See docs/design-system.md — use semantic tokens (success, warning, destructive, chart-*).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERN='(bg-\[#|text-amber-|bg-amber-|text-emerald-|bg-emerald-)'

if command -v rg >/dev/null 2>&1; then
  if rg -n --glob '*.tsx' \
    -e 'bg-\[#' \
    -e 'text-amber-' \
    -e 'bg-amber-' \
    -e 'text-emerald-' \
    -e 'bg-emerald-' \
    components 2>/dev/null; then
    echo >&2 ""
    echo >&2 "Theme check failed: use semantic tokens (e.g. text-warning, bg-success/10, text-destructive) instead of amber/emerald or arbitrary hex in class names."
    echo >&2 "See docs/design-system.md and lib/map-paint-colors.ts for MapLibre exceptions."
    exit 1
  fi
else
  if git grep -nE "$PATTERN" -- components 2>/dev/null; then
    echo >&2 ""
    echo >&2 "Theme check failed (see matches above)."
    echo >&2 "See docs/design-system.md and lib/map-paint-colors.ts for MapLibre exceptions."
    exit 1
  fi
fi

echo "Theme color check passed."
