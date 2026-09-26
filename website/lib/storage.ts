import fs from 'fs/promises';
import path from 'path';
import { Ticket } from './types';

const STORAGE_PATH = path.join(process.cwd(), 'data', 'tickets.json');

export async function readTickets(): Promise<Ticket[]> {
  try {
    const data = await fs.readFile(STORAGE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

export async function writeTickets(tickets: Ticket[]): Promise<void> {
  await fs.writeFile(STORAGE_PATH, JSON.stringify(tickets, null, 2), 'utf8');
}
