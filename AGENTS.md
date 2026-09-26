# Project Architecture

## Modules
- **cli/src/parser.ts:** Recursively walks a repo, finds files containing `<<<<<<<`, parses each conflict block into a `ConflictRegion` (file, startLine, endLine, head, incoming). Also exports `collectConflictsFromStrings(files: Map<string, string>)` for in-memory parsing (used by the GitHub integration path, no disk required).
- **cli/src/resolver.ts:** Spawns `bob -p <prompt>` per conflict; captures stdout; strips leading/trailing noise; parses JSON into `BobResolution`. Runs conflicts with a configurable concurrency pool (default 3).
- **cli/src/assembler.ts:** Combines a `ConflictRegion` + `BobResolution` into a `Ticket`. Clamps confidence to [0,1]. Assigns `status: "auto-resolved"` when `confidence >= threshold`, else `"needs-review"`. On Bob failure, emits a `needs-review` ticket with confidence 0 and the error as reasoning.
- **cli/src/commands/resolve.ts:** Orchestrates parser → resolver → assembler; prints the ticket array as JSON to stdout (`runResolve`). Also exports `resolveFromStrings(files, opts)` which returns the ticket array directly for callers that do not go through the CLI subprocess.
- **cli/src/commands/apply.ts:** Reads a tickets JSON file, locates the conflict markers in the source file (±5-line drift tolerance), replaces the entire block with `ticket.resolution`, preserves original line endings.
- **cli/src/index.ts:** `commander` CLI entry; exposes `resolve --repo <path>` and `apply --file <path> --id <id>`.
- **website/lib/github.ts:** Octokit-based GitHub API helpers. `getPrInfo` — fetches PR metadata (head SHA, branch, mergeability). `fetchConflictedFiles` — lists PR files, fetches raw content for each, returns only those containing conflict markers plus their blob SHA. `pushResolvedFile` — creates a commit on the PR branch replacing the conflicted file with the resolved content.
- **website/app/api/run/route.ts:** `POST /api/run` — two modes: **local** (execs the CLI `resolve` command against a local repo path) and **GitHub** (takes `repo_owner`, `repo_name`, `pr_number`; fetches conflicted files via GitHub API; writes them to a temp dir; runs the CLI against that dir; enriches tickets with GitHub PR context; cleans up temp dir). Writes results to `website/data/tickets.json`.
- **website/app/api/approve/route.ts:** `POST /api/approve` — two modes: **GitHub mode** (ticket has `githubOwner` etc.) calls `pushResolvedFile` to commit the resolution directly to the PR branch; **local mode** writes tickets to a temp file and execs CLI `apply`. Marks ticket `approved: true` in storage after either path.
- **website/app/api/github-push/route.ts:** `POST /api/github-push` — dedicated route to push a single ticket's resolution to GitHub as a commit. Validates GitHub context fields on the ticket before calling `pushResolvedFile`. Separated from `/api/approve` so it can be called independently.
- **website/app/api/tickets/route.ts:** `GET /api/tickets` — reads and returns all tickets from storage.
- **website/lib/storage.ts:** File-based persistence; reads/writes `website/data/tickets.json`.
- **website/components/:** React UI — TicketCard, StatusBadge, ConfidenceBar, DiffPanel, ResolutionBlock, Toast, Navbar.

## New GitHub Integration Workflow

```
POST /api/run { repo_owner, repo_name, pr_number }
        │
        ├─► getPrInfo()         — branch name + head SHA
        ├─► fetchConflictedFiles() — raw file content + blob SHA per file
        │
        ├─► write files to temp dir
        ├─► spawn: conflict-cli resolve --repo <tmpDir>
        ├─► parse tickets; inject githubOwner/Repo/Branch/BlobSha per ticket
        ├─► rm temp dir
        └─► writeTickets() → tickets.json

[Approve clicked]
        │
        └─► POST /api/approve { ticketId }
                │  (ticket has githubOwner etc.)
                └─► pushResolvedFile() — commit to PR branch
                    → PR conflict automatically resolved on GitHub
```

## Key Invariants
- The CLI's stdout contract is **JSON-only**: `console.log(JSON.stringify(tickets))` with no other writes to stdout; all diagnostic output goes to stderr or `console.error`.
- `ticket.file` is always a **forward-slash relative path** from the repo root (normalised in parser.ts on all platforms).
- `apply.ts` resolves the source file path by joining `repoRoot` + `ticket.file`; `repoRoot` must be passed explicitly — it must never default to `process.cwd()` because the CLI is called from the website's working directory.
- `ticket.id` format is `conflict-NN` (zero-padded to 2 digits); this is the stable cross-boundary identifier used by the website's approve and reject routes.
- Confidence is clamped to [0,1] in `assembler.ts`; Bob output outside that range is silently clamped, not rejected.
- The website's `Ticket` type adds an `approved` boolean and optional `github*` fields not present in the CLI's `Ticket` type; the website storage layer owns these fields.
- GitHub context fields (`githubOwner`, `githubRepo`, `githubBranch`, `githubBlobSha`) are set at ticket-creation time in `/api/run` and are immutable after that. `/api/approve` reads them to decide which apply path to use.
- `GITHUB_TOKEN` must be set in `.env.local` for GitHub mode. `website/lib/github.ts` throws a descriptive error if the token is missing.

## Dependency Rules
- The website must never import from `cli/src/`; it communicates exclusively by spawning the compiled `cli/dist/index.js` and parsing its stdout.
- `cli/src/commands/apply.ts` must not read `process.cwd()` to resolve source file paths; it must use the `repoRoot` option injected by the caller.
- `cli/src/resolver.ts` must not import anything from the website; it is a standalone library module.

## Conventions
- ESM throughout (`"type": "module"` in cli/package.json); all imports use `.js` extensions even for `.ts` sources.
- TypeScript strict mode enabled in both packages.
- Error handling: thrown `Error` objects propagate up; the CLI's top-level catch in `index.ts` exits with code 1 and prints to stderr.
- Tests use `jest.unstable_mockModule` for ESM-compatible module mocking (not `jest.mock`).
- API routes return `{ error: string }` with HTTP 4xx/5xx on failure; the frontend reads `data.error` and surfaces it as a toast.
- CSS design tokens are defined in `globals.css` as CSS custom properties and consumed via Tailwind `@theme inline`.

## Fragile Areas
- Bob subprocess latency: 5 conflicts × up to 60 s each = up to 5 min for a full resolve run; `execPromise` in `/api/run` must have `timeout` and `maxBuffer` set explicitly or it will fail silently.
- The `apply` command's ±5-line drift window breaks if the source file is significantly edited between `resolve` and `apply`; re-running `resolve` regenerates correct line numbers.
- `path.relative()` on Windows returns backslash-separated paths; `parser.ts` must normalise these to forward slashes before storing in `ticket.file`, or `apply.ts` path joins will break on non-Windows environments.
- `website/data/tickets.json` is a plain file; concurrent requests to `/api/run` or `/api/approve` can corrupt it. For the demo scope this is acceptable; do not scale this to concurrent users without a proper DB.
- GitHub API rate limits: `fetchConflictedFiles` calls `getContent` once per changed file in the PR. For PRs with many files (>50) this may hit secondary rate limits — paginate if needed.
- The blob SHA stored at ticket creation time (`githubBlobSha`) becomes stale if someone else pushes to the same branch between `resolve` and `approve`. The GitHub API will reject the push with a 409 conflict; the user must re-run the resolver to get a fresh SHA.
