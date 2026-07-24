import { type NextRequest } from 'next/server';
import { classifyRequest } from '@/lib/llm/router';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');

  if (!q) {
    return Response.json({ error: 'q 쿼리 파라미터가 필요합니다' }, { status: 400 });
  }

  const category = await classifyRequest([{ role: 'user', content: q }]);

  return Response.json({ message: q, category });
}
