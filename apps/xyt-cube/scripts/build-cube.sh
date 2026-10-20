#!/usr/bin/env bash
# Turn any video into a cubism/1 video cube: frame sheets at two resolutions
# (screen and phone) plus a manifest. The browser stacks the frames into one
# 3D texture, so x, y and t are sampled alike.
#
#   bash apps/xyt-cube/scripts/build-cube.sh <input-video> <clip-id> [seconds] [start] [height]
#
# Writes apps/xyt-cube/public/media/cubism/<clip-id>/{full-*.jpg, preview-*.jpg, manifest.json}.
# Then register the clip id in components/cubism/1/media/index.ts.
# Keeps the source aspect, 24 fps, at most 12 s. Sheets stay within 4096 px
# so phones can decode them. Long clips: lower FPS and heights via env, e.g.
#   FPS=12 PREVIEW_H=64 bash ... <video> <id> 60 0 144
# The volume costs width × height × frames × 4 bytes of GPU memory; keep the
# full level near 100 MB and the preview near 20 MB.
set -euo pipefail

INPUT="${1:?input video}"
CLIP_ID="${2:?clip id}"
SECONDS_MAX="${3:-12}"
START="${4:-0}"
FULL_H="${5:-288}"
PREVIEW_H="${PREVIEW_H:-96}"
FPS="${FPS:-24}"
SHEET_MAX=4096

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../public/media/cubism/$CLIP_ID"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

read -r SRC_W SRC_H < <(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0:s=x "$INPUT" | tr x ' ')

even() { echo $(( ($1 + 1) / 2 * 2 )); }

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# level <name> <height> → prints "width height columns rows sheets"
level() {
  local name="$1" h="$2"
  local w; w=$(even $(( SRC_W * h / SRC_H )))
  local dir="$WORK_DIR/$name"
  mkdir -p "$dir"
  ffmpeg -loglevel error -y -ss "$START" -t "$SECONDS_MAX" -i "$INPUT" \
    -vf "fps=$FPS,scale=$w:$h" -an "$dir/%04d.png"
  local frames; frames=$(find "$dir" -name '*.png' | wc -l | tr -d ' ')
  local columns=$(( SHEET_MAX / w )) rows=$(( SHEET_MAX / h ))
  local per=$(( columns * rows ))
  if [ "$frames" -lt "$per" ]; then
    rows=$(( (frames + columns - 1) / columns ))
    per=$(( columns * rows ))
  fi
  ffmpeg -loglevel error -y -framerate "$FPS" -start_number 1 -i "$dir/%04d.png" \
    -vf "tile=${columns}x${rows}" -q:v 3 "$OUT_DIR/$name-%d.jpg"
  local sheets; sheets=$(find "$OUT_DIR" -name "$name-*.jpg" | wc -l | tr -d ' ')
  echo "$w $h $columns $rows $sheets $frames"
}

read -r FW FH FC FR FS FRAMES < <(level full "$FULL_H")
read -r PW PH PC PR PS _ < <(level preview "$PREVIEW_H")

if [ "$FRAMES" -lt 2 ]; then
  echo "Only $FRAMES frame(s) decoded from $INPUT" >&2
  exit 1
fi

sheet_list() {
  local name="$1" count="$2" out="" i
  for (( i = 1; i <= count; i++ )); do out+="${out:+, }\"$name-$i.jpg\""; done
  echo "[$out]"
}

cat > "$OUT_DIR/manifest.json" <<JSON
{
  "frames": $FRAMES,
  "fps": $FPS,
  "full": { "width": $FW, "height": $FH, "columns": $FC, "rows": $FR, "sheets": $(sheet_list full "$FS") },
  "preview": { "width": $PW, "height": $PH, "columns": $PC, "rows": $PR, "sheets": $(sheet_list preview "$PS") }
}
JSON

echo "Wrote $FRAMES frames to $OUT_DIR (full ${FW}x${FH}, $FS sheet(s); preview ${PW}x${PH})"
