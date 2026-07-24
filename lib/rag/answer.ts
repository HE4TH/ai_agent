import type OpenAI from 'openai';
import { Langfuse } from 'langfuse';
import { searchDocuments } from '@/lib/rag/search';
import { callClaude } from '@/lib/llm/client';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL,
});

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

  const promptClient = await langfuse.getPrompt('rag-answer-prompt');
  const prompt = promptClient.compile({ context, history });

  return callClaude(prompt, 'anthropic/claude-sonnet-5', promptClient);
}
