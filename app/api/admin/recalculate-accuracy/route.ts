import { supabaseAdmin } from '@/lib/supabase-admin';
import { calculateWordAccuracy } from '@/lib/stt/accuracy';

export async function POST() {
  try {
    const { data: rows, error: selectError } = await supabaseAdmin
      .from('stt_comparison_logs')
      .select('id, transcript, reference_transcript')
      .not('accuracy_percent', 'is', null);

    if (selectError) {
      throw new Error(`행 조회 실패: ${selectError.message}`);
    }

    const targets = rows ?? [];

    const results = await Promise.all(
      targets.map((row) =>
        supabaseAdmin
          .from('stt_comparison_logs')
          .update({ accuracy_percent: calculateWordAccuracy(row.transcript, row.reference_transcript) })
          .eq('id', row.id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      throw new Error(`정확도 업데이트 실패: ${failed.error.message}`);
    }

    return Response.json({ count: targets.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 에러';
    return Response.json({ error: message }, { status: 500 });
  }
}
