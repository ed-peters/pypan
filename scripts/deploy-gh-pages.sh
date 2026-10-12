#!/bin/sh
# Build the game and commit it to the gh-pages branch, for GitHub Pages.
#
#   npm run deploy:pages            build and commit locally
#   npm run deploy:pages -- --push  ...and push gh-pages to origin
#
# Uses a temporary git worktree, so the current checkout is never touched.
set -eu

cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree has uncommitted changes; commit or stash them first." >&2
  exit 1
fi

npm run build

SOURCE=$(git rev-parse --short HEAD)
WORKTREE=$(mktemp -d)
trap 'git worktree remove --force "$WORKTREE" 2>/dev/null || true; rm -rf "$WORKTREE"' EXIT

if git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add "$WORKTREE" gh-pages
elif git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch origin gh-pages
  git worktree add -b gh-pages "$WORKTREE" origin/gh-pages
else
  git worktree add --detach "$WORKTREE"
  git -C "$WORKTREE" checkout --orphan gh-pages
  git -C "$WORKTREE" rm -rf --quiet .
fi

# replace the branch contents with the fresh build
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R dist/. "$WORKTREE"/
touch "$WORKTREE/.nojekyll" # serve files as-is, without Jekyll processing

git -C "$WORKTREE" add -A
if git -C "$WORKTREE" diff --cached --quiet; then
  echo "gh-pages is already up to date with $SOURCE."
else
  git -C "$WORKTREE" commit --quiet -m "Deploy $SOURCE to GitHub Pages"
  echo "Committed build of $SOURCE to gh-pages."
fi

if [ "${1:-}" = "--push" ]; then
  git push origin gh-pages
fi
