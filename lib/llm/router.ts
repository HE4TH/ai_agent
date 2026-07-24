import type OpenAI from 'openai';
import { Langfuse } from 'langfuse';
import { callClaude } from '@/lib/llm/client';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL,
});

const CATEGORIES = ['chitchat', 'faq', 'reservation', 'stats'] as const;
const RECENT_HISTORY_SIZE = 6;

export type RequestCategory = (typeof CATEGORIES)[number];

function getMessageText(message: OpenAI.Chat.ChatCompletionMessageParam): string {
  return typeof message.content === 'string' ? message.content : '';
}

export async function classifyRequest(
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<RequestCategory> {
  const recentMessages = messages.slice(-RECENT_HISTORY_SIZE);
  const lastMessage = recentMessages[recentMessages.length - 1];

  const history = recentMessages
    .map((message) => `${message.role}: ${getMessageText(message)}`)
    .join('\n');

  const promptClient = await langfuse.getPrompt('router-classification-prompt');
  const lastMessageText = lastMessage ? getMessageText(lastMessage) : '';
  const prompt = promptClient.compile({ history, lastMessage: lastMessageText });

  const response = await callClaude(prompt, undefined, promptClient);
  const normalized = response?.trim().toLowerCase() ?? '';

  const matched = CATEGORIES.find((category) => normalized.includes(category));

  return matched ?? 'chitchat';
}
