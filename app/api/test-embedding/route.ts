import { getEmbedding } from '@/lib/embeddings';

export async function GET() {
  const embedding = await getEmbedding('회의실 예약 규정');

  return Response.json({
    length: embedding.length,
    sample: embedding.slice(0, 5),
  });
}
