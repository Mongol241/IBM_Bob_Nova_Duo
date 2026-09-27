import fs from 'fs/promises';
import path from 'path';
import { Ticket } from './types';

// process.cwd() is /app/website because the Dockerfile CMD does:
//   cd /app/website && node node_modules/.bin/next start ...
const STORAGE_PATH = path.join(process.cwd(), 'data', 'tickets.json');

export async function readTickets(): Promise<Ticket[]> {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeTickets(tickets: Ticket[]): Promise<void> {
  await fs.mkdir(path.dirname(STORAGE_PATH), { recursive: true });
  await fs.writeFile(STORAGE_PATH, JSON.stringify(tickets, null, 2), 'utf8');
}
