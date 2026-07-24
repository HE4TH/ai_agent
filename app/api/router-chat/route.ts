import { auth } from '@/auth';
import { classifyRequest } from '@/lib/llm/router';
import { answerWithRAG } from '@/lib/rag/answer';
import { runAgent } from '@/lib/llm/agent';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { message } = await request.json();
  const category = await classifyRequest(message);

  let reply: string | null;

  switch (category) {
    case 'chitchat':
      reply = '안녕하세요! 무엇을 도와드릴까요?';
      break;
    case 'faq':
      reply = await answerWithRAG(message);
      break;
    case 'reservation':
      reply = await runAgent(message, session.user.id);
      break;
    case 'stats':
      reply = '통계 기능은 준비 중입니다';
      break;
  }

  return Response.json({ reply, category });
}
