#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  jobs -p | xargs -r kill
}
trap cleanup EXIT INT TERM

npm run dev:web &
npm run dev:api &

wait
