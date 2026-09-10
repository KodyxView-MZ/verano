import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const client = await getDb();
    const db = client.db('verano');
    
    const result = await db.collection('orders').updateOne(
      { _id: new ObjectId(id) },
      { $set: body }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('PUT /api/orders/[id] error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar pedido' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const client = await getDb();
    const db = client.db('verano');
    
    const result = await db.collection('orders').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('DELETE /api/orders/[id] error:', error);
    return NextResponse.json({ error: 'Erro ao deletar pedido' }, { status: 500 });
  }
}
