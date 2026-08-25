import type OpenAI from 'openai';
import { Langfuse } from 'langfuse';
import { callClaude } from '@/lib/llm/client';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL,
});

const RECENT_HISTORY_SIZE = 6;

function getMessageText(message: OpenAI.Chat.ChatCompletionMessageParam): string {
  return typeof message.content === 'string' ? message.content : '';
}

export async function answerChitchat(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string | null> {
  const recentMessages = messages.slice(-RECENT_HISTORY_SIZE);
  const history = recentMessages
    .map((message) => `${message.role}: ${getMessageText(message)}`)
    .join('\n');

  const promptClient = await langfuse.getPrompt('chitchat-answer-prompt');
  const prompt = promptClient.compile({ history });

  return callClaude(prompt, undefined, promptClient);
}
