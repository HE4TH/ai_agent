import { NextRequest, NextResponse } from 'next/server';
import { client, callClaude } from '@/lib/llm/client';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const SUMMARY_MODEL = 'anthropic/claude-sonnet-5';
const SUMMARY_PROMPT_INSTRUCTION = '핵심 내용, 결정 사항, 액션 아이템을 정리해서 요약해줘';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const formData = await request.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: '오디오 파일이 필요합니다' }, { status: 400 });
  }

  try {
    const file = new File([audio], 'recording.webm', {
      type: audio.type || 'audio/webm',
    });

    const transcription = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    const rawTranscript = transcription.text;

    const summary = await callClaude(
      `${SUMMARY_PROMPT_INSTRUCTION}\n\n${rawTranscript}`,
      SUMMARY_MODEL
    );

    const { data, error } = await supabaseAdmin
      .from('meeting_notes')
      .insert({
        user_id: session.user.id,
        raw_transcript: rawTranscript,
        summary,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
