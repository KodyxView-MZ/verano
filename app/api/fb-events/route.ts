import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
    const accessToken = process.env.FB_PIXEL_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      return NextResponse.json({ error: 'Pixel nao configurado' }, { status: 500 });
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            {
              event_name: body.eventName,
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: body.url || 'https://www.veranomz.store',
              user_data: {
                client_ip_address: request.headers.get('x-forwarded-for') || '',
                client_user_agent: request.headers.get('user-agent') || '',
              },
              custom_data: body.data || {},
            },
          ],
        }),
      }
    );

    const result = await response.json();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('FB Events error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}