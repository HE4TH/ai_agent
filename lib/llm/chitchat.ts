import type OpenAI from 'openai';
import { callClaude, langfuse } from '@/lib/llm/client';
import { getMessageText } from '@/lib/llm/messages';

const RECENT_HISTORY_SIZE = 6;

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
