import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// GET - listar pedidos
export async function GET() {
  try {
    const client = await getDb();
    const db = client.db('verano');
    const orders = await db.collection('orders').find({}).sort({ _id: -1 }).toArray();
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('GET /api/orders:', error);
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

// POST - criar pedido
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await getDb();
    const db = client.db('verano');
    const result = await db.collection('orders').insertOne(body);
    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('POST /api/orders:', error);
    return NextResponse.json({ error: 'Erro ao registrar encomenda' }, { status: 500 });
  }
}