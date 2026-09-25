---
name: web-frontend
description: Use when the user wants to implement a UI component or change existing frontend code ("build a [component]", "implement this in the frontend", "change this in the frontend", "update this component", "fix the UI for"). Expects either a bob-research brief or existing code as input, then implements or reviews accordingly.
---

# Web Frontend Skill

Follow these steps every time this skill activates.

## Step 1 — Identify the Mode

Determine which path applies based on the user's request and available context:

- **New component / implementation request** — a `bob-research` brief is available, or the user has described what to build. Go to **Step 2A**.
- **Existing code review / change request** — the user has pointed at existing code and wants it reviewed, improved, or modified. Go to **Step 2B**.

If the request is ambiguous (e.g. "update the navbar" without showing code), use `read_file` or `grep` to check whether the component already exists in the workspace before deciding.

If no `bob-research` brief has been produced yet and the request implies a non-trivial design decision, activate the `bob-research` skill first before continuing.

---

## Step 2A — New Component: Implement

1. **Read the project conventions** — Use `glob` and `grep` to locate similar components. Note the framework, naming conventions, file structure, and CSS approach in use.

2. **Use the research brief if available** — Follow the primary recommendation from `bob-research`. Do not re-research what is already decided. If no brief exists and the implementation is straightforward, proceed directly.

3. **Implement the component** — Use `write_file` (new file) or `apply_diff` / `insert_content` (adding to an existing file):
   - Match the project's language, framework, and style conventions exactly.
   - Include only what was asked — no extra features, wrappers, or abstractions.
   - Add brief inline comments only where logic is non-obvious.

4. **Report** — State what was created, the file path, and any manual steps the user needs to take (imports, registration, routing, etc.).

---

## Step 2B — Existing Code: Review & Change

1. **Read the relevant files** — Use `read_file` to open the file(s) the user referenced. If the exact file is unknown, use `grep` or `glob` to locate it.

2. **Review the code against these criteria:**
   - **Correctness** — Does the component do what it claims? Are there obvious bugs or broken edge cases?
   - **Accessibility** — Proper semantic HTML, ARIA roles/labels where needed, keyboard navigability.
   - **Performance** — Unnecessary re-renders, unoptimised assets, blocking operations.
   - **Style consistency** — Does it match the conventions used elsewhere in the project?
   - **Maintainability** — Dead code, magic values, overly complex logic.

3. **Summarise findings** — List issues grouped by severity: **blocking / minor / suggestion**. Quote the specific line or pattern for each.

4. **Apply the requested change(s)** — Use `apply_diff` or `search_and_replace` for targeted edits. Change only what was asked or what is clearly broken. Do not refactor unrelated code.

5. **Report** — Confirm what changed, reference the file and line range, and note any follow-up actions needed (tests, imports, etc.).

---

## General Constraints (apply to both paths)

- Always read existing project files before making assumptions about conventions in use.
- Produce the minimal change that satisfies the request — no scope creep.
- If a requested change would introduce a breaking or risky pattern, flag it before implementing and ask for confirmation.
- Do not run shell commands unless the user explicitly requests a build or lint check.
