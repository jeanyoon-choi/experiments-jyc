#!/bin/sh
# Levels the two voices of the atlas (left = South, right = North) without
# touching the picture. The two takes measured the same integrated loudness but
# the North's sat lower in the band where speech is heard (1–5 kHz), so it
# sounded quieter, most of all on a mobile's speaker. Both lose the rumble under
# 120 Hz; the North gets a presence shelf and 0.5 dB; both are limited to -2 dBFS.
# usage: level.sh in.mp4 out.mp4
ffmpeg -y -v error -i "$1" -filter_complex "\
[0:a]channelsplit=channel_layout=stereo[s][n];\
[s]highpass=f=120,alimiter=limit=0.8:level=false[s2];\
[n]highpass=f=120,treble=g=4:f=2000,volume=0.5dB,alimiter=limit=0.8:level=false[n2];\
[s2][n2]join=inputs=2:channel_layout=stereo[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -movflags +faststart "$2"
