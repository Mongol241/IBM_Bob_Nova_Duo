---
name: conflict-resolver
description: Use when the user wants to find and resolve git merge conflicts — detects all conflicts in the repository, resolves them one at a time using architectural context from AGENTS.md, and applies the resolutions or escalates when confidence is low.
---

# Conflict Resolver

Follow these steps in order. The conflict-finding step is deterministic (shell commands); the resolution step is where architectural judgment is applied.

## Step 1 — Find All Conflicts

Use `execute_command` to locate every file that contains unresolved merge conflict markers:

```powershell
git diff --name-only --diff-filter=U
```

If that returns nothing, also try:

```powershell
git grep -l "^<<<<<<< "
```

Collect the list of conflicted files. If there are zero conflicts, tell the user and stop.

## Step 2 — Extract Conflict Blocks

For each conflicted file, use `read_file` to get its full contents. Parse out every conflict block — a block is:

```
<<<<<<< HEAD
<head-side>
=======
<incoming-side>
>>>>>>> <branch>
```

A single file may contain multiple conflict blocks. Number them globally across all files: `CONFLICT-001`, `CONFLICT-002`, etc.

For each conflict block, record:
- **ID:** e.g. `CONFLICT-001`
- **File:** relative path
- **Line range:** start and end line of the block
- **HEAD side:** the text between `<<<<<<<` and `=======`
- **INCOMING side:** the text between `=======` and `>>>>>>>`
- **Conflict type** (classify immediately):
  - `mechanical` — whitespace-only, lockfile, auto-generated file, import sort order
  - `structural` — function signature, variable rename, refactor that doesn't change logic
  - `logic` — both sides change actual behaviour in a non-trivially-compatible way

## Step 3 — Resolve Each Conflict

Process conflicts **one at a time**. For each conflict:

### 3a — Apply architectural context

`AGENTS.md` is already in your context (Bob auto-loads it from the project root). Use it. Before proposing a resolution, explicitly ask: *"Given the module this file belongs to, its invariants, and the dependency rules — which side is consistent with how this codebase actually works?"*

### 3b — Produce a resolution

Determine the resolved text. Rules by type:

| Type | Default approach |
|---|---|
| `mechanical` | Pick the cleaner side or merge both; confidence should be ≥ 0.90 |
| `structural` | Use the side that matches the naming/style conventions in AGENTS.md; confidence typically 0.75–0.95 |
| `logic` | Reason from the invariants and call-sites; be honest about ambiguity |

### 3c — Confidence gate (escalation)

If your confidence for a `logic` conflict is **below 0.75**:

1. Use `read_file` to read the **entire file** containing the conflict (not just the block).
2. Use `grep` to find 1–3 call-sites of the conflicting function/variable elsewhere in the repo.
3. Re-evaluate with that broader context and update your confidence.
4. If confidence is still below 0.75 after escalation, **do not auto-apply** — mark it `NEEDS_HUMAN` and explain exactly what context is missing.

Mechanical and structural conflicts never need escalation; skip straight to Step 3d.

### 3d — Record the resolution

For each conflict, produce a resolution record:

```
ID: CONFLICT-001
File: src/billing/invoice.ts  lines 42–58
Type: logic
Confidence: 0.87
Resolution:
  <resolved text — the exact lines that should replace the entire conflict block>
Reasoning:
  The HEAD side adds discountRate validation before applying the discount, which is
  consistent with the invariant in AGENTS.md ("billing always validates discountRate
  before use"). The INCOMING side skips validation, contradicting that invariant.
Status: READY | NEEDS_HUMAN
```

## Step 4 — Write the Conflict Report

Write `CONFLICT_REPORT.md` to the workspace root using `write_file`. Structure:

```markdown
# Merge Conflict Report
**Date:** <ISO date>
**Total conflicts:** N  (READY: X  |  NEEDS_HUMAN: Y)

## Conflicts

### CONFLICT-001
| Field | Value |
|---|---|
| **File** | `src/billing/invoice.ts` |
| **Lines** | 42–58 |
| **Type** | logic |
| **Confidence** | 0.87 |
| **Status** | ✅ READY |

**HEAD side:**
```
<head text>
```
**INCOMING side:**
```
<incoming text>
```
**Resolution:**
```
<resolved text>
```
**Reasoning:** <one paragraph>

---
### CONFLICT-002
...

## Needs Human Review
List any NEEDS_HUMAN conflicts here with a clear explanation of what information
is required to resolve them.
```

## Step 5 — Apply Resolutions

After writing the report, ask the user:

> "I've found N conflicts. X are ready to apply automatically. Y need human review (listed in CONFLICT_REPORT.md).
> Apply the X ready resolutions now? (yes / no / show me each one first)"

If the user confirms **yes** or **show me each one first**:

For each `READY` conflict, use `search_and_replace` (or `apply_diff`) to replace the entire conflict block (from `<<<<<<< HEAD` through `>>>>>>> branch`) with the resolved text.

After applying all resolutions, run:

```powershell
git diff --name-only --diff-filter=U
```

If the output is empty, confirm: **"All conflicts resolved. Working tree is clean."**

If any remain, list them and explain why they were skipped.

## Step 6 — Post-Resolution Validation

Run the project's test suite (use the same command as `code-review` would — check `package.json` scripts, `pytest`, `go test`, etc.) using `execute_command`.

Report the result:
- ✅ Tests pass — resolution is safe
- ❌ Tests fail — show the failure and advise the user to inspect `CONFLICT_REPORT.md` for the `logic` conflicts most likely to have caused a regression

## Notes

- **AGENTS.md is your free context.** You don't need to re-explore the repo to understand architecture — that file was written by `code-review` for exactly this purpose. If it's missing or stale, recommend running `code-review` first.
- **Never guess on low-confidence logic conflicts.** A wrong auto-resolution that compiles is worse than a correctly flagged `NEEDS_HUMAN`.
- **Mechanical conflicts are cheap.** Don't escalate them. Whitespace, lockfiles, and generated files should never block the batch.
