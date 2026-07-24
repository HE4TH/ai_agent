import type OpenAI from 'openai';
import { callClaudeWithTools } from '@/lib/llm/client';
import { tools } from '@/lib/llm/tools';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

async function executeTool(
  toolCall: OpenAI.Chat.ChatCompletionMessageFunctionToolCall,
  userId: string
) {
  console.log('도구 호출됨:', toolCall.function.name, toolCall.function.arguments);

  const args = JSON.parse(toolCall.function.arguments);

  switch (toolCall.function.name) {
    case 'checkAvailability':
      return checkAvailability(args);
    case 'createReservation':
      return createReservation(args, userId);
    case 'getResourceInfo':
      return getResourceInfo(args);
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

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `오늘은 ${today}입니다. 사용자가 내일, 모레 같은 상대적 날짜를 말하면 이 기준으로 정확히 계산해서 YYYY-MM-DD 형식으로 checkAvailability, createReservation 함수를 호출해주세요.

현재 등록된 자원 목록: ${resourceNames}
사용자가 자원을 어떤 이름이나 표현으로 말하든, 위 목록을 참고해서 가장 일치하는 정확한 자원명으로 함수를 호출하세요.

다음 규칙을 반드시 따르세요:
- 수용 인원, 위치, 자원 종류 등 자원 자체의 정보를 묻는 질문에는 반드시 getResourceInfo를 호출하세요. checkAvailability로 대체하지 마세요.
- checkAvailability는 오직 특정 날짜/시간대의 예약 가능 여부를 확인할 때만 사용하세요.
- 절대로 함수 호출 결과 없이 추측으로 답변하지 마세요. 자원 정보나 예약 현황에 대해 확실하지 않다면 반드시 해당 함수를 먼저 호출한 뒤 답변하세요.
- 사용자가 요청한 시작/종료 시간이 30분 단위(00분 또는 30분)가 아니라면, 다른 정보(인원 수 등)를 묻기 전에 즉시 이 사실을 알리고 올바른 시간을 다시 요청하세요. 잘못된 시간 형식으로 대화를 계속 진행하지 마세요.
- 현재 시스템은 예약 가능 여부 확인, 예약 생성, 자원 정보 조회, 전체 이번 주 통계 조회만 지원합니다. 개인별 예약 목록 조회, 예약 취소, 예약 변경 기능은 아직 지원하지 않습니다. 사용자가 이런 미지원 기능을 요청하면, 있는 것처럼 지어내지 말고 솔직하게 아직 지원하지 않는다고 답변하세요.
- 사용자가 예약 요청 시 인원수를 언급했다면, 다른 정보(날짜, 시간 등)를 묻기 전에 먼저 getResourceInfo로 해당 자원의 수용 인원을 확인하고, 초과할 경우 즉시 알리고 다른 정보는 묻지 마세요.`,
    },
    ...history,
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
