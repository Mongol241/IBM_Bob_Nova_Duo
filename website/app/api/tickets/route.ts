import { NextResponse } from 'next/server';
import { readTickets } from '@/lib/storage';

export async function GET() {
  try {
    const tickets = await readTickets();
    return NextResponse.json(tickets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
