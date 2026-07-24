import type OpenAI from 'openai';
import { auth } from '@/auth';
import { classifyRequest } from '@/lib/llm/router';
import { answerWithRAG } from '@/lib/rag/answer';
import { runAgent } from '@/lib/llm/agent';
import { answerStats } from '@/lib/stats/answer';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { messages } = (await request.json()) as {
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
  };

  const category = await classifyRequest(messages);

  let reply: string | null;

  switch (category) {
    case 'chitchat':
      reply = '안녕하세요! 무엇을 도와드릴까요?';
      break;
    case 'faq':
      reply = await answerWithRAG(messages);
      break;
    case 'reservation':
      reply = await runAgent(messages, session.user.id);
      break;
    case 'stats':
      reply = await answerStats();
      break;
  }

  return Response.json({ reply, category });
}
