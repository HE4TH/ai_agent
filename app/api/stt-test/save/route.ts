import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculateWordAccuracy } from '@/lib/stt/accuracy';

export const dynamic = 'force-dynamic';

type SttResult = {
  transcript?: string | null;
  latency_ms?: number | null;
  duration_seconds?: number | null;
  cost_usd?: number | null;
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { webSpeechResult, whisperResult, referenceText } = body as {
    webSpeechResult?: SttResult;
    whisperResult?: SttResult;
    referenceText?: string;
  };

  if (!webSpeechResult || !whisperResult) {
    return NextResponse.json(
      { error: 'webSpeechResult, whisperResult는 필수입니다' },
      { status: 400 }
    );
  }

  const sessionId = crypto.randomUUID();
  const referenceTranscript = referenceText || null;

  const rows = [
    {
      session_id: sessionId,
      method: 'web_speech',
      transcript: webSpeechResult.transcript ?? null,
      reference_transcript: referenceTranscript,
      latency_ms: webSpeechResult.latency_ms ?? null,
      audio_duration_seconds: webSpeechResult.duration_seconds ?? whisperResult.duration_seconds ?? null,
      cost_usd: 0,
      accuracy_percent: calculateWordAccuracy(webSpeechResult.transcript, referenceTranscript),
    },
    {
      session_id: sessionId,
      method: 'whisper',
      transcript: whisperResult.transcript ?? null,
      reference_transcript: referenceTranscript,
      latency_ms: whisperResult.latency_ms ?? null,
      audio_duration_seconds: whisperResult.duration_seconds ?? null,
      cost_usd: whisperResult.cost_usd ?? null,
      accuracy_percent: calculateWordAccuracy(whisperResult.transcript, referenceTranscript),
    },
  ];

  const { error } = await supabaseAdmin.from('stt_comparison_logs').insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session_id: sessionId }, { status: 201 });
}
