import { NextRequest, NextResponse } from 'next/server';
import { parseBuffer } from 'music-metadata';
import { client } from '@/lib/llm/client';

export const dynamic = 'force-dynamic';

// OpenRouter 응답에만 실릴 수 있는 필드(usage.cost, usage.seconds 등)라 openai SDK의
// Transcription 타입에는 없다. 별도로 정의해서 안전하게 읽는다.
type OpenRouterTranscriptionUsage = {
  seconds?: number;
  duration?: number;
  cost?: number;
};

type OpenRouterTranscriptionResponse = {
  text: string;
  duration?: number;
  usage?: OpenRouterTranscriptionUsage;
};

async function getAudioDurationSeconds(
  buffer: Buffer,
  mimeType: string
): Promise<number | null> {
  try {
    const metadata = await parseBuffer(buffer, mimeType);
    return metadata.format.duration ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const audio = formData.get('audio');

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: '오디오 파일이 필요합니다' }, { status: 400 });
  }

  const startedAt = Date.now();

  try {
    const mimeType = audio.type || 'audio/webm';
    const buffer = Buffer.from(await audio.arrayBuffer());
    const file = new File([buffer], 'recording.webm', { type: mimeType });

    const transcription = (await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'json',
    })) as unknown as OpenRouterTranscriptionResponse;

    const latencyMs = Date.now() - startedAt;

    // usage에 duration 정보가 없으면 업로드된 오디오 파일에서 직접 재생 시간을 계산한다.
    const durationSeconds =
      transcription.duration ??
      transcription.usage?.seconds ??
      transcription.usage?.duration ??
      (await getAudioDurationSeconds(buffer, mimeType));

    return NextResponse.json({
      transcript: transcription.text,
      latency_ms: latencyMs,
      cost_usd: transcription.usage?.cost ?? null,
      duration_seconds: durationSeconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
