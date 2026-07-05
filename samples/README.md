# samples/

Drop real credit card statement PDFs here for parser development.

## Rules

- Files in this folder (except this README and `.gitkeep`) are **git-ignored**. See top-level `.gitignore`.
- Treat these as sensitive. Do not commit, share, or upload anywhere.
- Suggested naming: `<bank>-<YYYY-MM>.pdf` (e.g. `chase-2026-04.pdf`).

## Use

Once a real PDF is here, wire the parser:

1. Inspect the text layout:
   ```bash
   node -e "require('pdf-parse')(require('fs').readFileSync('samples/your.pdf')).then(r => console.log(r.text))"
   ```
2. Implement the real bodies of:
   - `src/lib/pdf/extract.ts` — use `pdf-parse` to return the text.
   - `src/lib/pdf/parser.ts` — regex the rows into `RawTxn[]`, plus `periodStart` / `periodEnd`.
3. Re-upload via `/upload` in the UI, or POST directly:
   ```bash
   curl -F "file=@samples/your.pdf" http://localhost:3000/api/upload
   ```
