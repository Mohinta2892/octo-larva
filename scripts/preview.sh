#!/usr/bin/env bash
# Serve the site locally at http://localhost:8000 (Ctrl+C to stop).
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${1:-8000}"
echo "Previewing at http://localhost:$PORT"
python3 -m http.server "$PORT"
