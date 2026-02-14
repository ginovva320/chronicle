#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${CHRONICLE_DB_PATH:-./travelog.db}"

echo "Resetting SQLite database at ${DB_PATH}"
rm -f "${DB_PATH}"

echo "Database removed. Start the API with CHRONICLE_SEED=true to reseed:"
echo "  CHRONICLE_SEED=true npm run dev:api"
