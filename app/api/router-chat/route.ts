import type OpenAI from 'openai';
import { auth } from '@/auth';
import { classifyRequest } from '@/lib/llm/router';
import { answerChitchat } from '@/lib/llm/chitchat';
import { answerWithRAG } from '@/lib/rag/answer';
import { runAgent } from '@/lib/llm/agent';
import { answerStats } from '@/lib/stats/answer';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const allowed = await checkRateLimit(session.user.id);
  if (!allowed) {
    return Response.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 }
    );
  }

  const { messages } = (await request.json()) as {
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
  };

  const category = await classifyRequest(messages);

  let reply: string | null;

  switch (category) {
    case 'chitchat':
      reply = await answerChitchat(messages);
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
