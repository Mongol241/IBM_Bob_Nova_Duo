import { NextResponse } from 'next/server';
import { writeTickets } from '@/lib/storage';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// process.cwd() is the website/ directory when running via Next.js
const ROOT = path.resolve(process.cwd(), '..');
const DEFAULT_CLI_PATH = path.join(ROOT, 'cli', 'dist', 'index.js');
const DEFAULT_REPO_PATH = path.join(ROOT, 'cli', 'demo-repo');

export async function POST() {
  console.log('DEBUG: DEMO_MODE is', process.env.DEMO_MODE);
  try {
    let tickets;

    if (process.env.DEMO_MODE === 'true') {
      const goldenPath = path.join(process.cwd(), 'golden_tickets.json');
      const data = await fs.readFile(goldenPath, 'utf8');
      tickets = (JSON.parse(data) as any[]).map((t: any) => ({ approved: false, ...t }));
    } else {
      const cliPath = process.env.CLI_PATH
        ? path.resolve(process.cwd(), process.env.CLI_PATH)
        : DEFAULT_CLI_PATH;
      const repoPath = process.env.REPO_PATH
        ? path.resolve(process.cwd(), process.env.REPO_PATH)
        : DEFAULT_REPO_PATH;
      // 5 conflicts × 60 s each + startup overhead; maxBuffer covers verbose JSON output
      const { stdout } = await execPromise(
        `node "${cliPath}" resolve --repo "${repoPath}"`,
        { timeout: 360_000, maxBuffer: 10 * 1024 * 1024 }
      );
      // Initialise approved/rejected fields not present in CLI output
      tickets = (JSON.parse(stdout) as any[]).map((t: any) => ({
        approved: false,
        rejected: false,
        ...t,
      }));
    }

    await writeTickets(tickets);
    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error('Run Resolver Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
