#!/bin/bash
# Runs at the start of every cloud session. Two steps, and it never fails the
# session start:
#
# 1. Keeps the checkout current with GitHub. Fetches origin, then fast-forwards
#    the current branch to its own remote copy and to origin/main, but only
#    when that is safe. It never merges, rebases, resets or pushes.
# 2. Makes the Node version in .nvmrc available. If `node -v` does not match,
#    it installs the official linux-x64 build from nodejs.org into a cache
#    outside the repository ($HOME/.cache/feengo-node/<version>), checks its
#    SHA-256 against SHASUMS256.txt, and puts its bin folder first on PATH for
#    the rest of the session through $CLAUDE_ENV_FILE.
#
# FEENGO_NODE_DIST_URL is for testing this script only; it replaces
# https://nodejs.org/dist as the download location.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Step 1. Runs in a subshell, so its early exits end only this step.
git_sync() (
  cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

  if ! GIT_TERMINAL_PROMPT=0 timeout 30 git fetch --quiet origin 2>/dev/null; then
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
      if git merge --quiet --ff-only "$target" 2>/dev/null; then
        echo "session-start: fast-forwarded '$branch' by $behind commit(s) to $target."
      else
        echo "session-start: git refused to fast-forward '$branch' to $target (an untracked file may be in the way); run it by hand."
      fi
    else
      echo "session-start: '$branch' is $behind commit(s) behind $target and has its own commits, so it was not fast-forwarded. Merge $target deliberately if it is needed."
    fi
  }

  fast_forward "origin/$branch"
  [ "$branch" != "main" ] && fast_forward "origin/main"

  echo "session-start: fetched origin; '$branch' is at $(git log -1 --format='%h %s')."
  exit 0
)

# Step 2. Also a subshell; every path ends in exit 0.
node_setup() (
  # The hook is registered with a 60-second timeout. SECONDS counts from the
  # start of the hook, so the git step's time is included; stop well before 60.
  budget=50

  nvmrc="${CLAUDE_PROJECT_DIR:-.}/.nvmrc"
  [ -f "$nvmrc" ] || exit 0
  ver="$(tr -d '[:space:]' < "$nvmrc")"
  ver="${ver#v}"
  if ! [[ "$ver" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "session-start: .nvmrc holds '$ver', which is not an exact version like 26.13.1; Node was not set up. Install the right Node by hand."
    exit 0
  fi
  if [ "$(node -v 2>/dev/null)" = "v$ver" ]; then
    exit 0
  fi

  manual="download https://nodejs.org/dist/v$ver/node-v$ver-linux-x64.tar.xz, unpack it and put its bin folder first on PATH"

  arch="$(uname -m)"
  if [ "$arch" != "x86_64" ]; then
    echo "session-start: Node $ver is wanted but this machine is '$arch', which this hook does not handle; install Node $ver by hand."
    exit 0
  fi
  plat="linux-x64"

  cache_root="${HOME:-/root}/.cache/feengo-node"
  cache="$cache_root/$ver"
  state="cached"

  if [ "$("$cache/bin/node" -v 2>/dev/null)" != "v$ver" ]; then
    state="downloaded"
    dist="${FEENGO_NODE_DIST_URL:-https://nodejs.org/dist}/v$ver"
    file="node-v$ver-$plat.tar.xz"

    if ! mkdir -p "$cache_root" 2>/dev/null; then
      echo "session-start: could not create $cache_root, so Node $ver was not installed; $manual."
      exit 0
    fi
    # The temporary folder sits next to the cache so the final move is a
    # rename on the same file system. It is removed on every exit.
    tmp="$(mktemp -d "$cache_root/.tmp.XXXXXX" 2>/dev/null)" || {
      echo "session-start: could not create a temporary folder in $cache_root, so Node $ver was not installed; $manual."
      exit 0
    }
    trap 'rm -rf "$tmp"' EXIT

    left=$((budget - SECONDS))
    if [ "$left" -lt 20 ]; then
      echo "session-start: not enough time left in the session-start hook to download Node $ver; $manual."
      exit 0
    fi

    if ! curl --fail --silent --show-error --location --connect-timeout 5 --max-time 10 \
        -o "$tmp/SHASUMS256.txt" "$dist/SHASUMS256.txt" 2>/dev/null; then
      echo "session-start: could not download SHASUMS256.txt for Node $ver (no network?), so Node was not installed; $manual."
      exit 0
    fi
    want="$(awk -v f="$file" '$2 == f { print $1 }' "$tmp/SHASUMS256.txt")"
    if ! [[ "$want" =~ ^[0-9a-f]{64}$ ]]; then
      echo "session-start: SHASUMS256.txt for Node $ver has no valid line for $file, so Node was not installed; $manual."
      exit 0
    fi

    # Keep about 8 seconds for checking, unpacking and moving.
    left=$((budget - SECONDS - 8))
    if [ "$left" -lt 10 ]; then
      echo "session-start: not enough time left in the session-start hook to download Node $ver; $manual."
      exit 0
    fi
    if ! curl --fail --silent --show-error --location --connect-timeout 5 --max-time "$left" \
        -o "$tmp/$file" "$dist/$file" 2>/dev/null; then
      echo "session-start: could not download Node $ver within ${left}s (no network or too slow), so Node was not installed; $manual."
      exit 0
    fi

    got="$(sha256sum "$tmp/$file" | awk '{ print $1 }')"
    if [ "$got" != "$want" ]; then
      echo "session-start: the Node $ver download failed its SHA-256 check and was deleted, so Node was not installed; $manual, after checking it against SHASUMS256.txt."
      exit 0
    fi

    mkdir "$tmp/x"
    if ! tar --no-same-owner -xJf "$tmp/$file" -C "$tmp/x" 2>/dev/null; then
      echo "session-start: could not unpack the Node $ver archive, so Node was not installed; $manual."
      exit 0
    fi
    unpacked="$tmp/x/node-v$ver-$plat"
    if [ "$("$unpacked/bin/node" -v 2>/dev/null)" != "v$ver" ]; then
      echo "session-start: the unpacked Node $ver does not run or reports the wrong version, so it was not installed; $manual."
      exit 0
    fi

    # Replace a broken cache entry, then move the checked build in with one
    # rename. If another session got there first, use its copy.
    [ -e "$cache" ] && rm -rf "$cache"
    if ! mv -T "$unpacked" "$cache" 2>/dev/null \
        && [ "$("$cache/bin/node" -v 2>/dev/null)" != "v$ver" ]; then
      echo "session-start: could not move Node $ver into $cache, so Node was not installed; $manual."
      exit 0
    fi
  fi

  line="export PATH=\"$cache/bin:\$PATH\""
  if [ -z "${CLAUDE_ENV_FILE:-}" ]; then
    echo "session-start: Node $ver is in $cache ($state), but CLAUDE_ENV_FILE is not set, so it is not on PATH; run: $line"
    exit 0
  fi
  if ! grep -qxF "$line" "$CLAUDE_ENV_FILE" 2>/dev/null; then
    if ! printf '%s\n' "$line" >> "$CLAUDE_ENV_FILE" 2>/dev/null; then
      echo "session-start: Node $ver is in $cache ($state), but $CLAUDE_ENV_FILE could not be written, so it is not on PATH; run: $line"
      exit 0
    fi
  fi
  echo "session-start: Node $ver ready ($state)."
  exit 0
)

git_sync
node_setup
exit 0
