IBM Bob Usage Statement
Project: Merge Conflict Resolver
Team: Nova Duo
Overview
IBM Bob was the core AI engine of this project, not a peripheral tool. The entire product exists to have IBM Bob reason through Git merge conflicts and produce structured, machine-readable resolutions that a team can review and approve. Every architectural decision — the CLI subprocess design, the prompt engineering, the confidence-threshold system, and the deployment pipeline — was made specifically around how IBM Bob works. Bob was also used, in Agent mode, to build and debug the project itself, including resolving production deployment issues on Railway.
How IBM Bob Was Used
1. Non-Interactive Subprocess Invocation (bob -p)
The central integration point is cli/src/resolver.ts. For every merge conflict detected in a repository, the CLI spawns IBM Bob in non-interactive mode via Node's child_process.spawn:
const child = spawn("bob", ["-p", prompt], { shell: true });
Bob's stdout is captured and a JSON object is extracted from it containing three fields — resolution, confidence (0–1), and reasoning. This is the machine-parseable output contract the rest of the system is built around.
2. Prompt Engineering for Structured Output
Each prompt explicitly instructs Bob to resolve the conflict by referencing the affected file (@src/billing.js) and line range, and to return only a JSON object with no markdown fences or surrounding commentary. Because Bob's non-interactive output can include reasoning text alongside the answer, the CLI defensively strips any content before or after the JSON object rather than assuming clean output.
3. Confidence-Based Triage
Bob's confidence score drives the ticket's status: responses at or above 0.8 are marked auto-resolved; everything else is marked needs-review. If Bob's response fails to parse as valid JSON, the CLI catches the error and falls back to needs-review with reasoning: "could not parse model output" instead of crashing the run — so Bob's output quality directly determines the human review workload.
4. Applying Resolutions Back to Source
The apply command takes an approved ticket and rewrites the original <<<<<<< / ======= / >>>>>>> conflict block in the source file with Bob's resolution text — closing the loop from AI suggestion to committed code.
5. Two-Hop Architecture: Website → CLI → Bob
In the full product, the dashboard's "Run" button spawns the CLI, which in turn spawns one bob process per detected conflict. Concurrency is deliberately limited, since each call is a real process spawn rather than a lightweight API request — a distinction that shaped both the CLI's execution model and the demo's timing.
6. IBM Bob Used to Build the Project Itself
Throughout development, IBM Bob (in Agent mode) was used directly to:
Scaffold and implement the CLI engine (parser.ts, resolver.ts, assembler.ts, context.ts, commands/resolve.ts, commands/apply.ts)
Build the Next.js dashboard — all React components (TicketCard, DiffPanel, ConfidenceBar, StatusBadge, ResolutionBlock, Toast, Navbar), all API routes (/api/run, /api/approve, /api/tickets, /api/github-push), and the storage layer
Design and implement the GitHub integration — Octokit-based helpers in website/lib/github.ts for fetching conflicted files from a live PR, injecting GitHub context into tickets, and pushing resolutions back to the PR branch as commits
Add Slack notifications — website/lib/slack.ts webhook integration so teams are alerted the moment new conflict tickets are created
Debug edge cases — Windows path normalization (backslash → forward slash in parser.ts), ESM import resolution (.js extensions for .ts sources), stdout JSON-extraction robustness, and ±5-line drift tolerance in the apply command
7. IBM Bob Used for Railway Deployment Debugging
This meant Bob wasn't only the AI resolving merge conflicts inside the product — it was also the tool the team relied on to get that product actually running as a live, deployed application for judges to use
