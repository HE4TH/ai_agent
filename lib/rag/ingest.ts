import { readFile } from 'fs/promises';
import path from 'path';
import { getEmbedding } from '@/lib/embeddings';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function ingestDocuments() {
  const filePath = path.join(process.cwd(), 'data', 'reservation-rules.txt');
  const text = await readFile(filePath, 'utf-8');

  const chunks = text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);

    const { error } = await supabaseAdmin
      .from('document_chunks')
      .insert({ content: chunk, embedding });

    if (error) {
      throw new Error(`청크 저장 실패: ${error.message}`);
    }
  }

  return chunks.length;
}
