
# SaXalis

This is a code bundle for SaXalis. The original project is available at https://www.figma.com/design/KJkZCqJA8NHwLxwI8ZSdpl/Site-Web-de-Suivi-Financier.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Documentation
We keep high-level docs in the `docs/` folder. Useful pages:

- `docs/RECEIPT_SCANNER.md` — Description of the invoice scanner (OCR) integration, how feedback is collected and exported.
- `docs/TIMEZONE.md` — Rationale and developer guidance for timezone handling (client naive dates are interpreted as Europe/Paris and stored as UTC).

## Developer notes (Windows)
- If `npm` scripts fail on Windows due to PowerShell execution policy (error referencing `npm.ps1`), use one of the following:
  - Run `npm.cmd` instead of `npm` from PowerShell (e.g. `npm.cmd run build`).
  - Use `cmd.exe` or Git Bash to run `npm` commands.
  - Set policy temporarily: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` (requires admin consent; be mindful of security implications).
- Ensure `php` is available in PATH to run local scripts like `php scripts/test_date_normalization.php`.

