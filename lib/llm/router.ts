import type OpenAI from 'openai';
import { callClaude } from '@/lib/llm/client';

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

  const prompt = `다음은 최근 대화 기록이야. 가장 마지막 메시지를 아래 4개 카테고리 중 하나로 분류해줘.

- chitchat: 인사, 잡담, 감사 표현 등
- faq: 예약 규정, 이용 안내 관련 질문
- reservation: 예약 생성, 예약 가능 여부 확인 요청
- stats: 예약 현황, 통계 관련 질문

중요 규칙: 이전 대화에서 예약이나 규정 관련 대화가 진행 중이었다면, 지금 메시지가 짧은 답변(예: 날짜 확인, 인원수 답변)이더라도 chitchat이 아니라 그 대화를 이어가는 카테고리(reservation 또는 faq)로 분류해야 한다.

반드시 위 4개 카테고리 이름 중 하나만 정확히 답해줘. 다른 설명은 붙이지 마.

대화 기록:
${history}

분류할 메시지: "${lastMessage ? getMessageText(lastMessage) : ''}"`;

  const response = await callClaude(prompt);
  const normalized = response?.trim().toLowerCase() ?? '';

  const matched = CATEGORIES.find((category) => normalized.includes(category));

  return matched ?? 'chitchat';
}
