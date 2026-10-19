#!/usr/bin/env bash
# Turn any video into a spacetime-cube clip: a frame atlas plus manifest.
#
#   bash apps/xyt-cube/scripts/build-atlas.sh <input-video> <clip-id> [seconds] [start]
#
# Writes apps/xyt-cube/public/media/spacetime/<clip-id>/{atlas.jpg,manifest.json}.
# Then register the clip id in components/spacetime/1/media/clips.ts.
# Frames are center-cropped to 16:9, 480x270, 24 fps, at most 8 s (192 frames).
# A static camera reads best; a clip whose last frame meets its first loops cleanly (O1).
set -euo pipefail

INPUT="${1:?input video}"
CLIP_ID="${2:?clip id}"
SECONDS_MAX="${3:-8}"
START="${4:-0}"
FPS=24
FRAME_W=480
FRAME_H=270
COLUMNS=16

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../public/media/spacetime/$CLIP_ID"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$OUT_DIR"
ffmpeg -loglevel error -y -ss "$START" -t "$SECONDS_MAX" -i "$INPUT" \
  -vf "fps=$FPS,scale=$FRAME_W:$FRAME_H:force_original_aspect_ratio=increase,crop=$FRAME_W:$FRAME_H" \
  -an "$WORK_DIR/%04d.png"

FRAMES=$(find "$WORK_DIR" -name '*.png' | wc -l | tr -d ' ')
if [ "$FRAMES" -lt 2 ]; then
  echo "Only $FRAMES frame(s) decoded from $INPUT" >&2
  exit 1
fi
ROWS=$(( (FRAMES + COLUMNS - 1) / COLUMNS ))

ffmpeg -loglevel error -y -framerate "$FPS" -start_number 1 -i "$WORK_DIR/%04d.png" \
  -vf "tile=${COLUMNS}x${ROWS}" -frames:v 1 -q:v 3 "$OUT_DIR/atlas.jpg"

cat > "$OUT_DIR/manifest.json" <<JSON
{
  "atlas": "atlas.jpg",
  "frames": $FRAMES,
  "fps": $FPS,
  "frameWidth": $FRAME_W,
  "frameHeight": $FRAME_H,
  "columns": $COLUMNS,
  "rows": $ROWS
}
JSON

echo "Wrote $FRAMES frames ($COLUMNS x $ROWS) to $OUT_DIR"
