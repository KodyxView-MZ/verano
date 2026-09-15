import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const client = await getDb();
    const db = client.db('verano');
    const result = await db.collection('events').deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('DELETE /api/events/[id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
