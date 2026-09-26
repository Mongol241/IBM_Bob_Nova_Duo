Goal: We need to move from "scanning a folder" to "integrating with the GitHub API."

The New Workflow

Instead of Resolve -> Local Folder, the flow becomes:
1. Webhook: GitHub sends a notification to your website when a "Pull Request" is opened or updated.
2. Fetch: Your website uses the GitHub API to find files in that PR that contain conflicts.
3. Clone/Fetch: The app pulls the conflicting versions of the files into a temporary directory.
4. Resolve: The existing CLI runs against that temporary directory.
5. Push: Once you click "Approve" on the website, the app pushes the fix back to GitHub as a commit to the branch.

---

Implementation Plan

I recommend we tackle this in three phases:

Phase 1: GitHub API Integration (The "Read" Phase)

We need to replace the local folder scan with GitHub API calls.
- New Dependency: Add octokit (the official GitHub SDK) to the website.
- GitHub App/Token: You'll need a GitHub Personal Access Token (PAT) or a GitHub App installation to read private repos.
- Logic Change: Modify /api/run to:
  - Take a repo_owner and repo_name instead of a local path.
  - Use the GitHub API to identify the "mergeable" state of a Pull Request.
  - Fetch the "blob" (content) of the conflicting files.

Phase 2: Virtual Workspace (The "Process" Phase)

Since the CLI expects a physical folder on disk to work, this will be the approach:
- Virtual Files: Rewrite the CLI parser.ts to accept a list of strings (files) from the API instead of walking a directory. (This is cleaner and faster).

Phase 3: The Feedback Loop (The "Write" Phase)

Currently, apply.ts overwrites a local file. We need to change this to:
- GitHub Commit: Use the GitHub API to create a new commit on the feature branch containing the ticket.resolution text.
- PR Update: This automatically updates the Pull Request on GitHub, resolving the conflict.

---

Immediate Next Steps
- GitHub Commit: Use the GitHub API to create a new commit on the feature branch containing the ticket.resolution text.
- PR Update: This automatically updates the Pull Request on GitHub, resolving the conflict.

---