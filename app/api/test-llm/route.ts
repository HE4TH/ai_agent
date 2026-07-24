import { NextResponse } from 'next/server';
import { callClaude } from '@/lib/llm/client';

export async function GET() {
  const result = await callClaude('안녕하세요라고만 대답해줘');

  return NextResponse.json({ result });
}
