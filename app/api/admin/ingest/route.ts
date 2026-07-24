import { ingestDocuments } from '@/lib/rag/ingest';

export async function POST() {
  try {
    const count = await ingestDocuments();
    return Response.json({ count });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return Response.json({ error: message }, { status: 500 });
  }
}
