#!/usr/bin/env bash
# Browser tests against stand-ins for Supabase and Open Food Facts.
# Needs Playwright with Chromium and ffmpeg. Run from the repository root: npm run test:e2e
set -euo pipefail
OUT=tests/.out
rm -rf "$OUT" && mkdir -p "$OUT"

# Fake camera feed showing an EAN-13 barcode, for the scanner test.
ffmpeg -loglevel error -y -loop 1 -i tests/fixtures-ean13.png -t 3 -pix_fmt yuv420p "$OUT/ean.y4m"

# On-device build (no Supabase) for food tests; account build pointed at the stand-in.
VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= npx vite build --outDir "$OUT/local" >/dev/null
VITE_SUPABASE_URL=https://fake-d15.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_test npx vite build --outDir "$OUT/cloud" >/dev/null

python3 -m http.server 8092 --bind 127.0.0.1 --directory "$OUT/local" >/dev/null 2>&1 & P1=$!
python3 -m http.server 8093 --bind 127.0.0.1 --directory "$OUT/cloud" >/dev/null 2>&1 & P2=$!
trap 'kill $P1 $P2 2>/dev/null' EXIT
sleep 1

OUT="$OUT" node tests/food.e2e.cjs
OUT="$OUT" node tests/portions.e2e.cjs
OUT="$OUT" node tests/pregnancy.e2e.cjs
OUT="$OUT" node tests/routine.e2e.cjs
OUT="$OUT" node tests/workouts.e2e.cjs
OUT="$OUT" node tests/rough.e2e.cjs
OUT="$OUT" node tests/activity.e2e.cjs
OUT="$OUT" node tests/measure.e2e.cjs
OUT="$OUT" node tests/rest.e2e.cjs
OUT="$OUT" node tests/session.e2e.cjs
OUT="$OUT" node tests/join.e2e.cjs
OUT="$OUT" node tests/update.e2e.cjs
OUT="$OUT" node tests/auth.e2e.cjs
