import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await getDb();
    const db = client.db('verano');
    
    await db.collection('events').insertOne({
      eventName: body.eventName,
      data: body.data || {},
      url: body.url || '',
      userAgent: request.headers.get('user-agent') || '',
      ip: request.headers.get('x-forwarded-for') || '',
      createdAt: new Date()
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/events error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await getDb();
    const db = client.db('verano');
    const events = await db.collection('events').find({}).sort({ createdAt: -1 }).limit(100).toArray();
    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
