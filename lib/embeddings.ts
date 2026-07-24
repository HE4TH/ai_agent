import { client } from './llm/client';

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: 'openai/text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}
