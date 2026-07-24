import { getEmbedding } from '@/lib/embeddings';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function searchDocuments(query: string): Promise<string[]> {
  const embedding = await getEmbedding(query);

  const { data, error } = await supabaseAdmin.rpc('match_documents', {
    query_embedding: embedding,
    match_count: 3,
  });

  if (error) {
    throw new Error(`문서 검색 실패: ${error.message}`);
  }

  return (data ?? []).map((row: { content: string }) => row.content);
}
