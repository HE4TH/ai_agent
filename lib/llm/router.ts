import { callClaude } from '@/lib/llm/client';

const CATEGORIES = ['chitchat', 'faq', 'reservation', 'stats'] as const;

export type RequestCategory = (typeof CATEGORIES)[number];

export async function classifyRequest(userMessage: string): Promise<RequestCategory> {
  const prompt = `다음 사용자 메시지를 아래 4개 카테고리 중 하나로 분류해줘.

- chitchat: 인사, 잡담, 감사 표현 등
- faq: 예약 규정, 이용 안내 관련 질문
- reservation: 예약 생성, 예약 가능 여부 확인 요청
- stats: 예약 현황, 통계 관련 질문

반드시 위 4개 카테고리 이름 중 하나만 정확히 답해줘. 다른 설명은 붙이지 마.

사용자 메시지: "${userMessage}"`;

  const response = await callClaude(prompt);
  const normalized = response?.trim().toLowerCase() ?? '';

  const matched = CATEGORIES.find((category) => normalized.includes(category));

  return matched ?? 'chitchat';
}
