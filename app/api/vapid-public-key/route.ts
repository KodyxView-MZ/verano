import { NextResponse } from 'next/server';

export async function GET() {
  // Substitua pela sua chave pública VAPID real (gerada com web-push)
  const publicKey = 'BP7tU6Z4s4s9w5s8s7s6s5s4s3s2s1s0s9s8s7s6s5s4s3s2s1s0s9s8s7s6s5s4s3s2s1s0';
  return NextResponse.json({ publicKey });
}
