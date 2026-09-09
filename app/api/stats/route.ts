import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const client = await getDb();
    const db = client.db('verano');
    const total = await db.collection('orders').countDocuments();
    const pendentes = await db.collection('orders').countDocuments({ status: 'pendente' });
    const enviados = await db.collection('orders').countDocuments({ status: 'enviado' });
    const entregues = await db.collection('orders').countDocuments({ status: 'entregue' });
    
    const pipeline = [{ $group: { _id: null, total: { $sum: '$totalPrice' } } }];
    const result = await db.collection('orders').aggregate(pipeline).toArray();
    const totalVendas = result.length > 0 ? result[0].total : 0;

    return NextResponse.json({ total, pendentes, enviados, entregues, totalVendas });
  } catch (error) {
    console.error('GET /api/stats error:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
