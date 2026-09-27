import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Ticket } from './types';

// Resolve relative to this file so the path is correct regardless of cwd.
// In production the server may run from /app rather than /app/website, so
// process.cwd()-based paths are unreliable.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_PATH = path.join(__dirname, '..', 'data', 'tickets.json');

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
