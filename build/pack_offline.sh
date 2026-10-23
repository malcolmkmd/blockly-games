#!/bin/bash
# Build offline/Thinka-Coding-Games-offline.zip for facilitators.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
PACK="$ROOT/offline/Thinka Coding Games"
GAMES="$PACK/game-files"
STAGE="$ROOT/offline/_stage"

rm -rf "$ROOT/offline"
mkdir -p "$GAMES" "$PACK/server" "$STAGE"

cp -R appengine/. "$GAMES/"

rm -f "$GAMES"/*.yaml "$GAMES"/*.py "$GAMES"/*.sh || true
rm -f "$GAMES/admin.html" "$GAMES/apple-touch-icon.png" "$GAMES/favicon.ico" "$GAMES/robots.txt" || true
rm -rf "$GAMES/gallery" "$GAMES/gallery_api" "$GAMES/generated"
find "$GAMES" -type d -name src -prune -exec rm -rf {} +
mkdir -p "$GAMES/src"
cp appengine/src/thinka.config.js "$GAMES/src/thinka.config.js"
find "$GAMES" -name 'uncompressed.js' -delete
find "$GAMES" -name '.DS_Store' -delete
rm -f "$GAMES/index/title.png" "$GAMES/index/title-beta.png"
rm -f "$GAMES/pond/crobots.txt"
rm -rf "$GAMES/pond/battle"
rm -f "$GAMES/common/stripes.svg"
rm -f "$GAMES/third-party/base.js"
rm -f "$GAMES/third-party/soundfonts/README.txt"

mv "$GAMES/third-party/ace/ace.js" \
   "$GAMES/third-party/ace/ext-language_tools.js" \
   "$GAMES/third-party/ace/mode-javascript.js" \
   "$GAMES/third-party/ace/theme-chrome.js" \
   "$GAMES/third-party/ace/worker-javascript.js" \
   "$STAGE/"
rm -rf "$GAMES/third-party/ace"
mkdir -p "$GAMES/third-party/ace"
mv "$STAGE/ace.js" "$STAGE/ext-language_tools.js" "$STAGE/mode-javascript.js" \
   "$STAGE/theme-chrome.js" "$STAGE/worker-javascript.js" \
   "$GAMES/third-party/ace/"

mv "$GAMES/third-party/SoundJS/soundjs.min.js" "$STAGE/"
rm -rf "$GAMES/third-party/SoundJS"
mkdir -p "$GAMES/third-party/SoundJS"
mv "$STAGE/soundjs.min.js" "$GAMES/third-party/SoundJS/"

mv "$GAMES/third-party/blockly/media" "$STAGE/"
rm -rf "$GAMES/third-party/blockly"
mkdir -p "$GAMES/third-party/blockly"
mv "$STAGE/media" "$GAMES/third-party/blockly/"

mv "$GAMES/third-party/JS-Interpreter/compressed.js" "$STAGE/"
rm -rf "$GAMES/third-party/JS-Interpreter"
mkdir -p "$GAMES/third-party/JS-Interpreter"
mv "$STAGE/compressed.js" "$GAMES/third-party/JS-Interpreter/"
rm -rf "$STAGE"

cp build/serve.py build/race_hub.py build/race_ws.py build/race_rules.py \
   build/class_store.py build/class_api.py "$PACK/server/"
cp build/start_class_mac.command "$PACK/Start Class (Mac).command"
cp build/start_class_windows.bat "$PACK/Start Class (Windows).bat"
chmod +x "$PACK/Start Class (Mac).command" build/start_class_mac.command
cp build/start_here.html "$PACK/START HERE - Thinka Games.html"
cp build/offline-readme.txt "$PACK/README.txt"

find "$PACK" -name 'test_*' -delete
find "$PACK" -type d -name '__pycache__' -prune -exec rm -rf {} + || true
find "$PACK" -name '.git' -prune -exec rm -rf {} + || true

(
  cd "$ROOT/offline"
  zip -r9 Thinka-Coding-Games-offline.zip "Thinka Coding Games"
)
echo "Wrote offline/Thinka-Coding-Games-offline.zip"
