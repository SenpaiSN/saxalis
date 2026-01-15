# run_recurring scripts

This folder contains helper scripts to run the recurring-transactions runner (`API/run_recurring_transactions.php`) in a secure automated way.

How it works
- Configure a secret token in `API/config.local.php` (copy `API/config.local.example.php` and set your values):
  - add: `$cron_secret = 'long-random-secret';`
- Export that secret as an environment variable on the machine where you run the script:
  - Linux/macOS (bash): `export SAXALIS_CRON_SECRET='long-random-secret'`
  - Windows PowerShell: `$env:SAXALIS_CRON_SECRET = 'long-random-secret'`
- Run the script which will POST the `cron_secret` to the runner endpoint:
  - Bash: `SAXALIS_CRON_SECRET='...' ./scripts/run_recurring.sh`
  - PowerShell: `.\	ools\run_recurring.ps1` (or call from Task Scheduler with the environment variable set)

Scheduling
- Linux (cron): add an entry to run nightly, e.g. `0 3 * * * SAXALIS_CRON_SECRET=your-secret /path/to/project/scripts/run_recurring.sh`
- Windows (Task Scheduler): create a scheduled task that runs PowerShell and ensures the `SAXALIS_CRON_SECRET` environment variable is set for the task's user.

Security notes
- Keep the `cron_secret` secret (do not commit to git).
- Use a long random string for `$cron_secret`.

Quick test
- From a terminal (with the secret exported), run:
  - Bash: `SAXALIS_CRON_SECRET="your-secret" ./scripts/run_recurring.sh`
  - PowerShell: `$env:SAXALIS_CRON_SECRET = 'your-secret'; .\scripts\run_recurring.ps1`
- The runner will respond with JSON; check `created` entries to confirm occurrences were generated.
- To test the add-flow behavior, create a recurring plan with a future date and verify no immediate transaction is created when `skip_initial=true`, then trigger the runner and verify the occurrence is created.

