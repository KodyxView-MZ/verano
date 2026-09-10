import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import webpush from 'web-push';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@veranomz.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await getDb();
    const db = client.db('verano');
    const result = await db.collection('orders').insertOne(body);

    try {
      const subscriptions = await db.collection('subscriptions').find({}).toArray();
      const payload = JSON.stringify({
        title: 'Novo Pedido!',
        body: (body.customerName || 'Cliente') + ' - ' + (body.kitName || 'Produto'),
        url: '/solar-lamp/backend/dashboard/index.html'
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (err) {
          console.error('Erro ao enviar notificacao:', err);
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.collection('subscriptions').deleteOne({ _id: sub._id });
          }
        }
      }
    } catch (notifError) {
      console.error('Erro geral nas notificacoes:', notifError);
    }

    return NextResponse.json({ success: true, id: result.insertedId });
  } catch (error) {
    console.error('POST /api/orders:', error);
    return NextResponse.json({ error: 'Erro ao registrar encomenda' }, { status: 500 });
  }
}
