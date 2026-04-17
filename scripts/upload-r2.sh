#!/usr/bin/env bash
# Upload staged assets to the mlbook-assets R2 bucket.
#
# Layout uploaded to bucket root:
#   ch3/<image>.png       (staged at tmp/images/ch3/)
#   ch8/<image>.png
#   ...
#   pdfs/Chapter 3_...pdf (originals from $HOME/MLBook)
#   cover.png             (if tmp/cover.png exists)
#
# Requires wrangler authenticated (wrangler login) and bucket mlbook-assets.
set -eo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUCKET="mlbook-assets"
WRANGLER="$PROJECT_ROOT/node_modules/.bin/wrangler"
IMG_DIR="$PROJECT_ROOT/tmp/images"
MLBOOK="$HOME/MLBook"

if [ ! -x "$WRANGLER" ]; then
  echo "wrangler not found at $WRANGLER" >&2
  exit 1
fi

upload() {
  local src="$1"
  local key="$2"
  echo "  -> $key"
  "$WRANGLER" r2 object put "$BUCKET/$key" --file "$src" --remote >/dev/null
}

# 1. Chapter images
if [ -d "$IMG_DIR" ]; then
  for ch_dir in "$IMG_DIR"/*/; do
    ch="$(basename "$ch_dir")"
    echo "=== Uploading images for $ch ==="
    shopt -s nullglob
    for f in "$ch_dir"*; do
      [ -f "$f" ] || continue
      upload "$f" "$ch/$(basename "$f")"
    done
    shopt -u nullglob
  done
else
  echo "No $IMG_DIR yet — skipping images."
fi

# 2. Original PDFs (so students can download the real book)
if [ -d "$MLBOOK" ]; then
  echo "=== Uploading original PDFs ==="
  shopt -s nullglob
  for f in "$MLBOOK"/*.pdf; do
    name="$(basename "$f")"
    # URL-safe key: replace spaces with underscores, keep .pdf
    key_name="$(echo "$name" | tr ' ' '_')"
    upload "$f" "pdfs/$key_name"
  done
  shopt -u nullglob
fi

# 3. Cover image (if staged)
if [ -f "$PROJECT_ROOT/tmp/cover.png" ]; then
  echo "=== Uploading cover.png ==="
  upload "$PROJECT_ROOT/tmp/cover.png" "cover.png"
fi

echo
echo "Done. Public URL prefix: https://pub-ee43721261544e8e8a0ca430d5d2c560.r2.dev/"
