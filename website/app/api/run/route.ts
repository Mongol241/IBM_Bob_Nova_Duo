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
  try {
    let tickets;

    if (process.env.DEMO_MODE === 'true') {
      const goldenPath = path.join(process.cwd(), 'golden_tickets.json');
      const data = await fs.readFile(goldenPath, 'utf8');
      tickets = JSON.parse(data);
    } else {
      const cliPath = process.env.CLI_PATH
        ? path.resolve(process.cwd(), process.env.CLI_PATH)
        : DEFAULT_CLI_PATH;
      const repoPath = process.env.REPO_PATH
        ? path.resolve(process.cwd(), process.env.REPO_PATH)
        : DEFAULT_REPO_PATH;
      const { stdout } = await execPromise(`node "${cliPath}" resolve --repo "${repoPath}"`);
      tickets = JSON.parse(stdout);
    }

    await writeTickets(tickets);
    return NextResponse.json(tickets);
  } catch (error: any) {
    console.error('Run Resolver Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
