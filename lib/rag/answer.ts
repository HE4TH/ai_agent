import type OpenAI from 'openai';
import { searchDocuments } from '@/lib/rag/search';
import { callClaude, langfuse } from '@/lib/llm/client';
import { getMessageText } from '@/lib/llm/messages';

export async function answerWithRAG(messages: OpenAI.Chat.ChatCompletionMessageParam[]) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  const question = lastUserMessage ? getMessageText(lastUserMessage) : '';

  const chunks = await searchDocuments(question);
  const context = chunks.join('\n\n');

  const history = messages
    .map((message) => `${message.role}: ${getMessageText(message)}`)
    .join('\n');

  const promptClient = await langfuse.getPrompt('rag-answer-prompt');
  const prompt = promptClient.compile({ context, history });

  return callClaude(prompt, 'anthropic/claude-sonnet-5', promptClient);
}
