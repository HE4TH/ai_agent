import type OpenAI from 'openai';
import { Langfuse } from 'langfuse';
import { callClaude, callClaudeWithTools } from '@/lib/llm/client';
import { tools } from '@/lib/llm/tools';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { searchDocuments } from '@/lib/rag/search';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL,
});

async function findResource(resourceName: string, select: string): Promise<any> {
  const normalized = resourceName.replace(/\s+/g, '');

  const { data, error } = await supabaseAdmin
    .from('resources')
    .select(select)
    .ilike('name', `%${normalized}%`);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

async function getResourceId(resourceName: string): Promise<string> {
  const resource = await findResource(resourceName, 'id');

  if (!resource) {
    throw new Error(`자원을 찾을 수 없습니다: ${resourceName}`);
  }

  return resource.id;
}

async function checkAvailability(args: {
  resource_name: string;
  date: string;
  start_time: string;
  end_time: string;
}) {
  if (!isOnHalfHourBoundary(args.start_time) || !isOnHalfHourBoundary(args.end_time)) {
    return { available: false, reason: '예약은 30분 단위로만 가능합니다' };
  }

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

function isOnHalfHourBoundary(time: string): boolean {
  const minute = Number(time.split(':')[1]);
  return minute === 0 || minute === 30;
}

async function checkRuleViolation(args: {
  resource_name: string;
  date: string;
  start_time: string;
  end_time: string;
  attendee_count: number;
}): Promise<void> {
  const chunks = await searchDocuments('예약 규정 위반 확인');

  if (chunks.length === 0) {
    return;
  }

  const context = chunks.join('\n\n');
  const prompt = `다음은 예약 규정 문서에서 검색된 내용입니다.

${context}

아래 예약 요청이 위 규정을 위반하는지 확인하세요.
- 자원: ${args.resource_name}
- 날짜: ${args.date}
- 시간: ${args.start_time} ~ ${args.end_time}
- 인원: ${args.attendee_count}명

위반 사항이 없으면 "OK"라고만 답하세요.
위반 사항이 있으면 "VIOLATION: <위반 사유>" 형식으로만 답하세요.`;

  const response = await callClaude(prompt, 'anthropic/claude-haiku-4.5');
  const normalized = response?.trim() ?? '';

  if (normalized.toUpperCase().startsWith('VIOLATION')) {
    const reason = normalized.replace(/^VIOLATION:?\s*/i, '').trim();
    throw new Error(reason || '예약 규정에 위배됩니다.');
  }
}

async function createReservation(
  args: {
    resource_name: string;
    date: string;
    start_time: string;
    end_time: string;
    attendee_count: number;
  },
  userId: string
) {
  if (!isOnHalfHourBoundary(args.start_time) || !isOnHalfHourBoundary(args.end_time)) {
    throw new Error('예약은 30분 단위로만 가능합니다');
  }

  const resource = await findResource(args.resource_name, 'id, capacity');

  if (!resource) {
    throw new Error(`자원을 찾을 수 없습니다: ${args.resource_name}`);
  }

  if (resource.capacity !== null && args.attendee_count > resource.capacity) {
    throw new Error(
      `${args.resource_name}의 최대 수용 인원은 ${resource.capacity}명입니다. 인원을 줄이거나 다른 자원을 이용해주세요.`
    );
  }

  await checkRuleViolation(args);

  const startTime = `${args.date}T${args.start_time}:00+09:00`;
  const endTime = `${args.date}T${args.end_time}:00+09:00`;

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .insert({
      resource_id: resource.id,
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

async function getResourceInfo(args: { resource_name: string }) {
  const resource = await findResource(args.resource_name, 'name, type, capacity, location');

  if (!resource) {
    throw new Error(`자원을 찾을 수 없습니다: ${args.resource_name}`);
  }

  return resource;
}

async function getOwnedReservation(reservationId: string, userId: string) {
  const { data: reservation, error } = await supabaseAdmin
    .from('reservations')
    .select('id, user_id, start_time, status')
    .eq('id', reservationId)
    .single();

  if (error || !reservation) {
    throw new Error('예약을 찾을 수 없습니다.');
  }

  if (reservation.user_id !== userId) {
    throw new Error('본인이 생성한 예약만 취소/변경할 수 있습니다.');
  }

  return reservation;
}

async function cancelReservation(args: { reservation_id: string }, userId: string) {
  const reservation = await getOwnedReservation(args.reservation_id, userId);

  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  if (new Date(reservation.start_time) < oneHourFromNow) {
    throw new Error('이용 시작 1시간 전까지만 취소 가능합니다.');
  }

  const { error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', args.reservation_id);

  if (error) {
    throw new Error(`예약 취소 실패: ${error.message}`);
  }

  return { success: true };
}

async function updateReservation(
  args: {
    reservation_id: string;
    new_date: string;
    new_start_time: string;
    new_end_time: string;
  },
  userId: string
) {
  await getOwnedReservation(args.reservation_id, userId);

  if (!isOnHalfHourBoundary(args.new_start_time) || !isOnHalfHourBoundary(args.new_end_time)) {
    throw new Error('예약은 30분 단위로만 가능합니다');
  }

  const startTime = `${args.new_date}T${args.new_start_time}:00+09:00`;
  const endTime = `${args.new_date}T${args.new_end_time}:00+09:00`;

  const { error } = await supabaseAdmin
    .from('reservations')
    .update({ start_time: startTime, end_time: endTime })
    .eq('id', args.reservation_id);

  if (error) {
    if (error.code === '23P01') {
      throw new Error('해당 시간대는 이미 예약되어 있습니다.');
    }
    throw new Error(`예약 변경 실패: ${error.message}`);
  }

  return { success: true };
}

function formatTimeInKST(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return { date, time };
}

async function listMyReservations(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('id, start_time, end_time, status, resources(name)')
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`예약 목록 조회 실패: ${error.message}`);
  }

  return data.map((reservation) => {
    const start = formatTimeInKST(reservation.start_time);
    const end = formatTimeInKST(reservation.end_time);
    return {
      reservation_id: reservation.id,
      resource_name:
        (reservation.resources as unknown as { name: string } | null)?.name ?? '알 수 없는 자원',
      date: start.date,
      start_time: start.time,
      end_time: end.time,
    };
  });
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
    case 'getResourceInfo':
      return getResourceInfo(args);
    case 'searchDocuments':
      return searchDocuments(args.query);
    case 'cancelReservation':
      return cancelReservation(args, userId);
    case 'updateReservation':
      return updateReservation(args, userId);
    case 'listMyReservations':
      return listMyReservations(userId);
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

export async function runAgent(
  history: OpenAI.Chat.ChatCompletionMessageParam[],
  userId: string
): Promise<string | null> {
  const today = getTodayInKST();

  const { data: resourceRows } = await supabaseAdmin.from('resources').select('name');
  const resourceNames = (resourceRows ?? []).map((row) => row.name).join(', ');

  const systemPrompt = await langfuse.getPrompt('reservation-system-prompt');
  const compiledSystemPrompt = systemPrompt.compile({ today, resourceNames });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: compiledSystemPrompt,
    },
    ...history,
  ];

  const MAX_TOOL_ROUNDS = 5;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const message = await callClaudeWithTools(
      messages,
      tools as OpenAI.Chat.ChatCompletionTool[],
      'anthropic/claude-haiku-4.5',
      systemPrompt
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
  }

  // 최대 라운드를 넘겨도 계속 도구를 호출하려 하면, 더 이상 도구 실행 없이 마지막 텍스트 응답만 받아온다.
  const finalMessage = await callClaudeWithTools(
    messages,
    tools as OpenAI.Chat.ChatCompletionTool[],
    'anthropic/claude-haiku-4.5',
    systemPrompt
  );

  return finalMessage.content;
}
