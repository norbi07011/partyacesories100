#!/bin/sh
# Build the sandbox preview into $1 and bundle its photos into packs.
set -e
OUT="$1"
VITE_PREVIEW=1 PREVIEW_OUT="$OUT" npx vite build
python3 "$(dirname "$0")/pack.py" "$OUT"
cat > "$OUT/stijl-en-dorpel.html" <<'EOF'
<title>Stijl & Dorpel</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" type="image/svg+xml" href="./favicon.svg" />
<link rel="stylesheet" href="./app.css">
<div id="root"></div>
<script type="module" src="./app.js"></script>
EOF
