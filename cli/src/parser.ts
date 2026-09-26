import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";
import type { ConflictRegion } from "./types.js";

/** Normalise Windows backslashes to forward slashes for a portable ticket.file value. */
function toForwardSlash(p: string): string {
  return p.replace(/\\/g, "/");
}

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".bob"]);

export async function findConflictedFiles(repoPath: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            await walk(join(dir, entry.name));
          }
        } else if (entry.isFile()) {
          const fullPath = join(dir, entry.name);
          const content = await readFile(fullPath, "utf8").catch(() => "");
          if (content.includes("<<<<<<<")) {
            results.push(toForwardSlash(relative(repoPath, fullPath)));
          }
        }
      })
    );
  }

  await walk(repoPath);
  return results;
}

/**
 * Replace every conflict marker block in `content` with a neutral placeholder
 * so Bob sees the file structure without being confused by the markers themselves.
 */
function stripConflictMarkers(content: string): string {
  return content.replace(
    /^<{7}.*$[\s\S]*?^={7}$[\s\S]*?^>{7}.*$/gm,
    "// <conflict resolved here>"
  );
}

export function parseConflicts(
  fileContent: string,
  relativeFilePath: string
): ConflictRegion[] {
  const lines = fileContent.split("\n");
  const regions: ConflictRegion[] = [];
  const fileContext = stripConflictMarkers(fileContent);

  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith("<<<<<<<")) {
      const startLine = i + 1; // 1-based
      const headLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].startsWith("=======")) {
        headLines.push(lines[i]);
        i++;
      }

      // skip the ======= line
      i++;

      const incomingLines: string[] = [];
      while (i < lines.length && !lines[i].startsWith(">>>>>>>")) {
        incomingLines.push(lines[i]);
        i++;
      }

      // Guard: if EOF without a closing >>>>>>>, discard this incomplete region
      if (i >= lines.length) {
        continue;
      }

      const endLine = i + 1; // 1-based, line of >>>>>>>
      i++; // move past >>>>>>>

      regions.push({
        file: relativeFilePath,
        startLine,
        endLine,
        head: headLines.join("\n").trim(),
        incoming: incomingLines.join("\n").trim(),
        fileContext,
      });
    } else {
      i++;
    }
  }

  return regions;
}

export async function collectAllConflicts(
  repoPath: string
): Promise<ConflictRegion[]> {
  const files = await findConflictedFiles(repoPath);
  const allRegions: ConflictRegion[] = [];

  for (const relPath of files) {
    const fullPath = join(repoPath, relPath);
    const content = await readFile(fullPath, "utf8");
    const regions = parseConflicts(content, relPath);
    allRegions.push(...regions);
  }

  return allRegions;
}

/**
 * Parse conflicts from an in-memory map of file contents.
 * Used by the GitHub integration path where files are fetched via API
 * rather than read from disk.
 *
 * @param files - Map from repo-relative forward-slash path → raw file content
 */
export function collectConflictsFromStrings(
  files: Map<string, string>
): ConflictRegion[] {
  const allRegions: ConflictRegion[] = [];
  for (const [relPath, content] of files) {
    if (content.includes("<<<<<<<")) {
      const regions = parseConflicts(content, relPath);
      allRegions.push(...regions);
    }
  }
  return allRegions;
}
