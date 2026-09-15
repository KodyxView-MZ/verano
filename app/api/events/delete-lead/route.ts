import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerName = searchParams.get('customer');
    if (!customerName) return NextResponse.json({ error: 'Cliente nao especificado' }, { status: 400 });
    const client = await getDb();
    const db = client.db('verano');
    const result = await db.collection('events').deleteMany({ 'data.customer_name': customerName });
    return NextResponse.json({ success: true, deleted: result.deletedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
