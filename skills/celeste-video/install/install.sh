#!/usr/bin/env sh
# Installs the celeste-video skill for Claude Code (macOS / Linux / Git Bash).
# Usage: sh install/install.sh [--scope project|user] [--project DIR] [--force]
# Never installs software system-wide, never touches other skills.
set -eu

SCOPE=project
PROJECT=$(pwd)
FORCE=0
SOURCE=$(cd "$(dirname "$0")/.." && pwd)
SKILLS_ROOT=""

while [ $# -gt 0 ]; do
  case "$1" in
    --scope) SCOPE=$2; shift 2 ;;
    --project) PROJECT=$2; shift 2 ;;
    --skills-root) SKILLS_ROOT=$2; shift 2 ;;
    --force) FORCE=1; shift ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done

[ -f "$SOURCE/SKILL.md" ] || { echo "SKILL.md not found in $SOURCE" >&2; exit 1; }
if [ -n "$SKILLS_ROOT" ]; then ROOT=$SKILLS_ROOT
elif [ "$SCOPE" = user ]; then ROOT=$HOME/.claude/skills
else ROOT=$PROJECT/.claude/skills; fi
DEST=$ROOT/celeste-video

if [ -e "$DEST" ] && [ "$FORCE" -ne 1 ]; then
  [ "$(cd "$DEST" && pwd)" = "$SOURCE" ] && { echo "Already installed at $DEST (this is the source)."; exit 0; }
  echo "$DEST already exists. Re-run with --force to replace it." >&2; exit 1
fi

mkdir -p "$DEST"
( cd "$SOURCE" && tar --exclude=node_modules --exclude=.cv --exclude=out --exclude=__pycache__ --exclude=.venv --exclude=.venv-piper --exclude=venv --exclude=voices -cf - . ) | ( cd "$DEST" && tar -xf - )
echo "Installed: $DEST"

if command -v node >/dev/null 2>&1; then
  echo; echo "Environment check (read-only):"
  node "$DEST/scripts/cv.mjs" doctor --project "$PROJECT" || true
else
  echo "Node.js 20+ not found: install it, then run: node \"$DEST/scripts/cv.mjs\" doctor"
fi
echo; echo "Next: open Claude Code in your project and type  /celeste-video <what you want>  (run /reload-skills once if the folder is new)"
