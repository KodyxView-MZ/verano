import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await getDb();
    const db = client.db('verano');
    const result = await db.collection('orders').insertOne(body);
    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: 'Erro ao registrar encomenda' }, { status: 500 });
  }
}
