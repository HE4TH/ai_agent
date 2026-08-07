import { callClaude } from '@/lib/llm/client';
import { supabaseAdmin } from '@/lib/supabase-admin';

const VALID_CATEGORIES = ['chitchat', 'faq', 'reservation', 'stats'];

type SuggestedQuestion = {
  text: string;
  icon: string;
  category: string;
};

function parseQuestions(raw: string | null): SuggestedQuestion[] {
  if (!raw) {
    throw new Error('LLM 응답이 비어 있습니다.');
  }

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('LLM 응답에서 JSON 배열을 찾을 수 없습니다.');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) {
    throw new Error('LLM 응답이 배열 형식이 아닙니다.');
  }

  return parsed.filter(
    (item): item is SuggestedQuestion =>
      typeof item?.text === 'string' &&
      typeof item?.icon === 'string' &&
      VALID_CATEGORIES.includes(item?.category)
  );
}

export async function POST() {
  try {
    const prompt =
      '회의실 예약 시스템에서 사용자가 물어볼 만한 질문 20개를 만들어줘. ' +
      '잡담(인사말), 예약 규정 질문, 예약 요청, 통계 질문 4가지 유형이 골고루 섞이게 해줘. ' +
      '각 질문은 짧고 자연스러운 구어체로, Tabler 아이콘 이름도 함께 JSON 배열로 반환해줘. ' +
      '각 항목은 {"text": "질문", "icon": "Tabler 아이콘 이름", "category": "chitchat|faq|reservation|stats" 중 하나} 형식이어야 하고, ' +
      'JSON 배열 외의 다른 설명 텍스트는 포함하지 마.';

    const response = await callClaude(prompt, 'anthropic/claude-haiku-4.5');
    const questions = parseQuestions(response);

    if (questions.length === 0) {
      throw new Error('생성된 질문이 없습니다.');
    }

    const { error } = await supabaseAdmin.from('suggested_questions').insert(
      questions.map((question) => ({
        text: question.text,
        icon: question.icon,
        category: question.category,
      }))
    );

    if (error) {
      throw new Error(`질문 저장 실패: ${error.message}`);
    }

    return Response.json({ count: questions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return Response.json({ error: message }, { status: 500 });
  }
}
