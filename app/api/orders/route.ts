=import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import webpush from 'web-push';

const vapidConfigurado = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (vapidConfigurado) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@veranomz.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export async function GET() {
  try {
    const client = await getDb();
    const db = client.db('verano');
    const orders = await db.collection('orders').find({}).sort({ _id: -1 }).toArray();
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pedidos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await getDb();
    const db = client.db('verano');
    const result = await db.collection('orders').insertOne(body);

    const resultadosPush: any[] = [];

    if (!vapidConfigurado) {
      resultadosPush.push({ erro: 'VAPID nao configurado' });
    } else {
      try {
        const subscriptions = await db.collection('subscriptions').find({}).toArray();
        resultadosPush.push({ subsEncontradas: subscriptions.length });

        const payload = JSON.stringify({
          title: 'Novo Pedido!',
          body: (body.customerName || 'Cliente') + ' - ' + (body.kitName || 'Produto'),
          url: '/solar-lamp/backend/dashboard/index.html'
        });

        for (const sub of subscriptions) {
          try {
            const res = await webpush.sendNotification(sub, payload);
            resultadosPush.push({
              endpoint: sub.endpoint.substring(0, 50),
              statusCode: res.statusCode,
              sucesso: true
            });
          } catch (err: any) {
            resultadosPush.push({
              endpoint: sub.endpoint.substring(0, 50),
              erro: err.statusCode || err.message,
              sucesso: false
            });
            if (err.statusCode === 410 || err.statusCode === 404) {
              await db.collection('subscriptions').deleteOne({ _id: sub._id });
            }
          }
        }
      } catch (notifError: any) {
        resultadosPush.push({ erroGeral: notifError.message });
      }
    }

    return NextResponse.json({
      success: true,
      id: result.insertedId,
      vapidConfigurado,
      pushResults: resultadosPush
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro', details: error.message }, { status: 500 });
  }
}