import { auth } from '@/auth';
import { runAgent } from '@/lib/llm/agent';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { message } = await request.json();

  const reply = await runAgent(message, session.user.id);

  return Response.json({ reply });
}
