import { NextResponse } from 'next/server';
import { readTickets, writeTickets } from '@/lib/storage';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tickets = await readTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = (body as { action?: string }).action;

    if (action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action. Use { "action": "reject" }' }, { status: 400 });
    }

    const tickets = await readTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updatedTickets = tickets.map(t =>
      t.id === id ? { ...t, rejected: true, approved: false } : t
    );
    await writeTickets(updatedTickets);

    return NextResponse.json({ success: true, ticket: updatedTickets.find(t => t.id === id) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
