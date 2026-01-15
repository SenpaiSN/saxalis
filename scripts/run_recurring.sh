#!/bin/sh
# Usage: set SAXALIS_CRON_SECRET env var and run:
# SAXALIS_CRON_SECRET=your-secret ./scripts/run_recurring.sh
API_URL="${API_URL:-https://saxalis.free.nf/API/run_recurring_transactions.php}"
if [ -z "$SAXALIS_CRON_SECRET" ]; then
  echo "SAXALIS_CRON_SECRET not set" >&2
  exit 1
fi

curl -s -X POST -d "cron_secret=$SAXALIS_CRON_SECRET" "$API_URL" || exit 0
