# Merge Conflict Resolver using IBM BOB

## The problem

Merge conflicts are one of the most tedious parts of working on a shared codebase. Someone has to stop what they're doing, open the file, figure out what each side of the conflict was trying to do, and manually stitch together a fix — even when the conflict is something trivial like a formatting difference or a lockfile bump.

This project takes a first pass at that work for you. It scans a repository for merge conflicts, sends each one to an AI model for a suggested resolution, and turns the results into a simple list of "tickets" you can review. Conflicts the model is confident about are flagged as **auto-resolved**; anything murkier is flagged as **needs review**, with the model's reasoning attached so a human can make the final call quickly instead of starting from scratch.

There are two pieces:

- **A command-line engine** that does the actual work — finding conflicts, asking the AI model to resolve them, and applying approved resolutions back to the source files.
- **A web dashboard** that gives you a friendly view of the tickets, lets you inspect each conflict side by side with the suggested fix, and approve or reject it with a click.

## What's included beyond the basics

On top of the core "scan → suggest → approve" loop, this version also wires the tool into the workflows a team would actually use it in:

- **Slack notifications** — when a run turns up a new conflict ticket, a message gets posted to a Slack channel, so the team finds out as soon as something needs attention instead of having to remember to check the dashboard.
- **GitHub-connected runs** — the tool identifies and works against a real GitHub repository (using a personal access token) rather than only a local demo folder, so it can be pointed at an actual project.

## Setup

You'll need Node.js installed. The project has two parts — the CLI engine and the website — and each needs to be set up separately.

### 1. Set up the CLI

```
cd cli
npm install
npm run build
```

This builds the engine that the website calls behind the scenes whenever you click "Run" or "Approve."

### 2. Configure the website

Inside the `website` folder, create a file named `.env.local` with the following entries:

```dotenv
DEMO_MODE= can be false or true, false uses bob coins for reasoning
CLI_PATH=../cli/dist/index.js can change if user moves files but unlikely
REPO_PATH=Targeted repo for the demo
GITHUB_TOKEN=Personal Access Token for repo identification
SLACK_WEBHOOK_URL=Connect our merge conflicter to slack so you know when a project emitted an merge conflict.
```

A quick note on each setting:

- **DEMO_MODE** — set to `true` to run without using real AI credits, or `false` to have the model actually reason through each conflict (this uses "bob coins").
- **CLI_PATH** — where the website finds the built CLI. The default already points at the right place; you'd only change this if you moved the project files around.
- **REPO_PATH** — the repository the tool should scan for conflicts.
- **GITHUB_TOKEN** — a personal access token so the tool can identify and access the target repo on GitHub.
- **SLACK_WEBHOOK_URL** — a Slack webhook URL so the team gets notified in Slack whenever a new merge conflict ticket is created.

### 3. Run the website

```
cd website
npm install
npm run dev
```

Once it's running, open the dashboard in your browser, hit **Run** to scan the configured repo for conflicts, and review the tickets that come back.
