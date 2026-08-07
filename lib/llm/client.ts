import OpenAI, { APIError } from 'openai';
import { Langfuse, type LangfusePromptClient } from 'langfuse';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL,
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

const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5';

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
  let timer: ReturnType<typeof setTimeout>;

  // AbortSignal 만으로는 하드 타임아웃을 보장할 수 없다 (기반 fetch/SDK가 signal을
  // 무시하고 응답을 계속 기다리는 경우가 있음). Promise.race로 이 함수 자체가
  // timeoutMs 안에 반드시 반환/거부되도록 강제한다.
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(TIMEOUT_MESSAGE));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(controller.signal), timeoutPromise]);
  } finally {
    clearTimeout(timer!);
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

export async function logLLMCall(
  requestType: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  latencyMs: number
) {
  try {
    const { error } = await supabaseAdmin.from('llm_logs').insert({
      request_type: requestType,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      latency_ms: latencyMs,
    });

    if (error) {
      console.error('LLM 로그 기록 실패:', error);
    }
  } catch (error) {
    console.error('LLM 로그 기록 실패:', error);
  }
}

export async function callClaude(
  prompt: string,
  model: string = DEFAULT_MODEL,
  langfusePrompt?: LangfusePromptClient
) {
  const cached = cache.get(prompt);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const trace = langfuse.trace({ name: 'chat' });
  const inputMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'user', content: prompt },
  ];
  const generation = trace.generation({
    name: 'callClaude',
    model,
    input: inputMessages,
    prompt: langfusePrompt,
  });

  const startedAt = Date.now();

  const response = await withRetry(() =>
    withTimeout((signal) =>
      client.chat.completions.create(
        {
          model,
          messages: inputMessages,
        },
        { signal }
      )
    )
  );

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const result = response.choices[0].message.content;

  generation.end({
    output: result,
    usage: { input: inputTokens, output: outputTokens },
  });

  await logLLMCall('chat', model, inputTokens, outputTokens, Date.now() - startedAt);

  cache.set(prompt, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });

  return result;
}

export async function callClaudeWithTools(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools: OpenAI.Chat.ChatCompletionTool[],
  model: string = DEFAULT_MODEL,
  langfusePrompt?: LangfusePromptClient
) {
  const trace = langfuse.trace({ name: 'agent' });
  const generation = trace.generation({
    name: 'callClaudeWithTools',
    model,
    input: messages,
    prompt: langfusePrompt,
  });

  const startedAt = Date.now();

  const response = await withRetry(() =>
    withTimeout((signal) =>
      client.chat.completions.create(
        {
          model,
          messages,
          tools,
        },
        { signal }
      )
    )
  );

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const resultMessage = response.choices[0].message;

  generation.end({
    output: resultMessage,
    usage: { input: inputTokens, output: outputTokens },
  });

  await logLLMCall('agent', model, inputTokens, outputTokens, Date.now() - startedAt);

  return resultMessage;
}
