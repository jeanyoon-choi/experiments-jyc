#!/usr/bin/env bash
# Turn a video into a moving-image/1 video cube.
#
#   [FPS=..] [PREVIEW_H=..] [LETTERBOX=1] bash apps/xyt-cube/scripts/build-cube.sh <input-video> <clip-id> [seconds=12] [start=0]
#
# Writes apps/xyt-cube/public/media/moving-image/<clip-id>/:
#   clip.mp4      the screen's cube: the source frames at their own resolution
#                 (at least 1920x1080; wider than 2048 px is scaled to 1920 wide,
#                 the GPU's 3D texture limit), resampled to FPS, every 8th frame a
#                 keyframe so the browser can seek frame by frame.
#                 LETTERBOX=1 accepts a 1920-wide scope master (e.g. 1920x800)
#                 and pads it to 1920x1080 with black bars, as 16:9 releases do.
#   preview-N.jpg the phone's cube: small frame sheets (PREVIEW_H px tall).
#   manifest.json
# Then register the clip id in components/moving-image/1/media/index.ts.
#
# The screen stores the volume as Y + half-size CbCr (the mp4's own 4:2:0), so
# GPU memory is width x height x 1.5 x frames: 1920x1080 costs 3.1 MB a frame.
# Keep frames near 300 (about 0.9 GB): trade FPS against seconds.
set -euo pipefail

INPUT="${1:?input video}"
CLIP_ID="${2:?clip id}"
SECONDS_MAX="${3:-12}"
START="${4:-0}"
PREVIEW_H="${PREVIEW_H:-96}"
FPS="${FPS:-24}"
MIN_W=1920
MIN_H=1080
MAX_W=2048
SHEET_MAX=4096

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../public/media/moving-image/$CLIP_ID"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

read -r SRC_W SRC_H < <(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0:s=x "$INPUT" | tr x ' ')

SCALE=""
if [ "${LETTERBOX:-0}" = 1 ] && [ "$SRC_W" -ge "$MIN_W" ] && [ "$SRC_H" -lt "$MIN_H" ]; then
  SCALE=",scale=$MIN_W:-2:flags=lanczos,pad=$MIN_W:$MIN_H:(ow-iw)/2:(oh-ih)/2:black"
  SRC_W=$MIN_W
  SRC_H=$MIN_H
fi

if [ "$SRC_W" -lt "$MIN_W" ] || [ "$SRC_H" -lt "$MIN_H" ]; then
  echo "$INPUT is ${SRC_W}x${SRC_H}; cubism clips need at least ${MIN_W}x${MIN_H}" >&2
  exit 1
fi

even() { echo $(( ($1 + 1) / 2 * 2 )); }

if [ "$SRC_W" -gt "$MAX_W" ]; then
  FW=$MIN_W
  FH=$(even $(( SRC_H * MIN_W / SRC_W )))
  SCALE=",scale=$FW:$FH:flags=lanczos"
else
  FW=$SRC_W
  FH=$SRC_H
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

ffmpeg -loglevel error -y -ss "$START" -t "$SECONDS_MAX" -i "$INPUT" \
  -vf "fps=$FPS$SCALE" -an -c:v libx264 -preset slow -crf 16 -g 8 -bf 0 \
  -pix_fmt yuv420p -movflags +faststart "$OUT_DIR/clip.mp4"

FRAMES=$(ffprobe -v error -select_streams v:0 -count_frames \
  -show_entries stream=nb_read_frames -of csv=p=0 "$OUT_DIR/clip.mp4")
if [ "$FRAMES" -lt 2 ]; then
  echo "Only $FRAMES frame(s) decoded from $INPUT" >&2
  exit 1
fi

# Phone sheets from the same frames.
PH=$PREVIEW_H
PW=$(even $(( FW * PH / FH )))
mkdir -p "$WORK_DIR/preview"
ffmpeg -loglevel error -y -i "$OUT_DIR/clip.mp4" -vf "scale=$PW:$PH:flags=area" "$WORK_DIR/preview/%04d.png"
PC=$(( SHEET_MAX / PW ))
PR=$(( SHEET_MAX / PH ))
if [ "$FRAMES" -lt $(( PC * PR )) ]; then PR=$(( (FRAMES + PC - 1) / PC )); fi
ffmpeg -loglevel error -y -framerate "$FPS" -start_number 1 -i "$WORK_DIR/preview/%04d.png" \
  -vf "tile=${PC}x${PR}" -q:v 3 "$OUT_DIR/preview-%d.jpg"
PS=$(find "$OUT_DIR" -name 'preview-*.jpg' | wc -l | tr -d ' ')

sheets=""
for (( i = 1; i <= PS; i++ )); do sheets+="${sheets:+, }\"preview-$i.jpg\""; done

cat > "$OUT_DIR/manifest.json" <<JSON
{
  "frames": $FRAMES,
  "fps": $FPS,
  "full": { "width": $FW, "height": $FH, "video": "clip.mp4" },
  "preview": { "width": $PW, "height": $PH, "columns": $PC, "rows": $PR, "sheets": [$sheets] }
}
JSON

echo "Wrote $FRAMES frames to $OUT_DIR (screen ${FW}x${FH} mp4 $(du -h "$OUT_DIR/clip.mp4" | cut -f1); phone ${PW}x${PH}, $PS sheet(s))"
