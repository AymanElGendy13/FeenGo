#!/bin/bash
# Keeps the checkout current with GitHub at the start of every cloud session.
# Fetches origin, then fast-forwards the current branch to its own remote copy
# and to origin/main, but only when that is safe. It never merges, rebases,
# resets or pushes, and it never fails the session start.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if ! timeout 60 git fetch --quiet origin 2>/dev/null; then
  echo "session-start: could not fetch from origin; the checkout may be out of date. Run 'git fetch origin' before relying on it."
  exit 0
fi

branch="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
if [ -z "$branch" ]; then
  echo "session-start: fetched origin; HEAD is detached, so nothing was fast-forwarded."
  exit 0
fi
if ! git rev-parse --verify --quiet HEAD >/dev/null; then
  echo "session-start: fetched origin; '$branch' has no commits yet, so nothing was fast-forwarded."
  exit 0
fi

dirty="$(git status --porcelain --untracked-files=no)"

fast_forward() {
  local target="$1"
  git rev-parse --verify --quiet "$target" >/dev/null || return 0
  local behind
  behind="$(git rev-list --count "HEAD..$target")"
  [ "$behind" -eq 0 ] && return 0
  if [ -n "$dirty" ]; then
    echo "session-start: '$branch' is $behind commit(s) behind $target, not updated because there are uncommitted changes."
  elif git merge-base --is-ancestor HEAD "$target"; then
    git merge --quiet --ff-only "$target" \
      && echo "session-start: fast-forwarded '$branch' by $behind commit(s) to $target."
  else
    echo "session-start: '$branch' is $behind commit(s) behind $target and has its own commits, so it was not fast-forwarded. Merge $target deliberately if it is needed."
  fi
}

fast_forward "origin/$branch"
[ "$branch" != "main" ] && fast_forward "origin/main"

echo "session-start: fetched origin; '$branch' is at $(git log -1 --format='%h %s')."
exit 0
