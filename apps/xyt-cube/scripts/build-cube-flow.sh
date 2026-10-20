#!/usr/bin/env bash
# Add dense optical flow to an existing moving-image cube (for moving-image/3).
#
#   [PYTHON=..] [SCALE=4] bash apps/xyt-cube/scripts/build-cube-flow.sh <clip-id>
#
# Reads public/media/moving-image/<clip-id>/ (built by build-cube.sh) and adds
# flow.bin.gz + flow.json beside clip.mp4; nothing else there changes. See
# build-cube-flow.py for the format. Needs ffmpeg and a Python with numpy and
# opencv-python-headless, e.g.
#   python3 -m venv /tmp/flowenv && /tmp/flowenv/bin/pip install numpy opencv-python-headless
#   PYTHON=/tmp/flowenv/bin/python bash apps/xyt-cube/scripts/build-cube-flow.sh sintel-trailer
#
# GPU cost: (W/SCALE) x (H/SCALE) x 4 B per frame; 1920x1080 at SCALE=4 is
# 0.52 MB a frame (155 MB for 300 frames) on top of the clip's 3.1 MB.
set -euo pipefail

CLIP_ID="${1:?clip id}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIP_DIR="$SCRIPT_DIR/../public/media/moving-image/$CLIP_ID"
[ -f "$CLIP_DIR/manifest.json" ] || { echo "No cube at $CLIP_DIR (run build-cube.sh first)" >&2; exit 1; }

"${PYTHON:-python3}" "$SCRIPT_DIR/build-cube-flow.py" "$CLIP_DIR" --scale "${SCALE:-4}"
