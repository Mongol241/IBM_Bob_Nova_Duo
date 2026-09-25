# Merge Conflict Resolver — Development Plan

Two components: a **CLI engine** that finds and resolves conflicts, and a **web dashboard** that shows the results as tickets. The CLI is the reusable core; the website is a thin surface on top of it. LLM processing is done via **IBM Bob Shell**, invoked from the CLI in non-interactive mode.

---


## Part 1 — CLI (Engine)

### Purpose
Find merge conflicts in a repo, ask Bob Shell to resolve each one, and emit a structured list of "tickets" — auto-resolved or needs-review — as JSON.

### Tech stack
- **Language:** Node.js + TypeScript (shares tooling/types with the website)
- **CLI framework:** `commander` or `yargs`
- **LLM:** IBM Bob Shell, called via Node's `child_process` (spawning `bob -p ...`) — no SDK needed, since Bob is invoked as a local subprocess, not an HTTP API
- **Git parsing:** plain string parsing of conflict markers (no library needed — the format is fixed)

### Commands
- `resolve --repo <path>` — scans for conflicts, calls Bob Shell per conflict, prints ticket JSON to stdout
- `apply --file <ticket.json> --id <conflict-id>` — takes one approved ticket and rewrites the conflict block in the source file with the resolution

### Development phases

1. **Repo setup + fixtures**
   Set up the TS project. Prepare a demo repo folder with 4–5 files containing realistic staged conflicts (a logic conflict, a lockfile conflict, a whitespace conflict, a docs conflict). Confirm `bob -p "test"` works from this machine before building anything else — this is now a hard dependency for every later step.

2. **Conflict parser**
   Walk the repo for files containing `<<<<<<<`. For each file, record every conflict region as `{ file, startLine, endLine, head, incoming }`. Because Bob can read whole files via `@file`, you don't need to hand-extract surrounding context yourself — Bob can be pointed at the file and told which line range to resolve.

3. **Bob Shell resolution call**
   For each parsed conflict, spawn a `bob` process non-interactively, referencing the file and describing the conflict region, e.g.:
   ```
   bob -p "Resolve the merge conflict in @src/billing.js between lines 40-58.
   Respond with ONLY a JSON object, no other text, no markdown fences:
   { \"resolution\": string, \"confidence\": number 0-1, \"reasoning\": string }"
   ```
   Capture stdout, strip anything before/after the JSON object defensively (Bob Shell's non-interactive output can include reasoning/thinking text alongside the answer, so instruct it explicitly to return JSON only, and don't assume the output is clean). Run these calls with limited concurrency — each is a real process spawn, not a lightweight HTTP request, so don't fire dozens in parallel.

4. **Ticket assembly + status threshold**
   Parse each response into a ticket object, with a `try/catch` around the JSON parse — if it fails, fall back to `status: "needs-review"` with `reasoning: "could not parse model output"` rather than crashing the whole run. Anything at or above a confidence cutoff (e.g. `0.8`) is marked `"status": "auto-resolved"`; otherwise `"needs-review"`. Print the full array to stdout.

5. **`apply` command**
   Given a ticket JSON file and a ticket id, re-locate that conflict block and replace the `<<<<<<< ... ======= ... >>>>>>>` region with the resolution text. This is what the dashboard's "approve" button calls — Bob itself never touches the file.

### Ticket JSON schema (the data contract)

```json
[
  {
    "id": "conflict-01",
    "file": "src/billing.js",
    "confidence": 0.91,
    "resolution": "function calculateTotal(items, discountRate = 0) { ... }",
    "reasoning": "Kept discount logic from incoming branch, preserved original function signature from HEAD.",
    "status": "auto-resolved"
  },
  {
    "id": "conflict-02",
    "file": "src/auth.js",
    "confidence": 0.62,
    "resolution": "...",
    "reasoning": "Both sides change error-handling behavior; intent unclear.",
    "status": "needs-review"
  }
]
```

This schema is unchanged from a Claude-based version — swapping the LLM only changes *how* the CLI produces a ticket, not the shape of a ticket. Keep it stable once the dashboard starts consuming it.

---

## Part 2 — Website (Dashboard)

### Purpose
Trigger the engine, display its output as a ticket list, and let someone approve or reject each ticket. Unchanged by the choice of LLM — the website never talks to Bob directly.

### Tech stack
- **Framework:** Next.js (React) — frontend + API routes in one app, one deploy target
- **Styling:** Tailwind, for speed
- **Storage:** SQLite (`better-sqlite3`) or a single JSON file on disk — skip Postgres, skip migrations, skip auth for now
- **Backend:** Next.js API routes calling the CLI (see Part 3)

### Views
- **Ticket list** — all tickets, grouped or filterable by `auto-resolved` vs `needs-review`
- **Ticket detail** — the two original sides, the proposed resolution, confidence, reasoning, and Approve / Reject buttons
- **"Run" trigger** — a button that kicks off a fresh `resolve` pass against the demo repo

### Development phases

1. **Skeleton with mock data**
   Build the ticket list and detail views against a hardcoded array matching the JSON schema above. Unblocks this workstream from the CLI/Bob integration being finished.

2. **Storage layer**
   Minimal store for tickets: id, file, confidence, resolution, reasoning, status, `approved` boolean.

3. **API routes**
   - `POST /api/run` — triggers the CLI, stores the returned tickets
   - `GET /api/tickets` — returns stored tickets for the list view
   - `POST /api/tickets/:id/approve` — marks approved and calls the CLI's `apply` command

4. **Wire to real data**
   Swap the mock array for real API calls. Confirm the full loop: click Run → tickets appear → click Approve → file is updated.

5. **Polish**
   Status badges, confidence shown visually, basic empty/loading states.

---

## Part 3 — Connecting CLI, Bob, and the Website

This is now a **two-hop subprocess chain** rather than one: the website spawns the CLI, and the CLI itself spawns Bob Shell.

```
[Run button clicked]
        │
        ▼
POST /api/run  ────────────►  spawn: `conflict-cli resolve --repo ./demo-repo`
        │                              │
        │                              ▼
        │                     for each detected conflict:
        │                       spawn: `bob -p "resolve @file lines X-Y, return JSON only"`
        │                              │
        │                              ▼
        │                     Bob Shell prints its answer to stdout
        │                              │
        │                     CLI parses/validates JSON, assigns status,
        │                     collects all tickets into one array
        │                              │
        ◄──────────────────────────────┘
        ▼
Parse CLI's stdout as JSON → store tickets → return to frontend
        │
        ▼
Dashboard renders ticket list
        │
        ▼
[Approve clicked] ──► POST /api/tickets/:id/approve
                              │
                              ▼
                    spawn: `conflict-cli apply --file tickets.json --id conflict-01`
                              │
                              ▼
                    Source file updated, ticket marked approved
```

The website's contract with the CLI is unchanged from before: "valid JSON on stdout." The only new piece is *inside* the CLI, where each conflict now costs one `bob` process spawn instead of one HTTP call — functionally similar, but worth remembering when timing the demo (process startup adds latency that an API call wouldn't have), and worth testing `bob -p` against your actual fixtures early, since exact non-interactive output formatting is one of the few things worth confirming hands-on before you're relying on it live.

---

## Build order (reference)

1. Confirm `bob -p` works non-interactively on the demo machine (Part 0) — do this before anything else
2. Fixtures + repo setup
3. CLI parser → Bob Shell call per conflict → JSON output (testable standalone via terminal)
4. Dashboard skeleton against mock data (parallel with step 3)
5. Wire dashboard to CLI via `/api/run`
6. Approve action → `apply` command
7. Polish + rehearse the demo

## Stretch goals (only after the above works end-to-end)
- Slack webhook ping when a new ticket is created
- Swap the per-conflict `bob` spawn for a single batched Bob call covering all conflicts in a file, if latency becomes a problem
- Real GitHub webhook instead of a manual "Run" button
