import OpenAI, { APIError } from 'openai';

export const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MAX_RETRIES = 3;
const MAX_TIMEOUT_RETRIES = 1;
const BASE_DELAY_MS = 1000;
const TIMEOUT_MS = 10000;
const TIMEOUT_MESSAGE = '응답 시간 초과';
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  value: string | null;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof APIError)) return false;
  const status = error.status;
  if (status === undefined) return false;
  return status === 429 || status >= 500;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.message === TIMEOUT_MESSAGE;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fn(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  maxTimeoutRetries: number = MAX_TIMEOUT_RETRIES
): Promise<T> {
  let retryCount = 0;
  let timeoutRetryCount = 0;

  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (isTimeoutError(error)) {
        if (timeoutRetryCount >= maxTimeoutRetries) throw error;
        timeoutRetryCount++;
        continue;
      }

      if (isRetryableError(error)) {
        if (retryCount >= maxRetries) throw error;
        const delay = BASE_DELAY_MS * 2 ** retryCount;
        retryCount++;
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }
}

export async function callClaude(prompt: string) {
  const cached = cache.get(prompt);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await withRetry(() =>
    withTimeout((signal) =>
      client.chat.completions.create(
        {
          model: 'anthropic/claude-haiku-4.5',
          messages: [{ role: 'user', content: prompt }],
        },
        { signal }
      )
    )
  );

  const result = response.choices[0].message.content;
  cache.set(prompt, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });

  return result;
}

export async function callClaudeWithTools(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools: OpenAI.Chat.ChatCompletionTool[]
) {
  const response = await withRetry(() =>
    withTimeout((signal) =>
      client.chat.completions.create(
        {
          model: 'anthropic/claude-haiku-4.5',
          messages,
          tools,
        },
        { signal }
      )
    )
  );

  return response.choices[0].message;
}
