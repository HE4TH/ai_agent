import type OpenAI from 'openai';
import { callClaudeWithTools } from '@/lib/llm/client';
import { tools } from '@/lib/llm/tools';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function getResourceId(resourceName: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('id')
    .eq('name', resourceName)
    .single();

  if (error || !data) {
    throw new Error(`자원을 찾을 수 없습니다: ${resourceName}`);
  }

  return data.id;
}

async function checkAvailability(args: {
  resource_name: string;
  date: string;
  start_time: string;
  end_time: string;
}) {
  const resourceId = await getResourceId(args.resource_name);
  const startTime = `${args.date}T${args.start_time}:00+09:00`;
  const endTime = `${args.date}T${args.end_time}:00+09:00`;

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('resource_id', resourceId)
    .eq('status', 'confirmed')
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (error) {
    throw new Error(`예약 조회 실패: ${error.message}`);
  }

  return { available: data.length === 0 };
}

async function createReservation(
  args: {
    resource_name: string;
    date: string;
    start_time: string;
    end_time: string;
  },
  userId: string
) {
  const resourceId = await getResourceId(args.resource_name);
  const startTime = `${args.date}T${args.start_time}:00+09:00`;
  const endTime = `${args.date}T${args.end_time}:00+09:00`;

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      resource_id: resourceId,
      user_id: userId,
      start_time: startTime,
      end_time: endTime,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`예약 생성 실패: ${error.message}`);
  }

  return { success: true, reservation_id: data.id };
}

async function executeTool(
  toolCall: OpenAI.Chat.ChatCompletionMessageFunctionToolCall,
  userId: string
) {
  const args = JSON.parse(toolCall.function.arguments);

  switch (toolCall.function.name) {
    case 'checkAvailability':
      return checkAvailability(args);
    case 'createReservation':
      return createReservation(args, userId);
    default:
      throw new Error(`알 수 없는 도구: ${toolCall.function.name}`);
  }
}

function getTodayInKST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export async function runAgent(userMessage: string, userId: string): Promise<string | null> {
  const today = getTodayInKST();

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `오늘은 ${today}입니다. 사용자가 내일, 모레 같은 상대적 날짜를 말하면 이 기준으로 정확히 계산해서 YYYY-MM-DD 형식으로 checkAvailability, createReservation 함수를 호출해주세요.`,
    },
    { role: 'user', content: userMessage },
  ];

  const message = await callClaudeWithTools(
    messages,
    tools as OpenAI.Chat.ChatCompletionTool[],
    'anthropic/claude-haiku-4.5'
  );

  if (!message.tool_calls || message.tool_calls.length === 0) {
    return message.content;
  }

  messages.push(message);

  for (const toolCall of message.tool_calls) {
    if (toolCall.type !== 'function') continue;

    let result: unknown;
    try {
      result = await executeTool(toolCall, userId);
    } catch (error) {
      result = { error: error instanceof Error ? error.message : '알 수 없는 에러' };
    }

    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  const finalMessage = await callClaudeWithTools(
    messages,
    tools as OpenAI.Chat.ChatCompletionTool[],
    'anthropic/claude-haiku-4.5'
  );

  return finalMessage.content;
}
