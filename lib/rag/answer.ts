import type OpenAI from 'openai';
import { searchDocuments } from '@/lib/rag/search';
import { callClaude } from '@/lib/llm/client';

function getMessageText(message: OpenAI.Chat.ChatCompletionMessageParam): string {
  return typeof message.content === 'string' ? message.content : '';
}

export async function answerWithRAG(messages: OpenAI.Chat.ChatCompletionMessageParam[]) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const question = lastUserMessage ? getMessageText(lastUserMessage) : '';

  const chunks = await searchDocuments(question);
  const context = chunks.join('\n\n');

  const history = messages
    .map((message) => `${message.role}: ${getMessageText(message)}`)
    .join('\n');

  const prompt = `다음 규정을 참고해서 대화 맥락에 맞게 질문에 답해줘: ${context}\n\n대화 기록:\n${history}`;

  return callClaude(prompt, 'anthropic/claude-sonnet-5');
}
