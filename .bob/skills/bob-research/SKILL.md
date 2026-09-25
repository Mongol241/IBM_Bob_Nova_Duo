---
name: bob-research
description: Use when the user wants to find the best approach, pattern, library, or solution for a technical problem — frontend or backend ("what's the best way to", "research how to", "what should I use for", "find the optimal approach for"). Scans the project context, reasons through options, and outputs a clean recommendation brief with a primary choice and an alternative.
---

# Bob Research Skill

Follow these steps every time this skill activates.

## Step 1 — Understand the Request

Extract from the user's message:
- **The problem or component to solve** — what needs to be built, chosen, or decided.
- **Any stated constraints** — performance, accessibility, team familiarity, licensing, existing stack.
- **Intent signal** — is the user asking purely for a recommendation, or is there an implied or explicit request to implement afterwards? Note this for Step 5.

If the request is too vague to research meaningfully, ask one focused clarifying question before continuing.

---

## Step 2 — Scan the Project Context

Use `read_file`, `glob`, and `grep` to gather relevant project facts. Collect only what is needed to make the recommendation — do not read unrelated files.

Collect as applicable:
- **Package manager & dependencies** — read `package.json`, `requirements.txt`, `go.mod`, `pom.xml`, `Cargo.toml`, or equivalent. Note the framework, key libraries, and their versions.
- **Existing patterns** — use `grep` to find how similar problems are solved today (e.g. existing components, API patterns, data-access layers).
- **Configuration** — check for a design system config, linting rules, or framework config files that constrain choices.
- **Language & runtime** — confirm the primary language and runtime from file extensions and config.

If the project has no existing code (greenfield), note that and rely on the stated constraints only.

---

## Step 3 — Reason Through the Options

Internally evaluate at least two viable approaches against the project context and constraints. For each, consider:

- **Fit** — how well does it align with the existing stack and conventions?
- **Complexity** — implementation effort and ongoing maintenance cost.
- **Trade-offs** — what does this approach give up compared to the other?
- **Risk** — maturity, community support, known issues.

Select the **primary recommendation** (best overall fit) and one **alternative** (next-best, or best under different constraints).

---

## Step 4 — Output the Recommendation Brief

Write a clean, structured brief. Keep it concise — this is an input for an implementor, not a tutorial.

```
## Research Brief: [Problem / Component Name]

### Context
[One sentence: relevant stack facts that shaped the recommendation.]

### Primary Recommendation: [Name / Approach]
- **Why:** [2–3 sentences — fit, key strengths, why it beats the alternative here.]
- **Trade-off:** [One sentence — what it gives up.]
- **Implementation notes:** [Bullet points — key steps, imports, config, gotchas. Enough for an implementor to act without further research.]

### Alternative: [Name / Approach]
- **When to prefer this:** [One sentence — the condition under which this becomes the better choice.]
- **Trade-off:** [One sentence.]
- **Implementation notes:** [Brief bullets.]
```

Do not pad the brief with background explanations, history, or generic advice. Every line should be actionable.

---

## Step 5 — Decide Whether to Continue to Implementation

Check the intent signal noted in Step 1:

- **Explicit implementation request** (e.g. "build a X", "implement Y", "create this component") → inform the user that research is complete, then activate the appropriate implementor skill (`web-frontend` for UI work, or proceed with inline implementation for backend/other work).
- **Implicit implementation context** (e.g. the research was triggered mid-task where code is clearly expected next) → ask the user: *"Ready to implement using the primary recommendation?"* and proceed only on confirmation.
- **Pure research request** (e.g. "what's the best way to", "should I use X or Y") → output the brief and stop. Do not implement unless asked.
