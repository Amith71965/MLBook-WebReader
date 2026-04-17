#!/usr/bin/env bash
# Extract all 5 chapter PDFs to tmp/extracted/chN/ using marker-pdf.
# Each chapter produces: tmp/extracted/chN/<original_stem>/<file>.md + extracted images.
set -eo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MLBOOK="$HOME/MLBook"
OUT="$PROJECT_ROOT/tmp/extracted"
MARKER="$PROJECT_ROOT/.venv/bin/marker_single"

mkdir -p "$OUT"

# Force Apple Silicon GPU (MPS) — orders of magnitude faster than CPU.
export TORCH_DEVICE=mps
# MPS needs this for some ops not yet implemented on Metal.
export PYTORCH_ENABLE_MPS_FALLBACK=1

# Parallel arrays (bash 3.2 compatible — macOS default)
IDS=(ch3 ch8 ch9 ch10 ch11)
FILES=(
  "Chapter 3_Probability and Statistics.pdf"
  "Chapter 8 -Regressions.pdf"
  "Chapter 9- Classification Algorithms.pdf"
  "Chapter 10-Artificial Neural Network.pdf"
  "Chapter 11-Self-supervised Deep Learning.pdf"
)

for i in "${!IDS[@]}"; do
  CH="${IDS[$i]}"
  PDF="$MLBOOK/${FILES[$i]}"
  DEST="$OUT/$CH"
  mkdir -p "$DEST"
  echo "=== Extracting $CH from '${FILES[$i]}' ==="
  time "$MARKER" "$PDF" --output_dir "$DEST" --output_format markdown
  echo "=== Done $CH ==="
  echo
done

echo "All chapters extracted to $OUT"
