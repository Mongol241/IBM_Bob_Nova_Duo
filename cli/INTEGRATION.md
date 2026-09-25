# Integration Test Guide

This guide walks you through running the full `conflict-cli` pipeline end-to-end:
resolving conflicts in `demo-repo/` with Bob Shell, then applying a chosen resolution
back to the source file.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js 20+** | `node --version` should print `v20.x` or higher |
| **`bob` CLI** | Must be installed and available on `PATH`. Run `bob --version` to confirm. |
| **Terminal outside a Bob session** | The `conflict-cli resolve` command spawns `bob -p` as a subprocess. This will fail if you are already inside a Bob session. Open a plain system terminal (PowerShell, bash, etc.). |

---

## 1. Install

```bash
cd cli
npm install
```

---

## 2. Build

```bash
npm run build
```

The compiled output lands in `cli/dist/`.

---

## 3. Unit Tests

```bash
npm test
```

All Jest unit tests (including `apply.test.ts`) should pass.  
To see coverage:

```bash
npm test -- --coverage
```

---

## 4. Integration Test — Resolve Conflicts

> ⚠️ Run this from a **plain terminal**, not from inside a Bob session.
> `conflict-cli resolve` calls `bob -p` for each conflict it finds.
> Calling `bob -p` from inside a Bob session is not supported and will error.

```bash
node dist/index.js resolve --repo ./demo-repo
```

Or, if you have linked the bin:

```bash
conflict-cli resolve --repo ./demo-repo
```

### Optional flags

| Flag | Default | Description |
|---|---|---|
| `--confidence <0–1>` | `0.8` | Tickets with confidence ≥ threshold get `"auto-resolved"` status |
| `--concurrency <n>` | `3` | Max parallel `bob -p` processes |

### Expected output (stdout)

The command prints a JSON array of `Ticket` objects, one per conflict found:

```json
[
  {
    "id": "conflict-01",
    "file": "src/billing.ts",
    "startLine": 20,
    "endLine": 26,
    "head": "// Validate discount code before applying it\n  let discount = 0;\n  ...",
    "incoming": "// Skip coupon validation — apply a flat discount directly\n  ...",
    "confidence": 0.92,
    "resolution": "  // Validate discount code before applying it\n  let discount = 0;\n  ...",
    "reasoning": "HEAD correctly validates the coupon before applying the discount; INCOMING skips validation which could allow invalid or expired coupons.",
    "status": "auto-resolved"
  },
  { "id": "conflict-02", "file": "src/auth.ts", ... },
  { "id": "conflict-03", "file": "package-lock.json", ... },
  { "id": "conflict-04", "file": "README.md", ... },
  { "id": "conflict-05", "file": "src/utils.ts", ... }
]
```

Save the output to a file for use with the `apply` command:

```bash
node dist/index.js resolve --repo ./demo-repo > tickets.json
```

---

## 5. Apply a Resolution

Once you have a `tickets.json`, apply a single ticket back to the source file:

```bash
node dist/index.js apply --file tickets.json --id conflict-01
```

Expected stdout:

```
Applied conflict-01: src/billing.ts (lines 20–26)
```

The source file `demo-repo/src/billing.ts` will be rewritten with the conflict
markers replaced by the `resolution` string from the ticket.

To apply all auto-resolved tickets in one loop (bash):

```bash
node dist/index.js resolve --repo ./demo-repo > tickets.json
node -e "
  const t = JSON.parse(require('fs').readFileSync('tickets.json','utf8'));
  t.filter(x => x.status === 'auto-resolved').forEach(x => {
    require('child_process').execSync(
      \`node dist/index.js apply --file tickets.json --id \${x.id}\`,
      { stdio: 'inherit' }
    );
  });
"
```

---

## 6. Verifying the Demo-Repo Fixtures

The files in `demo-repo/` are **not** tracked by the outer git repository as a
real merge conflict (they are plain text files with the markers baked in).
Standard `git grep` only works on tracked files in a proper merge state, so use
plain `grep` instead:

```bash
grep -r "<<<<<<<" demo-repo/
```

Expected output (five matches — one per fixture file):

```
demo-repo/src/billing.ts:<<<<<<< HEAD
demo-repo/src/auth.ts:<<<<<<< HEAD
demo-repo/package-lock.json:<<<<<<< HEAD
demo-repo/README.md:<<<<<<< HEAD
demo-repo/src/utils.ts:<<<<<<< HEAD
```

To also see the `=======` and `>>>>>>>` separators:

```bash
grep -rn -E "^(<<<<<<<|=======|>>>>>>>)" demo-repo/
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `bob: command not found` | Install the Bob CLI and ensure it is on your `PATH` |
| `bob -p` hangs or errors | Make sure you are running outside a Bob session |
| `ticket "conflict-XX" not found` | The `--id` value must exactly match an `id` in the tickets JSON |
| `Drift exceeded` error on apply | The file was modified after the tickets were generated; re-run `resolve` to get fresh line numbers |
| `Could not read source file` | The `file` path in the ticket is relative to `process.cwd()`; run `apply` from the `cli/` directory |
