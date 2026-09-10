import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();
    const client = await getDb();
    const db = client.db('verano');
    
    await db.collection('subscriptions').updateOne(
      { endpoint: subscription.endpoint },
      { $set: subscription },
      { upsert: true }
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/subscribe error:', error);
    return NextResponse.json({ error: 'Erro ao guardar subscricao' }, { status: 500 });
  }
}
