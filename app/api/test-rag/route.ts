import { type NextRequest } from 'next/server';
import { searchDocuments } from '@/lib/rag/search';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');

  if (!q) {
    return Response.json({ error: 'q 쿼리 파라미터가 필요합니다' }, { status: 400 });
  }

  const results = await searchDocuments(q);

  return Response.json({ results });
}
