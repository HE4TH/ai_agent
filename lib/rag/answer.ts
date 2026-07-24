import { searchDocuments } from '@/lib/rag/search';
import { callClaude } from '@/lib/llm/client';

export async function answerWithRAG(question: string) {
  const chunks = await searchDocuments(question);
  const context = chunks.join('\n\n');

  const prompt = `다음 규정을 참고해서 질문에 답해줘: ${context}\n\n질문: ${question}`;

  return callClaude(prompt);
}
