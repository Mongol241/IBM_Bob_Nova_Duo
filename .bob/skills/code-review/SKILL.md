---
name: code-review
description: Use when the user wants to review the current repository — performs a full architectural analysis, quality/security/performance review, runs tests, and writes or refreshes AGENTS.md so that conflict-resolver can use it.
---

# Code Review

Follow these steps in order. Use Bob's full repository exploration capability at every stage — do not summarise from a single file; read broadly first.

## Step 1 — Map the Architecture

1. Use `list_files` (recursive) on the workspace root to get a full picture of the project tree.
2. Identify the major modules, layers, and entry points. Read key files: `package.json` / `pyproject.toml` / `pom.xml` / `go.mod` (whichever applies), top-level `README`, and any existing `AGENTS.md` or `CONTEXT.md`.
3. Read the main entry point(s) and the files they depend on most heavily.
4. Use `grep` to find cross-cutting patterns: auth guards, validation call-sites, database access, external HTTP calls, background jobs — anything that reveals how the modules depend on each other.
5. Record the following (keep this in working memory; you will write it to AGENTS.md at the end):
   - Module/layer boundaries and their responsibilities
   - Key invariants (e.g. "billing always validates `discountRate` before use")
   - Critical dependency edges ("X must never import Y")
   - Naming and code conventions the codebase actually follows
   - Any known tech-debt areas or fragile seams

## Step 2 — Quality, Security, and Performance Review

Work file-by-file through the most important source files (skip generated files, lockfiles, vendored code). For each file, evaluate:

**Quality**
- Dead code, duplicated logic, overly complex functions (cyclomatic complexity smell)
- Missing or misleading comments on non-obvious behaviour
- Inconsistent naming or style relative to the rest of the codebase

**Security**
- Unsanitised input reaching SQL, shell, file-system, or HTML sinks
- Secrets, credentials, or PII hardcoded or logged
- Weak auth: missing guards, privilege escalation paths, insecure defaults
- Dependency versions with known CVEs (check `package.json` / `requirements.txt` / similar for obviously outdated pinned versions)

**Performance**
- N+1 query patterns or unbounded loops over large collections
- Synchronous blocking calls on hot paths
- Missing indexes hinted by query patterns in the code
- Large payloads serialised/deserialised unnecessarily

Capture every finding as a structured ticket (see Step 4 format).

## Step 3 — Run Assertions and Tests

1. Read the project's test runner config (`jest.config.*`, `pytest.ini`, `go test`, `mvn test`, etc.).
2. Use `execute_command` to run the test suite. Capture stdout/stderr.
3. Parse the output: record which tests pass, fail, or error. Include the failure messages verbatim in the report.
4. If no test suite exists, note this explicitly as a finding in the report.

## Step 4 — Produce the Markdown Report

Write a file `CODE_REVIEW.md` to the workspace root using `write_file`. Structure it as follows:

```
# Code Review Report
**Date:** <ISO date>
**Reviewed by:** Bob

## Architecture Summary
<2–4 paragraph description of module structure, key invariants, and dependency edges>

## Test Results
<pass/fail summary, with failure details>

## Findings

### [CR-001] <Short title>
| Field | Value |
|---|---|
| **Severity** | Critical / High / Medium / Low / Info |
| **Category** | Quality / Security / Performance |
| **File** | `path/to/file.ext:line` |
| **Summary** | One-sentence description |

**Detail:**
<Explanation of the problem and why it matters given the architecture>

**Suggested fix:**
<Concrete recommendation>

---
### [CR-002] ...
```

Number tickets sequentially (`CR-001`, `CR-002`, …). One ticket per distinct finding. Do not batch unrelated issues into a single ticket.

## Step 5 — Write / Refresh AGENTS.md

Write (or overwrite) `AGENTS.md` in the workspace root using `write_file`. This file is auto-loaded by Bob into every subsequent session, so it must be compact and high-signal. Use this structure:

```markdown
# Project Architecture

## Modules
- **<module-name>:** <one-line responsibility>

## Key Invariants
- <invariant — e.g. "billing always validates discountRate before applying it">

## Dependency Rules
- <what must not import what>

## Conventions
- <naming, error-handling, logging patterns actually used in this codebase>

## Fragile Areas
- <known tech-debt, areas where changes frequently cause regressions>
```

Keep each bullet to one sentence. Aim for under 60 lines total — this file is read on every session start; brevity is a feature.

## Step 6 — Report to the User

Tell the user:
1. How many findings were recorded and their severity breakdown
2. Whether the test suite passed
3. That `CODE_REVIEW.md` and `AGENTS.md` have been written to the project root
4. That `conflict-resolver` (if installed) will now automatically use the architectural context from `AGENTS.md` for all conflict resolutions in this repository
