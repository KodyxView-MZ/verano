import { MongoClient } from 'mongodb';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export default async function getDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não definida no ambiente.');
  }

  if (!clientPromise) {
    client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
  }

  return await clientPromise;
}
