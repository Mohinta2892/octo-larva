#!/usr/bin/env bash
# Convert figures (PDF / PNG / JPG exported from Overleaf) into web-sized PNGs
# in assets/img/.
#
# Usage:
#   scripts/prepare_figures.sh                 # convert everything in figures_src/
#   scripts/prepare_figures.sh path/to/fig.pdf # convert specific files
#
# Each output keeps the input's base name: figures_src/fig2.pdf -> assets/img/fig2.png
# Needs: pdftoppm (brew install poppler) for PDFs; sips (built into macOS)
#        or ImageMagick (`magick`) for resizing.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/figures_src"
OUT_DIR="$ROOT/assets/img"
MAX_WIDTH="${MAX_WIDTH:-2000}"   # px; override with MAX_WIDTH=1600 scripts/prepare_figures.sh
DPI="${DPI:-200}"                # rasterisation resolution for PDFs

mkdir -p "$OUT_DIR"

resize() {
  local f="$1"
  if command -v sips >/dev/null 2>&1; then
    local w
    w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/ {print $2}')
    if [ "$w" -gt "$MAX_WIDTH" ]; then
      sips --resampleWidth "$MAX_WIDTH" "$f" >/dev/null
    fi
  elif command -v magick >/dev/null 2>&1; then
    magick "$f" -resize "${MAX_WIDTH}x>" "$f"
  else
    echo "  (no sips/magick found; skipping resize)"
  fi
}

convert_one() {
  local in="$1"
  local name ext out
  name="$(basename "$in")"
  ext="${name##*.}"
  ext="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"
  name="${name%.*}"
  out="$OUT_DIR/$name.png"

  case "$ext" in
    pdf)
      command -v pdftoppm >/dev/null 2>&1 || { echo "pdftoppm missing: brew install poppler"; exit 1; }
      pdftoppm -png -r "$DPI" -singlefile -f 1 -l 1 "$in" "$OUT_DIR/$name"
      ;;
    png)
      cp "$in" "$out"
      ;;
    jpg|jpeg)
      if command -v sips >/dev/null 2>&1; then
        sips -s format png "$in" --out "$out" >/dev/null
      else
        magick "$in" "$out"
      fi
      ;;
    *)
      echo "skip (unsupported): $in"; return
      ;;
  esac
  resize "$out"
  printf "  %-40s -> assets/img/%s.png (%s KB)\n" "$(basename "$in")" "$name" "$(( $(stat -f%z "$out" 2>/dev/null || stat -c%s "$out") / 1024 ))"
}

if [ "$#" -gt 0 ]; then
  files=("$@")
else
  shopt -s nullglob nocaseglob
  files=("$SRC_DIR"/*.pdf "$SRC_DIR"/*.png "$SRC_DIR"/*.jpg "$SRC_DIR"/*.jpeg)
fi

[ "${#files[@]}" -eq 0 ] && { echo "No figures found in $SRC_DIR"; exit 0; }

echo "Converting ${#files[@]} figure(s) (max width ${MAX_WIDTH}px):"
for f in "${files[@]}"; do convert_one "$f"; done
echo "Done. Reference them in index.html as assets/img/<name>.png"
